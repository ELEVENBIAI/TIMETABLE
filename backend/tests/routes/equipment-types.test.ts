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

describe('Equipment-Types CRUD', () => {
  it('POST EMPLOYEE → 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/equipment-types',
      headers: loginAs({ userId: EMP, tenantId: TENANT_A, role: 'EMPLOYEE' }),
      payload: {
        code: 'M_HAND',
        name: 'Handrasenmäher',
        category: 'RASENMAEHER',
        hourlyRateFactor: 2.0,
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it('POST ADMIN → 201, hourly_rate_factor wird gespeichert', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/equipment-types',
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: {
        code: 'M_RIDE',
        name: 'Fahrrasenmäher',
        category: 'RASENMAEHER',
        hourlyRateFactor: 0.3,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().hourly_rate_factor).toBe('0.30');
  });

  it('POST hourly_rate_factor > 2.0 → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/equipment-types',
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: {
        code: 'X',
        name: 'X',
        category: 'OTHER',
        hourlyRateFactor: 3.0,
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST ungültige category → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/equipment-types',
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: {
        code: 'X',
        name: 'X',
        category: 'UNICORN',
        hourlyRateFactor: 1.0,
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('PUT: hourly_rate_factor anpassen', async () => {
    const pool = getOwnerPool();
    const r = await pool.query<{ id: string }>(
      `INSERT INTO equipment_types (tenant_id, code, name, category, hourly_rate_factor)
       VALUES ($1, 'X', 'X', 'OTHER', 1.00) RETURNING id`,
      [TENANT_A]
    );
    const res = await app.inject({
      method: 'PUT',
      url: `/api/equipment-types/${r.rows[0].id}`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { hourlyRateFactor: 1.5 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().hourly_rate_factor).toBe('1.50');
  });

  it('DELETE: nicht referenziert → 204', async () => {
    const pool = getOwnerPool();
    const r = await pool.query<{ id: string }>(
      `INSERT INTO equipment_types (tenant_id, code, name, category, hourly_rate_factor)
       VALUES ($1, 'X', 'X', 'OTHER', 1.00) RETURNING id`,
      [TENANT_A]
    );
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/equipment-types/${r.rows[0].id}`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(204);
  });

  it('DELETE: in employee_equipment referenziert → 409 IN_USE', async () => {
    const pool = getOwnerPool();
    const eqr = await pool.query<{ id: string }>(
      `INSERT INTO equipment_types (tenant_id, code, name, category, hourly_rate_factor)
       VALUES ($1, 'X', 'X', 'OTHER', 1.00) RETURNING id`,
      [TENANT_A]
    );
    const empr = await pool.query<{ id: string }>(
      `INSERT INTO employees (tenant_id, first_name, last_name, employee_type)
       VALUES ($1, 'A', 'B', 'FULLTIME') RETURNING id`,
      [TENANT_A]
    );
    await pool.query(
      `INSERT INTO employee_equipment (tenant_id, employee_id, equipment_type_id)
       VALUES ($1, $2, $3)`,
      [TENANT_A, empr.rows[0].id, eqr.rows[0].id]
    );
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/equipment-types/${eqr.rows[0].id}`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('IN_USE');
  });
});
