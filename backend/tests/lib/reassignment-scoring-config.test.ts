// Sanity-Checks für REASSIGNMENT_SCORING-Konstanten (ELE-190 / ADR-19).
// Stellt sicher dass die Gewichte konsistent sind und nicht durch
// versehentliche Änderungen "driften" (Summe ≠ 100, Schwellwerte außerhalb 0-100).

import { describe, expect, it } from 'vitest';
import { REASSIGNMENT_SCORING } from '../../src/config.js';

describe('REASSIGNMENT_SCORING constants (ELE-190 / ADR-19)', () => {
  it('WEIGHTS Summe = WEIGHT_TOTAL_SANITY', () => {
    const sum = Object.values(REASSIGNMENT_SCORING.WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(REASSIGNMENT_SCORING.WEIGHT_TOTAL_SANITY);
  });

  it('alle fünf Gewichts-Keys vorhanden', () => {
    expect(REASSIGNMENT_SCORING.WEIGHTS.capacity).toBeGreaterThan(0);
    expect(REASSIGNMENT_SCORING.WEIGHTS.proximity).toBeGreaterThan(0);
    expect(REASSIGNMENT_SCORING.WEIGHTS.qualification).toBeGreaterThan(0);
    expect(REASSIGNMENT_SCORING.WEIGHTS.experience).toBeGreaterThan(0);
    expect(REASSIGNMENT_SCORING.WEIGHTS.fairness).toBeGreaterThan(0);
  });

  it('MIN_SCORE_TO_SUGGEST liegt im Bereich [0, 100]', () => {
    expect(REASSIGNMENT_SCORING.MIN_SCORE_TO_SUGGEST).toBeGreaterThanOrEqual(0);
    expect(REASSIGNMENT_SCORING.MIN_SCORE_TO_SUGGEST).toBeLessThanOrEqual(100);
  });

  it('MAX_SUGGESTIONS ist eine positive ganze Zahl', () => {
    expect(REASSIGNMENT_SCORING.MAX_SUGGESTIONS).toBeGreaterThan(0);
    expect(Number.isInteger(REASSIGNMENT_SCORING.MAX_SUGGESTIONS)).toBe(true);
  });

  it('Sättigungs-Konstanten sind positiv', () => {
    expect(REASSIGNMENT_SCORING.MAX_USEFUL_KM).toBeGreaterThan(0);
    expect(REASSIGNMENT_SCORING.EXPERIENCE_SATURATION_MONTHS).toBeGreaterThan(0);
    expect(REASSIGNMENT_SCORING.FAIR_LOOKBACK_WEEKS).toBeGreaterThan(0);
    expect(REASSIGNMENT_SCORING.MAX_FAIR_VERTRETUNGEN).toBeGreaterThan(0);
  });

  it('MIN_QUALIFICATION_LEVEL ist ein gültiger Level-String', () => {
    expect(['BASIC', 'INTERMEDIATE', 'EXPERT', 'MASTER']).toContain(
      REASSIGNMENT_SCORING.MIN_QUALIFICATION_LEVEL
    );
  });

  it('EQUIPMENT_HARD_FILTER ist boolean', () => {
    expect(typeof REASSIGNMENT_SCORING.EQUIPMENT_HARD_FILTER).toBe('boolean');
  });

  it('Capacity hat das höchste Gewicht (ADR-19 Rationale)', () => {
    const w = REASSIGNMENT_SCORING.WEIGHTS;
    expect(w.capacity).toBeGreaterThanOrEqual(w.proximity);
    expect(w.capacity).toBeGreaterThanOrEqual(w.qualification);
    expect(w.capacity).toBeGreaterThanOrEqual(w.experience);
    expect(w.capacity).toBeGreaterThanOrEqual(w.fairness);
  });

  it('Fairness hat das niedrigste Gewicht (ADR-19 Rationale)', () => {
    const w = REASSIGNMENT_SCORING.WEIGHTS;
    expect(w.fairness).toBeLessThanOrEqual(w.experience);
    expect(w.fairness).toBeLessThanOrEqual(w.qualification);
    expect(w.fairness).toBeLessThanOrEqual(w.proximity);
    expect(w.fairness).toBeLessThanOrEqual(w.capacity);
  });
});
