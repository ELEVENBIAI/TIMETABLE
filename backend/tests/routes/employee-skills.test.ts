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
let EMPLOYEE_ID: string;
let QUAL_ID: string;
let EQUIP_ID: string;

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
  const e = await pool.query<{ id: string }>(
    `INSERT INTO employees (tenant_id, first_name, last_name, employee_type)
     VALUES ($1, 'Anna', 'S', 'FULLTIME') RETURNING id`,
    [TENANT_A]
  );
  EMPLOYEE_ID = e.rows[0].id;
  const q = await pool.query<{ id: string }>(
    `INSERT INTO qualification_types (tenant_id, code, name) VALUES ($1, 'WB', 'Winter') RETURNING id`,
    [TENANT_A]
  );
  QUAL_ID = q.rows[0].id;
  const eq = await pool.query<{ id: string }>(
    `INSERT INTO equipment_types (tenant_id, code, name, category, hourly_rate_factor)
     VALUES ($1, 'M', 'Mäher', 'RASENMAEHER', 1.00) RETURNING id`,
    [TENANT_A]
  );
  EQUIP_ID = eq.rows[0].id;
});

describe('Employee Qualifications', () => {
  it('POST EMPLOYEE → 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/employees/${EMPLOYEE_ID}/qualifications`,
      headers: loginAs({ userId: EMP, tenantId: TENANT_A, role: 'EMPLOYEE' }),
      payload: { qualificationTypeId: QUAL_ID },
    });
    expect(res.statusCode).toBe(403);
  });

  it('POST ADMIN → 201 mit valid_until', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/employees/${EMPLOYEE_ID}/qualifications`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { qualificationTypeId: QUAL_ID, validUntil: '2027-01-01' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().valid_until).toBe('2027-01-01');
  });

  it('POST: doppelt zuweisen → 409 DUPLICATE_ASSIGNMENT', async () => {
    const pool = getOwnerPool();
    await pool.query(
      `INSERT INTO employee_qualifications (tenant_id, employee_id, qualification_type_id)
       VALUES ($1, $2, $3)`,
      [TENANT_A, EMPLOYEE_ID, QUAL_ID]
    );
    const res = await app.inject({
      method: 'POST',
      url: `/api/employees/${EMPLOYEE_ID}/qualifications`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { qualificationTypeId: QUAL_ID },
    });
    expect(res.statusCode).toBe(409);
  });

  it('PUT: valid_until update', async () => {
    const pool = getOwnerPool();
    const r = await pool.query<{ id: string }>(
      `INSERT INTO employee_qualifications (tenant_id, employee_id, qualification_type_id)
       VALUES ($1, $2, $3) RETURNING id`,
      [TENANT_A, EMPLOYEE_ID, QUAL_ID]
    );
    const res = await app.inject({
      method: 'PUT',
      url: `/api/employees/${EMPLOYEE_ID}/qualifications/${r.rows[0].id}`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { validUntil: '2028-06-30' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().valid_until).toBe('2028-06-30');
  });

  it('DELETE → 204, GET liefert leer', async () => {
    const pool = getOwnerPool();
    const r = await pool.query<{ id: string }>(
      `INSERT INTO employee_qualifications (tenant_id, employee_id, qualification_type_id)
       VALUES ($1, $2, $3) RETURNING id`,
      [TENANT_A, EMPLOYEE_ID, QUAL_ID]
    );
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/employees/${EMPLOYEE_ID}/qualifications/${r.rows[0].id}`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(del.statusCode).toBe(204);
    const list = await app.inject({
      method: 'GET',
      url: `/api/employees/${EMPLOYEE_ID}/qualifications`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(list.json().qualifications).toHaveLength(0);
  });
});

describe('Employee Equipment', () => {
  it('POST ADMIN → 201, assigned_at default heute', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/employees/${EMPLOYEE_ID}/equipment`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { equipmentTypeId: EQUIP_ID },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().assigned_at).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it('POST: doppelt → 409', async () => {
    const pool = getOwnerPool();
    await pool.query(
      `INSERT INTO employee_equipment (tenant_id, employee_id, equipment_type_id)
       VALUES ($1, $2, $3)`,
      [TENANT_A, EMPLOYEE_ID, EQUIP_ID]
    );
    const res = await app.inject({
      method: 'POST',
      url: `/api/employees/${EMPLOYEE_ID}/equipment`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { equipmentTypeId: EQUIP_ID },
    });
    expect(res.statusCode).toBe(409);
  });
});

describe('Employee Availability', () => {
  it('PUT Wochentag 1 (Mo) → upsert 200', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/employees/${EMPLOYEE_ID}/availability/1`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { isAvailable: true, availableFrom: '08:00', availableUntil: '16:00' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().day_of_week).toBe(1);
    expect(res.json().is_available).toBe(true);
  });

  it('PUT: zweimal selber Tag → bleibt 1 Eintrag (UNIQUE)', async () => {
    await app.inject({
      method: 'PUT',
      url: `/api/employees/${EMPLOYEE_ID}/availability/2`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { isAvailable: true, availableFrom: '08:00', availableUntil: '12:00' },
    });
    await app.inject({
      method: 'PUT',
      url: `/api/employees/${EMPLOYEE_ID}/availability/2`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { isAvailable: false },
    });
    const list = await app.inject({
      method: 'GET',
      url: `/api/employees/${EMPLOYEE_ID}/availability`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    const di = list.json().availability;
    expect(di).toHaveLength(1);
    expect(di[0].is_available).toBe(false);
  });

  it('PUT: dayOfWeek 8 → 400', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/employees/${EMPLOYEE_ID}/availability/8`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { isAvailable: true },
    });
    expect(res.statusCode).toBe(400);
  });
});
