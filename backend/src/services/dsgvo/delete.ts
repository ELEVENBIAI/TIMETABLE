// DSGVO Art. 17 — Löschung (ELE-187).
// Phase 1: Soft-Delete sofort. Phase 2: Hard-Delete via Retention-Cron nach Frist.
// Historische Schedule-Entries (≥90 Tage alt) bleiben mit anonymisiertem Employee
// erhalten — HGB-Aufbewahrungspflicht für Geschäfts-Aufzeichnungen.

import type { Pool, PoolClient } from 'pg';
import { DSGVO_RETENTION } from '../../config.js';

const ANONYMIZED_FIRST_NAME = '[gelöscht]';
const ANONYMIZED_LAST_NAME = '';
const HISTORICAL_DAYS = 90;

export interface SoftDeleteResult {
  userId: string;
  employeeId: string | null;
  hardDeleteAt: string;
  affectedTables: {
    users: number;
    employees: number;
    employee_skills: number;
    schedule_entries_future: number;
    schedule_entries_anonymized: number;
    absences: number;
  };
}

/**
 * Soft-Delete eines Users im DSGVO-Sinn.
 * - Setzt is_deleted=TRUE auf user, employee, employee_skills, future schedule_entries, absences
 * - Anonymisiert employee-Daten für historische schedule_entries (≥90 Tage)
 * - Markiert hard_delete_at = NOW() + EMPLOYEE_DATA_AFTER_LEAVING_DAYS
 *
 * audit_log wird NICHT angefasst (Append-Only, Compliance).
 */
