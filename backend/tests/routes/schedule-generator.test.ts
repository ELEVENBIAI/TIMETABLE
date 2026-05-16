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
let EMP_LOW_HOURS: string;
let PROPERTY_ID: string;
let SERVICE_TYPE_ID: string;
let WASTE_SERVICE_TYPE_ID: string;
let TEMPLATE_ID: string;

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
  // Mitarbeiter mit großzügiger Stundenzahl
  const e = await pool.query<{ id: string }>(
    `INSERT INTO employees (tenant_id, first_name, last_name, employee_type, weekly_hours)
     VALUES ($1, 'Anna', 'A', 'FULLTIME', 40.0) RETURNING id`,
    [TENANT_A]
  );
  EMP_ID = e.rows[0].id;
  // Mitarbeiter mit wenig Stunden (für OVERLOAD-Test)
  const e2 = await pool.query<{ id: string }>(
    `INSERT INTO employees (tenant_id, first_name, last_name, employee_type, weekly_hours)
     VALUES ($1, 'Berta', 'B', 'PARTTIME', 5.0) RETURNING id`,
    [TENANT_A]
  );
  EMP_LOW_HOURS = e2.rows[0].id;
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
  const ws = await pool.query<{ id: string }>(
    `INSERT INTO service_types (tenant_id, name, short_name, category, color_code, default_duration_min)
     VALUES ($1, 'Müll', 'M', 'WASTE', '#666666', 10) RETURNING id`,
    [TENANT_A]
  );
  WASTE_SERVICE_TYPE_ID = ws.rows[0].id;
  void WASTE_SERVICE_TYPE_ID; // genutzt indirekt durch Generator
  const t = await pool.query<{ id: string }>(
    `INSERT INTO schedule_templates (tenant_id, name, created_by)
     VALUES ($1, 'Standard-Woche', $2) RETURNING id`,
    [TENANT_A, ADMIN]
  );
  TEMPLATE_ID = t.rows[0].id;
});

const planner = () => loginAs({ userId: PLANNER, tenantId: TENANT_A, role: 'PLANNER' });

