import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { cleanDb, getConnectionUri, getOwnerPool } from '../helpers/db.js';
import { loginAs } from '../helpers/loginAs.js';

process.env.JWT_SECRET ??= 'a'.repeat(64);
process.env.NODE_ENV = 'test';

let app: FastifyInstance;
const TENANT_A = '11111111-1111-1111-1111-111111111111';
const ADMIN = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
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
     VALUES ($1, $3, 'a@x', 'x', 'A', 'ADMIN'),
            ($2, $3, 'e@x', 'x', 'E', 'EMPLOYEE')`,
    [ADMIN, EMP, TENANT_A]
  );
});

describe('Properties CRUD', () => {
  it('POST EMPLOYEE → 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/properties',
      headers: loginAs({ userId: EMP, tenantId: TENANT_A, role: 'EMPLOYEE' }),
      payload: {
        name: 'Haus 1',
        street: 'Hauptstr.',
        zipCode: '69115',
        city: 'Heidelberg',
        propertyType: 'APARTMENT_BUILDING',
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it('POST ADMIN → 201, lat/lng deferred (NULL ok)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/properties',
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: {
        name: 'Anlage Süd',
        street: 'Schillerstr.',
        houseNumber: '12a',
        zipCode: '69115',
        city: 'Heidelberg',
        propertyType: 'APARTMENT_BUILDING',
        unitCount: 24,
        floorCount: 4,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().name).toBe('Anlage Süd');
    expect(res.json().lat).toBeNull();
  });

  it('POST: ungültiger property_type → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/properties',
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: {
        name: 'X',
        street: 'X',
        zipCode: '1',
        city: 'X',
        propertyType: 'SHIP',
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET ?q=anlage → ILIKE-Suche', async () => {
    const pool = getOwnerPool();
    await pool.query(
      `INSERT INTO properties (tenant_id, name, street, zip_code, city, property_type)
       VALUES ($1, 'Anlage Süd', 'A', '1', 'X', 'APARTMENT_BUILDING'),
              ($1, 'Villa', 'B', '2', 'Y', 'SINGLE_FAMILY')`,
      [TENANT_A]
    );
    const res = await app.inject({
      method: 'GET',
      url: '/api/properties?q=anlage',
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().properties).toHaveLength(1);
    expect(res.json().properties[0].name).toBe('Anlage Süd');
  });

  it('DELETE: referenziert → 409 IN_USE', async () => {
    const pool = getOwnerPool();
    const pr = await pool.query<{ id: string }>(
      `INSERT INTO properties (tenant_id, name, street, zip_code, city, property_type)
       VALUES ($1, 'P', 'S', '1', 'X', 'APARTMENT_BUILDING') RETURNING id`,
      [TENANT_A]
    );
    const sr = await pool.query<{ id: string }>(
      `INSERT INTO service_types (tenant_id, name, short_name, category, color_code, default_duration_min)
       VALUES ($1, 'X', 'X', 'CLEANING', '#000000', 30) RETURNING id`,
      [TENANT_A]
    );
    await pool.query(
      `INSERT INTO property_services (tenant_id, property_id, service_type_id, frequency, estimated_duration_min)
       VALUES ($1, $2, $3, 'WEEKLY', 30)`,
      [TENANT_A, pr.rows[0].id, sr.rows[0].id]
    );
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/properties/${pr.rows[0].id}`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(409);
  });
});

describe('Property Zones (nested)', () => {
  it('POST + GET Zones', async () => {
    const pool = getOwnerPool();
    const pr = await pool.query<{ id: string }>(
      `INSERT INTO properties (tenant_id, name, street, zip_code, city, property_type)
       VALUES ($1, 'P', 'S', '1', 'X', 'APARTMENT_BUILDING') RETURNING id`,
      [TENANT_A]
    );
    const propId = pr.rows[0].id;
    const post = await app.inject({
      method: 'POST',
      url: `/api/properties/${propId}/zones`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { name: 'Treppenhaus A', zoneType: 'STAIRCASE', floorNumber: 1, areaSqm: 80 },
    });
    expect(post.statusCode).toBe(201);
    const list = await app.inject({
      method: 'GET',
      url: `/api/properties/${propId}/zones`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(list.json().zones).toHaveLength(1);
    expect(list.json().zones[0].zone_type).toBe('STAIRCASE');
  });

  it('PUT ungültiger zone_type → 400', async () => {
    const pool = getOwnerPool();
    const pr = await pool.query<{ id: string }>(
      `INSERT INTO properties (tenant_id, name, street, zip_code, city, property_type)
       VALUES ($1, 'P', 'S', '1', 'X', 'APARTMENT_BUILDING') RETURNING id`,
      [TENANT_A]
    );
    const zr = await pool.query<{ id: string }>(
      `INSERT INTO property_zones (tenant_id, property_id, name, zone_type)
       VALUES ($1, $2, 'Z', 'STAIRCASE') RETURNING id`,
      [TENANT_A, pr.rows[0].id]
    );
    const res = await app.inject({
      method: 'PUT',
      url: `/api/properties/${pr.rows[0].id}/zones/${zr.rows[0].id}`,
      headers: loginAs({ userId: ADMIN, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { zoneType: 'POOL' },
    });
    expect(res.statusCode).toBe(400);
  });
});
