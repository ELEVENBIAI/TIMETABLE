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
let PROPERTY_ID: string;
let SERVICE_TYPE_ID: string;
let WBT_ID: string;

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
    [ADMIN, PLANNER, EMP, TENANT_A]
  );
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
  const w = await pool.query<{ id: string }>(
    `INSERT INTO waste_bin_types (tenant_id, code, name) VALUES ($1, 'RESIDUAL', 'Residual')
     RETURNING id`,
    [TENANT_A]
  );
  WBT_ID = w.rows[0].id;
});

describe('GET /api/due-services', () => {
  it('ohne weekStart → 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/due-services',
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(400);
  });

  it('als EMPLOYEE → 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/due-services?weekStart=2026-05-18',
      headers: loginAs({ userId: EMP, tenantId: TENANT_A, role: 'EMPLOYEE' }),
    });
    expect(res.statusCode).toBe(403);
  });

  it('PLANNER mit gemischten Frequenzen → korrekte due-Liste', async () => {
    const pool = getOwnerPool();
    // WEEKLY am Montag
    await pool.query(
      `INSERT INTO property_services (tenant_id, property_id, service_type_id, frequency, frequency_detail, estimated_duration_min)
       VALUES ($1, $2, $3, 'WEEKLY', '{"dayOfWeek":1}'::jsonb, 30)`,
      [TENANT_A, PROPERTY_ID, SERVICE_TYPE_ID]
    );
    // ON_DEMAND (sollte NICHT auftauchen)
    await pool.query(
      `INSERT INTO property_services (tenant_id, property_id, service_type_id, frequency, frequency_detail, estimated_duration_min)
       VALUES ($1, $2, $3, 'ON_DEMAND', '{}'::jsonb, 30)`,
      [TENANT_A, PROPERTY_ID, SERVICE_TYPE_ID]
    );
    // Waste WEEKLY Dienstag
    await pool.query(
      `INSERT INTO waste_schedules (tenant_id, property_id, waste_bin_type_id, collection_days, location_description)
       VALUES ($1, $2, $3, '{"daysOfWeek":[2],"frequency":"WEEKLY"}'::jsonb, 'Hof')`,
      [TENANT_A, PROPERTY_ID, WBT_ID]
    );

    const res = await app.inject({
      method: 'GET',
      url: '/api/due-services?weekStart=2026-05-18',
      headers: loginAs({ userId: PLANNER, tenantId: TENANT_A, role: 'PLANNER' }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.isoWeek).toBe(21);
    expect(body.year).toBe(2026);
    expect(body.dueServices).toHaveLength(1);
    expect(body.dueServices[0].dates).toEqual(['2026-05-18']);
    expect(body.dueWasteSchedules).toHaveLength(1);
    expect(body.dueWasteSchedules[0].events[0]).toEqual({
      collectionDate: '2026-05-19',
      putOutDate: '2026-05-18',
      takeInDate: '2026-05-20',
    });
  });
});
