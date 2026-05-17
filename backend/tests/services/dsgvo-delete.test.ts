// DSGVO Service-Tests: softDeleteUser + hardDeleteDueUsers (ELE-187).
// DB-bound (testcontainers), prüft Edge-Cases die der Route-Test nicht abdeckt.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cleanDb, getOwnerPool } from '../helpers/db.js';
import { hardDeleteDueUsers, softDeleteUser } from '../../src/services/dsgvo/delete.js';
import { queryAuditLog } from '../../src/services/dsgvo/audit.js';
import { aggregateUserData, buildReport } from '../../src/services/dsgvo/export.js';

const TENANT = '11111111-1111-1111-1111-111111111111';
const ADMIN = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_WITH_EMP = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const USER_NO_EMP = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const EMPLOYEE = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

beforeAll(async () => {
  // ggf. App nicht booten — wir testen Services direkt mit pool
});

beforeEach(async () => {
  await cleanDb();
  const pool = getOwnerPool();
  await pool.query(
    `INSERT INTO tenants (id, name, slug, brand) VALUES ($1, 'Tenant', 'tenant', 'GEPARD')`,
    [TENANT]
  );
  await pool.query(
    `INSERT INTO users (id, tenant_id, email, password_hash, display_name, role) VALUES
       ($1, $4, 'admin@test.local', 'hash', 'Admin', 'ADMIN'),
       ($2, $4, 'emp@test.local', 'hash', 'Emp', 'EMPLOYEE'),
       ($3, $4, 'no-emp@test.local', 'hash', 'NoEmp', 'EMPLOYEE')`,
    [ADMIN, USER_WITH_EMP, USER_NO_EMP, TENANT]
  );
  await pool.query(
    `INSERT INTO employees (id, tenant_id, user_id, first_name, last_name, employee_type, weekly_hours)
     VALUES ($1, $2, $3, 'Daniel', 'K.', 'FULLTIME', 40)`,
    [EMPLOYEE, TENANT, USER_WITH_EMP]
  );
});

afterAll(async () => {
  /* container stoppt globaler teardown */
});

describe('softDeleteUser (ELE-187)', () => {
  it('User mit Employee: alle Tabellen soft-gelöscht + hard_delete_at gesetzt', async () => {
    const pool = getOwnerPool();
    const result = await softDeleteUser(pool, {
      userId: USER_WITH_EMP,
      tenantId: TENANT,
      actorUserId: ADMIN,
      reason: 'test',
    });
    expect(result.employeeId).toBe(EMPLOYEE);
    expect(result.affectedTables.users).toBe(1);
    expect(result.affectedTables.employees).toBe(1);

    const u = await pool.query<{ is_deleted: boolean; hard_delete_at: Date | null }>(
      `SELECT is_deleted, hard_delete_at FROM users WHERE id = $1`,
      [USER_WITH_EMP]
    );
    expect(u.rows[0].is_deleted).toBe(true);
    expect(u.rows[0].hard_delete_at).toBeTruthy();
  });

  it('User OHNE Employee: läuft durch, employeeId=null, andere Tables 0', async () => {
    const pool = getOwnerPool();
    const result = await softDeleteUser(pool, {
      userId: USER_NO_EMP,
      tenantId: TENANT,
      actorUserId: ADMIN,
      reason: 'test',
    });
    expect(result.employeeId).toBeNull();
    expect(result.affectedTables.users).toBe(1);
    expect(result.affectedTables.employees).toBe(0);
    expect(result.affectedTables.employee_skills).toBe(0);
    expect(result.affectedTables.absences).toBe(0);
  });

  it('User existiert nicht → wirft USER_NOT_FOUND_OR_ALREADY_DELETED', async () => {
    const pool = getOwnerPool();
    await expect(
      softDeleteUser(pool, {
        userId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        tenantId: TENANT,
        actorUserId: ADMIN,
        reason: 'test',
      })
    ).rejects.toThrow(/USER_NOT_FOUND_OR_ALREADY_DELETED/);
  });

  it('User bereits gelöscht → wirft USER_NOT_FOUND_OR_ALREADY_DELETED', async () => {
    const pool = getOwnerPool();
    // Erst soft-deleten
    await softDeleteUser(pool, {
      userId: USER_WITH_EMP,
      tenantId: TENANT,
      actorUserId: ADMIN,
      reason: 'first',
    });
    // Zweiter Aufruf muss werfen
    await expect(
      softDeleteUser(pool, {
        userId: USER_WITH_EMP,
        tenantId: TENANT,
        actorUserId: ADMIN,
        reason: 'second',
      })
    ).rejects.toThrow();
  });
});

