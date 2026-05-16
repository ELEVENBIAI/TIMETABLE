import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { getConnectionUri } from '../helpers/db.js';

process.env.JWT_SECRET ??= 'a'.repeat(64);

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

describe('GET /api/health', () => {
  it('200 mit DB connected wenn alles OK', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.db).toBe('connected');
    expect(body.version).toBeTypeOf('string');
  });
});

describe('GET /api/config', () => {
  it('liefert whitelisted Feature-Flags', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/config' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.version).toBeTypeOf('string');
    expect(body.features).toMatchObject({
      planGeneratorEnabled: expect.any(Boolean),
      reassignmentAiEnabled: expect.any(Boolean),
      routingProvider: expect.any(String),
    });
    // Keine "geheimen" Configs sind exposed
    expect(body.features.jwtSecretMinLength).toBeUndefined();
  });
});

describe('GET /api/docs', () => {
  it('Swagger UI ist unter /api/docs erreichbar', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/docs/static/index.html' });
    // Swagger UI gibt 200 oder 302 (redirect zu .html) — beide OK
    expect([200, 302]).toContain(res.statusCode);
  });
});
