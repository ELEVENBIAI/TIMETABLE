import { describe, expect, it } from 'vitest';
import { parseISO } from 'date-fns';
import {
  getDueDatesInWeek,
  getWasteCollectionsInWeek,
  isInSeason,
  isServiceDueInWeek,
  normalizeToWeekStart,
  weekInfo,
  type PropertyServiceForEngine,
  type WasteScheduleForEngine,
} from '../../../src/services/scheduling/frequency-engine.js';

function service(overrides: Partial<PropertyServiceForEngine>): PropertyServiceForEngine {
  return {
    id: 'ps-1',
    property_id: 'p-1',
    service_type_id: 'st-1',
    frequency: 'WEEKLY',
    frequency_detail: {},
    estimated_duration_min: 30,
    time_window_start: null,
    time_window_end: null,
    priority: 3,
    seasonal_start: null,
    seasonal_end: null,
    ...overrides,
  };
}

function wasteSchedule(overrides: Partial<WasteScheduleForEngine>): WasteScheduleForEngine {
  return {
    id: 'ws-1',
    property_id: 'p-1',
    waste_bin_type_id: 'wb-1',
    collection_days: { daysOfWeek: [2], frequency: 'WEEKLY' } as unknown as Record<string, unknown>,
    latest_put_out: '06:00',
    earliest_take_in: '20:00',
    bin_count: 1,
    location_description: 'Hof',
    ...overrides,
  };
}

// Bekannte Wochen für Tests:
// KW 21 2026 starts Monday 2026-05-18 (Mai-Wahl)
// KW 14 2026 starts Monday 2026-03-30 (Quartalsanfang April)
const week21 = parseISO('2026-05-18'); // KW 21 (ungerade)
const week22 = parseISO('2026-05-25'); // KW 22 (gerade)
const week20 = parseISO('2026-05-11'); // KW 20 (gerade), enthält 15. Mai 2026 (Freitag)
const week14 = parseISO('2026-03-30'); // KW 14 — erste Apr-Woche (Quartal)
const week45 = parseISO('2026-11-02'); // KW 45 — erste Nov-Woche (Biannual)

describe('isInSeason — Saison-Wrap', () => {
  it('ganzjährig wenn beide null', () => {
    expect(isInSeason(7, null, null)).toBe(true);
  });

  it('linear: Sommer-Service Mai (start ≤ end)', () => {
    expect(isInSeason(5, 4, 9)).toBe(true);
    expect(isInSeason(10, 4, 9)).toBe(false);
  });

  it('Wrap-Around: Winterdienst Nov–Mär', () => {
    expect(isInSeason(12, 11, 3)).toBe(true);
    expect(isInSeason(2, 11, 3)).toBe(true);
    expect(isInSeason(5, 11, 3)).toBe(false);
  });

  it('nur start gesetzt → bis Dezember', () => {
    expect(isInSeason(6, 5, null)).toBe(true);
    expect(isInSeason(4, 5, null)).toBe(false);
  });
});

describe('getDueDatesInWeek — WEEKLY', () => {
  it('WEEKLY dayOfWeek=1 → liefert Montag der Woche', () => {
    const ps = service({ frequency: 'WEEKLY', frequency_detail: { dayOfWeek: 1 } });
    expect(getDueDatesInWeek(ps, week21)).toEqual(['2026-05-18']);
  });

  it('WEEKLY weekdays=[1,4] → liefert Mo + Do', () => {
    const ps = service({ frequency: 'WEEKLY', frequency_detail: { weekdays: [1, 4] } });
    expect(getDueDatesInWeek(ps, week21)).toEqual(['2026-05-18', '2026-05-21']);
  });

  it('WEEKLY mit Saison außerhalb → []', () => {
    const ps = service({
      frequency: 'WEEKLY',
      frequency_detail: { dayOfWeek: 1 },
      seasonal_start: 11,
      seasonal_end: 3,
    });
    expect(getDueDatesInWeek(ps, week21)).toEqual([]); // Mai außerhalb Nov–Mär
  });
});

describe('getDueDatesInWeek — BIWEEKLY', () => {
  it('oddWeek=true in ungerader KW 21 → liefert', () => {
    const ps = service({
      frequency: 'BIWEEKLY',
      frequency_detail: { dayOfWeek: 3, oddWeek: true },
    });
    expect(getDueDatesInWeek(ps, week21)).toEqual(['2026-05-20']);
  });

  it('oddWeek=true in gerader KW 22 → []', () => {
    const ps = service({
      frequency: 'BIWEEKLY',
      frequency_detail: { dayOfWeek: 3, oddWeek: true },
    });
    expect(getDueDatesInWeek(ps, week22)).toEqual([]);
  });

  it('oddWeek nicht gesetzt = false → liefert nur in geraden Wochen', () => {
    const ps = service({
      frequency: 'BIWEEKLY',
      frequency_detail: { dayOfWeek: 1 },
    });
    expect(getDueDatesInWeek(ps, week22)).toEqual(['2026-05-25']);
    expect(getDueDatesInWeek(ps, week21)).toEqual([]);
  });
});

