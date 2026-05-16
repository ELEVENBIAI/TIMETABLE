// Migration-Runner — wendet alle ausstehenden SQL-Migrations an.
// Nutzt drizzle-orm/migrator das automatisch _journal.json liest + Tracking via __drizzle_migrations.
//
// Verwendung:
//   tsx backend/src/db/migrate.ts        — alle ausstehenden Migrations anwenden
//   tsx backend/src/db/migrate.ts down   — letzte Migration zurückrollen (siehe ADR-13)

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

const MIGRATIONS_DIR = path.join(import.meta.dirname, 'migrations');

// .env aus Repo-Root laden (kein dotenv-Dep nötig)
const ROOT_ENV = path.join(import.meta.dirname, '..', '..', '..', '.env');
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
  console.error(
    '[migrate] FEHLER: DATABASE_URL_OWNER nicht gesetzt.\n' +
      '  Bitte ausführen: node scripts/setup-dev-db.mjs\n' +
      '  Oder DATABASE_URL_OWNER manuell in .env eintragen.'
  );
  process.exit(1);
}

async function up(): Promise<void> {
  const pool = new Pool({ connectionString: OWNER_URL });
  const db = drizzle(pool);
  console.log(`[migrate] Running migrations from ${MIGRATIONS_DIR}`);
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  console.log('[migrate] All migrations applied ✓');
  await pool.end();
}

async function down(): Promise<void> {
  // Drizzle hat keinen eingebauten Down-Mechanismus — wir müssen es selbst machen.
  // Reihenfolge: höchste idx zuerst, dann __drizzle_migrations-Eintrag entfernen.
  const pool = new Pool({ connectionString: OWNER_URL });

  const journalPath = path.join(MIGRATIONS_DIR, 'meta', '_journal.json');
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as {
    entries: Array<{ idx: number; tag: string }>;
  };

  // Letzte angewandte Migration ermitteln
  const lastApplied = await pool.query<{ hash: string; created_at: Date }>(
    `SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1`
  );

  if (lastApplied.rows.length === 0) {
    console.log('[migrate-down] No migrations applied — nothing to roll back');
    await pool.end();
    return;
  }

  // Tag aus Hash herausfinden (Drizzle hasht den Migration-File-Inhalt)
  // Pragmatischer Weg: die letzte Journal-Entry rollen
  const lastEntry = journal.entries[journal.entries.length - 1];
  if (!lastEntry) {
    throw new Error('[migrate-down] Journal entry inconsistent with __drizzle_migrations');
  }
  const downFile = path.join(MIGRATIONS_DIR, `${lastEntry.tag}.down.sql`);
  if (!existsSync(downFile)) {
    throw new Error(`[migrate-down] Down-File fehlt: ${downFile}`);
  }

  const downSql = readFileSync(downFile, 'utf8');
  console.log(`[migrate-down] Rolling back ${lastEntry.tag}`);
  await pool.query(downSql);

  // Eintrag aus __drizzle_migrations entfernen
  await pool.query(`DELETE FROM drizzle.__drizzle_migrations WHERE hash = $1`, [
    lastApplied.rows[0].hash,
  ]);
  console.log(`[migrate-down] ${lastEntry.tag} rolled back ✓`);
  await pool.end();
}

const mode = process.argv[2] ?? 'up';

if (mode === 'down') {
  down().catch((err) => {
    console.error('[migrate-down] FAILED:', err);
    process.exit(1);
  });
} else {
  up().catch((err) => {
    console.error('[migrate] FAILED:', err);
    process.exit(1);
  });
}

// Suppress unused warning for readdirSync (imported for future use)
void readdirSync;
