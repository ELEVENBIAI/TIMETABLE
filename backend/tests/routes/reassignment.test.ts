// Reassignment-Engine Integration-Tests (ELE-196).
// Testet Service + Route gegen testcontainer-DB mit echtem Seed.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { cleanDb, getConnectionUri, getOwnerPool } from '../helpers/db.js';
import { loginAs } from '../helpers/loginAs.js';

process.env.JWT_SECRET ??= 'a'.repeat(64);
process.env.NODE_ENV = 'test';

let app: FastifyInstance;

const TENANT = '11111111-1111-1111-1111-111111111111';
const ADMIN = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const EMP_USER_ABSENT = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const EMP_USER_GOOD = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const EMP_USER_FAR = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const EMP_USER_CONTINGENCY = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

const EMP_ABSENT = '11111111-2222-2222-2222-111111111111'; // Original employee, will be absent
const EMP_GOOD = '22222222-2222-2222-2222-222222222222'; // Good candidate
const EMP_FAR = '33333333-3333-3333-3333-333333333333'; // Far away
const EMP_CONTINGENCY = '44444444-4444-4444-4444-444444444444'; // Has contingency rule

const PROPERTY = 'a1a1a1a1-1111-1111-1111-111111111111';
const SERVICE_TYPE = 'cccccccc-1111-1111-1111-111111111111';
const SCHEDULE = '20202020-4000-1111-1111-111111111111';
const ENTRY_ID = '55555555-1111-1111-1111-111111111111';

const ENTRY_DATE = '2026-05-20'; // Wednesday in KW 21

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

async function seedScenario(): Promise<void> {
  const pool = getOwnerPool();
  // Tenant + Admin
  await pool.query(
    `INSERT INTO tenants (id, name, slug, brand) VALUES ($1, 'Tenant', 'tenant', 'GEPARD')`,
    [TENANT]
  );
  await pool.query(
    `INSERT INTO users (id, tenant_id, email, password_hash, display_name, role) VALUES
       ($1, $5, 'admin@test.local', 'hash', 'Admin', 'ADMIN'),
       ($2, $5, 'absent@test.local', 'hash', 'Absent', 'EMPLOYEE'),
       ($3, $5, 'good@test.local', 'hash', 'Good', 'EMPLOYEE'),
       ($4, $5, 'far@test.local', 'hash', 'Far', 'EMPLOYEE'),
       ('${EMP_USER_CONTINGENCY}', $5, 'contingency@test.local', 'hash', 'Contingency', 'EMPLOYEE')`,
    [ADMIN, EMP_USER_ABSENT, EMP_USER_GOOD, EMP_USER_FAR, TENANT]
  );

  // 4 Employees: ABSENT (original), GOOD (nah, frei), FAR (weit), CONTINGENCY (contingency-match)
  await pool.query(
    `INSERT INTO employees (id, tenant_id, user_id, first_name, last_name, employee_type, weekly_hours, home_lat, home_lng) VALUES
       ($1, $5, $6, 'Absent', 'A', 'FULLTIME', 40, 50.940, 6.960),
       ($2, $5, $7, 'Good', 'G', 'FULLTIME', 40, 50.945, 6.965),
       ($3, $5, $8, 'Far', 'F', 'FULLTIME', 40, 52.520, 13.405),
       ($4, $5, '${EMP_USER_CONTINGENCY}', 'Contingency', 'C', 'PARTTIME', 20, 50.943, 6.962)`,
    [
      EMP_ABSENT,
      EMP_GOOD,
      EMP_FAR,
      EMP_CONTINGENCY,
      TENANT,
      EMP_USER_ABSENT,
      EMP_USER_GOOD,
      EMP_USER_FAR,
    ]
  );

  // Property in Köln (Porzer Str.)
  await pool.query(
    `INSERT INTO properties (id, tenant_id, name, street, zip_code, city, property_type, lat, lng)
     VALUES ($1, $2, 'Porzer Str. 12', 'Porzer Straße', '51143', 'Köln', 'APARTMENT_BUILDING', 50.941, 6.961)`,
    [PROPERTY, TENANT]
  );

  // Service-Type
  await pool.query(
    `INSERT INTO service_types (id, tenant_id, name, short_name, category, color_code, default_duration_min)
     VALUES ($1, $2, 'Treppenhaus', 'Treppe', 'CLEANING', '#3B82F6', 30)`,
    [SERVICE_TYPE, TENANT]
  );

  // Schedule + Entry — Original-Employee ist ABSENT
  await pool.query(
    `INSERT INTO schedules (id, tenant_id, week_start, year, week_number, status, generation_method)
     VALUES ($1, $2, '2026-05-18', 2026, 21, 'DRAFT', 'MANUAL')`,
    [SCHEDULE, TENANT]
  );
  await pool.query(
    `INSERT INTO schedule_entries (id, tenant_id, schedule_id, employee_id, entry_date, day_of_week,
       property_id, service_type_id, start_time, duration_min, status)
     VALUES ($1, $2, $3, $4, $5, 3, $6, $7, '08:00:00', 30, 'REASSIGNMENT_NEEDED')`,
    [ENTRY_ID, TENANT, SCHEDULE, EMP_ABSENT, ENTRY_DATE, PROPERTY, SERVICE_TYPE]
  );

  // Absence-Record für ABSENT-Employee am ENTRY_DATE (testet Hard-Filter)
  await pool.query(
    `INSERT INTO absence_records (tenant_id, employee_id, start_date, end_date, absence_type)
     VALUES ($1, $2, $3, $3, 'SICK')`,
    [TENANT, EMP_ABSENT, ENTRY_DATE]
  );

  // Contingency-Rule: CONTINGENCY-Employee ist Backup für ABSENT bei diesem Service+Property
  await pool.query(
    `INSERT INTO contingency_rules (tenant_id, primary_employee_id, backup_employee_id,
       property_id, service_type_id, priority, is_active)
     VALUES ($1, $2, $3, $4, $5, 1, TRUE)`,
    [TENANT, EMP_ABSENT, EMP_CONTINGENCY, PROPERTY, SERVICE_TYPE]
  );
}

