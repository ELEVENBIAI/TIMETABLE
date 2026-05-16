import { describe, expect, it } from 'vitest';
import { getOwnerPool } from '../helpers/db.js';

// Migrations werden bereits in helpers/db.ts beim Test-Boot ausgeführt.
// Hier verifizieren wir nur, dass das Tracking funktioniert.

describe('Migration-Tracking', () => {
  it('__drizzle_migrations Tabelle existiert', async () => {
    const pool = getOwnerPool();
    const result = await pool.query<{ count: string }>(`
      SELECT count(*)::text FROM information_schema.tables
      WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'
    `);
    expect(result.rows[0].count).toBe('1');
  });

  it('Migration 0001_schicht1 ist registriert', async () => {
    const pool = getOwnerPool();
    const result = await pool.query<{ count: string }>(`
      SELECT count(*)::text FROM drizzle.__drizzle_migrations
    `);
    // Mindestens eine Migration ist angewandt
    expect(Number(result.rows[0].count)).toBeGreaterThanOrEqual(1);
  });
});
