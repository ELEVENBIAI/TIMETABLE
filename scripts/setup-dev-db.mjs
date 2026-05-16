#!/usr/bin/env node
// scripts/setup-dev-db.mjs
//
// Einmaliger Setup für die persistente Dev-DB im bestehenden eleven_crm_db Container.
// - Legt Rollen hmservice_owner (BYPASSRLS, CREATEDB) + hmservice_app (NOBYPASSRLS) an
// - Legt Datenbank timetable mit hmservice_owner als Owner an
// - Spielt Init-SQL ein (Extensions, Funktionen)
// - Generiert Zufalls-Passwörter und schreibt sie in .env (DATABASE_URL_OWNER + DATABASE_URL)
//
// Idempotent: Wenn Rollen/DB schon existieren, wird der Setup-Skip-Pfad genommen.
//
// Verwendung:
//   node scripts/setup-dev-db.mjs
//
// Voraussetzung:
//   - Container "eleven_crm_db" läuft + ist von localhost:5432 erreichbar
//   - SUPERUSER-Verbindung möglich (default postgres oder eleven_crm)

import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(PROJECT_ROOT, '.env');

const SUPERUSER_DB = 'eleven_crm';
const SUPERUSER_USER = 'eleven_crm';
const CONTAINER_NAME = 'eleven_crm_db';
const TARGET_DB = 'timetable';
const OWNER_ROLE = 'hmservice_owner';
const APP_ROLE = 'hmservice_app';

// Passwort generieren oder aus bestehender .env wiederverwenden
function getOrGeneratePassword(envKey) {
  const env = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8') : '';
  const m = env.match(new RegExp(`^${envKey}=.+?$`, 'm'));
  if (m) {
    const url = m[0]
      .split('=')[1]
      .trim()
      .replace(/^["']|["']$/g, '');
    const passMatch = url.match(/:([^:@]+)@/);
    if (passMatch) return passMatch[1];
  }
  return randomBytes(24).toString('base64url');
}

const OWNER_PASSWORD = getOrGeneratePassword('DATABASE_URL_OWNER');
const APP_PASSWORD = getOrGeneratePassword('DATABASE_URL');

function execInContainer(sql, db = SUPERUSER_DB) {
  // Quote-safety: SQL ohne Newlines/Quotes via stdin
  const cmd = `docker exec -i ${CONTAINER_NAME} psql -U ${SUPERUSER_USER} -d ${db} -v ON_ERROR_STOP=1`;
  try {
    return execSync(cmd, { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err) {
    const msg = err.stderr?.toString() ?? err.message;
    throw new Error(`psql failed: ${msg}`);
  }
}

function execFileInContainer(filePath, db = SUPERUSER_DB) {
  const sql = readFileSync(filePath, 'utf8');
  return execInContainer(sql, db);
}

console.log('=== Timetable Dev-DB Setup ===');

// 1) Rolle hmservice_owner anlegen (mit CREATEDB + BYPASSRLS)
console.log(`\n[1/5] Rolle ${OWNER_ROLE} anlegen…`);
execInContainer(`
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${OWNER_ROLE}') THEN
    CREATE ROLE ${OWNER_ROLE} LOGIN PASSWORD '${OWNER_PASSWORD}' CREATEDB BYPASSRLS;
    RAISE NOTICE '  ${OWNER_ROLE} created';
  ELSE
    ALTER ROLE ${OWNER_ROLE} WITH LOGIN PASSWORD '${OWNER_PASSWORD}' CREATEDB BYPASSRLS;
    RAISE NOTICE '  ${OWNER_ROLE} updated (password rotated)';
  END IF;
END $$;
`);
console.log(`  ✓ ${OWNER_ROLE} ready`);

// 2) Datenbank timetable anlegen (falls noch nicht da)
console.log(`\n[2/5] Datenbank ${TARGET_DB} anlegen…`);
const dbExists = execInContainer(
  `SELECT 1 FROM pg_database WHERE datname = '${TARGET_DB}';`
).trim();
if (dbExists.includes('1')) {
  console.log(
    `  ⚠ ${TARGET_DB} existiert bereits — Setup überspringt Re-Create. Für Reset: db:reset später.`
  );
} else {
  execInContainer(`CREATE DATABASE ${TARGET_DB} OWNER ${OWNER_ROLE};`);
  console.log(`  ✓ ${TARGET_DB} created`);
}

// 3) App-Rolle anlegen
console.log(`\n[3/5] Rolle ${APP_ROLE} anlegen…`);
execInContainer(`
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_ROLE}') THEN
    CREATE ROLE ${APP_ROLE} LOGIN PASSWORD '${APP_PASSWORD}' NOBYPASSRLS;
    RAISE NOTICE '  ${APP_ROLE} created';
  ELSE
    ALTER ROLE ${APP_ROLE} WITH LOGIN PASSWORD '${APP_PASSWORD}' NOBYPASSRLS;
    RAISE NOTICE '  ${APP_ROLE} updated';
  END IF;
END $$;
`);
console.log(`  ✓ ${APP_ROLE} ready`);

// 4) Init-SQL in timetable DB einspielen (Extensions + Funktionen + Grants)
console.log(`\n[4/5] Init-SQL in ${TARGET_DB} einspielen…`);
const initDir = path.join(PROJECT_ROOT, 'backend', 'src', 'db', 'init');
for (const file of ['01-extensions.sql', '03-functions.sql']) {
  const filePath = path.join(initDir, file);
  if (!existsSync(filePath)) throw new Error(`Init-File fehlt: ${filePath}`);
  execFileInContainer(filePath, TARGET_DB);
  console.log(`  ✓ ${file}`);
}

// 02-roles.sql kann nicht 1:1 ausgeführt werden (CREATE ROLE muss als Superuser laufen,
// und unsere App-Rolle ist schon angelegt). Stattdessen: GRANT-Statements direkt
execInContainer(
  `GRANT CONNECT ON DATABASE ${TARGET_DB} TO ${APP_ROLE};
   GRANT USAGE ON SCHEMA public TO ${APP_ROLE};
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${APP_ROLE};
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${APP_ROLE};
   ALTER ROLE ${OWNER_ROLE} BYPASSRLS;`,
  TARGET_DB
);
console.log(`  ✓ App-Rolle Grants gesetzt`);

// 5) .env aktualisieren mit DATABASE_URL + DATABASE_URL_OWNER
console.log(`\n[5/5] .env aktualisieren…`);
const ownerUrl = `postgresql://${OWNER_ROLE}:${OWNER_PASSWORD}@localhost:5432/${TARGET_DB}`;
const appUrl = `postgresql://${APP_ROLE}:${APP_PASSWORD}@localhost:5432/${TARGET_DB}`;

let env = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8') : '';
const setOrAppend = (key, value) => {
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(env)) {
    env = env.replace(re, `${key}=${value}`);
  } else {
    if (!env.endsWith('\n') && env.length > 0) env += '\n';
    env += `${key}=${value}\n`;
  }
};
setOrAppend('DATABASE_URL_OWNER', ownerUrl);
setOrAppend('DATABASE_URL', appUrl);
writeFileSync(ENV_PATH, env);
console.log(`  ✓ DATABASE_URL + DATABASE_URL_OWNER geschrieben (Passwörter NICHT im Log)`);

console.log('\n=== Setup fertig ===');
console.log(`\nNächste Schritte:`);
console.log(`  cd backend && npm run db:migrate   # Schema anwenden`);
console.log(`  cd backend && npm run db:check     # Verify`);
