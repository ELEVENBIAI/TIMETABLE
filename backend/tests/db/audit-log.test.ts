import { afterEach, describe, expect, it } from 'vitest';
import { cleanDb, getOwnerPool } from '../helpers/db.js';
import { FIXTURE_IDS, seedFixture } from '../helpers/seedFixture.js';
import { withTestTenant } from '../helpers/withTestTenant.js';

afterEach(async () => {
  await cleanDb();
});

describe('AUDIT_LOG — Constraints', () => {
  it('akzeptiert gültiges ACTION-Format "domain.action"', async () => {
    await seedFixture('mini-pilot');
    const owner = getOwnerPool();
    await expect(
      owner.query(
        `INSERT INTO audit_log (tenant_id, action, target_type, target_id)
         VALUES ($1, 'employee.read', 'employee', $2)`,
        [FIXTURE_IDS.tenantA, FIXTURE_IDS.userA1Admin]
      )
    ).resolves.toBeDefined();
  });

  it('lehnt ungültiges ACTION-Format ab', async () => {
    await seedFixture('mini-pilot');
    const owner = getOwnerPool();
    await expect(
      owner.query(`INSERT INTO audit_log (tenant_id, action) VALUES ($1, 'invalid')`, [
        FIXTURE_IDS.tenantA,
      ])
    ).rejects.toThrow(/check constraint/i);
  });

  it('JSONB metadata speichert + liest korrekt', async () => {
    await seedFixture('mini-pilot');
    const owner = getOwnerPool();
    await owner.query(
      `INSERT INTO audit_log (tenant_id, action, metadata)
       VALUES ($1, 'user.login', '{"ip":"127.0.0.1","success":true}'::jsonb)`,
      [FIXTURE_IDS.tenantA]
    );
    const result = await owner.query<{ metadata: { ip: string; success: boolean } }>(
      `SELECT metadata FROM audit_log WHERE action = 'user.login'`
    );
    expect(result.rows[0].metadata.ip).toBe('127.0.0.1');
    expect(result.rows[0].metadata.success).toBe(true);
  });
});

describe('AUDIT_LOG — Append-Only (GRANT-Schutz)', () => {
  it('App-Pool darf INSERT', async () => {
    await seedFixture('mini-pilot');
    await withTestTenant(FIXTURE_IDS.tenantA, async (client) => {
      await client.query(`INSERT INTO audit_log (tenant_id, action) VALUES ($1, 'test.action')`, [
        FIXTURE_IDS.tenantA,
      ]);
    });
    // Verify Insert via Owner
    const owner = getOwnerPool();
    const result = await owner.query(
      `SELECT count(*)::int as c FROM audit_log WHERE action = 'test.action'`
    );
    expect(result.rows[0].c).toBe(1);
  });

  it('App-Pool darf KEIN UPDATE auf audit_log', async () => {
    await seedFixture('mini-pilot');
    const owner = getOwnerPool();
    const inserted = await owner.query<{ id: string }>(
      `INSERT INTO audit_log (tenant_id, action) VALUES ($1, 'test.action') RETURNING id`,
      [FIXTURE_IDS.tenantA]
    );

    await expect(
      withTestTenant(FIXTURE_IDS.tenantA, async (client) => {
        await client.query(`UPDATE audit_log SET action = 'tamper.action' WHERE id = $1`, [
          inserted.rows[0].id,
        ]);
      })
    ).rejects.toThrow(/permission denied/i);
  });

  it('App-Pool darf KEIN DELETE auf audit_log', async () => {
    await seedFixture('mini-pilot');
    const owner = getOwnerPool();
    const inserted = await owner.query<{ id: string }>(
      `INSERT INTO audit_log (tenant_id, action) VALUES ($1, 'test.action') RETURNING id`,
      [FIXTURE_IDS.tenantA]
    );

    await expect(
      withTestTenant(FIXTURE_IDS.tenantA, async (client) => {
        await client.query(`DELETE FROM audit_log WHERE id = $1`, [inserted.rows[0].id]);
      })
    ).rejects.toThrow(/permission denied/i);
  });

  it('App-Pool darf SELECT (mit RLS)', async () => {
    await seedFixture('two-tenants');
    const owner = getOwnerPool();
    await owner.query(
      `INSERT INTO audit_log (tenant_id, action) VALUES ($1, 'a.event'), ($2, 'b.event')`,
      [FIXTURE_IDS.tenantA, FIXTURE_IDS.tenantB]
    );

    const rows = await withTestTenant(FIXTURE_IDS.tenantA, async (client) => {
      const res = await client.query(`SELECT action FROM audit_log`);
      return res.rows;
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('a.event');
  });
});
