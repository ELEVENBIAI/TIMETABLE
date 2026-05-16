// Plan-Generator (ELE-185)
// ────────────────────────────────────────────────────────────────────────────
// Erzeugt aus einem Schedule-Template + Stammdaten einen DRAFT-Wochenplan
// in 6 Phasen mit Warnings.
//
// 1) Template-Entries → BaseEntries
// 2) Frequenz-Engine: fällige Property-Services + Waste-Schedules
// 3) Waste: 2 Entries (raus + rein) pro Termin
// 4) Absences-Check → REASSIGNMENT_NEEDED + ABSENCE-Warning
// 5) Availability-Check → OUTSIDE_AVAILABILITY-Warning
// 6) Overload + Quali-Expiry → Warnings
//
// Alles in einer DB-Transaction. Rollback bei jedem Fehler.
// ────────────────────────────────────────────────────────────────────────────

import { parseISO } from 'date-fns';
import type { PoolClient } from 'pg';

import { HttpError, NotFoundError } from '../../lib/errors.js';
import type { ScheduleEntryRow } from '../../schemas/schedule-entries.js';
import type {
  GenerateScheduleInput,
  GeneratorResult,
  GeneratorWarning,
} from '../../schemas/schedule-generator.js';
import type { ScheduleRow } from '../../schemas/schedules.js';
import {
  getDueServicesForWeek,
  getDueWasteSchedulesForWeek,
  normalizeToWeekStart,
  type DueService,
  type DueWasteSchedule,
} from './frequency-engine.js';
import {
  absenceTypeToReassignmentReason,
  computeEmployeeLoad,
  findAbsenceFor,
  findExpiringQualifications,
  findOverloadedEmployees,
  isEmployeeAvailable,
  pickEntryDate,
  type AbsenceWindow,
  type AvailabilitySlot,
  type EmployeeCapacity,
  type QualificationToCheck,
} from './plan-generator-pure.js';

class DuplicateWeekError extends HttpError {
  constructor() {
    super(409, 'DUPLICATE_WEEK', 'errors.duplicateWeek', 'errors.duplicateWeek');
  }
}

type QueryRunner = Pick<PoolClient, 'query'>;

interface TemplateEntry {
  template_id: string;
  employee_id: string;
  day_of_week: number;
  property_id: string;
  service_type_id: string;
  start_time: string;
  duration_min: number;
  sort_order: number;
  notes: string | null;
}

interface PendingEntry {
  employeeId: string;
  entryDate: string;
  dayOfWeek: number;
  propertyId: string;
  serviceTypeId: string;
  propertyServiceId: string | null;
  startTime: string | null;
  durationMin: number;
  sortOrder: number;
  status: string;
  isExtra: boolean;
  reassignmentReason: string | null;
  notes: string | null;
}

const WASTE_PUT_OUT_DURATION_MIN = 10;
const WASTE_TAKE_IN_DURATION_MIN = 10;
const QUALI_EXPIRY_DAYS_WINDOW = 30;

/**
 * Erzeugt einen DRAFT-Wochenplan aus einem Template.
 * Muss innerhalb einer Transaktion (BEGIN/COMMIT) aufgerufen werden.
 */
