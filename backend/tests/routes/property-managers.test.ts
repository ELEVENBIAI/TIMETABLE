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

describe('Property-Managers CRUD', () => {
  it('POST EMPLOYEE → 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/property-managers',
      headers: loginAs({ userId: EMP, tenantId: TENANT_A, role: 'EMPLOYEE' }),
      payload: { name: 'Verwaltung X' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('POST ADMIN → 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/property-managers',
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: {
        name: 'Hausverwaltung Müller GmbH',
        contactName: 'Erika Müller',
        email: 'kontakt@mueller-hausverwaltung.de',
        phone: '+49 6221 111111',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().name).toBe('Hausverwaltung Müller GmbH');
  });

  it('POST PLANNER → 201 (Plan-Berechtigung)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/property-managers',
      headers: loginAs({ userId: PLANNER, tenantId: TENANT_A, role: 'PLANNER' }),
      payload: { name: 'Verwaltung X' },
    });
    expect(res.statusCode).toBe(201);
  });

  it('GET liefert alle', async () => {
    const pool = getOwnerPool();
    await pool.query(
      `INSERT INTO property_managers (tenant_id, name) VALUES ($1, 'A'), ($1, 'B')`,
      [TENANT_A]
    );
    const res = await app.inject({
      method: 'GET',
      url: '/api/property-managers',
      headers: loginAs({ userId: EMP, tenantId: TENANT_A, role: 'EMPLOYEE' }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().propertyManagers).toHaveLength(2);
  });

  it('GET ?q=müller → ILIKE-Suche über name + email + contact_name', async () => {
    const pool = getOwnerPool();
    await pool.query(
      `INSERT INTO property_managers (tenant_id, name, email, contact_name) VALUES
         ($1, 'Hausverwaltung Müller GmbH', 'kontakt@mueller.de', 'Erika Müller'),
         ($1, 'Schmidt GmbH', 'info@schmidt.de', 'Max Schmidt'),
         ($1, 'Andere Verwaltung', NULL, NULL)`,
      [TENANT_A]
    );
    const res = await app.inject({
      method: 'GET',
      url: '/api/property-managers?q=müller',
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(200);
    // "Müller" matched in name + email + contact_name → genau 1 row
    expect(res.json().propertyManagers).toHaveLength(1);
    expect(res.json().propertyManagers[0].name).toContain('Müller');
  });

  it('DELETE wenn Properties referenzieren → 409 IN_USE', async () => {
    const pool = getOwnerPool();
    const pm = await pool.query<{ id: string }>(
      `INSERT INTO property_managers (tenant_id, name) VALUES ($1, 'X') RETURNING id`,
      [TENANT_A]
    );
    await pool.query(
      `INSERT INTO properties (tenant_id, property_manager_id, name, street, zip_code, city, property_type)
       VALUES ($1, $2, 'P', 'S', '1', 'X', 'APARTMENT_BUILDING')`,
      [TENANT_A, pm.rows[0].id]
    );
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/property-managers/${pm.rows[0].id}`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(409);
  });

  it('DELETE wenn Verträge referenzieren → 409 IN_USE', async () => {
    const pool = getOwnerPool();
    const pm = await pool.query<{ id: string }>(
      `INSERT INTO property_managers (tenant_id, name) VALUES ($1, 'X') RETURNING id`,
      [TENANT_A]
    );
    await pool.query(
      `INSERT INTO contracts (tenant_id, property_manager_id, contract_type)
       VALUES ($1, $2, 'STANDARD')`,
      [TENANT_A, pm.rows[0].id]
    );
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/property-managers/${pm.rows[0].id}`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(409);
  });
});