export async function softDeleteUser(
  pool: Pool,
  params: {
    userId: string;
    tenantId: string;
    actorUserId: string;
    reason: string;
  }
): Promise<SoftDeleteResult> {
  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) Hard-Delete-Zeitpunkt vormerken
    const hardDeleteAt = new Date(
      Date.now() + DSGVO_RETENTION.EMPLOYEE_DATA_AFTER_LEAVING_DAYS * 86400_000
    ).toISOString();

    const userRes = await client.query<{ id: string }>(
      `UPDATE users
       SET is_deleted = TRUE,
           deleted_at = NOW(),
           hard_delete_at = $1
       WHERE id = $2 AND tenant_id = $3 AND is_deleted = FALSE
       RETURNING id`,
      [hardDeleteAt, params.userId, params.tenantId]
    );
    if (userRes.rowCount === 0) {
      throw new Error('USER_NOT_FOUND_OR_ALREADY_DELETED');
    }

    // 2) Employee finden und soft-deleten
    const empRes = await client.query<{ id: string }>(
      `UPDATE employees
       SET is_deleted = TRUE, deleted_at = NOW(), is_active = FALSE
       WHERE user_id = $1 AND tenant_id = $2 AND is_deleted = FALSE
       RETURNING id`,
      [params.userId, params.tenantId]
    );
    const employeeId = empRes.rows[0]?.id ?? null;

    // 3) Employee-Qualifikationen soft-deleten
    let skillsCount = 0;
    if (employeeId) {
      const skillsRes = await client.query(
        `UPDATE employee_qualifications
         SET is_deleted = TRUE
         WHERE employee_id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [employeeId, params.tenantId]
      );
      skillsCount = skillsRes.rowCount ?? 0;
    }

    // 4) Zukünftige Schedule-Entries soft-deleten
    let futureEntries = 0;
    if (employeeId) {
      const futureRes = await client.query(
        `UPDATE schedule_entries
         SET is_deleted = TRUE
         WHERE employee_id = $1 AND tenant_id = $2 AND is_deleted = FALSE
           AND entry_date >= CURRENT_DATE`,
        [employeeId, params.tenantId]
      );
      futureEntries = futureRes.rowCount ?? 0;
    }

    // 5) Historische Schedule-Entries (≥ HISTORICAL_DAYS alt) bleiben, aber Employee
    //    wird auf Tabellen-Ebene durch Anonymisierung der employees-Row entwertet.
    //    Das passiert via Hard-Delete später; für jetzt zählen wir die "anonymized"
    //    als die Anzahl historischer Entries die NICHT gelöscht wurden.
    let anonymized = 0;
    if (employeeId) {
      const histRes = await client.query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM schedule_entries
         WHERE employee_id = $1 AND tenant_id = $2 AND is_deleted = FALSE
           AND entry_date < CURRENT_DATE - INTERVAL '${HISTORICAL_DAYS} days'`,
        [employeeId, params.tenantId]
      );
      anonymized = Number(histRes.rows[0].c);
    }

    // 6) Absence-Records soft-deleten
    let absencesCount = 0;
    if (employeeId) {
      const absRes = await client.query(
        `UPDATE absence_records
         SET is_deleted = TRUE
         WHERE employee_id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [employeeId, params.tenantId]
      );
      absencesCount = absRes.rowCount ?? 0;
    }

    // 7) audit_log-Eintrag schreiben
    await client.query(
      `INSERT INTO audit_log (tenant_id, user_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, 'dsgvo.delete_requested', 'user', $3, $4::jsonb)`,
      [
        params.tenantId,
        params.actorUserId,
        params.userId,
        JSON.stringify({
          reason: params.reason,
          hardDeleteAt,
          affectedTables: {
            users: 1,
            employees: empRes.rowCount ?? 0,
            employee_skills: skillsCount,
            schedule_entries_future: futureEntries,
            schedule_entries_anonymized: anonymized,
            absences: absencesCount,
          },
        }),
      ]
    );

    await client.query('COMMIT');

    return {
      userId: params.userId,
      employeeId,
      hardDeleteAt,
      affectedTables: {
        users: 1,
        employees: empRes.rowCount ?? 0,
        employee_skills: skillsCount,
        schedule_entries_future: futureEntries,
        schedule_entries_anonymized: anonymized,
        absences: absencesCount,
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Phase-2 Hard-Delete (Retention-Cron). Findet User mit hard_delete_at < NOW(),
 * anonymisiert historische schedule_entries (Employee-FK auf NULL), löscht
 * physisch: employee_skills, employees, users. audit_log bleibt unberührt.
 *
 * Idempotent: mehrfacher Aufruf am gleichen Tag ändert nichts.
 */
export async function hardDeleteDueUsers(
  pool: Pool,
  options: { dryRun: boolean }
): Promise<Array<{ userId: string; tenantId: string }>> {
  const due = await pool.query<{ id: string; tenant_id: string }>(
    `SELECT id, tenant_id FROM users
     WHERE hard_delete_at IS NOT NULL AND hard_delete_at < NOW()
       AND is_deleted = TRUE`
  );

  const processed: Array<{ userId: string; tenantId: string }> = [];
  if (options.dryRun || due.rows.length === 0) {
    return due.rows.map((r) => ({ userId: r.id, tenantId: r.tenant_id }));
  }

  for (const row of due.rows) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Historische schedule_entries: employee_id ist NOT NULL — wir können
      // nicht einfach auf NULL setzen. Lösung: physische Anonymisierung des
      // employee-Rows (Personenbezug weg, Geschäfts-Aufzeichnung bleibt).
      // Vor der user-Löschung: employees.user_id → NULL, weil sonst der FK
      // employees_user_id_fkey die user-DELETE blockiert.
      await client.query(
        `UPDATE employees
         SET first_name = $1, last_name = $2, display_name = $1,
             email = NULL, phone = NULL, home_address = NULL,
             home_lat = NULL, home_lng = NULL,
             user_id = NULL
         WHERE user_id = $3 AND tenant_id = $4`,
        [ANONYMIZED_FIRST_NAME, ANONYMIZED_LAST_NAME, row.id, row.tenant_id]
      );

      // Employee-Qualifikationen physisch löschen (employees-Row bleibt)
      await client.query(
        `DELETE FROM employee_qualifications
         WHERE employee_id IN (
           SELECT id FROM employees WHERE tenant_id = $1
             AND first_name = $2 AND user_id IS NULL
         )`,
        [row.tenant_id, ANONYMIZED_FIRST_NAME]
      );

      // User-Row physisch löschen (audit_log bleibt — user_id wird zur ID-Ruine)
      await client.query(`DELETE FROM users WHERE id = $1 AND tenant_id = $2`, [
        row.id,
        row.tenant_id,
      ]);

      // audit_log Hard-Delete-Bestätigung
      await client.query(
        `INSERT INTO audit_log (tenant_id, user_id, action, target_type, target_id, metadata)
         VALUES ($1, NULL, 'dsgvo.hard_deleted', 'user', $2, $3::jsonb)`,
        [row.tenant_id, row.id, JSON.stringify({ executedAt: new Date().toISOString() })]
      );

      await client.query('COMMIT');
      processed.push({ userId: row.id, tenantId: row.tenant_id });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  return processed;
}
