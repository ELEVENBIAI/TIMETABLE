#!/usr/bin/env node
// CI-Only Helper: setzt für alle Pilot-User echte bcrypt-Hashes auf 'ChangeMe123!'
// und deaktiviert must_change_password — damit Playwright-E2E sich anmelden kann.
// Niemals in Production aufrufen (würde alle Pilot-Passwörter zurücksetzen).

import bcrypt from 'bcryptjs';
import pg from 'pg';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

// .env laden falls vorhanden (lokal); in CI kommen die Vars aus env
const ENV_PATH = path.join(PROJECT_ROOT, '.env');
if (existsSync(ENV_PATH)) {
  for (const line of readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const OWNER_URL = process.env.DATABASE_URL_OWNER;
if (!OWNER_URL) {
  console.error('FEHLER: DATABASE_URL_OWNER nicht gesetzt');
  process.exit(1);
}

const TEST_PASSWORD = 'ChangeMe123!';

const pool = new pg.Pool({ connectionString: OWNER_URL });

async function main() {
  const hash = await bcrypt.hash(TEST_PASSWORD, 12);
  const result = await pool.query(
    `UPDATE users
     SET password_hash = $1,
         must_change_password = FALSE,
         failed_login_count = 0,
         locked_until = NULL
     WHERE email LIKE '%@pilot.local'
     RETURNING email, role`,
    [hash]
  );
  console.log(
    `[seed-test-credentials] ${result.rowCount} Pilot-User auf '${TEST_PASSWORD}' gesetzt:`
  );
  for (const row of result.rows) {
    console.log(`  - ${row.email} (${row.role})`);
  }
  await pool.end();
}

main().catch((err) => {
  console.error('[seed-test-credentials] FEHLER:', err);
  pool.end().catch(() => {});
  process.exit(1);
});
