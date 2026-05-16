import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

let container: StartedPostgreSqlContainer | null = null;
let ownerPool: Pool | null = null;
let appPool: Pool | null = null;

const APP_ROLE = 'hmservice_app';
const APP_PASSWORD = 'app_test_pw';
const INIT_DIR = path.join(import.meta.dirname, '..', '..', 'src', 'db', 'init');
const MIGRATIONS_DIR = path.join(import.meta.dirname, '..', '..', 'src', 'db', 'migrations');

export async function startTestDb(): Promise<void> {
  if (container) return;

  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('timetable_test')
    .withUsername('hmservice_owner')
    .withPassword('owner_test_pw')
    .start();

  ownerPool = new Pool({ connectionString: container.getConnectionUri() });

  // Init-SQL ausführen (Extensions, Rollen, Funktionen) — analog Docker-Init
  // Owner-Rolle ist BYPASSRLS, App-Rolle wird hier angelegt
  await ownerPool.query(`ALTER ROLE hmservice_owner BYPASSRLS;`);

  for (const file of readdirSync(INIT_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    const sql = readFileSync(path.join(INIT_DIR, file), 'utf8')
      // ersetze die Password-Variable durch unseren Test-Wert
      .replace(/current_setting\('app\.app_password', true\)/g, `'${APP_PASSWORD}'`);
    await ownerPool.query(sql);
  }

  // Migrations laufen lassen
  const db = drizzle(ownerPool);
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });

  // App-Pool mit App-Rolle (NOBYPASSRLS)
  const host = container.getHost();
  const port = container.getMappedPort(5432);
  appPool = new Pool({
    host,
    port,
    database: 'timetable_test',
    user: APP_ROLE,
    password: APP_PASSWORD,
  });
}

export async function stopTestDb(): Promise<void> {
  if (appPool) {
    await appPool.end();
    appPool = null;
  }
  if (ownerPool) {
    await ownerPool.end();
    ownerPool = null;
  }
  if (container) {
    await container.stop();
    container = null;
  }
}

export function getOwnerPool(): Pool {
  if (!ownerPool) throw new Error('Test-DB not started. Call startTestDb() first.');
  return ownerPool;
}

export function getAppPool(): Pool {
  if (!appPool) throw new Error('Test-DB not started. Call startTestDb() first.');
  return appPool;
}

export function getConnectionUri(): string {
  if (!container) throw new Error('Test-DB not started. Call startTestDb() first.');
  return container.getConnectionUri();
}

// Cleanup zwischen Tests: TRUNCATE alle Tabellen außer __drizzle_migrations
export async function cleanDb(): Promise<void> {
  if (!ownerPool) return;
  await ownerPool.query(`
    TRUNCATE TABLE
      audit_log, service_types, property_zones, properties, contracts,
      property_managers, employees, regions, users, tenants
    RESTART IDENTITY CASCADE;
  `);
}
