import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { cleanDb, getConnectionUri, getOwnerPool } from '../helpers/db.js';
import { loginAs } from '../helpers/loginAs.js';

process.env.JWT_SECRET ??= 'a'.repeat(64);
process.env.NODE_ENV = 'test';

let app: FastifyInstance;
const TENANT_A = '11111111-1111-1111-1111-111111111111';
const ADMIN = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PLANNER = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
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
     VALUES ($1, $4, 'a@x', 'x', 'A', 'ADMIN'),
            ($2, $4, 'e@x', 'x', 'E', 'EMPLOYEE'),
            ($3, $4, 'p@x', 'x', 'P', 'PLANNER')`,
    [ADMIN, EMP, PLANNER, TENANT_A]
  );
});

const planner = () => loginAs({ userId: PLANNER, tenantId: TENANT_A, role: 'PLANNER' });
const admin = () => loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' });

describe('Schedules CRUD', () => {
  it('POST EMPLOYEE → 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedules',
      headers: loginAs({ userId: EMP, tenantId: TENANT_A, role: 'EMPLOYEE' }),
      payload: { weekStart: '2026-05-18', weekNumber: 21, year: 2026 },
    });
    expect(res.statusCode).toBe(403);
  });

  it('POST PLANNER → 201 mit status=DRAFT', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedules',
      headers: planner(),
      payload: { weekStart: '2026-05-18', weekNumber: 21, year: 2026 },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().status).toBe('DRAFT');
    expect(res.json().week_number).toBe(21);
  });

  it('POST: doppelte Woche → 409 DUPLICATE_WEEK', async () => {
    const pool = getOwnerPool();
    await pool.query(
      `INSERT INTO schedules (tenant_id, week_start, week_number, year, status, created_by)
       VALUES ($1, '2026-05-18', 21, 2026, 'DRAFT', $2)`,
      [TENANT_A, ADMIN]
    );
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedules',
      headers: admin(),
      payload: { weekStart: '2026-05-18', weekNumber: 21, year: 2026 },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('DUPLICATE_WEEK');
  });

  it('PUBLISH: DRAFT → PUBLISHED setzt published_at + by', async () => {
    const pool = getOwnerPool();
    const r = await pool.query<{ id: string }>(
      `INSERT INTO schedules (tenant_id, week_start, week_number, year, status, created_by)
       VALUES ($1, '2026-05-18', 21, 2026, 'DRAFT', $2) RETURNING id`,
      [TENANT_A, ADMIN]
    );
    const res = await app.inject({
      method: 'POST',
      url: `/api/schedules/${r.rows[0].id}/publish`,
      headers: planner(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('PUBLISHED');
    expect(res.json().published_at).not.toBeNull();
    expect(res.json().published_by).toBe(PLANNER);
  });

  it('PUBLISH: schon PUBLISHED → 400 INVALID_STATUS_TRANSITION', async () => {
    const pool = getOwnerPool();
    const r = await pool.query<{ id: string }>(
      `INSERT INTO schedules (tenant_id, week_start, week_number, year, status, created_by)
       VALUES ($1, '2026-05-18', 21, 2026, 'PUBLISHED', $2) RETURNING id`,
      [TENANT_A, ADMIN]
    );
    const res = await app.inject({
      method: 'POST',
      url: `/api/schedules/${r.rows[0].id}/publish`,
      headers: planner(),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('PUT: DRAFT → ARCHIVED (Sprung) → 400', async () => {
    const pool = getOwnerPool();
    const r = await pool.query<{ id: string }>(
      `INSERT INTO schedules (tenant_id, week_start, week_number, year, status, created_by)
       VALUES ($1, '2026-05-18', 21, 2026, 'DRAFT', $2) RETURNING id`,
      [TENANT_A, ADMIN]
    );
    const res = await app.inject({
      method: 'PUT',
      url: `/api/schedules/${r.rows[0].id}`,
      headers: planner(),
      payload: { status: 'ARCHIVED' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('GET ?status=DRAFT filter', async () => {
    const pool = getOwnerPool();
    await pool.query(
      `INSERT INTO schedules (tenant_id, week_start, week_number, year, status, created_by)
       VALUES ($1, '2026-05-18', 21, 2026, 'DRAFT', $2),
              ($1, '2026-05-25', 22, 2026, 'PUBLISHED', $2)`,
      [TENANT_A, ADMIN]
    );
    const res = await app.inject({
      method: 'GET',
      url: '/api/schedules?status=DRAFT',
      headers: planner(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().schedules).toHaveLength(1);
    expect(res.json().schedules[0].status).toBe('DRAFT');
  });

  it('GET /open-reassignments: aggregiert REASSIGNMENT_NEEDED-Counts pro Woche', async () => {
    const pool = getOwnerPool();
    const propId = 'a1a1a1a1-1111-1111-1111-111111111111';
    const stId = 'cccccccc-1111-1111-1111-111111111111';
    const empId = 'eeeeeeee-1111-1111-1111-111111111111';
    await pool.query(
      `INSERT INTO properties (id, tenant_id, name, street, zip_code, city, property_type)
       VALUES ($1, $2, 'P', 'S', '00000', 'C', 'APARTMENT_BUILDING')`,
      [propId, TENANT_A]
    );
    await pool.query(
      `INSERT INTO service_types (id, tenant_id, name, short_name, category, color_code, default_duration_min)
       VALUES ($1, $2, 'X', 'X', 'CLEANING', '#888888', 30)`,
      [stId, TENANT_A]
    );
    await pool.query(
      `INSERT INTO employees (id, tenant_id, user_id, first_name, last_name, employee_type, weekly_hours)
       VALUES ($1, $2, $3, 'D', 'K', 'FULLTIME', 40)`,
      [empId, TENANT_A, EMP]
    );
    const sched = await pool.query<{ id: string }>(
      `INSERT INTO schedules (tenant_id, week_start, week_number, year, status, created_by)
       VALUES ($1, '2026-05-25', 22, 2026, 'DRAFT', $2),
              ($1, '2026-05-11', 20, 2026, 'DRAFT', $2),
              ($1, '2026-05-18', 21, 2026, 'PUBLISHED', $2)
       RETURNING id`,
      [TENANT_A, ADMIN]
    );
    const [s22, s20, s21] = sched.rows;
    await pool.query(
      `INSERT INTO schedule_entries
         (tenant_id, schedule_id, employee_id, property_id, service_type_id,
          entry_date, day_of_week, duration_min, sort_order, status, created_by)
       VALUES
         ($1, $2, $3, $4, $5, '2026-05-26', 2, 30, 1, 'REASSIGNMENT_NEEDED', $6),
         ($1, $2, $3, $4, $5, '2026-05-27', 3, 30, 2, 'REASSIGNMENT_NEEDED', $6),
         ($1, $7, $3, $4, $5, '2026-05-11', 1, 30, 1, 'REASSIGNMENT_NEEDED', $6),
         ($1, $8, $3, $4, $5, '2026-05-18', 1, 30, 1, 'PLANNED', $6)`,
      [TENANT_A, s22.id, empId, propId, stId, ADMIN, s20.id, s21.id]
    );

    const res = await app.inject({
      method: 'GET',
      url: '/api/reassignments/open-weeks',
      headers: planner(),
    });
    expect(res.statusCode).toBe(200);
    const weeks = res.json().weeks as Array<{ weekStart: string; openCount: number }>;
    expect(weeks).toHaveLength(2);
    expect(weeks[0]).toMatchObject({ weekStart: '2026-05-11', openCount: 1 });
    expect(weeks[1]).toMatchObject({ weekStart: '2026-05-25', openCount: 2 });
  });

  it('GET /open-reassignments: EMPLOYEE → leere Liste', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/reassignments/open-weeks',
      headers: loginAs({ userId: EMP, tenantId: TENANT_A, role: 'EMPLOYEE' }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().weeks).toEqual([]);
  });
});
