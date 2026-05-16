import { describe, expect, it } from 'vitest';
import {
  entriesOverlap,
  isValidStatusTransition,
  timeToMinutes,
} from '../../../src/services/scheduling/conflict-check.js';

describe('timeToMinutes', () => {
  it('konvertiert HH:MM korrekt', () => {
    expect(timeToMinutes('08:30')).toBe(510);
  });

  it('konvertiert HH:MM:SS (Sekunden ignoriert)', () => {
    expect(timeToMinutes('08:30:45')).toBe(510);
  });

  it('liefert null für null', () => {
    expect(timeToMinutes(null)).toBeNull();
  });
});

describe('entriesOverlap', () => {
  it('zwei Entries ohne startTime überlappen NICHT', () => {
    expect(
      entriesOverlap({ startTime: null, durationMin: 60 }, { startTime: null, durationMin: 60 })
    ).toBe(false);
  });

  it('Entry ohne startTime überlappt mit nichts', () => {
    expect(
      entriesOverlap({ startTime: null, durationMin: 60 }, { startTime: '08:00', durationMin: 60 })
    ).toBe(false);
  });

  it('komplett identische Slots → overlap', () => {
    expect(
      entriesOverlap(
        { startTime: '08:00', durationMin: 60 },
        { startTime: '08:00', durationMin: 60 }
      )
    ).toBe(true);
  });

  it('teilweise überlappend (8:00-9:00 vs 8:30-9:30) → overlap', () => {
    expect(
      entriesOverlap(
        { startTime: '08:00', durationMin: 60 },
        { startTime: '08:30', durationMin: 60 }
      )
    ).toBe(true);
  });

  it('Berührung am Endpunkt (8:00-9:00 vs 9:00-10:00) → KEIN overlap (halb-offen)', () => {
    expect(
      entriesOverlap(
        { startTime: '08:00', durationMin: 60 },
        { startTime: '09:00', durationMin: 60 }
      )
    ).toBe(false);
  });

  it('disjunkt (8:00-9:00 vs 10:00-11:00) → kein overlap', () => {
    expect(
      entriesOverlap(
        { startTime: '08:00', durationMin: 60 },
        { startTime: '10:00', durationMin: 60 }
      )
    ).toBe(false);
  });

  it('a vor b: a endet 1min vor b → kein overlap', () => {
    expect(
      entriesOverlap(
        { startTime: '08:00', durationMin: 59 },
        { startTime: '09:00', durationMin: 60 }
      )
    ).toBe(false);
  });

  it('a in b komplett enthalten → overlap', () => {
    expect(
      entriesOverlap(
        { startTime: '09:00', durationMin: 30 },
        { startTime: '08:00', durationMin: 180 }
      )
    ).toBe(true);
  });
});

describe('isValidStatusTransition', () => {
  it('DRAFT → PUBLISHED erlaubt', () => {
    expect(isValidStatusTransition('DRAFT', 'PUBLISHED')).toBe(true);
  });

  it('PUBLISHED → ARCHIVED erlaubt', () => {
    expect(isValidStatusTransition('PUBLISHED', 'ARCHIVED')).toBe(true);
  });

  it('DRAFT → ARCHIVED verboten (Sprung)', () => {
    expect(isValidStatusTransition('DRAFT', 'ARCHIVED')).toBe(false);
  });

  it('PUBLISHED → DRAFT verboten (rückwärts)', () => {
    expect(isValidStatusTransition('PUBLISHED', 'DRAFT')).toBe(false);
  });

  it('ARCHIVED → * verboten (Sackgasse)', () => {
    expect(isValidStatusTransition('ARCHIVED', 'PUBLISHED')).toBe(false);
    expect(isValidStatusTransition('ARCHIVED', 'DRAFT')).toBe(false);
  });

  it('Status auf sich selbst (Idempotenz)', () => {
    expect(isValidStatusTransition('DRAFT', 'DRAFT')).toBe(true);
  });
});
