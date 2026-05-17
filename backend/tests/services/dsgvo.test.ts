// DSGVO-Service-Unit-Tests (ELE-187).

import { describe, expect, it } from 'vitest';
import { toCsv, type AuditLogRow } from '../../src/services/dsgvo/audit.js';
import { buildReport } from '../../src/services/dsgvo/export.js';

const ROW: AuditLogRow = {
  id: '11111111-1111-1111-1111-111111111111',
  tenant_id: '22222222-2222-2222-2222-222222222222',
  user_id: '33333333-3333-3333-3333-333333333333',
  action: 'employee.read',
  target_type: 'employee',
  target_id: '44444444-4444-4444-4444-444444444444',
  metadata: { foo: 'bar' },
  ip_address: '127.0.0.1',
  user_agent: 'Mozilla',
  created_at: '2026-05-17T12:00:00Z',
};

describe('toCsv (DSGVO Audit-Log)', () => {
  it('emittiert Header + Datenzeile in RFC-4180-Format', () => {
    const csv = toCsv([ROW]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe(
      'id,created_at,user_id,action,target_type,target_id,metadata,ip_address,user_agent'
    );
    expect(lines[1]).toContain(ROW.id);
    expect(lines[1]).toContain('employee.read');
  });

  it('escaped Felder mit Komma und Anführungszeichen', () => {
    const row: AuditLogRow = {
      ...ROW,
      user_agent: 'Mozilla, "Linux", x86_64',
    };
    const csv = toCsv([row]);
    expect(csv).toContain('"Mozilla, ""Linux"", x86_64"');
  });

  it('rendert JSON-Metadata als String', () => {
    const csv = toCsv([ROW]);
    expect(csv).toContain('"{""foo"":""bar""}"');
  });

  it('liefert null/undefined als leeren Feldwert', () => {
    const row: AuditLogRow = { ...ROW, user_id: null, ip_address: null, user_agent: null };
    const csv = toCsv([row]);
    const fields = csv.split('\r\n')[1].split(',');
    // user_id ist index 2
    expect(fields[2]).toBe('');
  });

  it('handhabt leeres Array', () => {
    const csv = toCsv([]);
    expect(csv).toBe(
      'id,created_at,user_id,action,target_type,target_id,metadata,ip_address,user_agent\r\n'
    );
  });
});

describe('buildReport (DSGVO Markdown-Bericht)', () => {
  it('rendert User + Employee + Stats', () => {
    const report = buildReport({
      generatedAt: '2026-05-17T10:00:00Z',
      tenant: { id: 't', name: 'Pilot Tenant' },
      user: {
        email: 'daniel@pilot.local',
        display_name: 'Daniel K.',
        role: 'EMPLOYEE',
        locale: 'de',
        created_at: '2026-01-01',
        last_login_at: '2026-05-16',
        is_deleted: false,
      },
      employee: {
        first_name: 'Daniel',
        last_name: 'K.',
        employee_type: 'FULLTIME',
        weekly_hours: 40,
        phone: '0123',
        email: 'daniel@pilot.local',
        home_address: 'Test 1',
      },
      employeeSkills: [],
      scheduleEntries: Array.from({ length: 5 }, () => ({})),
      absences: [{}],
      auditLog: [],
    });
    expect(report).toContain('Daniel K.');
    expect(report).toContain('Pilot Tenant');
    expect(report).toContain('Gesamt: 5 Einträge');
    expect(report).toContain('Art. 15 DSGVO');
  });
});
