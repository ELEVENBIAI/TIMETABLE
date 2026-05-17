import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { cleanDb, getConnectionUri, getOwnerPool } from '../helpers/db.js';
import { hashPassword } from '../../src/auth/password.js';

// JWT_SECRET muss gesetzt sein BEVOR config.ts geladen wird
process.env.JWT_SECRET ??= 'a'.repeat(64);
// NODE_ENV=test deaktiviert Rate-Limit auf /api/auth/* (sequentielle Tests)
process.env.NODE_ENV = 'test';

let app: FastifyInstance;

beforeAll(async () => {
  process.env.DATABASE_URL_OWNER = getConnectionUri();
  process.env.DATABASE_URL = getConnectionUri().replace(
    'hmservice_owner:owner_test_pw',
    'hmservice_app:app_test_pw'
  );
  console.log('[BEFORE-ALL] set:', process.env.DATABASE_URL_OWNER?.substring(0, 60));
  const { closePools } = await import('../../src/db/pools.js');
  await closePools();
  const { buildApp } = await import('../../src/app.js');
  app = await buildApp();
});

afterAll(async () => {
  await app?.close();
});

beforeEach(async () => {
  // Komplett-Clean + Test-User mit echtem Hash anlegen
  await cleanDb();
  const pool = getOwnerPool();
  await pool.query(
    `INSERT INTO tenants (id, name, slug, brand)
     VALUES ('99999999-9999-9999-9999-999999999999', 'Auth-Test', 'auth-test', 'GEPARD')`
  );
  const hash = await hashPassword('TestPw1!');
  await pool.query(
    `INSERT INTO users (id, tenant_id, email, password_hash, display_name, role)
     VALUES ('88888888-8888-8888-8888-888888888888',
             '99999999-9999-9999-9999-999999999999',
             'test@auth.local', $1, 'Test User', 'PLANNER')`,
    [hash]
  );
});

describe('POST /api/auth/login', () => {
  it('liefert JWT bei gültigem Login', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@auth.local', password: 'TestPw1!' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toBeTypeOf('string');
    expect(body.token.split('.')).toHaveLength(3);
    expect(body.expiresIn).toBeTypeOf('string');
  });

  it('lehnt falsches Passwort ab + erhöht failed_login_count', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@auth.local', password: 'WrongPw!' },
    });
    expect(res.statusCode).toBe(401);

    const pool = getOwnerPool();
    const userResult = await pool.query<{ failed_login_count: number }>(
      `SELECT failed_login_count FROM users WHERE email = 'test@auth.local'`
    );
    expect(userResult.rows[0].failed_login_count).toBe(1);
  });

  it('lockt nach 5 Fehlversuchen', async () => {
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@auth.local', password: 'WrongPw!' },
      });
    }

    const pool = getOwnerPool();
    const lockResult = await pool.query<{ locked_until: Date | null }>(
      `SELECT locked_until FROM users WHERE email = 'test@auth.local'`
    );
    expect(lockResult.rows[0].locked_until).not.toBeNull();
    expect(lockResult.rows[0].locked_until!.getTime()).toBeGreaterThan(Date.now());

    // 6. Versuch (selbst mit richtigem PW): muss locked sein
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@auth.local', password: 'TestPw1!' },
    });
    expect(res.statusCode).toBe(423);
  });

  it('liefert 401 für non-existent user (Timing-Schutz)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'ghost@example.local', password: 'irrelevant' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
  });

  it('lehnt invalides Email-Format ab', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'not-an-email', password: 'X' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('reset failed_login_count nach erfolgreichem Login', async () => {
    // Erst Fehler erzeugen
    await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@auth.local', password: 'WrongPw!' },
    });
    // Dann korrekter Login
    await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@auth.local', password: 'TestPw1!' },
    });
    const pool = getOwnerPool();
    const r = await pool.query<{ failed_login_count: number; last_login_at: Date | null }>(
      `SELECT failed_login_count, last_login_at FROM users WHERE email = 'test@auth.local'`
    );
    expect(r.rows[0].failed_login_count).toBe(0);
    expect(r.rows[0].last_login_at).not.toBeNull();
  });
});

describe('POST /api/auth/forgot-password (ELE-201)', () => {
  it('antwortet 200 für existierenden User', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: 'test@auth.local' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('antwortet 200 für unbekannte Email (Anti-Enumeration)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: 'ghost@example.local' },
    });
    // Identischer Status + Body wie bei bekanntem User → kein Enumeration-Channel
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('antwortet 200 case-insensitive (Email-Normalisierung)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: 'TEST@AUTH.LOCAL' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('lehnt invalides Email-Format ab', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: 'not-an-email' },
    });
    expect(res.statusCode).toBe(400);
  });
});
