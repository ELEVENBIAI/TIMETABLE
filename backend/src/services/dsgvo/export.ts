// DSGVO Art. 15 — Datenauskunft (ELE-187).
// Aggregiert alle Daten zu einem User/Employee aus allen relevanten Tabellen
// und liefert ein strukturiertes Bundle (data + markdown report).

import type { Pool } from 'pg';

export interface UserDataExport {
  generatedAt: string;
  tenant: { id: string; name: string };
  user: Record<string, unknown> | null;
  employee: Record<string, unknown> | null;
  employeeSkills: Record<string, unknown>[];
  scheduleEntries: Record<string, unknown>[];
  absences: Record<string, unknown>[];
  auditLog: Record<string, unknown>[];
}

export async function aggregateUserData(
  pool: Pool,
  tenantId: string,
  userId: string
): Promise<UserDataExport> {
  const [tenantRes, userRes, employeeRes, skillsRes, entriesRes, absencesRes, auditRes] =
    await Promise.all([
      pool.query(`SELECT id, name FROM tenants WHERE id = $1`, [tenantId]),
      pool.query(
        `SELECT id, tenant_id, email, display_name, role, locale, is_super_admin,
              must_change_password, last_login_at, is_deleted,
              deleted_at, hard_delete_at, created_at, updated_at
       FROM users WHERE id = $1 AND tenant_id = $2`,
        [userId, tenantId]
      ),
      pool.query(
        `SELECT id, user_id, region_id, first_name, last_name, display_name,
              employee_type, weekly_hours, hourly_rate, phone, email,
              home_address, home_lat, home_lng, is_active, is_deleted,
              created_at, updated_at
       FROM employees WHERE user_id = $1 AND tenant_id = $2`,
        [userId, tenantId]
      ),
      pool.query(
        `SELECT eq.id, eq.employee_id, eq.qualification_type_id, qt.name AS qualification_name,
              eq.valid_until, eq.certificate_number, eq.notes
       FROM employee_qualifications eq
       JOIN employees e ON e.id = eq.employee_id
       LEFT JOIN qualification_types qt ON qt.id = eq.qualification_type_id
       WHERE e.user_id = $1 AND e.tenant_id = $2 AND eq.is_deleted = FALSE`,
        [userId, tenantId]
      ),
      pool.query(
        `SELECT se.id, se.schedule_id, se.entry_date, se.day_of_week,
              se.start_time, se.duration_min, se.status, se.is_extra,
              se.is_from_reassignment, se.original_employee_id, se.notes,
              se.created_at, se.updated_at
       FROM schedule_entries se
       JOIN employees e ON e.id = se.employee_id
       WHERE e.user_id = $1 AND se.tenant_id = $2 AND se.is_deleted = FALSE`,
        [userId, tenantId]
      ),
      pool.query(
        `SELECT a.id, a.employee_id, a.start_date, a.end_date, a.absence_type, a.notes,
              a.is_full_day, a.start_time, a.end_time, a.created_at, a.updated_at
       FROM absence_records a
       JOIN employees e ON e.id = a.employee_id
       WHERE e.user_id = $1 AND a.tenant_id = $2 AND a.is_deleted = FALSE`,
        [userId, tenantId]
      ),
      pool.query(
        `SELECT id, action, target_type, target_id, metadata, ip_address::text AS ip_address,
              user_agent, created_at
       FROM audit_log
       WHERE tenant_id = $1 AND (user_id = $2 OR target_id = $2)
       ORDER BY created_at DESC
       LIMIT 1000`,
        [tenantId, userId]
      ),
    ]);

  return {
    generatedAt: new Date().toISOString(),
    tenant: tenantRes.rows[0] ?? { id: tenantId, name: 'unknown' },
    user: userRes.rows[0] ?? null,
    employee: employeeRes.rows[0] ?? null,
    employeeSkills: skillsRes.rows,
    scheduleEntries: entriesRes.rows,
    absences: absencesRes.rows,
    auditLog: auditRes.rows,
  };
}

/** Lesbarer Markdown-Bericht für DSGVO-Auskunft. Keine technischen Felder. */
export function buildReport(data: UserDataExport): string {
  const lines: string[] = [];
  lines.push(`# Datenauskunft nach Art. 15 DSGVO`);
  lines.push('');
  lines.push(`**Erstellt am:** ${data.generatedAt}`);
  lines.push(`**Mandant:** ${data.tenant.name}`);
  lines.push('');

  if (data.user) {
    lines.push('## Benutzerkonto');
    lines.push('');
    lines.push(`- E-Mail: ${data.user.email}`);
    lines.push(`- Anzeigename: ${data.user.display_name ?? '—'}`);
    lines.push(`- Rolle: ${data.user.role}`);
    lines.push(`- Sprache: ${data.user.locale ?? '—'}`);
    lines.push(`- Konto angelegt: ${data.user.created_at}`);
    lines.push(`- Letzter Login: ${data.user.last_login_at ?? 'nie'}`);
    if (data.user.is_deleted) {
      lines.push(`- Status: Konto zur Löschung markiert (${data.user.deleted_at})`);
      if (data.user.hard_delete_at) {
        lines.push(`- Endgültige Löschung geplant: ${data.user.hard_delete_at}`);
      }
    }
    lines.push('');
  }

  if (data.employee) {
    lines.push('## Mitarbeiter-Stammdaten');
    lines.push('');
    lines.push(`- Vorname: ${data.employee.first_name}`);
    lines.push(`- Nachname: ${data.employee.last_name}`);
    lines.push(`- Anstellungsart: ${data.employee.employee_type}`);
    lines.push(`- Wochenstunden: ${data.employee.weekly_hours ?? '—'}`);
    lines.push(`- Telefon: ${data.employee.phone ?? '—'}`);
    lines.push(`- E-Mail: ${data.employee.email ?? '—'}`);
    lines.push(`- Adresse: ${data.employee.home_address ?? '—'}`);
    lines.push('');
  }

  if (data.employeeSkills.length > 0) {
    lines.push('## Qualifikationen');
    lines.push('');
    for (const s of data.employeeSkills) {
      lines.push(`- ${s.qualification_name ?? s.qualification_type_id} (Level ${s.level ?? '—'})`);
    }
    lines.push('');
  }

  lines.push('## Geplante Aufgaben');
  lines.push('');
  lines.push(`Gesamt: ${data.scheduleEntries.length} Einträge`);
  lines.push('');

  lines.push('## Abwesenheiten');
  lines.push('');
  lines.push(`Gesamt: ${data.absences.length} Einträge`);
  lines.push('');

  lines.push('## Audit-Log (letzte 1000 Einträge)');
  lines.push('');
  lines.push(`Gesamt: ${data.auditLog.length} Einträge`);
  lines.push('');

  lines.push('## Hinweise');
  lines.push('');
  lines.push(
    '- Diese Auskunft enthält alle personenbezogenen Daten, die zu Ihrer Person gespeichert sind.'
  );
  lines.push(
    '- Die vollständige technische Datei `data.json` enthält dieselben Daten in maschinenlesbarer Form.'
  );
  lines.push('- Bei Fragen wenden Sie sich an den Datenschutzbeauftragten.');
  return lines.join('\n');
}
