// Frequenz-Engine (ELE-184)
// ────────────────────────────────────────────────────────────────────────────
// Pure Functions berechnen: "Welche Property-Services und Waste-Schedules
// sind in einer Kalenderwoche fällig?"
//
// Berechnungs-Logik enthält KEINE DB-Zugriffe (ADR-04 + Maintainability).
// DB-Loader nutzen die Pure Functions und liefern hydratisierte Listen.
//
// date-fns für ISO-Week + Monatsarithmetik (ADR-05).
// ────────────────────────────────────────────────────────────────────────────

import {
  addDays,
  endOfISOWeek,
  format,
  getDate,
  getISOWeek,
  getMonth,
  getYear,
  parseISO,
  startOfISOWeek,
  startOfMonth,
} from 'date-fns';
import type { PoolClient } from 'pg';

import type { Frequency } from '../../schemas/property-services.js';

type QueryRunner = Pick<PoolClient, 'query'>;

export type IsoDate = string; // YYYY-MM-DD

// ─── Saison-Check ───────────────────────────────────────────────────────────

/**
 * Prüft ob ein Monat (1..12) in der Saison liegt (mit Wrap-Around).
 *
 * - `start` + `end` beide null → ganzjährig
 * - `start <= end` (z.B. 4–9 Sommer) → linear
 * - `start > end` (z.B. 11–3 Winter) → Wrap-Around: month >= start ODER month <= end
 * - Nur einer gesetzt: anderer wird als 1 (start) bzw. 12 (end) interpretiert
 */
export function isInSeason(
  month: number,
  seasonalStart: number | null,
  seasonalEnd: number | null
): boolean {
  if (seasonalStart === null && seasonalEnd === null) return true;
  const start = seasonalStart ?? 1;
  const end = seasonalEnd ?? 12;
  if (start <= end) {
    return month >= start && month <= end;
  }
  // Wrap-Around (z.B. 11 → 3)
  return month >= start || month <= end;
}

// ─── Frequency-Detail Helpers ───────────────────────────────────────────────

interface WeeklyDetail {
  dayOfWeek?: number;
  weekdays?: number[];
}
interface BiweeklyDetail {
  dayOfWeek: number;
  oddWeek?: boolean;
}
interface MonthlyDetail {
  dayOfMonth?: number;
  weekOfMonth?: number;
  dayOfWeek?: number;
}
interface PeriodicDetail {
  months?: number[];
}

