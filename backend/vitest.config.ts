import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        // Test-Files selbst
        'src/**/*.test.ts',
        'src/**/*.d.ts',

        // Type-only Files
        'src/types/**',

        // DB-Setup / CLI-Tools — laufen außerhalb der App im Setup-Kontext,
        // nicht durch Unit-/Integration-Tests testbar
        'src/db/migrate.ts',
        'src/db/schema.ts',
        'src/db/migrations/**',
        'src/db/scripts/**',
        'src/db/seed/**',
        'src/db/init/**',

        // App-Bootstrap-Entry — `buildApp(); fastify.listen()`, durch app.ts-Tests
        // + Smoke-E2E indirekt verifiziert
        'src/server.ts',

        // Wird durch Route-Tests indirekt verwendet, aber Coverage erkennt die
        // Verwendung über die Test-Helper-Variante (withTestTenant.ts) nicht
        'src/db/withTenant.ts',
      ],
      thresholds: {
        // Globale Schwellen — Funktionen niedriger, weil Schemas konditionale
        // Filter-Helper exportieren die im Test-Pfad nicht immer durchlaufen
        lines: 70,
        statements: 70,
        branches: 70,
        functions: 65,

        // Domain-Logik strenger
        'src/services/**': {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90,
        },
      },
    },
  },
});