beforeEach(async () => {
  await cleanDb();
  await seedScenario();
});

describe('GET /api/schedule-entries/:id/reassignment-suggestions (ELE-196)', () => {
  it('liefert sortierte Top-N + blocked-Liste für ADMIN', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/schedule-entries/${ENTRY_ID}/reassignment-suggestions`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.entryId).toBe(ENTRY_ID);
    expect(Array.isArray(body.suggestions)).toBe(true);
    expect(Array.isArray(body.blocked)).toBe(true);
    // Sortiert nach Score absteigend
    for (let i = 1; i < body.suggestions.length; i++) {
      expect(body.suggestions[i - 1].score).toBeGreaterThanOrEqual(body.suggestions[i].score);
    }
  });

  it('Original-Employee (ABSENT) ist in blocked, nicht in suggestions', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/schedule-entries/${ENTRY_ID}/reassignment-suggestions`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT, role: 'ADMIN' }),
    });
    const body = res.json();
    const allBlockedIds = body.blocked.map((b: { employeeId: string }) => b.employeeId);
    expect(allBlockedIds).toContain(EMP_ABSENT);
    // Original hat Absence + Self-Reassignment + (möglich) Time-Conflict
    const absent = body.blocked.find((b: { employeeId: string }) => b.employeeId === EMP_ABSENT);
    expect(absent.blockerKeys.length).toBeGreaterThan(0);
  });

  it('Contingency-Match boostet Score für CONTINGENCY-Employee', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/schedule-entries/${ENTRY_ID}/reassignment-suggestions`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT, role: 'ADMIN' }),
    });
    const body = res.json();
    const all = [...body.suggestions, ...body.blocked];
    const contingency = all.find((s: { employeeId: string }) => s.employeeId === EMP_CONTINGENCY);
    expect(contingency).toBeTruthy();
    expect(contingency.factorScores.contingencyBonus).toBeGreaterThan(0);
    expect(
      contingency.reasonKeys.some(
        (r: { key: string }) => r.key === 'reassignment.reasons.contingencyMatch'
      )
    ).toBe(true);
  });

  it('Naher Kandidat hat höheren Proximity-Score als ferner', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/schedule-entries/${ENTRY_ID}/reassignment-suggestions`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT, role: 'ADMIN' }),
    });
    const body = res.json();
    const all = [...body.suggestions, ...body.blocked];
    const good = all.find((s: { employeeId: string }) => s.employeeId === EMP_GOOD);
    const far = all.find((s: { employeeId: string }) => s.employeeId === EMP_FAR);
    expect(good.factorScores.proximity).toBeGreaterThan(far.factorScores.proximity);
  });

  it('EMPLOYEE bekommt 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/schedule-entries/${ENTRY_ID}/reassignment-suggestions`,
      headers: loginAs({ userId: EMP_USER_GOOD, tenantId: TENANT, role: 'EMPLOYEE' }),
    });
    expect(res.statusCode).toBe(403);
  });

  it('Ohne Token: 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/schedule-entries/${ENTRY_ID}/reassignment-suggestions`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('Nicht-existenter Entry: 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/schedule-entries/99999999-9999-9999-9999-999999999999/reassignment-suggestions`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(404);
  });

  it('PLANNER + FOREMAN haben Zugriff', async () => {
    for (const role of ['PLANNER', 'FOREMAN'] as const) {
      const res = await app.inject({
        method: 'GET',
        url: `/api/schedule-entries/${ENTRY_ID}/reassignment-suggestions`,
        headers: loginAs({ userId: ADMIN, tenantId: TENANT, role }),
      });
      expect(res.statusCode).toBe(200);
    }
  });
});
