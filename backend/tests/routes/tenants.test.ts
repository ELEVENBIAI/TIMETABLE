import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { cleanDb, getConnectionUri, getOwnerPool } from '../helpers/db.js';
import { loginAs } from '../helpers/loginAs.js';

process.env.JWT_SECRET ??= 'a'.repeat(64);
process.env.NODE_ENV = 'test';

let app: FastifyInstance;

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';
const ADMIN_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const EMP_A = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const SUPER = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

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
       ($1, 'Tenant A', 'tenant-a', 'GEPARD'),
       ($2, 'Tenant B', 'tenant-b', 'PAUL')`,
    [TENANT_A, TENANT_B]
  );
  await pool.query(
    `INSERT INTO users (id, tenant_id, email, password_hash, display_name, role, is_super_admin)
     VALUES
       ($1, $4, 'admin-a@test.local', 'x', 'Admin A', 'ADMIN', FALSE),
       ($2, $4, 'emp-a@test.local', 'x', 'Emp A', 'EMPLOYEE', FALSE),
       ($3, $4, 'super@test.local', 'x', 'Super', 'SUPER_ADMIN', TRUE)`,
    [ADMIN_A, EMP_A, SUPER, TENANT_A]
  );
});

describe('GET /api/tenants', () => {
  it('liefert eigenen Tenant für ADMIN', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/tenants',
      headers: loginAs({ userId: ADMIN_A, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.tenants).toHaveLength(1);
    expect(body.tenants[0].id).toBe(TENANT_A);
  });

  it('liefert alle Tenants für SUPER_ADMIN', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/tenants',
      headers: loginAs({
        userId: SUPER,
        tenantId: TENANT_A,
        role: 'SUPER_ADMIN',
        isSuperAdmin: true,
      }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().tenants).toHaveLength(2);
  });

  it('lehnt unauthorisierten Request ab (401)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tenants' });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/tenants/:id', () => {
  it('verweigert Cross-Tenant-Read für ADMIN (403)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/tenants/${TENANT_B}`,
      headers: loginAs({ userId: ADMIN_A, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(403);
  });

  it('erlaubt Cross-Tenant-Read für SUPER_ADMIN', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/tenants/${TENANT_B}`,
      headers: loginAs({
        userId: SUPER,
        tenantId: TENANT_A,
        role: 'SUPER_ADMIN',
        isSuperAdmin: true,
      }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(TENANT_B);
  });
});

describe('PUT /api/tenants/:id', () => {
  it('ADMIN kann eigenen Tenant updaten', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/tenants/${TENANT_A}`,
      headers: loginAs({ userId: ADMIN_A, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { name: 'Tenant A Neu', timezone: 'Europe/Vienna' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('Tenant A Neu');
    expect(res.json().timezone).toBe('Europe/Vienna');
  });

  it('EMPLOYEE bekommt 403 bei Update', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/tenants/${TENANT_A}`,
      headers: loginAs({ userId: EMP_A, tenantId: TENANT_A, role: 'EMPLOYEE' }),
      payload: { name: 'Hack' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('ADMIN bekommt 403 bei Cross-Tenant-Update', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/tenants/${TENANT_B}`,
      headers: loginAs({ userId: ADMIN_A, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { name: 'Hack' },
    });
    expect(res.statusCode).toBe(403);
  });
});
