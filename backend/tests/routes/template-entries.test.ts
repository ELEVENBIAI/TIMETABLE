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
const PLANNER = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
let TEMPLATE_ID: string;
let EMP_ID: string;
let PROPERTY_ID: string;
let SERVICE_TYPE_ID: string;
let CROSS_TENANT_EMP_ID: string;

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
    `INSERT INTO tenants (id, name, slug, brand) VALUES ($1, 'A', 'a', 'GEPARD'), ($2, 'B', 'b', 'GEPARD')`,
    [TENANT_A, TENANT_B]
  );
  await pool.query(
    `INSERT INTO users (id, tenant_id, email, password_hash, display_name, role)
     VALUES ($1, $3, 'a@x', 'x', 'A', 'ADMIN'), ($2, $3, 'p@x', 'x', 'P', 'PLANNER')`,
    [ADMIN, PLANNER, TENANT_A]
  );
  const tpl = await pool.query<{ id: string }>(
    `INSERT INTO schedule_templates (tenant_id, name) VALUES ($1, 'T') RETURNING id`,
    [TENANT_A]
  );
  TEMPLATE_ID = tpl.rows[0].id;
  const e = await pool.query<{ id: string }>(
    `INSERT INTO employees (tenant_id, first_name, last_name, employee_type)
     VALUES ($1, 'Anna', 'A', 'FULLTIME') RETURNING id`,
    [TENANT_A]
  );
  EMP_ID = e.rows[0].id;
  const eCross = await pool.query<{ id: string }>(
    `INSERT INTO employees (tenant_id, first_name, last_name, employee_type)
     VALUES ($1, 'Other', 'O', 'FULLTIME') RETURNING id`,
    [TENANT_B]
  );
  CROSS_TENANT_EMP_ID = eCross.rows[0].id;
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

const baseEntry = () => ({
  templateId: TEMPLATE_ID,
  employeeId: EMP_ID,
  dayOfWeek: 1,
  propertyId: PROPERTY_ID,
  serviceTypeId: SERVICE_TYPE_ID,
  startTime: '08:00',
  durationMin: 60,
});

describe('Template-Entries CRUD', () => {
  it('POST PLANNER → 201, GET ?templateId filtert', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/template-entries',
      headers: planner(),
      payload: baseEntry(),
    });
    expect(create.statusCode).toBe(201);
    const list = await app.inject({
      method: 'GET',
      url: `/api/template-entries?templateId=${TEMPLATE_ID}`,
      headers: planner(),
    });
    expect(list.json().templateEntries).toHaveLength(1);
  });

  it('POST mit Cross-Tenant-Employee → 404 employeeNotFound', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/template-entries',
      headers: planner(),
      payload: { ...baseEntry(), employeeId: CROSS_TENANT_EMP_ID },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.messageKey).toBe('errors.employeeNotFound');
  });

  it('PUT updated start_time und dayOfWeek', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/template-entries',
      headers: planner(),
      payload: baseEntry(),
    });
    const id = create.json().id;
    const upd = await app.inject({
      method: 'PUT',
      url: `/api/template-entries/${id}`,
      headers: planner(),
      payload: { startTime: '14:30', dayOfWeek: 3 },
    });
    expect(upd.statusCode).toBe(200);
    expect(upd.json().start_time).toBe('14:30:00');
    expect(upd.json().day_of_week).toBe(3);
  });

  it('DELETE → 204, dann GET → 404', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/template-entries',
      headers: planner(),
      payload: baseEntry(),
    });
    const id = create.json().id;
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/template-entries/${id}`,
      headers: planner(),
    });
    expect(del.statusCode).toBe(204);
    const g = await app.inject({
      method: 'GET',
      url: `/api/template-entries/${id}`,
      headers: planner(),
    });
    expect(g.statusCode).toBe(404);
  });
});
