import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { cleanDb, getConnectionUri, getOwnerPool } from '../helpers/db.js';
import { loginAs } from '../helpers/loginAs.js';

process.env.JWT_SECRET ??= 'a'.repeat(64);
process.env.NODE_ENV = 'test';

let app: FastifyInstance;
const TENANT_A = '11111111-1111-1111-1111-111111111111';
const ADMIN = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
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
     VALUES ($1, $2, 'a@x', 'x', 'A', 'ADMIN')`,
    [ADMIN, TENANT_A]
  );
  const p = await pool.query<{ id: string }>(
    `INSERT INTO properties (tenant_id, name, street, zip_code, city, property_type)
     VALUES ($1, 'P', 'S', '1', 'X', 'APARTMENT_BUILDING') RETURNING id`,
    [TENANT_A]
  );
  PROPERTY_ID = p.rows[0].id;
  const s = await pool.query<{ id: string }>(
    `INSERT INTO service_types (tenant_id, name, short_name, category, color_code, default_duration_min)
     VALUES ($1, 'Treppenhaus', 'TH', 'CLEANING', '#3b82f6', 30) RETURNING id`,
    [TENANT_A]
  );
  SERVICE_TYPE_ID = s.rows[0].id;
});

const auth = () => loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' });

describe('Property-Services CRUD', () => {
  it('POST WEEKLY mit dayOfWeek → 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/property-services',
      headers: auth(),
      payload: {
        propertyId: PROPERTY_ID,
        serviceTypeId: SERVICE_TYPE_ID,
        frequency: 'WEEKLY',
        frequencyDetail: { dayOfWeek: 1 },
        estimatedDurationMin: 30,
        priority: 2,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().frequency).toBe('WEEKLY');
    expect(res.json().frequency_detail).toEqual({ dayOfWeek: 1 });
  });

  it('POST WEEKLY ohne dayOfWeek/weekdays → 400 invalidFrequencyDetail', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/property-services',
      headers: auth(),
      payload: {
        propertyId: PROPERTY_ID,
        serviceTypeId: SERVICE_TYPE_ID,
        frequency: 'WEEKLY',
        frequencyDetail: {},
        estimatedDurationMin: 30,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_FREQUENCY_DETAIL');
  });

  it('POST BIWEEKLY mit oddWeek → 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/property-services',
      headers: auth(),
      payload: {
        propertyId: PROPERTY_ID,
        serviceTypeId: SERVICE_TYPE_ID,
        frequency: 'BIWEEKLY',
        frequencyDetail: { dayOfWeek: 3, oddWeek: true },
        estimatedDurationMin: 45,
      },
    });
    expect(res.statusCode).toBe(201);
  });

  it('POST MONTHLY mit weekOfMonth+dayOfWeek → 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/property-services',
      headers: auth(),
      payload: {
        propertyId: PROPERTY_ID,
        serviceTypeId: SERVICE_TYPE_ID,
        frequency: 'MONTHLY',
        frequencyDetail: { weekOfMonth: 1, dayOfWeek: 4 },
        estimatedDurationMin: 60,
      },
    });
    expect(res.statusCode).toBe(201);
  });

  it('POST ANNUAL ohne detail → 201 (leeres detail erlaubt)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/property-services',
      headers: auth(),
      payload: {
        propertyId: PROPERTY_ID,
        serviceTypeId: SERVICE_TYPE_ID,
        frequency: 'ANNUAL',
        estimatedDurationMin: 120,
      },
    });
    expect(res.statusCode).toBe(201);
  });

  it('POST mit Saison Nov→Mär (Winter-Wrap)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/property-services',
      headers: auth(),
      payload: {
        propertyId: PROPERTY_ID,
        serviceTypeId: SERVICE_TYPE_ID,
        frequency: 'WEEKLY',
        frequencyDetail: { dayOfWeek: 1 },
        estimatedDurationMin: 30,
        seasonalStart: 11,
        seasonalEnd: 3,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().seasonal_start).toBe(11);
    expect(res.json().seasonal_end).toBe(3);
  });

  it('GET ?propertyId filter', async () => {
    const pool = getOwnerPool();
    await pool.query(
      `INSERT INTO property_services (tenant_id, property_id, service_type_id, frequency, frequency_detail, estimated_duration_min)
       VALUES ($1, $2, $3, 'WEEKLY', '{"dayOfWeek":1}'::jsonb, 30)`,
      [TENANT_A, PROPERTY_ID, SERVICE_TYPE_ID]
    );
    const res = await app.inject({
      method: 'GET',
      url: `/api/property-services?propertyId=${PROPERTY_ID}`,
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().propertyServices).toHaveLength(1);
  });

  it('PUT frequency change revalidates detail', async () => {
    const pool = getOwnerPool();
    const r = await pool.query<{ id: string }>(
      `INSERT INTO property_services (tenant_id, property_id, service_type_id, frequency, frequency_detail, estimated_duration_min)
       VALUES ($1, $2, $3, 'WEEKLY', '{"dayOfWeek":1}'::jsonb, 30) RETURNING id`,
      [TENANT_A, PROPERTY_ID, SERVICE_TYPE_ID]
    );
    // Wechsel zu BIWEEKLY mit altem WEEKLY-detail (nur dayOfWeek=1) → fehlt nichts (BIWEEKLY hat oddWeek optional)
    const res = await app.inject({
      method: 'PUT',
      url: `/api/property-services/${r.rows[0].id}`,
      headers: auth(),
      payload: { frequency: 'BIWEEKLY' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().frequency).toBe('BIWEEKLY');
  });
});
