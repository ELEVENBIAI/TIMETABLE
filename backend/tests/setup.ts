import { afterAll, beforeAll } from 'vitest';
import { startTestDb, stopTestDb } from './helpers/db.js';

// Globaler Test-Setup: PostgreSQL-Container einmal pro Test-Run starten.
// Wenn USE_TESTCONTAINERS=false → Setup wird übersprungen (für reine Pure-Function-Tests).

const useContainer = process.env.USE_TESTCONTAINERS !== 'false';

// ─── pg-Cleanup-Noise filtern ──────────────────────────────────────────────
// Beim Testcontainer-Shutdown terminiert Postgres alle Verbindungen, die nicht
// von uns explizit geschlossen wurden (Fastify-eigene Pools aus src/db/pools.ts,
// die zwischen Test-Files überleben weil singleFork: true). pg emittiert dann
// error code `57P01` als unhandled (uncaughtException) im Event-Loop. Tests
// sind dabei längst grün, aber vitest setzt wegen unhandled errors den
// Process-Exit auf 1 → CI-Fail.
//
// Wir swallow gezielt nur diese Shutdown-Termination. Alle anderen pg-Errors
// propagieren normal.
function isPgShutdownTermination(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  return (
    e.code === '57P01' ||
    /terminating connection due to administrator command/i.test(String(e.message ?? ''))
  );
}

process.on('uncaughtException', (err) => {
  if (isPgShutdownTermination(err)) return;
  throw err;
});

process.on('unhandledRejection', (err) => {
  if (isPgShutdownTermination(err)) return;
  throw err;
});

beforeAll(async () => {
  if (!useContainer) return;
  await startTestDb();
}, 120_000);

afterAll(async () => {
  if (!useContainer) return;
  await stopTestDb();
});
