// Reassignment-Engine — DB-Loader + Orchestrator (ELE-196).
// Lädt Entry-Context + Kandidaten + alle Faktor-Daten, ruft Pure-Scoring,
// liefert sortierte Top-N (suggestions) + Hard-blocked (für UI-Transparenz).
//
// Keine Geschäftslogik im Loader — Scoring ist in reassignment-pure.ts.
// ────────────────────────────────────────────────────────────────────────────

import type { Pool } from 'pg';

import { REASSIGNMENT_SCORING } from '../../config.js';
import {
  scoreCandidate,
  splitSuggestions,
  type CandidateInput,
  type EntryInput,
  type SplitResult,
  type Suggestion,
} from './reassignment-pure.js';

export interface ReassignmentResponse {
  entryId: string;
  suggestions: Suggestion[];
  blocked: Suggestion[];
}

interface EntryContext {
  id: string;
  tenantId: string;
  employeeId: string;
  entryDate: string;
  startTime: string | null;
  durationMin: number;
  propertyId: string;
  serviceTypeId: string;
  propertyLat: number | null;
  propertyLng: number | null;
  weekStart: string;
  weekEnd: string;
}

interface CandidateRow {
  id: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_deleted: boolean;
  weekly_hours: string | null;
  home_lat: string | null;
  home_lng: string | null;
}

export class EntryNotFoundError extends Error {
  constructor() {
    super('Entry not found in tenant');
  }
}

async function loadEntryContext(
  pool: Pool,
  tenantId: string,
  entryId: string
): Promise<EntryContext> {
  const r = await pool.query<{
    id: string;
    tenant_id: string;
    employee_id: string;
    entry_date: string;
    start_time: string | null;
    duration_min: number;
    property_id: string;
    service_type_id: string;
    property_lat: string | null;
    property_lng: string | null;
  }>(
    `SELECT se.id, se.tenant_id, se.employee_id, se.entry_date::text AS entry_date,
            se.start_time::text AS start_time, se.duration_min,
            se.property_id, se.service_type_id,
            p.lat::text AS property_lat, p.lng::text AS property_lng
     FROM schedule_entries se
     JOIN properties p ON p.id = se.property_id
     WHERE se.id = $1 AND se.tenant_id = $2 AND se.is_deleted = FALSE`,
    [entryId, tenantId]
  );
  const row = r.rows[0];
  if (!row) throw new EntryNotFoundError();

  // Wochenstart (Montag) + Wochenende (Sonntag) berechnen für Kapazitäts-Query.
  // Plain SQL macht das robust (date_trunc('week', ...)).
  const weekRes = await pool.query<{ week_start: string; week_end: string }>(
    `SELECT (date_trunc('week', $1::date))::text AS week_start,
            (date_trunc('week', $1::date) + INTERVAL '6 days')::text AS week_end`,
    [row.entry_date]
  );

  return {
    id: row.id,
    tenantId: row.tenant_id,
    employeeId: row.employee_id,
    entryDate: row.entry_date,
    startTime: row.start_time,
    durationMin: row.duration_min,
    propertyId: row.property_id,
    serviceTypeId: row.service_type_id,
    propertyLat: row.property_lat !== null ? Number(row.property_lat) : null,
    propertyLng: row.property_lng !== null ? Number(row.property_lng) : null,
    weekStart: weekRes.rows[0].week_start.slice(0, 10),
    weekEnd: weekRes.rows[0].week_end.slice(0, 10),
  };
}

async function loadCandidatePool(pool: Pool, tenantId: string): Promise<CandidateRow[]> {
  const r = await pool.query<CandidateRow>(
    `SELECT id, first_name, last_name, is_active, is_deleted,
            weekly_hours::text AS weekly_hours,
            home_lat::text AS home_lat,
            home_lng::text AS home_lng
     FROM employees
     WHERE tenant_id = $1 AND is_deleted = FALSE
     ORDER BY id`,
    [tenantId]
  );
  return r.rows;
}

