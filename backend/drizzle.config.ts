import { defineConfig } from 'drizzle-kit';

// Wir nutzen Drizzle Kit nur für Migration-Tracking, nicht für Schema-Generierung.
// SQL-Files unter src/db/migrations/ sind handgeschrieben (siehe ADR-13).
export default defineConfig({
  dialect: 'postgresql',
  out: './src/db/migrations',
  schema: './src/db/schema.ts',
  dbCredentials: {
    url:
      process.env.DATABASE_URL_OWNER ??
      'postgresql://hmservice_owner:owner_dev_pw@localhost:5432/timetable',
  },
  strict: true,
  verbose: true,
});
