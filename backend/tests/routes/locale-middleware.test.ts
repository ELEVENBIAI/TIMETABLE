// Locale-Middleware E2E: erwartet, dass Errors in der Request-Locale gerendert werden.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { getConnectionUri } from '../helpers/db.js';
import { loginAs } from '../helpers/loginAs.js';

process.env.JWT_SECRET ??= 'a'.repeat(64);
process.env.NODE_ENV = 'test';

let app: FastifyInstance;

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

describe('Locale-Middleware — Error-Messages in Request-Locale', () => {
  it('liefert deutsche Error-Message bei Accept-Language: de', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/users',
      headers: { 'accept-language': 'de-DE,de;q=0.9' },
    });
    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.messageKey).toBe('errors.missingAuthHeader');
    expect(body.error.message).toBe('Authorization-Header fehlt');
  });

  it('liefert englische Error-Message bei Accept-Language: en', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/users',
      headers: { 'accept-language': 'en-US,en;q=0.9' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.message).toBe('Authorization header missing');
  });

  it('liefert englische Default-Message ohne Accept-Language', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/users' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.message).toBe('Authorization header missing');
  });

  it('JWT-Locale überschreibt Accept-Language', async () => {
    // User-Locale im JWT = de, Header en → erwarte de (JWT wins).
    // Da wir keinen User in DB anlegen, kommt der Fehler von einer anderen
    // Route. Wir nutzen GET /api/tenants/<bad uuid> mit auth.
    const res = await app.inject({
      method: 'GET',
      url: '/api/tenants/00000000-0000-0000-0000-000000000000',
      headers: {
        ...loginAs({
          userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          tenantId: '11111111-1111-1111-1111-111111111111',
          role: 'EMPLOYEE',
          locale: 'de',
        }),
        'accept-language': 'en-US,en',
      },
    });
    // Cross-Tenant-Forbidden → 403 in DE
    expect(res.statusCode).toBe(403);
    expect(res.json().error.message).toBe('Zugriff auf fremden Tenant verweigert');
  });
});
