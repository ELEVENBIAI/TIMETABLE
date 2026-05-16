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
const PLANNER = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

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
     VALUES ($1, $4, 'a@x', 'x', 'A', 'ADMIN'),
            ($2, $4, 'e@x', 'x', 'E', 'EMPLOYEE'),
            ($3, $4, 'p@x', 'x', 'P', 'PLANNER')`,
    [ADMIN, EMP, PLANNER, TENANT_A]
  );
});

describe('Qualification-Types CRUD', () => {
  it('POST EMPLOYEE → 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/qualification-types',
      headers: loginAs({ userId: EMP, tenantId: TENANT_A, role: 'EMPLOYEE' }),
      payload: { code: 'WINTER_BASIC', name: 'Winterdienst Grundkurs' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('POST PLANNER → 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/qualification-types',
      headers: loginAs({ userId: PLANNER, tenantId: TENANT_A, role: 'PLANNER' }),
      payload: {
        code: 'WINTER_BASIC',
        name: 'Winterdienst Grundkurs',
        requiresProof: true,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().code).toBe('WINTER_BASIC');
    expect(res.json().requires_proof).toBe(true);
  });

  it('POST: doppelter Code im selben Tenant → 409 DUPLICATE_CODE', async () => {
    const pool = getOwnerPool();
    await pool.query(
      `INSERT INTO qualification_types (tenant_id, code, name) VALUES ($1, 'WINTER_BASIC', 'X')`,
      [TENANT_A]
    );
    const res = await app.inject({
      method: 'POST',
      url: '/api/qualification-types',
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { code: 'WINTER_BASIC', name: 'Andere' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('DUPLICATE_CODE');
  });

  it('GET: alle dürfen lesen', async () => {
    const pool = getOwnerPool();
    await pool.query(
      `INSERT INTO qualification_types (tenant_id, code, name) VALUES ($1, 'WB', 'Winter'), ($1, 'GP', 'Garten')`,
      [TENANT_A]
    );
    const res = await app.inject({
      method: 'GET',
      url: '/api/qualification-types',
      headers: loginAs({ userId: EMP, tenantId: TENANT_A, role: 'EMPLOYEE' }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().qualificationTypes).toHaveLength(2);
  });

  it('DELETE: nicht referenziert → 204', async () => {
    const pool = getOwnerPool();
    const r = await pool.query<{ id: string }>(
      `INSERT INTO qualification_types (tenant_id, code, name) VALUES ($1, 'X', 'X') RETURNING id`,
      [TENANT_A]
    );
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/qualification-types/${r.rows[0].id}`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(204);
  });

  it('DELETE: in employee_qualifications referenziert → 409 IN_USE', async () => {
    const pool = getOwnerPool();
    const qr = await pool.query<{ id: string }>(
      `INSERT INTO qualification_types (tenant_id, code, name) VALUES ($1, 'X', 'X') RETURNING id`,
      [TENANT_A]
    );
    const er = await pool.query<{ id: string }>(
      `INSERT INTO employees (tenant_id, first_name, last_name, employee_type)
       VALUES ($1, 'A', 'B', 'FULLTIME') RETURNING id`,
      [TENANT_A]
    );
    await pool.query(
      `INSERT INTO employee_qualifications (tenant_id, employee_id, qualification_type_id)
       VALUES ($1, $2, $3)`,
      [TENANT_A, er.rows[0].id, qr.rows[0].id]
    );
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/qualification-types/${qr.rows[0].id}`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('IN_USE');
  });

  it('DELETE: in service_types.requires_qualification referenziert → 409 IN_USE', async () => {
    const pool = getOwnerPool();
    const qr = await pool.query<{ id: string }>(
      `INSERT INTO qualification_types (tenant_id, code, name) VALUES ($1, 'WINTER_BASIC', 'X') RETURNING id`,
      [TENANT_A]
    );
    await pool.query(
      `INSERT INTO service_types (tenant_id, name, short_name, category, color_code, default_duration_min, requires_qualification)
       VALUES ($1, 'Winter', 'W', 'WINTER', '#000000', 60, 'WINTER_BASIC')`,
      [TENANT_A]
    );
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/qualification-types/${qr.rows[0].id}`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('IN_USE');
  });
});
