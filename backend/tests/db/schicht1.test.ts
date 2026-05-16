import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanDb, getAppPool, getOwnerPool } from '../helpers/db.js';
import { FIXTURE_IDS, seedFixture } from '../helpers/seedFixture.js';
import { withTestTenant } from '../helpers/withTestTenant.js';

beforeAll(async () => {
  // Container ist bereits in tests/setup.ts hochgefahren
});

afterEach(async () => {
  await cleanDb();
});

describe('Schicht 1 — Schema-Sanity', () => {
  it('alle 10 Tabellen existieren', async () => {
    const pool = getOwnerPool();
    const result = await pool.query<{ count: string }>(`
      SELECT count(*)::text FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN (
          'tenants','users','employees','properties','property_zones',
          'property_managers','contracts','regions','service_types','audit_log'
        )
    `);
    expect(result.rows[0].count).toBe('10');
  });

  it('alle 10 Tabellen haben RLS aktiviert', async () => {
    const pool = getOwnerPool();
    const result = await pool.query<{ count: string }>(`
      SELECT count(*)::text FROM pg_tables t
      JOIN pg_class c ON c.relname = t.tablename
      WHERE t.schemaname = 'public'
        AND c.relrowsecurity = true
        AND t.tablename IN (
          'tenants','users','employees','properties','property_zones',
          'property_managers','contracts','regions','service_types','audit_log'
        )
    `);
    expect(result.rows[0].count).toBe('10');
  });
});

describe('RLS — Tenant-Isolation', () => {
  it('App-Pool ohne app.current_tenant_id sieht nichts', async () => {
    await seedFixture('two-tenants');
    const app = getAppPool();
    // KEIN SET current_tenant_id → RLS-Policy gibt 0 Rows zurück
    const result = await app.query(`SELECT id FROM properties`);
    expect(result.rows).toHaveLength(0);
  });

  it('App-Pool mit korrektem Tenant sieht nur eigene Daten', async () => {
    await seedFixture('two-tenants');
    const rows = await withTestTenant(FIXTURE_IDS.tenantA, async (client) => {
      const res = await client.query<{ id: string; tenant_id: string }>(
        `SELECT id, tenant_id FROM properties`
      );
      return res.rows;
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].tenant_id).toBe(FIXTURE_IDS.tenantA);
  });

  it('Owner-Pool umgeht RLS — sieht beide Tenants', async () => {
    await seedFixture('two-tenants');
    const owner = getOwnerPool();
    const result = await owner.query<{ count: string }>(`SELECT count(*)::text FROM properties`);
    expect(result.rows[0].count).toBe('2');
  });

  it('Cross-Tenant-Zugriff schlägt fehl (App sieht nur eigenen Tenant)', async () => {
    await seedFixture('two-tenants');
    const rows = await withTestTenant(FIXTURE_IDS.tenantA, async (client) => {
      // Versuch B-Daten zu lesen während Context A ist
      const res = await client.query(`SELECT id FROM properties WHERE id = $1`, [
        FIXTURE_IDS.propertyB1,
      ]);
      return res.rows;
    });
    expect(rows).toHaveLength(0);
  });
});

describe('Constraints — USERS.role', () => {
  it('akzeptiert alle 6 gültigen Rollen', async () => {
    await seedFixture('mini-pilot');
    const owner = getOwnerPool();
    const validRoles = [
      'SUPER_ADMIN',
      'ADMIN',
      'PLANNER',
      'FOREMAN',
      'EMPLOYEE',
      'PROPERTY_MANAGER',
    ];
    for (const role of validRoles) {
      await expect(
        owner.query(
          `INSERT INTO users (tenant_id, email, password_hash, role)
           VALUES ($1, $2, 'h', $3)`,
          [FIXTURE_IDS.tenantA, `${role.toLowerCase()}@test.local`, role]
        )
      ).resolves.toBeDefined();
    }
  });

  it('lehnt ungültige Rolle ab (CHECK violation)', async () => {
    await seedFixture('mini-pilot');
    const owner = getOwnerPool();
    await expect(
      owner.query(
        `INSERT INTO users (tenant_id, email, password_hash, role)
         VALUES ($1, 'invalid@test.local', 'h', 'BANANA')`,
        [FIXTURE_IDS.tenantA]
      )
    ).rejects.toThrow(/check constraint/i);
  });
});

describe('Triggers — updated_at', () => {
  it('updated_at wird bei UPDATE automatisch gesetzt', async () => {
    await seedFixture('mini-pilot');
    const owner = getOwnerPool();

    // Initial-Wert lesen
    const initial = await owner.query<{ updated_at: Date }>(
      `SELECT updated_at FROM tenants WHERE id = $1`,
      [FIXTURE_IDS.tenantA]
    );
    const before = initial.rows[0].updated_at;

    // 10ms warten — Postgres CLOCK_TIMESTAMP-Granularität
    await new Promise((r) => setTimeout(r, 50));

    // Update
    await owner.query(`UPDATE tenants SET name = 'Pilot Renamed' WHERE id = $1`, [
      FIXTURE_IDS.tenantA,
    ]);

    const after = await owner.query<{ updated_at: Date }>(
      `SELECT updated_at FROM tenants WHERE id = $1`,
      [FIXTURE_IDS.tenantA]
    );
    expect(after.rows[0].updated_at.getTime()).toBeGreaterThan(before.getTime());
  });
});
