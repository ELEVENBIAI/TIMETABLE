// Server-Boot-Entry-Point
// Validiert .env, baut App, lauscht auf Port.

import { buildApp } from './app.js';
import { env, validateEnv } from './config.js';
import { closePools } from './db/pools.js';

async function main(): Promise<void> {
  try {
    validateEnv();
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }

  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`Server hört auf http://localhost:${env.PORT}`);
    app.log.info(`Swagger UI: http://localhost:${env.PORT}/api/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful Shutdown
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, async () => {
      app.log.info(`${signal} empfangen — Shutdown läuft`);
      await app.close();
      await closePools();
      process.exit(0);
    });
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
