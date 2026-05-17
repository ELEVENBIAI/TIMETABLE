import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { cleanDb, getConnectionUri, getOwnerPool } from '../helpers/db.js';
import { loginAs } from '../helpers/loginAs.js';
import { hashPassword, comparePassword } from '../../src/auth/password.js';

process.env.JWT_SECRET ??= 'a'.repeat(64);
process.env.NODE_ENV = 'test';

let app: FastifyInstance;

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';
const ADMIN_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const EMP_A = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const ADMIN_B = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const SUPER = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const KNOWN_PW = 'TestPw1!';

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
  const hash = await hashPassword(KNOWN_PW);
  await pool.query(
    `INSERT INTO users (id, tenant_id, email, password_hash, display_name, role, is_super_admin)
     VALUES
       ($1, $5, 'admin-a@test.local', $6, 'Admin A', 'ADMIN', FALSE),
       ($2, $5, 'emp-a@test.local', $6, 'Emp A', 'EMPLOYEE', FALSE),
       ($3, $7, 'admin-b@test.local', $6, 'Admin B', 'ADMIN', FALSE),
       ($4, $5, 'super@test.local', $6, 'Super', 'SUPER_ADMIN', TRUE)`,
    [ADMIN_A, EMP_A, ADMIN_B, SUPER, TENANT_A, hash, TENANT_B]
  );
});

