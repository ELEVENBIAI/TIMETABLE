#!/usr/bin/env node
// JWT-Secret-Rotation (ELE-188 / ADR-18).
//
// Verwendung:
//   node scripts/rotate-jwt-secret.mjs --dry-run    # zeigt Plan ohne Schreibvorgang
//   node scripts/rotate-jwt-secret.mjs --apply       # rotiert + Backup
//
// Workflow:
//   1. Liest aktuelle .env
//   2. Backup nach .env.<ISO-Timestamp>.bak
//   3. Verschiebt JWT_SECRET → JWT_SECRET_PREVIOUS
//   4. Generiert neues JWT_SECRET (48 Bytes via crypto.randomBytes)
//   5. Schreibt .env zurück
//   6. stdout: "Backend bitte neu starten. Cleanup-Termin: <heute+7d>"

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(PROJECT_ROOT, '.env');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const apply = args.includes('--apply');

if (!dryRun && !apply) {
  console.error('Usage: rotate-jwt-secret.mjs --dry-run | --apply');
  process.exit(2);
}
if (dryRun && apply) {
  console.error('FEHLER: --dry-run und --apply schließen sich aus');
  process.exit(2);
}

function log(msg) {
  console.log(`[rotate-jwt] ${msg}`);
}

function generateSecret() {
  // 48 Bytes Base64 = 64 Zeichen — passt zu SECURITY.JWT_SECRET_MIN_LENGTH=64
  return randomBytes(48).toString('base64');
}

if (!existsSync(ENV_PATH)) {
  console.error(`FEHLER: .env nicht gefunden unter ${ENV_PATH}`);
  process.exit(1);
}

const envText = readFileSync(ENV_PATH, 'utf8');

// Aktuelles JWT_SECRET extrahieren
const currentMatch = envText.match(/^JWT_SECRET\s*=\s*(.*)$/m);
if (!currentMatch) {
  console.error('FEHLER: Keine JWT_SECRET-Zeile in .env gefunden');
  process.exit(1);
}
const currentSecret = currentMatch[1].replace(/^["']|["']$/g, '').trim();
if (!currentSecret) {
  console.error('FEHLER: JWT_SECRET ist leer — nichts zu rotieren');
  process.exit(1);
}

const newSecret = generateSecret();

log(`Mode: ${dryRun ? 'DRY-RUN' : 'APPLY'}`);
log(`Aktuelles JWT_SECRET: <${currentSecret.length} chars> (wird → JWT_SECRET_PREVIOUS)`);
log(`Neues JWT_SECRET: <${newSecret.length} chars> generiert`);

const cleanupAt = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
log(`Cleanup-Termin: ${cleanupAt} (JWT_SECRET_PREVIOUS entfernen + Backend neustarten)`);

if (dryRun) {
  log('DRY-RUN beendet — keine Änderung an .env');
  process.exit(0);
}

// Apply: Backup zuerst
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(PROJECT_ROOT, `.env.${ts}.bak`);
copyFileSync(ENV_PATH, backupPath);
log(`Backup: ${backupPath}`);

// .env-Text neu zusammenbauen
let newEnvText = envText;

// JWT_SECRET ersetzen
newEnvText = newEnvText.replace(/^JWT_SECRET\s*=.*$/m, `JWT_SECRET=${newSecret}`);

// JWT_SECRET_PREVIOUS setzen oder ergänzen
if (/^JWT_SECRET_PREVIOUS\s*=/m.test(newEnvText)) {
  newEnvText = newEnvText.replace(
    /^JWT_SECRET_PREVIOUS\s*=.*$/m,
    `JWT_SECRET_PREVIOUS=${currentSecret}`
  );
} else {
  // Direkt nach JWT_SECRET einfügen
  newEnvText = newEnvText.replace(/^(JWT_SECRET=.*)$/m, `$1\nJWT_SECRET_PREVIOUS=${currentSecret}`);
}

writeFileSync(ENV_PATH, newEnvText, 'utf8');
log(`✓ .env rotiert`);
log(`Backend bitte neu starten — neue Tokens werden mit dem neuen Secret signiert.`);
log(`Alte Tokens bleiben für ~7 Tage gültig (verifiziert über JWT_SECRET_PREVIOUS).`);
log(`Am ${cleanupAt}: JWT_SECRET_PREVIOUS aus .env entfernen + Backend neustarten.`);
