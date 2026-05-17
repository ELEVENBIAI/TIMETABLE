// Date-Utilities für Wochenplan (ELE-180). ISO-KW (Mo als Start).

import {
  addDays,
  addWeeks,
  format,
  formatISO,
  getISOWeek,
  getISOWeekYear,
  parseISO,
  startOfISOWeek,
} from 'date-fns';
import { de, enUS } from 'date-fns/locale';

const LOCALES = { en: enUS, de };

export function getWeekStartFromDate(date: Date): Date {
  return startOfISOWeek(date);
}

export function getCurrentWeekStart(): Date {
  return startOfISOWeek(new Date());
}

export function toISODate(date: Date): string {
  return formatISO(date, { representation: 'date' });
}

export function parseISODate(iso: string): Date {
  return parseISO(iso);
}

export function addWeeksToDate(date: Date, n: number): Date {
  return addWeeks(date, n);
}

export interface WeekMeta {
  weekStart: Date;
  weekNumber: number;
  year: number;
}

export function getWeekMeta(date: Date): WeekMeta {
  const ws = startOfISOWeek(date);
  return {
    weekStart: ws,
    weekNumber: getISOWeek(ws),
    year: getISOWeekYear(ws),
  };
}

export function formatWeekRange(weekStart: Date, locale: 'en' | 'de' = 'en'): string {
  const friday = addDays(weekStart, 4);
  const loc = LOCALES[locale];
  const start = format(weekStart, 'd. MMM', { locale: loc });
  const end = format(friday, 'd. MMM yyyy', { locale: loc });
  const wn = getISOWeek(weekStart);
  return locale === 'de' ? `KW ${wn} · ${start} – ${end}` : `Week ${wn} · ${start} – ${end}`;
}

export function formatDayHeader(date: Date, locale: 'en' | 'de' = 'en'): string {
  const loc = LOCALES[locale];
  return format(date, 'EEEE d.M.', { locale: loc });
}

export function formatTime(hhmmss: string | null): string {
  if (!hhmmss) return '';
  // "07:00:00" → "07:00"
  return hhmmss.slice(0, 5);
}

/**
 * Minuten ab 07:00 für die Y-Achse im Outlook-Kalender.
 * "07:00:00" → 0, "07:30:00" → 30, "13:15:00" → 6*60 + 15 = 375
 */
export function minutesFromGridStart(hhmmss: string | null, gridStartHour = 7): number {
  if (!hhmmss) return 0;
  const [h, m] = hhmmss.split(':').map(Number);
  return (h - gridStartHour) * 60 + (m ?? 0);
}

export function formatDurationLabel(min: number, locale: 'en' | 'de' = 'en'): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  if (locale === 'de') return rest === 0 ? `${h} h` : `${h} h ${rest} min`;
  return rest === 0 ? `${h} h` : `${h} h ${rest} min`;
}