describe('POST /api/users', () => {
  it('EMPLOYEE bekommt 403 beim Anlegen', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/users',
      headers: loginAs({ userId: EMP_A, tenantId: TENANT_A, role: 'EMPLOYEE' }),
      payload: {
        email: 'new@test.local',
        password: 'Strong1Pw',
        displayName: 'Neu',
        role: 'PLANNER',
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it('ADMIN kann User anlegen + Passwort wird gehasht', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/users',
      headers: loginAs({ userId: ADMIN_A, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: {
        email: 'planner@test.local',
        password: 'Strong1Pw',
        displayName: 'Planner',
        role: 'PLANNER',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.email).toBe('planner@test.local');
    expect(body.role).toBe('PLANNER');
    expect(body.locale).toBe('en');
    // Hash kontrollieren
    const pool = getOwnerPool();
    const r = await pool.query<{ password_hash: string }>(
      `SELECT password_hash FROM users WHERE email = 'planner@test.local'`
    );
    expect(r.rows[0].password_hash).not.toBe('Strong1Pw');
    expect(await comparePassword('Strong1Pw', r.rows[0].password_hash)).toBe(true);
  });

  it('lehnt zu schwaches Passwort ab (400 + passwordPolicy)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/users',
      headers: loginAs({ userId: ADMIN_A, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: {
        email: 'weak@test.local',
        password: 'weakpw',
        displayName: 'Weak',
        role: 'PLANNER',
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.messageKey).toBe('errors.passwordPolicy');
  });

  it('Email-Duplicate liefert 409', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/users',
      headers: loginAs({ userId: ADMIN_A, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: {
        email: 'admin-a@test.local', // existiert bereits
        password: 'Strong1Pw',
        displayName: 'Dup',
        role: 'PLANNER',
      },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('EMAIL_EXISTS');
  });
});

describe('GET /api/users', () => {
  it('ADMIN sieht alle eigenen Tenant-User', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/users',
      headers: loginAs({ userId: ADMIN_A, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(200);
    const { users } = res.json();
    // 3 User in Tenant A: ADMIN_A, EMP_A, SUPER
    expect(users.length).toBe(3);
    expect(users.every((u: { tenant_id: string }) => u.tenant_id === TENANT_A)).toBe(true);
  });

  it('EMPLOYEE sieht nur sich selbst', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/users',
      headers: loginAs({ userId: EMP_A, tenantId: TENANT_A, role: 'EMPLOYEE' }),
    });
    expect(res.statusCode).toBe(200);
    const { users } = res.json();
    expect(users).toHaveLength(1);
    expect(users[0].id).toBe(EMP_A);
  });
});

describe('PUT /api/users/:id', () => {
  it('Self-Update: displayName + locale erlaubt', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/users/${EMP_A}`,
      headers: loginAs({ userId: EMP_A, tenantId: TENANT_A, role: 'EMPLOYEE' }),
      payload: { displayName: 'Emp Neu', locale: 'de' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().display_name).toBe('Emp Neu');
    expect(res.json().locale).toBe('de');
  });

  it('Self-Update: role-Änderung verboten (403)', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/users/${EMP_A}`,
      headers: loginAs({ userId: EMP_A, tenantId: TENANT_A, role: 'EMPLOYEE' }),
      payload: { role: 'ADMIN' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('EMPLOYEE darf fremden User nicht updaten (403)', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/users/${ADMIN_A}`,
      headers: loginAs({ userId: EMP_A, tenantId: TENANT_A, role: 'EMPLOYEE' }),
      payload: { displayName: 'Hack' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('ADMIN darf Rolle ändern', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/users/${EMP_A}`,
      headers: loginAs({ userId: ADMIN_A, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { role: 'PLANNER' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().role).toBe('PLANNER');
  });
});

describe('DELETE /api/users/:id', () => {
  it('Self-Delete blockiert (400 SELF_DELETE_FORBIDDEN)', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/users/${ADMIN_A}`,
      headers: loginAs({ userId: ADMIN_A, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('SELF_DELETE_FORBIDDEN');
  });

  it('ADMIN kann anderen User soft-löschen', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/users/${EMP_A}`,
      headers: loginAs({ userId: ADMIN_A, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(204);

    const pool = getOwnerPool();
    const r = await pool.query<{ is_deleted: boolean }>(
      `SELECT is_deleted FROM users WHERE id = $1`,
      [EMP_A]
    );
    expect(r.rows[0].is_deleted).toBe(true);

    // GET /api/users sieht ihn nicht mehr
    const list = await app.inject({
      method: 'GET',
      url: '/api/users',
      headers: loginAs({ userId: ADMIN_A, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    const ids = list.json().users.map((u: { id: string }) => u.id);
    expect(ids).not.toContain(EMP_A);
  });

  it('ADMIN kann fremden Tenant-User nicht löschen (403)', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/users/${ADMIN_B}`,
      headers: loginAs({ userId: ADMIN_A, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('POST /api/users/:id/change-password', () => {
  it('Self mit falscher altem PW: 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/users/${ADMIN_A}/change-password`,
      headers: loginAs({ userId: ADMIN_A, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { oldPassword: 'falsch', newPassword: 'NewStrong1' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('Self mit korrektem altem PW: 200, neuer Hash funktioniert', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/users/${ADMIN_A}/change-password`,
      headers: loginAs({ userId: ADMIN_A, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { oldPassword: KNOWN_PW, newPassword: 'NewStrong1' },
    });
    expect(res.statusCode).toBe(200);
    const pool = getOwnerPool();
    const r = await pool.query<{ password_hash: string; must_change_password: boolean }>(
      `SELECT password_hash, must_change_password FROM users WHERE id = $1`,
      [ADMIN_A]
    );
    expect(await comparePassword('NewStrong1', r.rows[0].password_hash)).toBe(true);
    expect(r.rows[0].must_change_password).toBe(false);
  });

  it('Admin-Reset (anderer User, ohne oldPw): setzt must_change_password = TRUE', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/users/${EMP_A}/change-password`,
      headers: loginAs({ userId: ADMIN_A, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { newPassword: 'NewStrong1' },
    });
    expect(res.statusCode).toBe(200);
    const pool = getOwnerPool();
    const r = await pool.query<{ must_change_password: boolean }>(
      `SELECT must_change_password FROM users WHERE id = $1`,
      [EMP_A]
    );
    expect(r.rows[0].must_change_password).toBe(true);
  });

  it('lehnt schwaches neues Passwort ab (400 + passwordPolicy)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/users/${ADMIN_A}/change-password`,
      headers: loginAs({ userId: ADMIN_A, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { oldPassword: KNOWN_PW, newPassword: 'weak' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.messageKey).toBe('errors.passwordPolicy');
  });
});

describe('PATCH /api/users/me/locale', () => {
  it('User kann eigene Locale auf de setzen', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/users/me/locale',
      headers: loginAs({
        userId: EMP_A,
        tenantId: TENANT_A,
        role: 'EMPLOYEE',
        locale: 'en',
      }),
      payload: { locale: 'de' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().locale).toBe('de');
    const pool = getOwnerPool();
    const r = await pool.query<{ locale: string }>(`SELECT locale FROM users WHERE id = $1`, [
      EMP_A,
    ]);
    expect(r.rows[0].locale).toBe('de');
  });

  it('lehnt nicht-unterstützte Locale ab (400)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/users/me/locale',
      headers: loginAs({ userId: EMP_A, tenantId: TENANT_A, role: 'EMPLOYEE' }),
      payload: { locale: 'fr' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/users/me (ELE-201)', () => {
  it('liefert 401 ohne JWT', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/users/me',
    });
    expect(res.statusCode).toBe(401);
  });

  it('liefert das Self-Profile bei gültigem JWT', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/users/me',
      headers: loginAs({ userId: ADMIN_A, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({
      id: ADMIN_A,
      tenantId: TENANT_A,
      email: 'admin-a@test.local',
      displayName: 'Admin A',
      role: 'ADMIN',
      isSuperAdmin: false,
      mustChangePassword: false,
    });
    expect(body.locale).toBeTypeOf('string');
    expect(body.createdAt).toBeTypeOf('string');
    // ISO-Datums-Format
    expect(body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('liefert 401 wenn der User soft-deleted ist', async () => {
    // Soft-Delete den User direkt in der DB
    const pool = getOwnerPool();
    await pool.query(`UPDATE users SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1`, [
      ADMIN_A,
    ]);
    const res = await app.inject({
      method: 'GET',
      url: '/api/users/me',
      headers: loginAs({ userId: ADMIN_A, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
  });

  it('SUPER_ADMIN-Flag wird korrekt zurückgegeben', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/users/me',
      headers: loginAs({
        userId: SUPER,
        tenantId: TENANT_A,
        role: 'SUPER_ADMIN',
        isSuperAdmin: true,
      }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().isSuperAdmin).toBe(true);
  });
});
