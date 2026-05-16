// Time-Conflict-Check für Schedule-Entries (ELE-179)
// Pure Functions — keine DB-Zugriffe, voll testbar.
//
// Modell:
//   Entry = { startTime: 'HH:MM' | null, durationMin: number }
//   Zwei Entries überlappen, wenn beide eine startTime haben UND
//   [start_a, start_a + duration_a) ∩ [start_b, start_b + duration_b) ≠ ∅.
//   Entries ohne startTime ("noch unverplant") überlappen mit niemandem.

export interface TimeRange {
  startTime: string | null;
  durationMin: number;
}

/** Konvertiert "HH:MM" oder "HH:MM:SS" in Minuten ab Mitternacht. Null → null. */
export function timeToMinutes(time: string | null): number | null {
  if (!time) return null;
  const [hh, mm] = time.split(':');
  return Number(hh) * 60 + Number(mm);
}

/**
 * Prüft ob zwei Entries (gleicher Mitarbeiter, gleicher Tag) zeitlich überlappen.
 * Entries ohne startTime gelten als nicht-zeitgebunden und überlappen NICHT.
 */
export function entriesOverlap(a: TimeRange, b: TimeRange): boolean {
  const aStart = timeToMinutes(a.startTime);
  const bStart = timeToMinutes(b.startTime);
  if (aStart === null || bStart === null) return false;
  const aEnd = aStart + a.durationMin;
  const bEnd = bStart + b.durationMin;
  // Halb-offene Intervalle [start, end): Berührung am Endpunkt ist KEIN Overlap.
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Erlaubte Status-Übergänge für Schedules (lineare State-Machine).
 * DRAFT → PUBLISHED → ARCHIVED. Rückwärts oder Sprünge sind verboten.
 */
export type ScheduleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

const VALID_TRANSITIONS: Record<ScheduleStatus, readonly ScheduleStatus[]> = {
  DRAFT: ['PUBLISHED'],
  PUBLISHED: ['ARCHIVED'],
  ARCHIVED: [],
};

export function isValidStatusTransition(from: ScheduleStatus, to: ScheduleStatus): boolean {
  if (from === to) return true; // Idempotent
  return VALID_TRANSITIONS[from].includes(to);
}