async function buildCandidateInput(
  pool: Pool,
  ctx: EntryContext,
  row: CandidateRow
): Promise<CandidateInput> {
  const fairnessSince = new Date(
    Date.now() - REASSIGNMENT_SCORING.FAIR_LOOKBACK_WEEKS * 7 * 86400_000
  )
    .toISOString()
    .slice(0, 10);

  // Wir laden parallel: Auslastung (Wochenstunden), Qualifikationen,
  // Erfahrung am Property, Absences am Tag, Time-Conflicts, Contingency,
  // Reassignment-Count im Fairness-Fenster.
  const [plannedRes, qualRes, visitsRes, absenceRes, conflictRes, contingencyRes, fairnessRes] =
    await Promise.all([
      pool.query<{ sum_min: string }>(
        `SELECT COALESCE(SUM(duration_min), 0)::text AS sum_min
       FROM schedule_entries
       WHERE tenant_id = $1 AND employee_id = $2 AND is_deleted = FALSE
         AND entry_date BETWEEN $3 AND $4`,
        [ctx.tenantId, row.id, ctx.weekStart, ctx.weekEnd]
      ),
      pool.query<{ c: string }>(
        `SELECT COUNT(*)::text AS c
       FROM employee_qualifications
       WHERE tenant_id = $1 AND employee_id = $2 AND is_deleted = FALSE
         AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)`,
        [ctx.tenantId, row.id]
      ),
      pool.query<{ c: string }>(
        `SELECT COUNT(*)::text AS c
       FROM schedule_entries
       WHERE tenant_id = $1 AND employee_id = $2 AND property_id = $3
         AND is_deleted = FALSE
         AND entry_date >= CURRENT_DATE - INTERVAL '6 months'
         AND entry_date < $4::date`,
        [ctx.tenantId, row.id, ctx.propertyId, ctx.entryDate]
      ),
      pool.query<{ absence_type: string }>(
        `SELECT absence_type FROM absence_records
       WHERE tenant_id = $1 AND employee_id = $2 AND is_deleted = FALSE
         AND $3::date BETWEEN start_date AND end_date
       LIMIT 1`,
        [ctx.tenantId, row.id, ctx.entryDate]
      ),
      pool.query<{ start_time: string | null }>(
        `SELECT start_time::text AS start_time
       FROM schedule_entries
       WHERE tenant_id = $1 AND employee_id = $2 AND entry_date = $3
         AND is_deleted = FALSE AND id != $4
       LIMIT 1`,
        [ctx.tenantId, row.id, ctx.entryDate, ctx.id]
      ),
      pool.query<{ priority: number }>(
        `SELECT priority FROM contingency_rules
       WHERE tenant_id = $1 AND backup_employee_id = $2
         AND primary_employee_id = $3
         AND (property_id IS NULL OR property_id = $4)
         AND (service_type_id IS NULL OR service_type_id = $5)
         AND is_active = TRUE AND is_deleted = FALSE
       ORDER BY priority ASC
       LIMIT 1`,
        [ctx.tenantId, row.id, ctx.employeeId, ctx.propertyId, ctx.serviceTypeId]
      ),
      pool.query<{ c: string }>(
        `SELECT COUNT(*)::text AS c
       FROM reassignment_log
       WHERE tenant_id = $1 AND reassigned_to_id = $2
         AND created_at >= $3::date`,
        [ctx.tenantId, row.id, fairnessSince]
      ),
    ]);

  return {
    employeeId: row.id,
    employeeName: `${row.first_name} ${row.last_name}`.trim(),
    isActive: row.is_active,
    isDeleted: row.is_deleted,
    weeklyHoursTarget: row.weekly_hours !== null ? Number(row.weekly_hours) : null,
    plannedMinutesThisWeek: Number(plannedRes.rows[0].sum_min),
    homeLat: row.home_lat !== null ? Number(row.home_lat) : null,
    homeLng: row.home_lng !== null ? Number(row.home_lng) : null,
    validQualificationCount: Number(qualRes.rows[0].c),
    visitsAtPropertyLast6Mo: Number(visitsRes.rows[0].c),
    reassignmentsInWindow: Number(fairnessRes.rows[0].c),
    hasAbsenceOnDate: absenceRes.rowCount! > 0,
    absenceType:
      (absenceRes.rows[0]?.absence_type as CandidateInput['absenceType'] | undefined) ?? null,
    hasTimeConflict: conflictRes.rowCount! > 0,
    conflictingStartTime: conflictRes.rows[0]?.start_time?.slice(0, 5) ?? null,
    isSameAsOrigin: row.id === ctx.employeeId,
    contingencyPriority: contingencyRes.rows[0]?.priority ?? null,
  };
}

/**
 * Liefert sortierte Top-N Vertretungsvorschläge + Hard-blocked-Kandidaten
 * für einen Schedule-Entry. Tenant-scoped.
 */
export async function getReassignmentSuggestions(
  pool: Pool,
  tenantId: string,
  entryId: string
): Promise<ReassignmentResponse> {
  const ctx = await loadEntryContext(pool, tenantId, entryId);
  const candidates = await loadCandidatePool(pool, tenantId);

  const entry: EntryInput = {
    durationMin: ctx.durationMin,
    propertyLat: ctx.propertyLat,
    propertyLng: ctx.propertyLng,
  };

  // Parallel: alle Faktor-Daten je Kandidat laden, dann scoren.
  const allScored: Suggestion[] = await Promise.all(
    candidates.map(async (row) => {
      const input = await buildCandidateInput(pool, ctx, row);
      return scoreCandidate({ candidate: input, entry });
    })
  );

  const split: SplitResult = splitSuggestions(allScored);
  return {
    entryId,
    suggestions: split.suggestions,
    blocked: split.blocked,
  };
}
