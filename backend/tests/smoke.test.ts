import { describe, expect, it } from 'vitest';
import { getOwnerPool, getAppPool } from './helpers/db.js';

describe('Test-Infrastruktur Smoke-Test', () => {
  it('PostgreSQL-Container ist hochgefahren und antwortet', async () => {
    const pool = getOwnerPool();
    const result = await pool.query('SELECT 1 as one');
    expect(result.rows[0].one).toBe(1);
  });

  it('Extensions sind installiert', async () => {
    const pool = getOwnerPool();
    const result = await pool.query(`
      SELECT extname FROM pg_extension
      WHERE extname IN ('pgcrypto', 'pg_trgm', 'cube', 'earthdistance')
      ORDER BY extname
    `);
    const names = result.rows.map((r: { extname: string }) => r.extname);
    expect(names).toContain('pgcrypto');
    expect(names).toContain('pg_trgm');
    expect(names).toContain('cube');
    expect(names).toContain('earthdistance');
  });

  it('App-Rolle hmservice_app existiert und ist NOBYPASSRLS', async () => {
    const pool = getOwnerPool();
    const result = await pool.query(`
      SELECT rolname, rolbypassrls
      FROM pg_roles
      WHERE rolname = 'hmservice_app'
    `);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].rolbypassrls).toBe(false);
  });

  it('App-Pool kann mit hmservice_app verbinden', async () => {
    const pool = getAppPool();
    const result = await pool.query('SELECT current_user as user');
    expect(result.rows[0].user).toBe('hmservice_app');
  });

  it('Owner-Pool ist BYPASSRLS', async () => {
    const pool = getOwnerPool();
    const result = await pool.query(`
      SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user
    `);
    expect(result.rows[0].rolbypassrls).toBe(true);
  });
});

describe('Pure Logic Smoke-Test (ohne DB)', () => {
  it('Vitest Globals funktionieren', () => {
    expect(2 + 2).toBe(4);
  });

  it('Async/Await funktioniert', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
});
