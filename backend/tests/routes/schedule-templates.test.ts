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
});

const planner = () => loginAs({ userId: PLANNER, tenantId: TENANT_A, role: 'PLANNER' });
const admin = () => loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' });
const emp = () => loginAs({ userId: EMP_USER, tenantId: TENANT_A, role: 'EMPLOYEE' });

describe('Schedule-Templates CRUD', () => {
  it('POST PLANNER → 201, then GET liefert Template', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/schedule-templates',
      headers: planner(),
      payload: {
        name: 'Sommer-Default',
        isDefault: true,
        validFrom: '2026-04-01',
        validUntil: '2026-09-30',
      },
    });
    expect(create.statusCode).toBe(201);
    expect(create.json().is_default).toBe(true);

    const list = await app.inject({
      method: 'GET',
      url: '/api/schedule-templates',
      headers: planner(),
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().scheduleTemplates).toHaveLength(1);
  });

  it('POST EMPLOYEE → 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedule-templates',
      headers: emp(),
      payload: { name: 'X' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('POST is_default mit überlappendem Range → 409 DEFAULT_TEMPLATE_CONFLICT', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/schedule-templates',
      headers: planner(),
      payload: {
        name: 'Sommer',
        isDefault: true,
        validFrom: '2026-04-01',
        validUntil: '2026-09-30',
      },
    });
    const conflict = await app.inject({
      method: 'POST',
      url: '/api/schedule-templates',
      headers: planner(),
      payload: {
        name: 'Sommer-2',
        isDefault: true,
        validFrom: '2026-08-01',
        validUntil: '2026-12-31',
      },
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().error.code).toBe('DEFAULT_TEMPLATE_CONFLICT');
  });

  it('POST is_default disjunkt → 201 (kein Konflikt)', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/schedule-templates',
      headers: planner(),
      payload: {
        name: 'Sommer',
        isDefault: true,
        validFrom: '2026-04-01',
        validUntil: '2026-09-30',
      },
    });
    const ok = await app.inject({
      method: 'POST',
      url: '/api/schedule-templates',
      headers: planner(),
      payload: {
        name: 'Winter',
        isDefault: true,
        validFrom: '2026-10-01',
        validUntil: '2027-03-31',
      },
    });
    expect(ok.statusCode).toBe(201);
  });

  it('DELETE blockiert wenn Schedule referenziert → 409 IN_USE', async () => {
    const tpl = await app.inject({
      method: 'POST',
      url: '/api/schedule-templates',
      headers: planner(),
      payload: { name: 'X' },
    });
    const tplId = tpl.json().id;
    const pool = getOwnerPool();
    await pool.query(
      `INSERT INTO schedules (tenant_id, week_start, week_number, year, status, template_id, created_by)
       VALUES ($1, '2026-05-18', 21, 2026, 'DRAFT', $2, $3)`,
      [TENANT_A, tplId, ADMIN]
    );
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/schedule-templates/${tplId}`,
      headers: admin(),
    });
    expect(del.statusCode).toBe(409);
    expect(del.json().error.code).toBe('IN_USE');
  });

  it('POST /:id/duplicate kopiert Template + Entries', async () => {
    const tpl = await app.inject({
      method: 'POST',
      url: '/api/schedule-templates',
      headers: planner(),
      payload: { name: 'Original' },
    });
    const tplId = tpl.json().id;
    await app.inject({
      method: 'POST',
      url: '/api/template-entries',
      headers: planner(),
      payload: {
        templateId: tplId,
        employeeId: EMP_ID,
        dayOfWeek: 1,
        propertyId: PROPERTY_ID,
        serviceTypeId: SERVICE_TYPE_ID,
        startTime: '08:00',
        durationMin: 30,
      },
    });
    const dup = await app.inject({
      method: 'POST',
      url: `/api/schedule-templates/${tplId}/duplicate`,
      headers: planner(),
      payload: { name: 'Copy' },
    });
    expect(dup.statusCode).toBe(201);
    expect(dup.json().template.name).toBe('Copy');
    expect(dup.json().template.is_default).toBe(false);
    expect(dup.json().copiedEntries).toBe(1);
  });

  it('GET ?validForDate filtert nach Gültigkeit', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/schedule-templates',
      headers: planner(),
      payload: { name: 'Sommer', validFrom: '2026-04-01', validUntil: '2026-09-30' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/schedule-templates',
      headers: planner(),
      payload: { name: 'Winter', validFrom: '2026-10-01', validUntil: '2027-03-31' },
    });
    const r = await app.inject({
      method: 'GET',
      url: '/api/schedule-templates?validForDate=2026-06-15',
      headers: planner(),
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().scheduleTemplates).toHaveLength(1);
    expect(r.json().scheduleTemplates[0].name).toBe('Sommer');
  });
});