/** Liefert die 7 Tage einer ISO-Woche (Montag..Sonntag) als Date-Array. */
function isoWeekDays(weekStart: Date): Date[] {
  const monday = startOfISOWeek(weekStart);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Mappe ISO-day-of-week 1..7 (Mon..Sun) auf JS getDay() (0=Sun, 1=Mon, ...) → ISO. */
function isoDayOfWeek(date: Date): number {
  const js = date.getDay();
  return js === 0 ? 7 : js;
}

/** Berechnet "Wochen-im-Monat" (1..5) für einen ISO-Wochentag. */
function weekOfMonth(date: Date, isoDow: number): number {
  // Erster Tag im Monat
  const firstOfMonth = startOfMonth(date);
  // ISO-Tag des 1. im Monat
  const firstDow = isoDayOfWeek(firstOfMonth);
  // Tage bis zum ersten passenden Wochentag
  const offset = (isoDow - firstDow + 7) % 7;
  const firstOccurrence = addDays(firstOfMonth, offset);
  // Vom ersten Vorkommen weg in 7-Tage-Schritten zählen
  const diffDays = (date.getTime() - firstOccurrence.getTime()) / (1000 * 60 * 60 * 24);
  return Math.floor(diffDays / 7) + 1;
}

// ─── Pure: Datumsberechnung pro Frequenz ────────────────────────────────────

export interface PropertyServiceForEngine {
  id: string;
  property_id: string;
  service_type_id: string;
  frequency: string;
  frequency_detail: Record<string, unknown>;
  estimated_duration_min: number;
  time_window_start: string | null;
  time_window_end: string | null;
  priority: number;
  seasonal_start: number | null;
  seasonal_end: number | null;
}

/**
 * Pure: Liefert alle Tage einer Woche, an denen der Service stattfindet.
 * Saison wird hier mit einbezogen (außer-Saison → []).
 * weekStart wird zur ISO-Woche normalisiert.
 */
export function getDueDatesInWeek(ps: PropertyServiceForEngine, weekStart: Date): IsoDate[] {
  const days = isoWeekDays(weekStart);
  // Saison-Filter pro Tag (Service kann während der Woche Saison wechseln)
  const inSeasonDays = days.filter((d) =>
    isInSeason(getMonth(d) + 1, ps.seasonal_start, ps.seasonal_end)
  );
  if (inSeasonDays.length === 0) return [];

  const detail = ps.frequency_detail;
  const freq = ps.frequency as Frequency;
  const isoWeek = getISOWeek(weekStart);
  const result: Date[] = [];

  switch (freq) {
    case 'WEEKLY': {
      const d = detail as WeeklyDetail;
      const dows = d.weekdays ?? (d.dayOfWeek !== undefined ? [d.dayOfWeek] : []);
      for (const day of inSeasonDays) {
        if (dows.includes(isoDayOfWeek(day))) result.push(day);
      }
      break;
    }
    case 'BIWEEKLY': {
      const d = detail as unknown as BiweeklyDetail;
      const isOdd = isoWeek % 2 === 1;
      const wanted = d.oddWeek ?? false;
      if (wanted !== isOdd) break;
      for (const day of inSeasonDays) {
        if (isoDayOfWeek(day) === d.dayOfWeek) result.push(day);
      }
      break;
    }
    case 'MONTHLY': {
      const d = detail as MonthlyDetail;
      if (d.dayOfMonth !== undefined) {
        for (const day of inSeasonDays) {
          if (getDate(day) === d.dayOfMonth) result.push(day);
        }
      } else if (d.weekOfMonth !== undefined && d.dayOfWeek !== undefined) {
        for (const day of inSeasonDays) {
          if (isoDayOfWeek(day) !== d.dayOfWeek) continue;
          if (weekOfMonth(day, d.dayOfWeek) === d.weekOfMonth) result.push(day);
        }
      }
      break;
    }
    case 'QUARTERLY': {
      // 1. Woche im Quartal: ISO-KW 1, 14, 27, 40 (~13 Wochen Abstand)
      const d = detail as PeriodicDetail;
      const months = d.months ?? [1, 4, 7, 10];
      for (const day of inSeasonDays) {
        if (months.includes(getMonth(day) + 1) && isFirstWeekOfMonth(day)) {
          result.push(day);
          break; // Eine Woche → maximal ein "erstes Vorkommen"
        }
      }
      break;
    }
    case 'BIANNUAL': {
      const d = detail as PeriodicDetail;
      const months = d.months ?? [5, 11];
      for (const day of inSeasonDays) {
        if (months.includes(getMonth(day) + 1) && isFirstWeekOfMonth(day)) {
          result.push(day);
          break;
        }
      }
      break;
    }
    case 'ANNUAL': {
      const d = detail as PeriodicDetail;
      const months = d.months ?? [4];
      for (const day of inSeasonDays) {
        if (months.includes(getMonth(day) + 1) && isFirstWeekOfMonth(day)) {
          result.push(day);
          break;
        }
      }
      break;
    }
    case 'ON_DEMAND':
      // Wird nie automatisch eingeplant
      break;
  }

  return result.map((d) => format(d, 'yyyy-MM-dd'));
}

/** True wenn `date` in der ersten Woche seines Monats liegt (d.h. enthält den 1. bis 7. des Monats). */
function isFirstWeekOfMonth(date: Date): boolean {
  return getDate(date) <= 7;
}

/** Pure: ist ein Service in der angegebenen Woche überhaupt fällig? */
export function isServiceDueInWeek(ps: PropertyServiceForEngine, weekStart: Date): boolean {
  return getDueDatesInWeek(ps, weekStart).length > 0;
}

// ─── Pure: Waste-Schedule-Logik ─────────────────────────────────────────────

export interface WasteScheduleForEngine {
  id: string;
  property_id: string;
  waste_bin_type_id: string;
  collection_days: Record<string, unknown>;
  latest_put_out: string | null;
  earliest_take_in: string | null;
  bin_count: number;
  location_description: string | null;
}

interface CollectionDays {
  daysOfWeek: number[];
  frequency: 'WEEKLY' | 'BIWEEKLY';
  evenWeeks?: boolean;
  oddWeeks?: boolean;
}

/**
 * Pure: Liefert Abfuhrtermine + put-out/take-in-Daten einer Woche.
 * Pro Termin enthält das Objekt:
 *   collectionDate: der Abfuhrtag
 *   putOutDate: Vortag (Tonne raus)
 *   takeInDate: Folgetag (Tonne rein)
 */
export interface WasteCollectionEvent {
  collectionDate: IsoDate;
  putOutDate: IsoDate;
  takeInDate: IsoDate;
}

export function getWasteCollectionsInWeek(
  ws: WasteScheduleForEngine,
  weekStart: Date
): WasteCollectionEvent[] {
  const days = isoWeekDays(weekStart);
  const cd = ws.collection_days as unknown as CollectionDays;
  const isoWeek = getISOWeek(weekStart);

  if (cd.frequency === 'BIWEEKLY') {
    const isOdd = isoWeek % 2 === 1;
    if (cd.oddWeeks === true && !isOdd) return [];
    if (cd.evenWeeks === true && isOdd) return [];
  }

  const events: WasteCollectionEvent[] = [];
  for (const day of days) {
    if (!cd.daysOfWeek.includes(isoDayOfWeek(day))) continue;
    events.push({
      collectionDate: format(day, 'yyyy-MM-dd'),
      putOutDate: format(addDays(day, -1), 'yyyy-MM-dd'),
      takeInDate: format(addDays(day, 1), 'yyyy-MM-dd'),
    });
  }
  return events;
}

// ─── DB-Loader (nutzen die Pure Functions) ──────────────────────────────────

export interface DueService {
  propertyServiceId: string;
  propertyId: string;
  serviceTypeId: string;
  dates: IsoDate[];
  estimatedDurationMin: number;
  timeWindowStart: string | null;
  timeWindowEnd: string | null;
  priority: number;
}

export interface DueWasteSchedule {
  wasteScheduleId: string;
  propertyId: string;
  wasteBinTypeId: string;
  events: WasteCollectionEvent[];
  latestPutOut: string | null;
  earliestTakeIn: string | null;
  binCount: number;
  locationDescription: string | null;
}

/**
 * Lädt alle aktiven Property-Services des Tenants und filtert auf
 * "fällig in dieser Woche".
 */
export async function getDueServicesForWeek(
  client: QueryRunner,
  tenantId: string,
  weekStart: Date
): Promise<DueService[]> {
  const r = await client.query<PropertyServiceForEngine>(
    `SELECT id, property_id, service_type_id, frequency, frequency_detail,
            estimated_duration_min, time_window_start, time_window_end,
            priority, seasonal_start, seasonal_end
     FROM property_services
     WHERE tenant_id = $1 AND is_active = TRUE AND is_deleted = FALSE`,
    [tenantId]
  );
  const result: DueService[] = [];
  for (const ps of r.rows) {
    const dates = getDueDatesInWeek(ps, weekStart);
    if (dates.length === 0) continue;
    result.push({
      propertyServiceId: ps.id,
      propertyId: ps.property_id,
      serviceTypeId: ps.service_type_id,
      dates,
      estimatedDurationMin: ps.estimated_duration_min,
      timeWindowStart: ps.time_window_start,
      timeWindowEnd: ps.time_window_end,
      priority: ps.priority,
    });
  }
  return result;
}

/**
 * Lädt alle aktiven Waste-Schedules des Tenants und filtert auf "fällig diese Woche".
 */
export async function getDueWasteSchedulesForWeek(
  client: QueryRunner,
  tenantId: string,
  weekStart: Date
): Promise<DueWasteSchedule[]> {
  const r = await client.query<WasteScheduleForEngine>(
    `SELECT id, property_id, waste_bin_type_id, collection_days,
            latest_put_out, earliest_take_in, bin_count, location_description
     FROM waste_schedules
     WHERE tenant_id = $1 AND is_active = TRUE AND is_deleted = FALSE`,
    [tenantId]
  );
  const result: DueWasteSchedule[] = [];
  for (const ws of r.rows) {
    const events = getWasteCollectionsInWeek(ws, weekStart);
    if (events.length === 0) continue;
    result.push({
      wasteScheduleId: ws.id,
      propertyId: ws.property_id,
      wasteBinTypeId: ws.waste_bin_type_id,
      events,
      latestPutOut: ws.latest_put_out,
      earliestTakeIn: ws.earliest_take_in,
      binCount: ws.bin_count,
      locationDescription: ws.location_description,
    });
  }
  return result;
}

/** Helfer: parst YYYY-MM-DD und liefert den Montag der ISO-Woche. */
export function normalizeToWeekStart(isoDate: string): Date {
  return startOfISOWeek(parseISO(isoDate));
}

/** Helfer: ISO-KW + Year für eine Woche. */
export function weekInfo(weekStart: Date): { isoWeek: number; year: number; end: IsoDate } {
  return {
    isoWeek: getISOWeek(weekStart),
    year: getYear(weekStart),
    end: format(endOfISOWeek(weekStart), 'yyyy-MM-dd'),
  };
}
