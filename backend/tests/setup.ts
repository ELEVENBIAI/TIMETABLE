import { afterAll, beforeAll } from 'vitest';
import { startTestDb, stopTestDb } from './helpers/db.js';

// Globaler Test-Setup: PostgreSQL-Container einmal pro Test-Run starten.
// Wenn USE_TESTCONTAINERS=false → Setup wird übersprungen (für reine Pure-Function-Tests).

const useContainer = process.env.USE_TESTCONTAINERS !== 'false';

beforeAll(async () => {
  if (!useContainer) return;
  await startTestDb();
}, 120_000);

afterAll(async () => {
  if (!useContainer) return;
  await stopTestDb();
});
