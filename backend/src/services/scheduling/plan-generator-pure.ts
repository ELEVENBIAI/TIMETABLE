// Pure-Function-Helper für den Plan-Generator (ELE-185)
// ────────────────────────────────────────────────────────────────────────────
// Deterministische Berechnungen ohne DB-Zugriff. Werden vom Service
// `schedule-generator.ts` aufgerufen.
// ────────────────────────────────────────────────────────────────────────────

import { addDays, differenceInCalendarDays, format, parseISO, startOfISOWeek } from 'date-fns';

export type IsoDate = string; // YYYY-MM-DD

/**
 * Berechnet das konkrete Datum für (weekStart, dayOfWeek) wo dayOfWeek 1..7 (Mo..So).
 * weekStart wird zur ISO-Woche normalisiert (Montag).
 */
export function pickEntryDate(weekStart: IsoDate, dayOfWeek: number): IsoDate {
  if (dayOfWeek < 1 || dayOfWeek > 7) {
    throw new Error(`Invalid dayOfWeek: ${dayOfWeek} (expected 1..7)`);
  }
  const monday = startOfISOWeek(parseISO(weekStart));
  return format(addDays(monday, dayOfWeek - 1), 'yyyy-MM-dd');
}

interface LoadEntry {
  employeeId: string;
  durationMin: number;
}

/**
 * Summiert Dauer pro Mitarbeiter (in Minuten). Mitarbeiter ohne Entries
 * fehlen im Result-Map.
 */
export function computeEmployeeLoad(entries: LoadEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of entries) {
    map.set(e.employeeId, (map.get(e.employeeId) ?? 0) + e.durationMin);
  }
  return map;
}

export interface EmployeeCapacity {
  employeeId: string;
  /** Wochenstunden (NULL für Subunternehmer/Franchise) */
  weeklyHours: number | null;
}

export interface OverloadResult {
  employeeId: string;
  plannedMin: number;
  capacityMin: number;
}

/**
 * Findet Mitarbeiter, deren geplante Minuten ihre Kapazität (weekly_hours × 60)
 * überschreiten. Mitarbeiter ohne `weekly_hours` werden übersprungen.
 */
export function findOverloadedEmployees(
  load: Map<string, number>,
  capacities: EmployeeCapacity[]
): OverloadResult[] {
  const result: OverloadResult[] = [];
  for (const cap of capacities) {
    if (cap.weeklyHours === null) continue;
    const planned = load.get(cap.employeeId) ?? 0;
    const capacityMin = Math.round(cap.weeklyHours * 60);
    if (planned > capacityMin) {
      result.push({ employeeId: cap.employeeId, plannedMin: planned, capacityMin });
    }
  }
  return result;
}

export interface QualificationToCheck {
  employeeId: string;
  qualificationTypeId: string;
  validUntil: IsoDate | null;
}

export interface ExpiringQualification {
  employeeId: string;
  qualificationTypeId: string;
  validUntil: IsoDate;
  daysRemaining: number;
}

/**
 * Findet Qualifikationen, die innerhalb von `daysWindow` ab `referenceDate`
 * ablaufen ODER bereits abgelaufen sind. Quali ohne `validUntil` wird übersprungen.
 */
export function findExpiringQualifications(
  qualifications: QualificationToCheck[],
  referenceDate: IsoDate,
  daysWindow = 30
): ExpiringQualification[] {
  const ref = parseISO(referenceDate);
  const result: ExpiringQualification[] = [];
  for (const q of qualifications) {
    if (!q.validUntil) continue;
    const validUntil = parseISO(q.validUntil);
    const days = differenceInCalendarDays(validUntil, ref);
    if (days <= daysWindow) {
      result.push({
        employeeId: q.employeeId,
        qualificationTypeId: q.qualificationTypeId,
        validUntil: q.validUntil,
        daysRemaining: days,
      });
    }
  }
  return result;
}

export interface AbsenceWindow {
  employeeId: string;
  startDate: IsoDate;
  endDate: IsoDate;
  absenceType: 'SICK' | 'VACATION' | 'PERSONAL' | 'TRAINING' | 'OTHER';
}

/**
 * Pure: Prüft ob ein Mitarbeiter an einem konkreten Datum abwesend ist.
 * Liefert die passende Absence oder null.
 */
export function findAbsenceFor(
  absences: AbsenceWindow[],
  employeeId: string,
  date: IsoDate
): AbsenceWindow | null {
  const target = parseISO(date);
  for (const a of absences) {
    if (a.employeeId !== employeeId) continue;
    const start = parseISO(a.startDate);
    const end = parseISO(a.endDate);
    if (target >= start && target <= end) return a;
  }
  return null;
}

/** Mappt absence_type auf reassignment_reason (DB-Enums). */
export function absenceTypeToReassignmentReason(
  type: AbsenceWindow['absenceType']
): 'SICK' | 'VACATION' | 'EMERGENCY' | 'OPTIMIZATION' | 'OTHER' {
  switch (type) {
    case 'SICK':
      return 'SICK';
    case 'VACATION':
      return 'VACATION';
    case 'PERSONAL':
    case 'TRAINING':
    case 'OTHER':
      return 'OTHER';
  }
}

export interface AvailabilitySlot {
  employeeId: string;
  dayOfWeek: number;
  isAvailable: boolean;
  availableFrom: string | null; // HH:MM[:SS]
  availableUntil: string | null;
}

/**
 * Pure: ist der Mitarbeiter zur geplanten Zeit verfügbar?
 * - Kein Availability-Eintrag für den Tag → "frei" (true), keine Restriktion
 * - is_available = false → false
 * - Keine Zeitgrenzen gesetzt → true
 * - startTime + duration muss komplett im Window [availableFrom, availableUntil) liegen
 */
export function isEmployeeAvailable(
  availability: AvailabilitySlot[],
  employeeId: string,
  dayOfWeek: number,
  startTime: string | null,
  durationMin: number
): boolean {
  const slot = availability.find((s) => s.employeeId === employeeId && s.dayOfWeek === dayOfWeek);
  if (!slot) return true; // keine Pflege → keine Restriktion
  if (!slot.isAvailable) return false;
  if (!startTime || !slot.availableFrom || !slot.availableUntil) return true;
  const toMin = (t: string): number => {
    const [hh, mm] = t.split(':');
    return Number(hh) * 60 + Number(mm);
  };
  const start = toMin(startTime);
  const end = start + durationMin;
  const winStart = toMin(slot.availableFrom);
  const winEnd = toMin(slot.availableUntil);
  return start >= winStart && end <= winEnd;
}
