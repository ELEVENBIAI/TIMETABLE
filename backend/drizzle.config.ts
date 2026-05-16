import { defineConfig } from 'drizzle-kit';

// Wir nutzen Drizzle Kit nur für Migration-Tracking, nicht für Schema-Generierung.
// SQL-Files unter src/db/migrations/ sind handgeschrieben (siehe ADR-13).
const url = process.env.DATABASE_URL_OWNER;
if (!url) {
  throw new Error(
    'DATABASE_URL_OWNER nicht gesetzt — bitte node scripts/setup-dev-db.mjs ausführen.'
  );
}

export default defineConfig({
  dialect: 'postgresql',
  out: './src/db/migrations',
  schema: './src/db/schema.ts',
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
