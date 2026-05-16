import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { cleanDb, getConnectionUri, getOwnerPool } from '../helpers/db.js';
import { loginAs } from '../helpers/loginAs.js';

process.env.JWT_SECRET ??= 'a'.repeat(64);
process.env.NODE_ENV = 'test';

let app: FastifyInstance;
const TENANT_A = '11111111-1111-1111-1111-111111111111';
const ADMIN = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const EMP = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

beforeAll(async () => {
  process.env.DATABASE_URL_OWNER = getConnectionUri();
  process.env.DATABASE_URL = getConnectionUri().replace(
    'hmservice_owner:owner_test_pw',
    'hmservice_app:app_test_pw'
  );
  const { closePools } = await import('../../src/db/pools.js');
  await closePools();
  const { buildApp } = await import('../../src/app.js');
  app = await buildApp();
});

afterAll(async () => {
  await app?.close();
});

beforeEach(async () => {
  await cleanDb();
  const pool = getOwnerPool();
  await pool.query(`INSERT INTO tenants (id, name, slug, brand) VALUES ($1, 'A', 'a', 'GEPARD')`, [
    TENANT_A,
  ]);
  await pool.query(
    `INSERT INTO users (id, tenant_id, email, password_hash, display_name, role)
     VALUES ($1, $3, 'a@x', 'x', 'A', 'ADMIN'),
            ($2, $3, 'e@x', 'x', 'E', 'EMPLOYEE')`,
    [ADMIN, EMP, TENANT_A]
  );
});

describe('Waste-Bin-Types CRUD', () => {
  it('POST EMPLOYEE → 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/waste-bin-types',
      headers: loginAs({ userId: EMP, tenantId: TENANT_A, role: 'EMPLOYEE' }),
      payload: { code: 'RESIDUAL', name: 'Residual waste' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('POST ADMIN → 201 mit englischem code', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/waste-bin-types',
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: {
        code: 'PAPER',
        name: 'Papiertonne',
        colorCode: '#3B82F6',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().code).toBe('PAPER');
  });

  it('POST: ungültiger code → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/waste-bin-types',
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { code: 'BANANA', name: 'Bananenmüll' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST: doppelter code → 409 DUPLICATE_CODE', async () => {
    const pool = getOwnerPool();
    await pool.query(
      `INSERT INTO waste_bin_types (tenant_id, code, name) VALUES ($1, 'RESIDUAL', 'X')`,
      [TENANT_A]
    );
    const res = await app.inject({
      method: 'POST',
      url: '/api/waste-bin-types',
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { code: 'RESIDUAL', name: 'Y' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('DUPLICATE_CODE');
  });

  it('GET: alle dürfen lesen', async () => {
    const pool = getOwnerPool();
    await pool.query(
      `INSERT INTO waste_bin_types (tenant_id, code, name) VALUES
         ($1, 'RESIDUAL', 'X'), ($1, 'PAPER', 'Y'), ($1, 'GLASS', 'Z')`,
      [TENANT_A]
    );
    const res = await app.inject({
      method: 'GET',
      url: '/api/waste-bin-types',
      headers: loginAs({ userId: EMP, tenantId: TENANT_A, role: 'EMPLOYEE' }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().wasteBinTypes).toHaveLength(3);
  });

  it('DELETE: nicht referenziert → 204', async () => {
    const pool = getOwnerPool();
    const r = await pool.query<{ id: string }>(
      `INSERT INTO waste_bin_types (tenant_id, code, name) VALUES ($1, 'GLASS', 'Glas')
       RETURNING id`,
      [TENANT_A]
    );
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/waste-bin-types/${r.rows[0].id}`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(204);
  });

  it('DELETE: in waste_schedules referenziert → 409 IN_USE', async () => {
    const pool = getOwnerPool();
    const bt = await pool.query<{ id: string }>(
      `INSERT INTO waste_bin_types (tenant_id, code, name) VALUES ($1, 'BIO', 'Bio')
       RETURNING id`,
      [TENANT_A]
    );
    const p = await pool.query<{ id: string }>(
      `INSERT INTO properties (tenant_id, name, street, zip_code, city, property_type)
       VALUES ($1, 'P', 'S', '1', 'X', 'APARTMENT_BUILDING') RETURNING id`,
      [TENANT_A]
    );
    await pool.query(
      `INSERT INTO waste_schedules (tenant_id, property_id, waste_bin_type_id, collection_days, location_description)
       VALUES ($1, $2, $3, '{"daysOfWeek":[1],"frequency":"WEEKLY"}'::jsonb, 'Hinterhof')`,
      [TENANT_A, p.rows[0].id, bt.rows[0].id]
    );
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/waste-bin-types/${bt.rows[0].id}`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('IN_USE');
  });
});
