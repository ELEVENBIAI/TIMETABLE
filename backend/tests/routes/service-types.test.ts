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

describe('Service-Types CRUD', () => {
  it('POST: EMPLOYEE → 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/service-types',
      headers: loginAs({ userId: EMP, tenantId: TENANT_A, role: 'EMPLOYEE' }),
      payload: {
        name: 'Treppenhaus',
        shortName: 'TH',
        category: 'CLEANING',
        colorCode: '#3b82f6',
        defaultDurationMin: 30,
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it('POST: PLANNER kann anlegen', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/service-types',
      headers: loginAs({ userId: PLANNER, tenantId: TENANT_A, role: 'PLANNER' }),
      payload: {
        name: 'Treppenhaus',
        shortName: 'TH',
        category: 'CLEANING',
        colorCode: '#3b82f6',
        defaultDurationMin: 30,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().color_code).toBe('#3b82f6');
  });

  it('POST: ungültiger Color-Code → 400 + invalidColorCode messageKey', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/service-types',
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: {
        name: 'X',
        shortName: 'X',
        category: 'CLEANING',
        colorCode: 'not-a-color',
        defaultDurationMin: 30,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.messageKey).toBe('errors.invalidColorCode');
  });

  it('GET: alle dürfen lesen', async () => {
    const pool = getOwnerPool();
    await pool.query(
      `INSERT INTO service_types (tenant_id, name, short_name, category, color_code, default_duration_min)
       VALUES ($1, 'A', 'A', 'CLEANING', '#aaaaaa', 30),
              ($1, 'B', 'B', 'GARDEN', '#bbbbbb', 60)`,
      [TENANT_A]
    );
    const res = await app.inject({
      method: 'GET',
      url: '/api/service-types',
      headers: loginAs({ userId: EMP, tenantId: TENANT_A, role: 'EMPLOYEE' }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().serviceTypes).toHaveLength(2);
  });

  it('PUT: ADMIN ändert sort_order', async () => {
    const pool = getOwnerPool();
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service_types (tenant_id, name, short_name, category, color_code, default_duration_min)
       VALUES ($1, 'X', 'X', 'CLEANING', '#000000', 30) RETURNING id`,
      [TENANT_A]
    );
    const id = r.rows[0].id;
    const res = await app.inject({
      method: 'PUT',
      url: `/api/service-types/${id}`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { sortOrder: 99 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().sort_order).toBe(99);
  });

  it('DELETE: nicht referenziert → 204', async () => {
    const pool = getOwnerPool();
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service_types (tenant_id, name, short_name, category, color_code, default_duration_min)
       VALUES ($1, 'X', 'X', 'CLEANING', '#000000', 30) RETURNING id`,
      [TENANT_A]
    );
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/service-types/${r.rows[0].id}`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(204);
  });

  it('DELETE: referenziert in property_services → 409 IN_USE', async () => {
    const pool = getOwnerPool();
    // Property + Service-Type + Property-Service anlegen
    const sr = await pool.query<{ id: string }>(
      `INSERT INTO service_types (tenant_id, name, short_name, category, color_code, default_duration_min)
       VALUES ($1, 'X', 'X', 'CLEANING', '#000000', 30) RETURNING id`,
      [TENANT_A]
    );
    const stId = sr.rows[0].id;
    const pr = await pool.query<{ id: string }>(
      `INSERT INTO properties (tenant_id, name, street, zip_code, city, property_type)
       VALUES ($1, 'P', 'Straße', '12345', 'Berlin', 'APARTMENT_BUILDING') RETURNING id`,
      [TENANT_A]
    );
    const propId = pr.rows[0].id;
    await pool.query(
      `INSERT INTO property_services (tenant_id, property_id, service_type_id, frequency, estimated_duration_min)
       VALUES ($1, $2, $3, 'WEEKLY', 30)`,
      [TENANT_A, propId, stId]
    );

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/service-types/${stId}`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('IN_USE');
  });
});