describe('hardDeleteDueUsers (ELE-187 Retention-Cron)', () => {
  it('dry-run findet User mit hard_delete_at < NOW(), ändert aber nichts', async () => {
    const pool = getOwnerPool();
    // Direkt einen User mit hard_delete_at in der Vergangenheit anlegen
    await pool.query(
      `UPDATE users SET is_deleted = TRUE, deleted_at = NOW() - INTERVAL '40 days',
       hard_delete_at = NOW() - INTERVAL '1 day' WHERE id = $1`,
      [USER_WITH_EMP]
    );

    const processed = await hardDeleteDueUsers(pool, { dryRun: true });
    expect(processed.length).toBe(1);
    expect(processed[0].userId).toBe(USER_WITH_EMP);

    // User existiert noch (dry-run hat nichts gelöscht)
    const u = await pool.query(`SELECT id FROM users WHERE id = $1`, [USER_WITH_EMP]);
    expect(u.rowCount).toBe(1);
  });

  it('apply löscht User physisch + anonymisiert Employee + schreibt audit_log', async () => {
    const pool = getOwnerPool();
    await pool.query(
      `UPDATE users SET is_deleted = TRUE, deleted_at = NOW() - INTERVAL '40 days',
       hard_delete_at = NOW() - INTERVAL '1 day' WHERE id = $1`,
      [USER_WITH_EMP]
    );

    const processed = await hardDeleteDueUsers(pool, { dryRun: false });
    expect(processed.length).toBe(1);

    // User physisch weg
    const u = await pool.query(`SELECT id FROM users WHERE id = $1`, [USER_WITH_EMP]);
    expect(u.rowCount).toBe(0);

    // Employee anonymisiert
    const e = await pool.query<{ first_name: string; email: string | null }>(
      `SELECT first_name, email FROM employees WHERE id = $1`,
      [EMPLOYEE]
    );
    expect(e.rows[0].first_name).toBe('[gelöscht]');
    expect(e.rows[0].email).toBeNull();

    // audit_log enthält dsgvo.hard_deleted
    const a = await pool.query(
      `SELECT id FROM audit_log WHERE tenant_id = $1 AND action = 'dsgvo.hard_deleted' AND target_id = $2`,
      [TENANT, USER_WITH_EMP]
    );
    expect(a.rowCount).toBe(1);
  });

  it('Keine fälligen User → leere Liste, kein Throw', async () => {
    const pool = getOwnerPool();
    const processed = await hardDeleteDueUsers(pool, { dryRun: false });
    expect(processed.length).toBe(0);
  });
});

