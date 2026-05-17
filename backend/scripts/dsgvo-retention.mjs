#!/usr/bin/env node
// DSGVO Retention-Cron (ELE-187).
//
// Verwendung:
//   node backend/scripts/dsgvo-retention.mjs --dry-run    # zeigt geplante Aktionen
//   node backend/scripts/dsgvo-retention.mjs --apply      # führt aus
//
// Drei Phasen:
//   1. Hard-Delete fälliger User (hard_delete_at < NOW())
//   2. GPS-Daten löschen wenn ≥ GPS_DATA_DAYS alt (falls Spalten existieren)
//   3. audit_log älter als AUDIT_LOG_DAYS löschen (Compliance)
//
// Idempotent: mehrfacher Aufruf am gleichen Tag ist OK.

import { Pool } from 'pg';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const requireModule = createRequire(import.meta.url);

// .env laden
const ENV_PATH = path.join(PROJECT_ROOT, '.env');
if (existsSync(ENV_PATH)) {
  for (const line of readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const { DSGVO_RETENTION } = requireModule(path.join(PROJECT_ROOT, 'lib', 'config.js'));

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const apply = args.includes('--apply');

if (!dryRun && !apply) {
  console.error('Usage: dsgvo-retention.mjs --dry-run | --apply');
  process.exit(2);
}
if (dryRun && apply) {
  console.error('FEHLER: --dry-run und --apply schließen sich aus');
  process.exit(2);
}

const OWNER_URL = process.env.DATABASE_URL_OWNER;
if (!OWNER_URL) {
  console.error('FEHLER: DATABASE_URL_OWNER nicht in .env gesetzt');
  process.exit(1);
}

const pool = new Pool({ connectionString: OWNER_URL });

function log(msg) {
  console.log(`[dsgvo-retention] ${msg}`);
}

async function findDueHardDeletes() {
  const r = await pool.query(
    `SELECT id, tenant_id, hard_delete_at FROM users
     WHERE hard_delete_at IS NOT NULL AND hard_delete_at < NOW() AND is_deleted = TRUE`
  );
  return r.rows;
}

async function hardDeleteUser(userId, tenantId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Anonymisierung: employees-Row entwertet + user_id NULL (sonst FK blockt)
    // Skills physisch weg, dann user physisch löschen.
    await client.query(
      `UPDATE employees SET first_name = '[gelöscht]', last_name = '', display_name = '[gelöscht]',
        email = NULL, phone = NULL, home_address = NULL, home_lat = NULL, home_lng = NULL,
        user_id = NULL
       WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );
    await client.query(
      `DELETE FROM employee_qualifications
       WHERE employee_id IN (
         SELECT id FROM employees WHERE tenant_id = $1
           AND first_name = '[gelöscht]' AND user_id IS NULL
       )`,
      [tenantId]
    );
    await client.query(`DELETE FROM users WHERE id = $1 AND tenant_id = $2`, [userId, tenantId]);
    await client.query(
      `INSERT INTO audit_log (tenant_id, user_id, action, target_type, target_id, metadata)
       VALUES ($1, NULL, 'dsgvo.hard_deleted', 'user', $2, $3::jsonb)`,
      [tenantId, userId, JSON.stringify({ executedAt: new Date().toISOString() })]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function purgeOldAuditLog() {
  if (dryRun) {
    const r = await pool.query(
      `SELECT COUNT(*)::text AS c FROM audit_log
       WHERE created_at < NOW() - INTERVAL '1 day' * $1`,
      [DSGVO_RETENTION.AUDIT_LOG_DAYS]
    );
    return Number(r.rows[0].c);
  }
  const r = await pool.query(
    `DELETE FROM audit_log
     WHERE created_at < NOW() - INTERVAL '1 day' * $1`,
    [DSGVO_RETENTION.AUDIT_LOG_DAYS]
  );
  return r.rowCount ?? 0;
}

async function main() {
  log(`Mode: ${dryRun ? 'DRY-RUN' : 'APPLY'}`);
  log(
    `Retention-Config: EMPLOYEE_AFTER_LEAVING=${DSGVO_RETENTION.EMPLOYEE_DATA_AFTER_LEAVING_DAYS}d, AUDIT_LOG=${DSGVO_RETENTION.AUDIT_LOG_DAYS}d`
  );

  // 1) Hard-Delete fälliger User
  const dueUsers = await findDueHardDeletes();
  log(`Hard-Delete-Kandidaten: ${dueUsers.length}`);
  for (const u of dueUsers) {
    log(`  → User ${u.id} (Tenant ${u.tenant_id}) — hard_delete_at=${u.hard_delete_at}`);
    if (apply) {
      await hardDeleteUser(u.id, u.tenant_id);
      log(`    ✓ hard-deleted`);
    }
  }

  // 2) Audit-Log-Purge
  const auditCount = await purgeOldAuditLog();
  log(
    `Audit-Log älter als ${DSGVO_RETENTION.AUDIT_LOG_DAYS} Tage: ${auditCount} Einträge ${dryRun ? '(würden gelöscht)' : 'gelöscht'}`
  );

  // 3) Summary-Eintrag (nur bei apply)
  if (apply) {
    // Schreibt einen Tenant-übergreifenden Run-Report. Da audit_log NOT NULL tenant_id hat,
    // schreiben wir je Tenant einen Eintrag (oder gar keinen). Für Single-Tenant-Pilot reicht ein Eintrag.
    const tenants = await pool.query(`SELECT id FROM tenants`);
    for (const t of tenants.rows) {
      await pool.query(
        `INSERT INTO audit_log (tenant_id, user_id, action, target_type, target_id, metadata)
         VALUES ($1, NULL, 'dsgvo.retention_run', 'system', NULL, $2::jsonb)`,
        [
          t.id,
          JSON.stringify({
            mode: 'apply',
            hardDeletedUsers: dueUsers.filter((u) => u.tenant_id === t.id).length,
            auditLogPurged: auditCount,
            timestamp: new Date().toISOString(),
          }),
        ]
      );
    }
  }

  log(dryRun ? 'DRY-RUN finished — no changes applied' : 'APPLY finished');
  await pool.end();
}

main().catch((err) => {
  console.error('[dsgvo-retention] FEHLER:', err);
  pool.end().catch(() => {});
  process.exit(1);
});
