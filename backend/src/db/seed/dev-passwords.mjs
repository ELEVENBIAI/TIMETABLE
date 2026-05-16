#!/usr/bin/env node
// scripts/seed-dev-passwords — setzt echte bcrypt-Hashes für Pilot-User
// Migration 0005 setzt 'placeholder-hash' — damit funktioniert kein Login.
// Dev-Passwort: 'ChangeMe123!' für alle Pilot-User + MUST_CHANGE_PASSWORD=true

import bcrypt from 'bcryptjs';
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
  console.error('[seed-dev-passwords] FEHLER: DATABASE_URL_OWNER nicht gesetzt');
  process.exit(1);
}

const DEV_PASSWORD = 'ChangeMe123!';
const COST = 12;

const pool = new Pool({ connectionString: OWNER_URL });

console.log(`[seed-dev-passwords] Generiere bcrypt-Hash (cost ${COST})…`);
const hash = await bcrypt.hash(DEV_PASSWORD, COST);

console.log('[seed-dev-passwords] Update Pilot-Users mit placeholder-hash → echtem Hash…');
const result = await pool.query(
  `UPDATE users
   SET password_hash = $1, must_change_password = TRUE
   WHERE password_hash = 'placeholder-hash'
   RETURNING email`,
  [hash]
);

console.log(`[seed-dev-passwords] ${result.rows.length} User aktualisiert:`);
for (const row of result.rows) {
  console.log(`  ✓ ${row.email}  →  Dev-Passwort: ${DEV_PASSWORD}`);
}

await pool.end();
console.log('\n[seed-dev-passwords] Fertig.');
console.log('Login-Test:');
console.log(`  curl -X POST http://localhost:3000/api/auth/login \\`);
console.log(`    -H "Content-Type: application/json" \\`);
console.log(`    -d '{"email":"robert@pilot.local","password":"${DEV_PASSWORD}"}'`);