async function addTemplateEntry(
  employeeId: string,
  dayOfWeek: number,
  startTime: string,
  durationMin: number
): Promise<void> {
  const pool = getOwnerPool();
  await pool.query(
    `INSERT INTO template_entries (
       tenant_id, template_id, employee_id, day_of_week, property_id, service_type_id,
       start_time, duration_min
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      TENANT_A,
      TEMPLATE_ID,
      employeeId,
      dayOfWeek,
      PROPERTY_ID,
      SERVICE_TYPE_ID,
      startTime,
      durationMin,
    ]
  );
}

describe('POST /api/schedules/generate', () => {
  it('EMPLOYEE → 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedules/generate',
      headers: loginAs({ userId: EMP_USER, tenantId: TENANT_A, role: 'EMPLOYEE' }),
      payload: {
        templateId: TEMPLATE_ID,
        weekStart: '2026-05-18',
        weekNumber: 21,
        year: 2026,
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it('Unbekanntes Template → 404', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedules/generate',
      headers: planner(),
      payload: {
        templateId: '99999999-9999-9999-9999-999999999999',
        weekStart: '2026-05-18',
        weekNumber: 21,
        year: 2026,
      },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.messageKey).toBe('errors.templateNotFound');
  });

  it('Leeres Template → DRAFT-Plan ohne Entries, keine Warnings', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedules/generate',
      headers: planner(),
      payload: {
        templateId: TEMPLATE_ID,
        weekStart: '2026-05-18',
        weekNumber: 21,
        year: 2026,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.schedule.status).toBe('DRAFT');
    expect(body.schedule.generation_method).toBe('FROM_TEMPLATE');
    expect(body.entries).toEqual([]);
    expect(body.warnings).toEqual([]);
    expect(body.stats.totalEntries).toBe(0);
  });

  it('Doppel-Generierung gleicher Woche → 409 DUPLICATE_WEEK', async () => {
    const payload = {
      templateId: TEMPLATE_ID,
      weekStart: '2026-05-18',
      weekNumber: 21,
      year: 2026,
    };
    const first = await app.inject({
      method: 'POST',
      url: '/api/schedules/generate',
      headers: planner(),
      payload,
    });
    expect(first.statusCode).toBe(201);
    const second = await app.inject({
      method: 'POST',
      url: '/api/schedules/generate',
      headers: planner(),
      payload,
    });
    expect(second.statusCode).toBe(409);
    expect(second.json().error.code).toBe('DUPLICATE_WEEK');
  });

  it('Template-Entries werden zu Schedule-Entries; status PLANNED', async () => {
    await addTemplateEntry(EMP_ID, 1, '08:00', 60); // Mo 08:00
    await addTemplateEntry(EMP_ID, 4, '10:00', 90); // Do 10:00
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedules/generate',
      headers: planner(),
      payload: {
        templateId: TEMPLATE_ID,
        weekStart: '2026-05-18',
        weekNumber: 21,
        year: 2026,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.entries).toHaveLength(2);
    expect(body.entries.every((e: { status: string }) => e.status === 'PLANNED')).toBe(true);
    // Datums-Mapping: Mo+Do der Woche
    const dates = body.entries.map((e: { entry_date: string }) => e.entry_date).sort();
    expect(dates).toEqual(['2026-05-18', '2026-05-21']);
  });

  it('OVERLOAD: PARTTIME 5h + 10h Plan → Warning', async () => {
    // 10 Entries à 60 Min = 600 Min = 10h für Berta (5h Kapazität)
    for (let day = 1; day <= 5; day++) {
      await addTemplateEntry(EMP_LOW_HOURS, day, '08:00', 60);
      await addTemplateEntry(EMP_LOW_HOURS, day, '10:00', 60);
    }
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedules/generate',
      headers: planner(),
      payload: {
        templateId: TEMPLATE_ID,
        weekStart: '2026-05-18',
        weekNumber: 21,
        year: 2026,
      },
    });
    expect(res.statusCode).toBe(201);
    const overload = res.json().warnings.find((w: { code: string }) => w.code === 'OVERLOAD');
    expect(overload).toBeDefined();
    expect(overload.vars.employeeId).toBe(EMP_LOW_HOURS);
    expect(overload.vars.plannedMin).toBe(600);
    expect(overload.vars.capacityMin).toBe(300);
  });

  it('ABSENCE: Krank am Dienstag → Entry REASSIGNMENT_NEEDED + ABSENCE-Warning', async () => {
    await addTemplateEntry(EMP_ID, 2, '08:00', 60); // Di
    const pool = getOwnerPool();
    await pool.query(
      `INSERT INTO absence_records (tenant_id, employee_id, absence_type, start_date, end_date)
       VALUES ($1, $2, 'SICK', '2026-05-19', '2026-05-19')`,
      [TENANT_A, EMP_ID]
    );
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedules/generate',
      headers: planner(),
      payload: {
        templateId: TEMPLATE_ID,
        weekStart: '2026-05-18',
        weekNumber: 21,
        year: 2026,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.entries[0].status).toBe('REASSIGNMENT_NEEDED');
    expect(body.entries[0].reassignment_reason).toBe('SICK');
    const abs = body.warnings.find((w: { code: string }) => w.code === 'ABSENCE');
    expect(abs).toBeDefined();
  });

  it('QUALIFICATION_EXPIRY: Quali läuft in 10 Tagen ab → Warning', async () => {
    await addTemplateEntry(EMP_ID, 1, '08:00', 60);
    const pool = getOwnerPool();
    const q = await pool.query<{ id: string }>(
      `INSERT INTO qualification_types (tenant_id, code, name)
       VALUES ($1, 'WINTER', 'Winterdienst') RETURNING id`,
      [TENANT_A]
    );
    await pool.query(
      `INSERT INTO employee_qualifications (tenant_id, employee_id, qualification_type_id, valid_until)
       VALUES ($1, $2, $3, '2026-05-28')`,
      [TENANT_A, EMP_ID, q.rows[0].id]
    );
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedules/generate',
      headers: planner(),
      payload: {
        templateId: TEMPLATE_ID,
        weekStart: '2026-05-18',
        weekNumber: 21,
        year: 2026,
      },
    });
    expect(res.statusCode).toBe(201);
    const exp = res
      .json()
      .warnings.find((w: { code: string }) => w.code === 'QUALIFICATION_EXPIRY');
    expect(exp).toBeDefined();
    expect(exp.vars.daysRemaining).toBe(10);
  });

  it('NO_TEMPLATE_MATCH: fälliger Property-Service ohne Template-Entry → Warning', async () => {
    const pool = getOwnerPool();
    // Property-Service ohne passendes Template-Entry
    await pool.query(
      `INSERT INTO property_services (
         tenant_id, property_id, service_type_id, frequency, frequency_detail, estimated_duration_min
       ) VALUES ($1, $2, $3, 'WEEKLY', '{"dayOfWeek":1}'::jsonb, 30)`,
      [TENANT_A, PROPERTY_ID, SERVICE_TYPE_ID]
    );
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedules/generate',
      headers: planner(),
      payload: {
        templateId: TEMPLATE_ID,
        weekStart: '2026-05-18',
        weekNumber: 21,
        year: 2026,
      },
    });
    expect(res.statusCode).toBe(201);
    const noMatch = res
      .json()
      .warnings.find((w: { code: string }) => w.code === 'NO_TEMPLATE_MATCH');
    expect(noMatch).toBeDefined();
  });

  it('WASTE: ein Abfuhrtermin generiert 2 Entries (raus + rein)', async () => {
    const pool = getOwnerPool();
    const wbt = await pool.query<{ id: string }>(
      `INSERT INTO waste_bin_types (tenant_id, code, name)
       VALUES ($1, 'RESIDUAL', 'Restmüll') RETURNING id`,
      [TENANT_A]
    );
    // Abfuhr am Dienstag (2026-05-19) → raus am Mo 18., rein am Mi 20.
    await pool.query(
      `INSERT INTO waste_schedules (
         tenant_id, property_id, waste_bin_type_id, collection_days,
         latest_put_out, earliest_take_in, location_description
       ) VALUES ($1, $2, $3, '{"daysOfWeek":[2],"frequency":"WEEKLY"}'::jsonb,
                 '18:00', '08:00', 'Hinterhof')`,
      [TENANT_A, PROPERTY_ID, wbt.rows[0].id]
    );
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedules/generate',
      headers: planner(),
      payload: {
        templateId: TEMPLATE_ID,
        weekStart: '2026-05-18',
        weekNumber: 21,
        year: 2026,
      },
    });
    expect(res.statusCode).toBe(201);
    const wasteEntries = res
      .json()
      .entries.filter((e: { is_extra: boolean }) => e.is_extra === true);
    expect(wasteEntries).toHaveLength(2);
    const dates = wasteEntries.map((e: { entry_date: string }) => e.entry_date).sort();
    expect(dates).toEqual(['2026-05-18', '2026-05-20']);
  });
});
