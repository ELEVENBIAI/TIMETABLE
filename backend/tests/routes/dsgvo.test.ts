// DSGVO-Workflows (ELE-187): Export, Delete-Request, Audit-Log.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import JSZip from 'jszip';
import { cleanDb, getConnectionUri, getOwnerPool } from '../helpers/db.js';
import { loginAs } from '../helpers/loginAs.js';
import { hashPassword } from '../../src/auth/password.js';

process.env.JWT_SECRET ??= 'a'.repeat(64);
process.env.NODE_ENV = 'test';

let app: FastifyInstance;

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const ADMIN_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const EMP_A = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const EMP_RECORD_A = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
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
    `INSERT INTO tenants (id, name, slug, brand) VALUES ($1, 'Tenant A', 'tenant-a', 'GEPARD')`,
    [TENANT_A]
  );
  const hash = await hashPassword(KNOWN_PW);
  await pool.query(
    `INSERT INTO users (id, tenant_id, email, password_hash, display_name, role) VALUES
       ($1, $3, 'admin@test.local', $4, 'Admin', 'ADMIN'),
       ($2, $3, 'emp@test.local', $4, 'Emp Daniel', 'EMPLOYEE')`,
    [ADMIN_A, EMP_A, TENANT_A, hash]
  );
  await pool.query(
    `INSERT INTO employees (id, tenant_id, user_id, first_name, last_name, employee_type, weekly_hours)
     VALUES ($1, $2, $3, 'Daniel', 'K.', 'FULLTIME', 40)`,
    [EMP_RECORD_A, TENANT_A, EMP_A]
  );
});

describe('POST /api/dsgvo/data-export', () => {
  it('EMPLOYEE kann eigene Daten exportieren — liefert ZIP', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dsgvo/data-export',
      headers: loginAs({ userId: EMP_A, tenantId: TENANT_A, role: 'EMPLOYEE' }),
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/zip');
    const zip = await JSZip.loadAsync(res.rawPayload);
    expect(zip.file('data.json')).toBeTruthy();
    expect(zip.file('report.md')).toBeTruthy();
    const data = JSON.parse(await zip.file('data.json')!.async('string'));
    expect(data.user.email).toBe('emp@test.local');
    expect(data.employee.first_name).toBe('Daniel');
  });

  it('EMPLOYEE kann NICHT andere Mitarbeiter exportieren (403)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dsgvo/data-export',
      headers: loginAs({ userId: EMP_A, tenantId: TENANT_A, role: 'EMPLOYEE' }),
      payload: { userId: ADMIN_A },
    });
    expect(res.statusCode).toBe(403);
  });

  it('ADMIN kann beliebige User exportieren', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dsgvo/data-export',
      headers: loginAs({ userId: ADMIN_A, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { userId: EMP_A },
    });
    expect(res.statusCode).toBe(200);
  });

  it('Export schreibt audit_log Eintrag', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/dsgvo/data-export',
      headers: loginAs({ userId: EMP_A, tenantId: TENANT_A, role: 'EMPLOYEE' }),
      payload: {},
    });
    const pool = getOwnerPool();
    const r = await pool.query(
      `SELECT action, user_id, target_id FROM audit_log
       WHERE tenant_id = $1 AND action = 'dsgvo.export'`,
      [TENANT_A]
    );
    expect(r.rowCount).toBe(1);
    expect(r.rows[0].user_id).toBe(EMP_A);
    expect(r.rows[0].target_id).toBe(EMP_A);
  });
});