export async function generateSchedule(
  client: QueryRunner,
  tenantId: string,
  actorUserId: string,
  input: GenerateScheduleInput
): Promise<GeneratorResult> {
  const warnings: GeneratorWarning[] = [];
  const weekStartDate = normalizeToWeekStart(input.weekStart);

  // ─── Template laden + Validierung ─────────────────────────────────────────
  const tpl = await client.query<{ id: string }>(
    `SELECT id FROM schedule_templates
     WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
    [input.templateId, tenantId]
  );
  if (tpl.rowCount === 0) throw new NotFoundError('errors.templateNotFound');

  // ─── Phase 1: Schedule anlegen ────────────────────────────────────────────
  let schedule: ScheduleRow;
  try {
    const r = await client.query<ScheduleRow>(
      `INSERT INTO schedules (
         tenant_id, week_start, week_number, year, status,
         template_id, generation_method, notes, created_by
       ) VALUES ($1, $2, $3, $4, 'DRAFT', $5, 'FROM_TEMPLATE', $6, $7)
       RETURNING id, tenant_id, week_start, week_number, year, status, template_id,
                 generation_method, published_at, published_by, notes, created_at, updated_at`,
      [
        tenantId,
        input.weekStart,
        input.weekNumber,
        input.year,
        input.templateId,
        input.notes ?? null,
        actorUserId,
      ]
    );
    schedule = r.rows[0];
  } catch (err) {
    const e = err as { code?: string; constraint?: string };
    if (e.code === '23505' && e.constraint === 'uq_schedules_week') {
      throw new DuplicateWeekError();
    }
    throw err;
  }

  // ─── Phase 2: Template-Entries laden + BaseEntries erzeugen ───────────────
  const teResult = await client.query<TemplateEntry>(
    `SELECT template_id, employee_id, day_of_week, property_id, service_type_id,
            start_time, duration_min, sort_order, notes
     FROM template_entries
     WHERE template_id = $1 AND tenant_id = $2 AND is_deleted = FALSE
     ORDER BY day_of_week, sort_order, start_time`,
    [input.templateId, tenantId]
  );
  const templateEntries = teResult.rows;
  const pending: PendingEntry[] = templateEntries.map((te) => ({
    employeeId: te.employee_id,
    entryDate: pickEntryDate(input.weekStart, te.day_of_week),
    dayOfWeek: te.day_of_week,
    propertyId: te.property_id,
    serviceTypeId: te.service_type_id,
    propertyServiceId: null,
    startTime: te.start_time,
    durationMin: te.duration_min,
    sortOrder: te.sort_order,
    status: 'PLANNED',
    isExtra: false,
    reassignmentReason: null,
    notes: te.notes,
  }));

  // ─── Phase 3a: Frequenz-Engine — fällige Property-Services ────────────────
  const dueServices: DueService[] = await getDueServicesForWeek(client, tenantId, weekStartDate);

  // Match: Template-Entry mit gleicher property+service+date → property_service_id annotieren.
  // Wenn keiner gefunden → NO_TEMPLATE_MATCH-Warning.
  for (const ds of dueServices) {
    for (const date of ds.dates) {
      const match = pending.find(
        (p) =>
          p.propertyId === ds.propertyId &&
          p.serviceTypeId === ds.serviceTypeId &&
          p.entryDate === date
      );
      if (match) {
        match.propertyServiceId = ds.propertyServiceId;
      } else {
        warnings.push({
          code: 'NO_TEMPLATE_MATCH',
          messageKey: 'warnings.noTemplateMatch',
          vars: {
            propertyServiceId: ds.propertyServiceId,
            propertyId: ds.propertyId,
            date,
          },
        });
      }
    }
  }

  // ─── Phase 3b: Waste-Schedules → raus + rein-Entries ──────────────────────
  const wasteEvents: DueWasteSchedule[] = await getDueWasteSchedulesForWeek(
    client,
    tenantId,
    weekStartDate
  );

  // Waste-Service-Type aus der Tenant-Stammdaten holen (category = 'WASTE')
  const wsType = await client.query<{ id: string }>(
    `SELECT id FROM service_types
     WHERE tenant_id = $1 AND category = 'WASTE' AND is_active = TRUE AND is_deleted = FALSE
     ORDER BY sort_order LIMIT 1`,
    [tenantId]
  );
  const wasteServiceTypeId = wsType.rows[0]?.id ?? null;
  let wasteEventCount = 0;

  if (wasteEvents.length > 0 && !wasteServiceTypeId) {
    warnings.push({
      code: 'NO_WASTE_SERVICE_TYPE',
      messageKey: 'warnings.noWasteServiceType',
    });
  }

  if (wasteServiceTypeId) {
    // Pick the first FULLTIME/PARTTIME employee as default assignee for waste tasks.
    // Plan-Generator MVP-CUT: später per Routing-Engine (Welle 5) optimieren.
    const defaultAssignee = await client.query<{ id: string; day_of_week_set: number[] }>(
      `SELECT id, ARRAY[]::int[] AS day_of_week_set FROM employees
       WHERE tenant_id = $1 AND is_active = TRUE AND is_deleted = FALSE
       ORDER BY first_name LIMIT 1`,
      [tenantId]
    );
    const defaultEmployeeId = defaultAssignee.rows[0]?.id;

    if (defaultEmployeeId) {
      for (const we of wasteEvents) {
        for (const ev of we.events) {
          // Put-out am Vortag
          pending.push({
            employeeId: defaultEmployeeId,
            entryDate: ev.putOutDate,
            dayOfWeek: isoDayFromDate(ev.putOutDate),
            propertyId: we.propertyId,
            serviceTypeId: wasteServiceTypeId,
            propertyServiceId: null,
            startTime: we.latestPutOut,
            durationMin: WASTE_PUT_OUT_DURATION_MIN,
            sortOrder: 100,
            status: 'PLANNED',
            isExtra: true,
            reassignmentReason: null,
            notes: `Waste put-out (${we.locationDescription ?? ''})`.trim(),
          });
          // Take-in am Folgetag
          pending.push({
            employeeId: defaultEmployeeId,
            entryDate: ev.takeInDate,
            dayOfWeek: isoDayFromDate(ev.takeInDate),
            propertyId: we.propertyId,
            serviceTypeId: wasteServiceTypeId,
            propertyServiceId: null,
            startTime: we.earliestTakeIn,
            durationMin: WASTE_TAKE_IN_DURATION_MIN,
            sortOrder: 101,
            status: 'PLANNED',
            isExtra: true,
            reassignmentReason: null,
            notes: `Waste take-in (${we.locationDescription ?? ''})`.trim(),
          });
          wasteEventCount += 2;
        }
      }
    }
  }

  // ─── Phase 4: Absences-Check ──────────────────────────────────────────────
  const weekEndDate = pickEntryDate(input.weekStart, 7);
  const absencesResult = await client.query<{
    employee_id: string;
    start_date: string;
    end_date: string;
    absence_type: string;
  }>(
    `SELECT employee_id, start_date, end_date, absence_type
     FROM absence_records
     WHERE tenant_id = $1 AND is_deleted = FALSE
       AND start_date <= $3 AND end_date >= $2`,
    [tenantId, input.weekStart, weekEndDate]
  );
  const absences: AbsenceWindow[] = absencesResult.rows.map((a) => ({
    employeeId: a.employee_id,
    startDate: a.start_date,
    endDate: a.end_date,
    absenceType: a.absence_type as AbsenceWindow['absenceType'],
  }));

  for (const entry of pending) {
    const absence = findAbsenceFor(absences, entry.employeeId, entry.entryDate);
    if (absence) {
      entry.status = 'REASSIGNMENT_NEEDED';
      entry.reassignmentReason = absenceTypeToReassignmentReason(absence.absenceType);
      warnings.push({
        code: 'ABSENCE',
        messageKey: 'warnings.absence',
        vars: {
          employeeId: entry.employeeId,
          date: entry.entryDate,
          absenceType: absence.absenceType,
        },
      });
    }
  }

  // ─── Phase 5: Verfügbarkeits-Check ────────────────────────────────────────
  const employeeIds = Array.from(new Set(pending.map((p) => p.employeeId)));
  let availability: AvailabilitySlot[] = [];
  if (employeeIds.length > 0) {
    const av = await client.query<{
      employee_id: string;
      day_of_week: number;
      is_available: boolean;
      available_from: string | null;
      available_until: string | null;
    }>(
      `SELECT employee_id, day_of_week, is_available, available_from, available_until
       FROM employee_availability
       WHERE tenant_id = $1 AND employee_id = ANY($2::uuid[]) AND is_deleted = FALSE`,
      [tenantId, employeeIds]
    );
    availability = av.rows.map((a) => ({
      employeeId: a.employee_id,
      dayOfWeek: a.day_of_week,
      isAvailable: a.is_available,
      availableFrom: a.available_from,
      availableUntil: a.available_until,
    }));
  }

  for (const entry of pending) {
    // Skip Entries die bereits REASSIGNMENT_NEEDED durch Absence sind
    if (entry.status === 'REASSIGNMENT_NEEDED') continue;
    if (
      !isEmployeeAvailable(
        availability,
        entry.employeeId,
        entry.dayOfWeek,
        entry.startTime,
        entry.durationMin
      )
    ) {
      warnings.push({
        code: 'OUTSIDE_AVAILABILITY',
        messageKey: 'warnings.outsideAvailability',
        vars: {
          employeeId: entry.employeeId,
          date: entry.entryDate,
          dayOfWeek: entry.dayOfWeek,
          startTime: entry.startTime,
          durationMin: entry.durationMin,
        },
      });
    }
  }

  // ─── Phase 6: Overload + Quali-Expiry ─────────────────────────────────────
  if (employeeIds.length > 0) {
    const cap = await client.query<{ id: string; weekly_hours: string | null }>(
      `SELECT id, weekly_hours FROM employees
       WHERE tenant_id = $1 AND id = ANY($2::uuid[]) AND is_deleted = FALSE`,
      [tenantId, employeeIds]
    );
    const capacities: EmployeeCapacity[] = cap.rows.map((c) => ({
      employeeId: c.id,
      weeklyHours: c.weekly_hours === null ? null : parseFloat(c.weekly_hours),
    }));
    const load = computeEmployeeLoad(
      pending.map((p) => ({ employeeId: p.employeeId, durationMin: p.durationMin }))
    );
    for (const o of findOverloadedEmployees(load, capacities)) {
      warnings.push({
        code: 'OVERLOAD',
        messageKey: 'warnings.overload',
        vars: { ...o },
      });
    }

    // Quali-Expiry: nur fällige Qualifikationen, die in der Woche oder den nächsten 30 Tagen ablaufen
    const quali = await client.query<{
      employee_id: string;
      qualification_type_id: string;
      valid_until: string | null;
    }>(
      `SELECT employee_id, qualification_type_id, valid_until
       FROM employee_qualifications
       WHERE tenant_id = $1 AND employee_id = ANY($2::uuid[]) AND is_deleted = FALSE`,
      [tenantId, employeeIds]
    );
    const qualis: QualificationToCheck[] = quali.rows.map((q) => ({
      employeeId: q.employee_id,
      qualificationTypeId: q.qualification_type_id,
      validUntil: q.valid_until,
    }));
    for (const exp of findExpiringQualifications(
      qualis,
      input.weekStart,
      QUALI_EXPIRY_DAYS_WINDOW
    )) {
      warnings.push({
        code: 'QUALIFICATION_EXPIRY',
        messageKey: 'warnings.qualificationExpiry',
        vars: { ...exp },
      });
    }
  }

  // ─── Phase 7: Bulk-Insert ──────────────────────────────────────────────────
  const entries: ScheduleEntryRow[] = [];
  for (const p of pending) {
    const r = await client.query<ScheduleEntryRow>(
      `INSERT INTO schedule_entries (
         tenant_id, schedule_id, employee_id, entry_date, day_of_week,
         property_id, service_type_id, property_service_id, start_time,
         duration_min, sort_order, status, is_extra, reassignment_reason,
         notes, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING id, tenant_id, schedule_id, employee_id, entry_date, day_of_week,
                 property_id, service_type_id, property_service_id, start_time,
                 duration_min, sort_order, status, is_extra, is_from_reassignment,
                 original_employee_id, reassignment_reason, notes, created_at, updated_at`,
      [
        tenantId,
        schedule.id,
        p.employeeId,
        p.entryDate,
        p.dayOfWeek,
        p.propertyId,
        p.serviceTypeId,
        p.propertyServiceId,
        p.startTime,
        p.durationMin,
        p.sortOrder,
        p.status,
        p.isExtra,
        p.reassignmentReason,
        p.notes,
        actorUserId,
      ]
    );
    entries.push(r.rows[0]);
  }

  return {
    schedule,
    entries,
    warnings,
    stats: {
      templateEntries: templateEntries.length,
      dueServices: dueServices.length,
      wasteEvents: wasteEventCount,
      totalEntries: entries.length,
    },
  };
}

/** Pure helper: ISO-day-of-week (1..7) für ein YYYY-MM-DD-Datum. */
function isoDayFromDate(date: string): number {
  const d = parseISO(date);
  const js = d.getDay();
  return js === 0 ? 7 : js;
}