describe('getDueDatesInWeek — MONTHLY', () => {
  it('dayOfMonth=15 → liefert in der Woche die den 15. enthält', () => {
    const ps = service({
      frequency: 'MONTHLY',
      frequency_detail: { dayOfMonth: 15 },
    });
    // 2026-05-15 = Freitag, in KW 20
    expect(getDueDatesInWeek(ps, week20)).toEqual(['2026-05-15']);
    // In KW 21 ist der 15. nicht enthalten
    expect(getDueDatesInWeek(ps, week21)).toEqual([]);
  });

  it('weekOfMonth=1 + dayOfWeek=4 → 1. Donnerstag im Monat', () => {
    const ps = service({
      frequency: 'MONTHLY',
      frequency_detail: { weekOfMonth: 1, dayOfWeek: 4 },
    });
    // KW 14 (30.03 - 05.04.2026) → 1. April 2026 ist Mittwoch, 2. April Donnerstag
    // 2. April ist der 1. Donnerstag im April
    expect(getDueDatesInWeek(ps, week14)).toContain('2026-04-02');
  });
});

describe('getDueDatesInWeek — QUARTERLY / BIANNUAL / ANNUAL / ON_DEMAND', () => {
  it('QUARTERLY: liefert in erster Aprilwoche', () => {
    const ps = service({ frequency: 'QUARTERLY', frequency_detail: {} });
    const dates = getDueDatesInWeek(ps, week14);
    expect(dates.length).toBeGreaterThan(0);
    expect(dates[0]).toMatch(/2026-(03|04)-/); // KW 14 enthält 30.03 und 1.4
  });

  it('QUARTERLY: KW 21 (Mai) → []', () => {
    const ps = service({ frequency: 'QUARTERLY', frequency_detail: {} });
    expect(getDueDatesInWeek(ps, week21)).toEqual([]);
  });

  it('BIANNUAL Default-Monate Mai+November: KW 45 (1. Novemberwoche) liefert', () => {
    const ps = service({ frequency: 'BIANNUAL', frequency_detail: {} });
    const dates = getDueDatesInWeek(ps, week45);
    expect(dates.length).toBeGreaterThan(0);
  });

  it('ANNUAL Default Monat April: KW 14 liefert', () => {
    const ps = service({ frequency: 'ANNUAL', frequency_detail: {} });
    const dates = getDueDatesInWeek(ps, week14);
    expect(dates.length).toBeGreaterThan(0);
  });

  it('ON_DEMAND: immer []', () => {
    const ps = service({ frequency: 'ON_DEMAND', frequency_detail: {} });
    expect(getDueDatesInWeek(ps, week21)).toEqual([]);
    expect(getDueDatesInWeek(ps, week14)).toEqual([]);
  });
});

describe('isServiceDueInWeek', () => {
  it('liefert true wenn ≥1 Datum, false wenn []', () => {
    const ps = service({ frequency: 'WEEKLY', frequency_detail: { dayOfWeek: 1 } });
    expect(isServiceDueInWeek(ps, week21)).toBe(true);
    const ps2 = service({ frequency: 'ON_DEMAND', frequency_detail: {} });
    expect(isServiceDueInWeek(ps2, week21)).toBe(false);
  });
});

describe('getWasteCollectionsInWeek', () => {
  it('WEEKLY Di → 1 Termin mit put-out und take-in', () => {
    const ws = wasteSchedule({
      collection_days: { daysOfWeek: [2], frequency: 'WEEKLY' } as unknown as Record<
        string,
        unknown
      >,
    });
    const events = getWasteCollectionsInWeek(ws, week21);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      collectionDate: '2026-05-19', // Dienstag
      putOutDate: '2026-05-18',
      takeInDate: '2026-05-20',
    });
  });

  it('BIWEEKLY oddWeeks=true in ungerader KW 21 → liefert', () => {
    const ws = wasteSchedule({
      collection_days: {
        daysOfWeek: [3],
        frequency: 'BIWEEKLY',
        oddWeeks: true,
      } as unknown as Record<string, unknown>,
    });
    const events = getWasteCollectionsInWeek(ws, week21);
    expect(events).toHaveLength(1);
  });

  it('BIWEEKLY oddWeeks=true in gerader KW 22 → []', () => {
    const ws = wasteSchedule({
      collection_days: {
        daysOfWeek: [3],
        frequency: 'BIWEEKLY',
        oddWeeks: true,
      } as unknown as Record<string, unknown>,
    });
    expect(getWasteCollectionsInWeek(ws, week22)).toEqual([]);
  });
});

describe('Helpers', () => {
  it('normalizeToWeekStart führt zum ISO-Montag', () => {
    // 2026-05-22 (Freitag) → Montag derselben Woche: 2026-05-18
    const ws = normalizeToWeekStart('2026-05-22');
    expect(ws.getDate()).toBe(18);
  });

  it('weekInfo liefert KW + Year + end', () => {
    const info = weekInfo(week21);
    expect(info.isoWeek).toBe(21);
    expect(info.year).toBe(2026);
    expect(info.end).toBe('2026-05-24');
  });
});
