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
const FOREMAN = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
let PM_ID: string;

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
     VALUES ($1, $5, 'a@x', 'x', 'A', 'ADMIN'),
            ($2, $5, 'e@x', 'x', 'E', 'EMPLOYEE'),
            ($3, $5, 'p@x', 'x', 'P', 'PLANNER'),
            ($4, $5, 'f@x', 'x', 'F', 'FOREMAN')`,
    [ADMIN, EMP, PLANNER, FOREMAN, TENANT_A]
  );
  const pm = await pool.query<{ id: string }>(
    `INSERT INTO property_managers (tenant_id, name) VALUES ($1, 'Hausverwaltung X') RETURNING id`,
    [TENANT_A]
  );
  PM_ID = pm.rows[0].id;
});

describe('Contracts CRUD', () => {
  it('POST EMPLOYEE → 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/contracts',
      headers: loginAs({ userId: EMP, tenantId: TENANT_A, role: 'EMPLOYEE' }),
      payload: { propertyManagerId: PM_ID, contractType: 'STANDARD' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('POST ADMIN → 201 mit monthly_value', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/contracts',
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: {
        propertyManagerId: PM_ID,
        contractType: 'PREMIUM',
        startDate: '2026-01-01',
        endDate: '2027-12-31',
        noticePeriodMonths: 3,
        monthlyValue: 1500.5,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().contract_type).toBe('PREMIUM');
    expect(res.json().monthly_value).toBe('1500.50');
  });

  it('POST ungültiger contract_type → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/contracts',
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { propertyManagerId: PM_ID, contractType: 'GOLD' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET als FOREMAN: monthly_value gefiltert (null)', async () => {
    const pool = getOwnerPool();
    await pool.query(
      `INSERT INTO contracts (tenant_id, property_manager_id, contract_type, monthly_value)
       VALUES ($1, $2, 'STANDARD', 1000.00)`,
      [TENANT_A, PM_ID]
    );
    const res = await app.inject({
      method: 'GET',
      url: '/api/contracts',
      headers: loginAs({ userId: FOREMAN, tenantId: TENANT_A, role: 'FOREMAN' }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().contracts[0].monthly_value).toBeNull();
  });

  it('GET als PLANNER: monthly_value sichtbar', async () => {
    const pool = getOwnerPool();
    await pool.query(
      `INSERT INTO contracts (tenant_id, property_manager_id, contract_type, monthly_value)
       VALUES ($1, $2, 'STANDARD', 1000.00)`,
      [TENANT_A, PM_ID]
    );
    const res = await app.inject({
      method: 'GET',
      url: '/api/contracts',
      headers: loginAs({ userId: PLANNER, tenantId: TENANT_A, role: 'PLANNER' }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().contracts[0].monthly_value).toBe('1000.00');
  });

  it('GET ?propertyManagerId filter', async () => {
    const pool = getOwnerPool();
    const pm2 = await pool.query<{ id: string }>(
      `INSERT INTO property_managers (tenant_id, name) VALUES ($1, 'Y') RETURNING id`,
      [TENANT_A]
    );
    await pool.query(
      `INSERT INTO contracts (tenant_id, property_manager_id, contract_type) VALUES
         ($1, $2, 'STANDARD'),
         ($1, $3, 'PREMIUM')`,
      [TENANT_A, PM_ID, pm2.rows[0].id]
    );
    const res = await app.inject({
      method: 'GET',
      url: `/api/contracts?propertyManagerId=${PM_ID}`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.json().contracts).toHaveLength(1);
    expect(res.json().contracts[0].contract_type).toBe('STANDARD');
  });

  it('POST mit unbekannter propertyManagerId → 404', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/contracts',
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: {
        propertyManagerId: '99999999-9999-9999-9999-999999999999',
        contractType: 'STANDARD',
      },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.messageKey).toBe('errors.propertyManagerNotFound');
  });

  it('DELETE wenn Property den Vertrag referenziert → 409', async () => {
    const pool = getOwnerPool();
    const c = await pool.query<{ id: string }>(
      `INSERT INTO contracts (tenant_id, property_manager_id, contract_type)
       VALUES ($1, $2, 'STANDARD') RETURNING id`,
      [TENANT_A, PM_ID]
    );
    await pool.query(
      `INSERT INTO properties (tenant_id, contract_id, name, street, zip_code, city, property_type)
       VALUES ($1, $2, 'P', 'S', '1', 'X', 'APARTMENT_BUILDING')`,
      [TENANT_A, c.rows[0].id]
    );
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/contracts/${c.rows[0].id}`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(409);
  });

  it('PUT: monthly_value Änderung erlaubt', async () => {
    const pool = getOwnerPool();
    const c = await pool.query<{ id: string }>(
      `INSERT INTO contracts (tenant_id, property_manager_id, contract_type, monthly_value)
       VALUES ($1, $2, 'STANDARD', 500.00) RETURNING id`,
      [TENANT_A, PM_ID]
    );
    const res = await app.inject({
      method: 'PUT',
      url: `/api/contracts/${c.rows[0].id}`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { monthlyValue: 750.25 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().monthly_value).toBe('750.25');
  });
});
