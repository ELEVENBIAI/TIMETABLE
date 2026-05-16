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
let SCHEDULE_ID: string;
let EMP_ID: string;
let EMP_ID_2: string;
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
  const e1 = await pool.query<{ id: string }>(
    `INSERT INTO employees (tenant_id, user_id, first_name, last_name, employee_type)
     VALUES ($1, $2, 'Anna', 'A', 'FULLTIME') RETURNING id`,
    [TENANT_A, EMP_USER]
  );
  EMP_ID = e1.rows[0].id;
  const e2 = await pool.query<{ id: string }>(
    `INSERT INTO employees (tenant_id, first_name, last_name, employee_type)
     VALUES ($1, 'Bertha', 'B', 'FULLTIME') RETURNING id`,
    [TENANT_A]
  );
  EMP_ID_2 = e2.rows[0].id;
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

const planner = () => loginAs({ userId: PLANNER, tenantId: TENANT_A, role: 'PLANNER' });
const emp = () => loginAs({ userId: EMP_USER, tenantId: TENANT_A, role: 'EMPLOYEE' });

const baseEntry = () => ({
  scheduleId: SCHEDULE_ID,
  employeeId: EMP_ID,
  entryDate: '2026-05-18',
  dayOfWeek: 1,
  propertyId: PROPERTY_ID,
  serviceTypeId: SERVICE_TYPE_ID,
  durationMin: 60,
});

describe('Schedule-Entries CRUD', () => {
  it('POST EMPLOYEE → 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedule-entries',
      headers: emp(),
      payload: baseEntry(),
    });
    expect(res.statusCode).toBe(403);
  });

  it('POST PLANNER → 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedule-entries',
      headers: planner(),
      payload: { ...baseEntry(), startTime: '08:00' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().start_time).toBe('08:00:00');
  });

  it('POST: zwei überlappende Slots → 409 TIME_CONFLICT', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/api/schedule-entries',
      headers: planner(),
      payload: { ...baseEntry(), startTime: '08:00', durationMin: 60 },
    });
    expect(first.statusCode).toBe(201);
    const second = await app.inject({
      method: 'POST',
      url: '/api/schedule-entries',
      headers: planner(),
      payload: { ...baseEntry(), startTime: '08:30', durationMin: 60 },
    });
    expect(second.statusCode).toBe(409);
    expect(second.json().error.code).toBe('TIME_CONFLICT');
    expect(second.json().error.message).toContain('conflict');
  });

  it('POST: gleicher Slot anderer Mitarbeiter → 201 (kein conflict)', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/schedule-entries',
      headers: planner(),
      payload: { ...baseEntry(), startTime: '08:00', durationMin: 60 },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedule-entries',
      headers: planner(),
      payload: { ...baseEntry(), employeeId: EMP_ID_2, startTime: '08:00', durationMin: 60 },
    });
    expect(res.statusCode).toBe(201);
  });

  it('POST: archivierter Schedule → 403 SCHEDULE_LOCKED', async () => {
    const pool = getOwnerPool();
    await pool.query(`UPDATE schedules SET status = 'ARCHIVED' WHERE id = $1`, [SCHEDULE_ID]);
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedule-entries',
      headers: planner(),
      payload: baseEntry(),
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('SCHEDULE_LOCKED');
  });

  it('POST /bulk: alle oder nichts (Conflict → Rollback)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedule-entries/bulk',
      headers: planner(),
      payload: {
        entries: [
          { ...baseEntry(), startTime: '08:00' },
          { ...baseEntry(), startTime: '08:30' }, // konfligiert mit erstem
        ],
      },
    });
    expect(res.statusCode).toBe(409);
    const pool = getOwnerPool();
    const count = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM schedule_entries WHERE tenant_id = $1`,
      [TENANT_A]
    );
    expect(count.rows[0].count).toBe('0');
  });

  it('POST /bulk: 3 ohne Conflict → 201, alle drei vorhanden', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedule-entries/bulk',
      headers: planner(),
      payload: {
        entries: [
          { ...baseEntry(), startTime: '08:00', durationMin: 30 },
          { ...baseEntry(), startTime: '09:00', durationMin: 30 },
          { ...baseEntry(), employeeId: EMP_ID_2, startTime: '08:00', durationMin: 30 },
        ],
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().scheduleEntries).toHaveLength(3);
  });

  it('PATCH /:id/move: Drag&Drop auf anderen MA → is_from_reassignment=true', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/schedule-entries',
      headers: planner(),
      payload: { ...baseEntry(), startTime: '08:00' },
    });
    const id = created.json().id;
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/schedule-entries/${id}/move`,
      headers: planner(),
      payload: { employeeId: EMP_ID_2 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().is_from_reassignment).toBe(true);
    expect(res.json().original_employee_id).toBe(EMP_ID);
    expect(res.json().employee_id).toBe(EMP_ID_2);
  });

  it('PATCH /:id/move: in Conflict-Zeit → 409', async () => {
    const a = await app.inject({
      method: 'POST',
      url: '/api/schedule-entries',
      headers: planner(),
      payload: { ...baseEntry(), startTime: '08:00', durationMin: 60 },
    });
    const b = await app.inject({
      method: 'POST',
      url: '/api/schedule-entries',
      headers: planner(),
      payload: { ...baseEntry(), employeeId: EMP_ID_2, startTime: '09:30', durationMin: 60 },
    });
    // Move b auf EMP_ID 08:30 — überlappt mit a (08:00-09:00)
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/schedule-entries/${b.json().id}/move`,
      headers: planner(),
      payload: { employeeId: EMP_ID, startTime: '08:30' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('TIME_CONFLICT');
    void a;
  });

  it('GET als EMPLOYEE: sieht nur eigene Einträge', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/schedule-entries',
      headers: planner(),
      payload: { ...baseEntry(), startTime: '08:00' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/schedule-entries',
      headers: planner(),
      payload: { ...baseEntry(), employeeId: EMP_ID_2, startTime: '08:00' },
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/schedule-entries',
      headers: emp(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().scheduleEntries).toHaveLength(1);
    expect(res.json().scheduleEntries[0].employee_id).toBe(EMP_ID);
  });

  it('GET als PLANNER: sieht alle', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/schedule-entries',
      headers: planner(),
      payload: { ...baseEntry(), startTime: '08:00' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/schedule-entries',
      headers: planner(),
      payload: { ...baseEntry(), employeeId: EMP_ID_2, startTime: '08:00' },
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/schedule-entries',
      headers: planner(),
    });
    expect(res.json().scheduleEntries).toHaveLength(2);
  });
});
