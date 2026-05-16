import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';

let container: StartedPostgreSqlContainer | null = null;
let ownerPool: Pool | null = null;
let appPool: Pool | null = null;

const APP_ROLE = 'hmservice_app';
const APP_PASSWORD = 'app_test_pw';

export async function startTestDb(): Promise<void> {
  if (container) return;

  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('timetable_test')
    .withUsername('hmservice_owner')
    .withPassword('owner_test_pw')
    .start();

  ownerPool = new Pool({
    connectionString: container.getConnectionUri(),
  });

  // App-Rolle anlegen (RLS-erzwungen — kein BYPASSRLS)
  await ownerPool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_ROLE}') THEN
        CREATE ROLE ${APP_ROLE} LOGIN PASSWORD '${APP_PASSWORD}' NOBYPASSRLS;
      END IF;
    END
    $$;
  `);

  // Owner ist BYPASSRLS per ALTER
  await ownerPool.query(`ALTER ROLE hmservice_owner BYPASSRLS;`);

  // Extensions (für künftige RLS-Tests + earthdistance)
  await ownerPool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
  await ownerPool.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
  await ownerPool.query(`CREATE EXTENSION IF NOT EXISTS cube;`);
  await ownerPool.query(`CREATE EXTENSION IF NOT EXISTS earthdistance;`);

  // App-Pool mit App-Rolle
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
