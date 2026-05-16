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
const EMP_USER = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
let EMP_ID: string;
let OTHER_EMP_ID: string;
let SCHEDULE_ID: string;
let PROPERTY_ID: string;
let SERVICE_TYPE_ID: string;

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
            ($2, $4, 'p@x', 'x', 'P', 'PLANNER'),
            ($3, $4, 'e@x', 'x', 'E', 'EMPLOYEE')`,
    [ADMIN, PLANNER, EMP_USER, TENANT_A]
  );
  const e = await pool.query<{ id: string }>(
    `INSERT INTO employees (tenant_id, user_id, first_name, last_name, employee_type)
     VALUES ($1, $2, 'Anna', 'A', 'FULLTIME') RETURNING id`,
    [TENANT_A, EMP_USER]
  );
  EMP_ID = e.rows[0].id;
  const e2 = await pool.query<{ id: string }>(
    `INSERT INTO employees (tenant_id, first_name, last_name, employee_type)
     VALUES ($1, 'Bertha', 'B', 'FULLTIME') RETURNING id`,
    [TENANT_A]
  );
  OTHER_EMP_ID = e2.rows[0].id;
  const p = await pool.query<{ id: string }>(
    `INSERT INTO properties (tenant_id, name, street, zip_code, city, property_type)
     VALUES ($1, 'P', 'S', '1', 'X', 'APARTMENT_BUILDING') RETURNING id`,
    [TENANT_A]
  );
  PROPERTY_ID = p.rows[0].id;
  const s = await pool.query<{ id: string }>(
    `INSERT INTO service_types (tenant_id, name, short_name, category, color_code, default_duration_min)
     VALUES ($1, 'Treppenhaus', 'TH', 'CLEANING', '#3B82F6', 30) RETURNING id`,
    [TENANT_A]
  );
  SERVICE_TYPE_ID = s.rows[0].id;
  const sch = await pool.query<{ id: string }>(
    `INSERT INTO schedules (tenant_id, week_start, week_number, year, status, created_by)
     VALUES ($1, '2026-05-18', 21, 2026, 'DRAFT', $2) RETURNING id`,
    [TENANT_A, ADMIN]
  );
  SCHEDULE_ID = sch.rows[0].id;
});

async function seedEntry(employeeId: string, date: string): Promise<string> {
  const pool = getOwnerPool();
  const r = await pool.query<{ id: string }>(
    `INSERT INTO schedule_entries (
       tenant_id, schedule_id, employee_id, entry_date, day_of_week,
       property_id, service_type_id, duration_min, status
     ) VALUES ($1, $2, $3, $4, 1, $5, $6, 60, 'PLANNED') RETURNING id`,
    [TENANT_A, SCHEDULE_ID, employeeId, date, PROPERTY_ID, SERVICE_TYPE_ID]
  );
  return r.rows[0].id;
}

const planner = () => loginAs({ userId: PLANNER, tenantId: TENANT_A, role: 'PLANNER' });
const admin = () => loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' });
const emp = () => loginAs({ userId: EMP_USER, tenantId: TENANT_A, role: 'EMPLOYEE' });

describe('Absences CRUD + Side-Effects', () => {
  it('POST PLANNER SICK → 201, betroffene Entries werden REASSIGNMENT_NEEDED', async () => {
    const eid = await seedEntry(EMP_ID, '2026-05-18');
    const res = await app.inject({
      method: 'POST',
      url: '/api/absences',
      headers: planner(),
      payload: {
        employeeId: EMP_ID,
        absenceType: 'SICK',
        startDate: '2026-05-18',
        endDate: '2026-05-20',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().affectedScheduleEntries).toBe(1);

    const pool = getOwnerPool();
    const r = await pool.query<{ status: string; reassignment_reason: string }>(
      `SELECT status, reassignment_reason FROM schedule_entries WHERE id = $1`,
      [eid]
    );
    expect(r.rows[0].status).toBe('REASSIGNMENT_NEEDED');
    expect(r.rows[0].reassignment_reason).toBe('SICK');
  });

  it('POST EMPLOYEE: eigene SICK → 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/absences',
      headers: emp(),
      payload: {
        employeeId: EMP_ID,
        absenceType: 'SICK',
        startDate: '2026-05-18',
        endDate: '2026-05-19',
      },
    });
    expect(res.statusCode).toBe(201);
  });

  it('POST EMPLOYEE: eigene VACATION → 403 (nicht self-reportable)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/absences',
      headers: emp(),
      payload: {
        employeeId: EMP_ID,
        absenceType: 'VACATION',
        startDate: '2026-05-18',
        endDate: '2026-05-19',
      },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.messageKey).toBe('errors.absenceSelfReportingForbidden');
  });

  it('POST EMPLOYEE: fremder Mitarbeiter → 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/absences',
      headers: emp(),
      payload: {
        employeeId: OTHER_EMP_ID,
        absenceType: 'SICK',
        startDate: '2026-05-18',
        endDate: '2026-05-19',
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it('POST startDate > endDate → 400 VALIDATION_ERROR', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/absences',
      headers: planner(),
      payload: {
        employeeId: EMP_ID,
        absenceType: 'SICK',
        startDate: '2026-05-20',
        endDate: '2026-05-18',
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('DELETE rollt Schedule-Entries auf PLANNED zurück', async () => {
    const eid = await seedEntry(EMP_ID, '2026-05-18');
    const create = await app.inject({
      method: 'POST',
      url: '/api/absences',
      headers: planner(),
      payload: {
        employeeId: EMP_ID,
        absenceType: 'SICK',
        startDate: '2026-05-18',
        endDate: '2026-05-18',
      },
    });
    const aid = create.json().id;
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/absences/${aid}`,
      headers: planner(),
    });
    expect(del.statusCode).toBe(200);
    expect(del.json().restoredScheduleEntries).toBe(1);

    const pool = getOwnerPool();
    const r = await pool.query<{ status: string; reassignment_reason: string | null }>(
      `SELECT status, reassignment_reason FROM schedule_entries WHERE id = $1`,
      [eid]
    );
    expect(r.rows[0].status).toBe('PLANNED');
    expect(r.rows[0].reassignment_reason).toBeNull();
  });

  it('DELETE rollt NICHT zurück wenn andere aktive Absence den Tag abdeckt', async () => {
    const eid = await seedEntry(EMP_ID, '2026-05-18');
    // Erste Absence
    const a1 = await app.inject({
      method: 'POST',
      url: '/api/absences',
      headers: planner(),
      payload: {
        employeeId: EMP_ID,
        absenceType: 'SICK',
        startDate: '2026-05-18',
        endDate: '2026-05-18',
      },
    });
    // Zweite Absence (überlappend)
    await app.inject({
      method: 'POST',
      url: '/api/absences',
      headers: planner(),
      payload: {
        employeeId: EMP_ID,
        absenceType: 'VACATION',
        startDate: '2026-05-18',
        endDate: '2026-05-18',
      },
    });
    // Erste löschen — Entry muss REASSIGNMENT_NEEDED bleiben
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/absences/${a1.json().id}`,
      headers: planner(),
    });
    expect(del.statusCode).toBe(200);
    expect(del.json().restoredScheduleEntries).toBe(0);

    const pool = getOwnerPool();
    const r = await pool.query<{ status: string }>(
      `SELECT status FROM schedule_entries WHERE id = $1`,
      [eid]
    );
    expect(r.rows[0].status).toBe('REASSIGNMENT_NEEDED');
  });

  it('PATCH /:id/handle → is_handled=true', async () => {
    const c = await app.inject({
      method: 'POST',
      url: '/api/absences',
      headers: planner(),
      payload: {
        employeeId: EMP_ID,
        absenceType: 'SICK',
        startDate: '2026-05-18',
        endDate: '2026-05-19',
      },
    });
    const aid = c.json().id;
    const h = await app.inject({
      method: 'PATCH',
      url: `/api/absences/${aid}/handle`,
      headers: admin(),
    });
    expect(h.statusCode).toBe(200);
    expect(h.json().is_handled).toBe(true);
  });

  it('GET EMPLOYEE sieht nur eigene Absences', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/absences',
      headers: planner(),
      payload: {
        employeeId: EMP_ID,
        absenceType: 'SICK',
        startDate: '2026-05-18',
        endDate: '2026-05-19',
      },
    });
    await app.inject({
      method: 'POST',
      url: '/api/absences',
      headers: planner(),
      payload: {
        employeeId: OTHER_EMP_ID,
        absenceType: 'VACATION',
        startDate: '2026-05-18',
        endDate: '2026-05-19',
      },
    });
    const r = await app.inject({
      method: 'GET',
      url: '/api/absences',
      headers: emp(),
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().absences).toHaveLength(1);
    expect(r.json().absences[0].employee_id).toBe(EMP_ID);
  });
});
