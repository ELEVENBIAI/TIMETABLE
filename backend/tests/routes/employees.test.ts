import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { cleanDb, getConnectionUri, getOwnerPool } from '../helpers/db.js';
import { loginAs } from '../helpers/loginAs.js';

process.env.JWT_SECRET ??= 'a'.repeat(64);
process.env.NODE_ENV = 'test';

let app: FastifyInstance;

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';
const ADMIN = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const EMP = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const ADMIN_B = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

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
  await pool.query(
    `INSERT INTO tenants (id, name, slug, brand) VALUES
       ($1, 'A', 'a', 'GEPARD'),
       ($2, 'B', 'b', 'PAUL')`,
    [TENANT_A, TENANT_B]
  );
  await pool.query(
    `INSERT INTO users (id, tenant_id, email, password_hash, display_name, role)
     VALUES ($1, $4, 'a@x', 'x', 'A', 'ADMIN'),
            ($2, $4, 'e@x', 'x', 'E', 'EMPLOYEE'),
            ($3, $5, 'ab@x', 'x', 'AB', 'ADMIN')`,
    [ADMIN, EMP, ADMIN_B, TENANT_A, TENANT_B]
  );
});

describe('Employees CRUD', () => {
  it('POST: EMPLOYEE → 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/employees',
      headers: loginAs({ userId: EMP, tenantId: TENANT_A, role: 'EMPLOYEE' }),
      payload: { firstName: 'A', lastName: 'B', employeeType: 'FULLTIME' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('POST: ADMIN kann anlegen', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/employees',
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: {
        firstName: 'Anna',
        lastName: 'Schmidt',
        employeeType: 'FULLTIME',
        hourlyRate: 18.5,
        weeklyHours: 40,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().first_name).toBe('Anna');
    expect(res.json().hourly_rate).toBe('18.50');
  });

  it('POST: ungültiger employee_type → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/employees',
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { firstName: 'A', lastName: 'B', employeeType: 'CEO' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST: user_id aus fremdem Tenant → 400 USER_TENANT_MISMATCH', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/employees',
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: {
        firstName: 'A',
        lastName: 'B',
        employeeType: 'FULLTIME',
        userId: ADMIN_B, // gehört zu TENANT_B
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('USER_TENANT_MISMATCH');
  });

  it('GET: EMPLOYEE bekommt hourly_rate NICHT (DSGVO)', async () => {
    const pool = getOwnerPool();
    await pool.query(
      `INSERT INTO employees (tenant_id, first_name, last_name, employee_type, hourly_rate)
       VALUES ($1, 'Anna', 'S', 'FULLTIME', 18.50)`,
      [TENANT_A]
    );
    const res = await app.inject({
      method: 'GET',
      url: '/api/employees',
      headers: loginAs({ userId: EMP, tenantId: TENANT_A, role: 'EMPLOYEE' }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().employees[0].hourly_rate).toBeNull();
  });

  it('GET: ADMIN bekommt hourly_rate', async () => {
    const pool = getOwnerPool();
    await pool.query(
      `INSERT INTO employees (tenant_id, first_name, last_name, employee_type, hourly_rate)
       VALUES ($1, 'Anna', 'S', 'FULLTIME', 18.50)`,
      [TENANT_A]
    );
    const res = await app.inject({
      method: 'GET',
      url: '/api/employees',
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().employees[0].hourly_rate).toBe('18.50');
  });

  it('GET /:id schreibt audit_log (DSGVO Art. 30)', async () => {
    const pool = getOwnerPool();
    const er = await pool.query<{ id: string }>(
      `INSERT INTO employees (tenant_id, first_name, last_name, employee_type)
       VALUES ($1, 'Anna', 'S', 'FULLTIME') RETURNING id`,
      [TENANT_A]
    );
    const empId = er.rows[0].id;
    const res = await app.inject({
      method: 'GET',
      url: `/api/employees/${empId}`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(200);
    const audit = await pool.query<{ action: string; target_id: string }>(
      `SELECT action, target_id FROM audit_log WHERE action = 'employee.read'`
    );
    expect(audit.rowCount).toBe(1);
    expect(audit.rows[0].target_id).toBe(empId);
  });

  it('DELETE: nicht referenziert → 204', async () => {
    const pool = getOwnerPool();
    const er = await pool.query<{ id: string }>(
      `INSERT INTO employees (tenant_id, first_name, last_name, employee_type)
       VALUES ($1, 'Anna', 'S', 'FULLTIME') RETURNING id`,
      [TENANT_A]
    );
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/employees/${er.rows[0].id}`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(204);
  });

  it('DELETE: referenziert in schedule_entries → 409 IN_USE', async () => {
    const pool = getOwnerPool();
    const er = await pool.query<{ id: string }>(
      `INSERT INTO employees (tenant_id, first_name, last_name, employee_type)
       VALUES ($1, 'Anna', 'S', 'FULLTIME') RETURNING id`,
      [TENANT_A]
    );
    const empId = er.rows[0].id;
    const pr = await pool.query<{ id: string }>(
      `INSERT INTO properties (tenant_id, name, street, zip_code, city, property_type)
       VALUES ($1, 'P', 'S', '12345', 'X', 'APARTMENT_BUILDING') RETURNING id`,
      [TENANT_A]
    );
    const sr = await pool.query<{ id: string }>(
      `INSERT INTO service_types (tenant_id, name, short_name, category, color_code, default_duration_min)
       VALUES ($1, 'X', 'X', 'CLEANING', '#000000', 30) RETURNING id`,
      [TENANT_A]
    );
    // Eine Schedule + Schedule-Entry anlegen
    const schr = await pool.query<{ id: string }>(
      `INSERT INTO schedules (tenant_id, week_start, week_number, year, status, created_by)
       VALUES ($1, '2026-05-18', 21, 2026, 'DRAFT', $2) RETURNING id`,
      [TENANT_A, ADMIN]
    );
    await pool.query(
      `INSERT INTO schedule_entries (
         tenant_id, schedule_id, employee_id, entry_date, day_of_week,
         property_id, service_type_id, duration_min
       ) VALUES ($1, $2, $3, '2026-05-18', 1, $4, $5, 30)`,
      [TENANT_A, schr.rows[0].id, empId, pr.rows[0].id, sr.rows[0].id]
    );

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/employees/${empId}`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('IN_USE');
  });
});
