#!/usr/bin/env node
// db-check.mjs — Health-Check für Schicht 1 + RLS + AUDIT_LOG Append-Only
// Verwendung: node backend/src/db/scripts/db-check.mjs

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pgPkg from 'pg';

const { Pool } = pgPkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_ENV = path.resolve(__dirname, '..', '..', '..', '..', '.env');

if (existsSync(ROOT_ENV) && !process.env.DATABASE_URL_OWNER) {
  for (const line of readFileSync(ROOT_ENV, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const OWNER_URL = process.env.DATABASE_URL_OWNER;
if (!OWNER_URL) {
  console.error('[db-check] FEHLER: DATABASE_URL_OWNER nicht gesetzt');
  process.exit(1);
}

const pool = new Pool({ connectionString: OWNER_URL });

async function expect(label, query, expected) {
  const result = await pool.query(query);
  const value = result.rows[0]?.value ?? result.rows[0]?.count ?? result.rows;
  const actual = typeof value === 'string' ? value : String(value);
  if (actual !== String(expected)) {
    console.log(`  ❌ ${label}: expected ${expected}, got ${actual}`);
    return false;
  }
  console.log(`  ✓ ${label}: ${actual}`);
  return true;
}

let allOk = true;

const ALL_TABLES = [
  // Schicht 1
  'tenants',
  'users',
  'employees',
  'properties',
  'property_zones',
  'property_managers',
  'contracts',
  'regions',
  'service_types',
  'audit_log',
  // Schicht 2
  'qualification_types',
  'equipment_types',
  'employee_qualifications',
  'employee_equipment',
  'employee_availability',
  // Schicht 3
  'property_services',
  'waste_bin_types',
  'waste_schedules',
  // Schicht 4
  'schedule_templates',
  'template_entries',
  'schedules',
  'schedule_entries',
  'absence_records',
  'contingency_rules',
  // Schicht 5
  'time_logs',
  'reassignment_log',
];
const tableList = ALL_TABLES.map((t) => `'${t}'`).join(',');

console.log('[db-check] Schichten 1-5 Tabellen…');
allOk &= await expect(
  `${ALL_TABLES.length} Tabellen erwartet`,
  `SELECT count(*)::text as value FROM pg_tables
   WHERE schemaname = 'public' AND tablename IN (${tableList})`,
  String(ALL_TABLES.length)
);

console.log('\n[db-check] RLS-Status…');
allOk &= await expect(
  `${ALL_TABLES.length} Tabellen mit RLS`,
  `SELECT count(*)::text as value FROM pg_tables t
   JOIN pg_class c ON c.relname = t.tablename
   WHERE t.schemaname = 'public' AND c.relrowsecurity = true
     AND t.tablename IN (${tableList})`,
  String(ALL_TABLES.length)
);

console.log('\n[db-check] DB-Rollen…');
allOk &= await expect(
  'hmservice_owner ist BYPASSRLS',
  `SELECT rolbypassrls::text as value FROM pg_roles WHERE rolname = 'hmservice_owner'`,
  'true'
);
allOk &= await expect(
  'hmservice_app ist NOBYPASSRLS',
  `SELECT rolbypassrls::text as value FROM pg_roles WHERE rolname = 'hmservice_app'`,
  'false'
);

console.log('\n[db-check] AUDIT_LOG Append-Only (kein UPDATE/DELETE für App-Rolle)…');
allOk &= await expect(
  'hmservice_app hat KEIN UPDATE auf audit_log',
  `SELECT count(*)::text as value FROM information_schema.role_table_grants
   WHERE grantee = 'hmservice_app' AND table_name = 'audit_log' AND privilege_type = 'UPDATE'`,
  '0'
);
allOk &= await expect(
  'hmservice_app hat KEIN DELETE auf audit_log',
  `SELECT count(*)::text as value FROM information_schema.role_table_grants
   WHERE grantee = 'hmservice_app' AND table_name = 'audit_log' AND privilege_type = 'DELETE'`,
  '0'
);

console.log('\n[db-check] Extensions…');
allOk &= await expect(
  '4 Extensions installiert',
  `SELECT count(*)::text as value FROM pg_extension WHERE extname IN ('pgcrypto','pg_trgm','cube','earthdistance')`,
  '4'
);

console.log('\n[db-check] Migrations…');
allOk &= await expect(
  '>=1 Migration registriert',
  `SELECT (count(*) >= 1)::text as value FROM drizzle.__drizzle_migrations`,
  'true'
);

await pool.end();

if (allOk) {
  console.log('\n[db-check] Alle Checks ✓');
  process.exit(0);
} else {
  console.log('\n[db-check] Fehlgeschlagen');
  process.exit(1);
}