describe('aggregateUserData (ELE-187 Export)', () => {
  it('User ohne Employee → employee:null, employeeSkills/scheduleEntries/absences leer', async () => {
    const pool = getOwnerPool();
    const data = await aggregateUserData(pool, TENANT, USER_NO_EMP);
    expect(data.user).toBeTruthy();
    expect(data.employee).toBeNull();
    expect(data.employeeSkills).toEqual([]);
    expect(data.scheduleEntries).toEqual([]);
    expect(data.absences).toEqual([]);
  });

  it('Nicht-existenter User → user:null, kein Throw', async () => {
    const pool = getOwnerPool();
    const data = await aggregateUserData(pool, TENANT, 'ffffffff-ffff-ffff-ffff-ffffffffffff');
    expect(data.user).toBeNull();
  });

  it('buildReport ohne User/Employee rendert nur Hinweise-Sektion', () => {
    const report = buildReport({
      generatedAt: '2026-05-17T10:00:00Z',
      tenant: { id: 't', name: 'Test' },
      user: null,
      employee: null,
      employeeSkills: [],
      scheduleEntries: [],
      absences: [],
      auditLog: [],
    });
    expect(report).toContain('Art. 15 DSGVO');
    expect(report).toContain('Gesamt: 0 Einträge');
    expect(report).not.toContain('## Benutzerkonto');
    expect(report).not.toContain('## Mitarbeiter-Stammdaten');
  });

  it('buildReport nutzt Fallback "—"/"nie" wenn User/Employee-Felder null sind', () => {
    const report = buildReport({
      generatedAt: '2026-05-17T10:00:00Z',
      tenant: { id: 't', name: 'Test' },
      user: {
        email: 'x@y.local',
        display_name: null,
        role: 'EMPLOYEE',
        locale: null,
        created_at: '2026-01-01',
        last_login_at: null,
        is_deleted: false,
      },
      employee: {
        first_name: 'X',
        last_name: 'Y',
        employee_type: 'FULLTIME',
        weekly_hours: null,
        phone: null,
        email: null,
        home_address: null,
      },
      employeeSkills: [{ qualification_type_id: 'abc', level: null }],
      scheduleEntries: [],
      absences: [],
      auditLog: [],
    });
    // Default-Strings für null-Felder
    expect(report).toContain('Anzeigename: —');
    expect(report).toContain('Sprache: —');
    expect(report).toContain('Letzter Login: nie');
    expect(report).toContain('Wochenstunden: —');
    expect(report).toContain('Telefon: —');
    // qualification ohne Name fällt auf qualification_type_id zurück
    expect(report).toContain('abc');
    expect(report).toContain('Level —');
  });

  it('buildReport mit Soft-Deleted-User zeigt Lösch-Status', () => {
    const report = buildReport({
      generatedAt: '2026-05-17T10:00:00Z',
      tenant: { id: 't', name: 'Test' },
      user: {
        email: 'x@y.local',
        display_name: 'X Y',
        role: 'EMPLOYEE',
        locale: 'de',
        created_at: '2026-01-01',
        last_login_at: null,
        is_deleted: true,
        deleted_at: '2026-05-01',
        hard_delete_at: '2026-05-31',
      },
      employee: null,
      employeeSkills: [{ qualification_name: 'Sachkundenachweis', level: 'A' }],
      scheduleEntries: [],
      absences: [],
      auditLog: [],
    });
    expect(report).toContain('zur Löschung markiert');
    expect(report).toContain('Endgültige Löschung geplant');
    expect(report).toContain('Sachkundenachweis');
  });
});

describe('queryAuditLog (ELE-187 Filter-Pfade)', () => {
  it('Limit-Clamping: > MAX wird auf 200 geklemmt', async () => {
    const pool = getOwnerPool();
    const result = await queryAuditLog(pool, { tenantId: TENANT, limit: 99999 });
    expect(result.limit).toBe(200);
  });

  it('Page < 1 wird auf 1 geklemmt', async () => {
    const pool = getOwnerPool();
    const result = await queryAuditLog(pool, { tenantId: TENANT, page: 0 });
    expect(result.page).toBe(1);
  });

  it('alle Filter aktiv ergeben leere Liste wenn nichts matcht', async () => {
    const pool = getOwnerPool();
    const result = await queryAuditLog(pool, {
      tenantId: TENANT,
      userId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
      action: 'employee.read',
      targetType: 'employee',
      dateFrom: '2020-01-01T00:00:00Z',
      dateTo: '2020-01-02T00:00:00Z',
    });
    expect(result.total).toBe(0);
    expect(result.rows).toEqual([]);
  });
});