describe('POST /api/dsgvo/delete-request', () => {
  it('Self-Service mit confirmEmail soft-deleted + setzt hard_delete_at', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dsgvo/delete-request',
      headers: loginAs({ userId: EMP_A, tenantId: TENANT_A, role: 'EMPLOYEE' }),
      payload: {
        userId: EMP_A,
        reason: 'Pilot ended, please remove my data.',
        confirmEmail: 'emp@test.local',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.hardDeleteAt).toBeTruthy();

    // Verify soft-delete state
    const pool = getOwnerPool();
    const u = await pool.query<{ is_deleted: boolean; hard_delete_at: Date | null }>(
      `SELECT is_deleted, hard_delete_at FROM users WHERE id = $1`,
      [EMP_A]
    );
    expect(u.rows[0].is_deleted).toBe(true);
    expect(u.rows[0].hard_delete_at).toBeTruthy();

    const e = await pool.query<{ is_deleted: boolean }>(
      `SELECT is_deleted FROM employees WHERE user_id = $1`,
      [EMP_A]
    );
    expect(e.rows[0].is_deleted).toBe(true);
  });

  it('Self-Service ohne confirmEmail → 400 CONFIRM_EMAIL_MISMATCH', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dsgvo/delete-request',
      headers: loginAs({ userId: EMP_A, tenantId: TENANT_A, role: 'EMPLOYEE' }),
      payload: {
        userId: EMP_A,
        reason: 'phishing-attack-attempt',
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('CONFIRM_EMAIL_MISMATCH');
  });

  it('Self-Service mit falscher confirmEmail → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dsgvo/delete-request',
      headers: loginAs({ userId: EMP_A, tenantId: TENANT_A, role: 'EMPLOYEE' }),
      payload: {
        userId: EMP_A,
        reason: 'test',
        confirmEmail: 'wrong@test.local',
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('ADMIN kann anderen User löschen ohne confirmEmail', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dsgvo/delete-request',
      headers: loginAs({ userId: ADMIN_A, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { userId: EMP_A, reason: 'Mitarbeiter ist ausgeschieden' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('EMPLOYEE darf NICHT anderen löschen', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dsgvo/delete-request',
      headers: loginAs({ userId: EMP_A, tenantId: TENANT_A, role: 'EMPLOYEE' }),
      payload: { userId: ADMIN_A, reason: 'test', confirmEmail: 'admin@test.local' },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('GET /api/dsgvo/audit-log', () => {
  beforeEach(async () => {
    const pool = getOwnerPool();
    // Ein paar Audit-Events erzeugen
    await pool.query(
      `INSERT INTO audit_log (tenant_id, user_id, action, target_type, target_id)
       VALUES ($1, $2, 'employee.read', 'employee', $3),
              ($1, $2, 'employee.create', 'employee', $3),
              ($1, $2, 'user.login', 'user', $2)`,
      [TENANT_A, ADMIN_A, EMP_RECORD_A]
    );
  });

  it('ADMIN bekommt paginierte Liste', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/dsgvo/audit-log?limit=10',
      headers: loginAs({ userId: ADMIN_A, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.rows.length).toBeGreaterThan(0);
    expect(body.total).toBeGreaterThan(0);
    expect(body.page).toBe(1);
  });

  it('EMPLOYEE bekommt 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/dsgvo/audit-log',
      headers: loginAs({ userId: EMP_A, tenantId: TENANT_A, role: 'EMPLOYEE' }),
    });
    expect(res.statusCode).toBe(403);
  });

  it('Filter nach action funktioniert', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/dsgvo/audit-log?action=employee.read',
      headers: loginAs({ userId: ADMIN_A, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.rows.every((r: { action: string }) => r.action === 'employee.read')).toBe(true);
  });

  it('CSV-Export liefert text/csv', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/dsgvo/audit-log?format=csv',
      headers: loginAs({ userId: ADMIN_A, tenantId: TENANT_A, role: 'ADMIN' }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.body).toContain('action');
    expect(res.body).toContain('employee.read');
  });
});

describe('Soft-Delete-Constraints (ELE-187 Data-Integrity)', () => {
  it('audit_log bleibt nach Soft-Delete bestehen', async () => {
    const pool = getOwnerPool();
    await pool.query(
      `INSERT INTO audit_log (tenant_id, user_id, action) VALUES ($1, $2, 'user.login')`,
      [TENANT_A, EMP_A]
    );

    await app.inject({
      method: 'POST',
      url: '/api/dsgvo/delete-request',
      headers: loginAs({ userId: ADMIN_A, tenantId: TENANT_A, role: 'ADMIN' }),
      payload: { userId: EMP_A, reason: 'test' },
    });

    const r = await pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM audit_log WHERE tenant_id = $1 AND user_id = $2`,
      [TENANT_A, EMP_A]
    );
    expect(Number(r.rows[0].c)).toBeGreaterThan(0);
  });
});
