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
let PROPERTY_ID: string;
let BIN_TYPE_ID: string;
let PROPERTY_B: string;
let BIN_TYPE_B: string;

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
     VALUES ($1, $2, 'a@x', 'x', 'A', 'ADMIN')`,
    [ADMIN, TENANT_A]
  );
  const p = await pool.query<{ id: string }>(
    `INSERT INTO properties (tenant_id, name, street, zip_code, city, property_type)
     VALUES ($1, 'P', 'S', '1', 'X', 'APARTMENT_BUILDING') RETURNING id`,
    [TENANT_A]
  );
  PROPERTY_ID = p.rows[0].id;
  const bt = await pool.query<{ id: string }>(
    `INSERT INTO waste_bin_types (tenant_id, code, name)
     VALUES ($1, 'RESIDUAL', 'Restmüll') RETURNING id`,
    [TENANT_A]
  );
  BIN_TYPE_ID = bt.rows[0].id;
  // Cross-Tenant Property + BinType für USER_TENANT_MISMATCH-Tests
  const pb = await pool.query<{ id: string }>(
    `INSERT INTO properties (tenant_id, name, street, zip_code, city, property_type)
     VALUES ($1, 'PB', 'S', '1', 'X', 'APARTMENT_BUILDING') RETURNING id`,
    [TENANT_B]
  );
  PROPERTY_B = pb.rows[0].id;
  const btb = await pool.query<{ id: string }>(
    `INSERT INTO waste_bin_types (tenant_id, code, name)
     VALUES ($1, 'PAPER', 'Papier') RETURNING id`,
    [TENANT_B]
  );
  BIN_TYPE_B = btb.rows[0].id;
});

const auth = () => loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' });

describe('Waste-Schedules CRUD', () => {
  it('POST WEEKLY mit daysOfWeek → 201, collection_days roundtripped', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/waste-schedules',
      headers: auth(),
      payload: {
        propertyId: PROPERTY_ID,
        wasteBinTypeId: BIN_TYPE_ID,
        collectionDays: { daysOfWeek: [2], frequency: 'WEEKLY' },
        latestPutOut: '06:00',
        earliestTakeIn: '20:00',
        binCount: 3,
        locationDescription: 'Hinterhof links',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().collection_days).toEqual({ daysOfWeek: [2], frequency: 'WEEKLY' });
    expect(res.json().bin_count).toBe(3);
    expect(res.json().location_description).toBe('Hinterhof links');
  });

  it('POST BIWEEKLY ohne even/oddWeeks → 400 invalidCollectionDays', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/waste-schedules',
      headers: auth(),
      payload: {
        propertyId: PROPERTY_ID,
        wasteBinTypeId: BIN_TYPE_ID,
        collectionDays: { daysOfWeek: [3], frequency: 'BIWEEKLY' },
        locationDescription: 'X',
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.messageKey).toBe('errors.invalidCollectionDays');
  });

  it('POST BIWEEKLY mit oddWeeks=true → 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/waste-schedules',
      headers: auth(),
      payload: {
        propertyId: PROPERTY_ID,
        wasteBinTypeId: BIN_TYPE_ID,
        collectionDays: { daysOfWeek: [4], frequency: 'BIWEEKLY', oddWeeks: true },
        locationDescription: 'Hof rechts',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().collection_days).toEqual({
      daysOfWeek: [4],
      frequency: 'BIWEEKLY',
      oddWeeks: true,
    });
  });

  it('POST ohne locationDescription → 400 (Pflicht laut Spec)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/waste-schedules',
      headers: auth(),
      payload: {
        propertyId: PROPERTY_ID,
        wasteBinTypeId: BIN_TYPE_ID,
        collectionDays: { daysOfWeek: [1], frequency: 'WEEKLY' },
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST mit Property aus fremdem Tenant → 404 propertyNotFound', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/waste-schedules',
      headers: auth(),
      payload: {
        propertyId: PROPERTY_B,
        wasteBinTypeId: BIN_TYPE_ID,
        collectionDays: { daysOfWeek: [1], frequency: 'WEEKLY' },
        locationDescription: 'X',
      },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.messageKey).toBe('errors.propertyNotFound');
  });

  it('POST mit Waste-Bin-Type aus fremdem Tenant → 404 wasteBinTypeNotFound', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/waste-schedules',
      headers: auth(),
      payload: {
        propertyId: PROPERTY_ID,
        wasteBinTypeId: BIN_TYPE_B,
        collectionDays: { daysOfWeek: [1], frequency: 'WEEKLY' },
        locationDescription: 'X',
      },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.messageKey).toBe('errors.wasteBinTypeNotFound');
  });

  it('GET ?propertyId filter', async () => {
    const pool = getOwnerPool();
    await pool.query(
      `INSERT INTO waste_schedules (tenant_id, property_id, waste_bin_type_id, collection_days, location_description)
       VALUES ($1, $2, $3, '{"daysOfWeek":[1],"frequency":"WEEKLY"}'::jsonb, 'Hof')`,
      [TENANT_A, PROPERTY_ID, BIN_TYPE_ID]
    );
    const res = await app.inject({
      method: 'GET',
      url: `/api/waste-schedules?propertyId=${PROPERTY_ID}`,
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().wasteSchedules).toHaveLength(1);
  });

  it('PUT: latest_put_out anpassen', async () => {
    const pool = getOwnerPool();
    const r = await pool.query<{ id: string }>(
      `INSERT INTO waste_schedules (tenant_id, property_id, waste_bin_type_id, collection_days, location_description)
       VALUES ($1, $2, $3, '{"daysOfWeek":[1],"frequency":"WEEKLY"}'::jsonb, 'Hof') RETURNING id`,
      [TENANT_A, PROPERTY_ID, BIN_TYPE_ID]
    );
    const res = await app.inject({
      method: 'PUT',
      url: `/api/waste-schedules/${r.rows[0].id}`,
      headers: auth(),
      payload: { latestPutOut: '07:30' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().latest_put_out).toBe('07:30:00');
  });
});
