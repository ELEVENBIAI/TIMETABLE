// Pure Scoring-Function Unit-Tests (ELE-196).
// Alle Tests sind pure — kein DB, kein Mock, kein Setup.

import { describe, expect, it } from 'vitest';
import {
  applyContingencyBonus,
  hardFilterBlockerKeys,
  haversineKm,
  scoreCapacity,
  scoreCandidate,
  scoreExperience,
  scoreFairness,
  scoreProximity,
  scoreQualification,
  splitSuggestions,
  type CandidateInput,
  type EntryInput,
  type Suggestion,
} from '../../src/services/scheduling/reassignment-pure.js';

const BASE_CANDIDATE: CandidateInput = {
  employeeId: 'emp-1',
  employeeName: 'Test Person',
  isActive: true,
  isDeleted: false,
  weeklyHoursTarget: 40,
  plannedMinutesThisWeek: 600, // 10h
  homeLat: 50.94,
  homeLng: 6.96, // Köln
  validQualificationCount: 2,
  visitsAtPropertyLast6Mo: 3,
  reassignmentsInWindow: 2,
  hasAbsenceOnDate: false,
  absenceType: null,
  hasTimeConflict: false,
  conflictingStartTime: null,
  isSameAsOrigin: false,
  contingencyPriority: null,
};

const BASE_ENTRY: EntryInput = {
  durationMin: 30,
  propertyLat: 50.95, // ~1 km nördlich
  propertyLng: 6.96,
};

// ─── haversineKm ──────────────────────────────────────────────────────────

describe('haversineKm', () => {
  it('liefert 0 km bei identischen Koordinaten', () => {
    expect(haversineKm(50.94, 6.96, 50.94, 6.96)).toBe(0);
  });

  it('berechnet ~1 km zwischen 50.94/6.96 und 50.95/6.96', () => {
    const km = haversineKm(50.94, 6.96, 50.95, 6.96);
    expect(km).toBeGreaterThan(0.9);
    expect(km).toBeLessThan(1.5);
  });

  it('ist symmetrisch (A→B = B→A)', () => {
    const a = haversineKm(50.94, 6.96, 51.0, 7.0);
    const b = haversineKm(51.0, 7.0, 50.94, 6.96);
    expect(a).toBeCloseTo(b, 5);
  });
});

// ─── scoreCapacity ─────────────────────────────────────────────────────────

describe('scoreCapacity', () => {
  it('liefert 100 bei 0 geplanten Minuten und 40h Vertrag', () => {
    expect(scoreCapacity(0, 40)).toBe(100);
  });

  it('liefert 0 bei voll ausgelastetem 40h-Vertrag (2400 min)', () => {
    expect(scoreCapacity(2400, 40)).toBe(0);
  });

  it('liefert 50 bei halb ausgelastetem 40h-Vertrag (1200 min)', () => {
    expect(scoreCapacity(1200, 40)).toBe(50);
  });

  it('liefert 50 (neutral) wenn weeklyHoursTarget=null', () => {
    expect(scoreCapacity(0, null)).toBe(50);
    expect(scoreCapacity(2400, null)).toBe(50);
  });

  it('clamped bei Überstunden (> 100% ausgelastet) auf 0', () => {
    expect(scoreCapacity(3000, 40)).toBe(0); // 50h geplant in 40h-Vertrag
  });
});

// ─── scoreProximity ────────────────────────────────────────────────────────

describe('scoreProximity', () => {
  it('liefert 100 bei identischen Koordinaten', () => {
    const r = scoreProximity(50.94, 6.96, 50.94, 6.96, 20);
    expect(r.score).toBe(100);
    expect(r.distanceKm).toBe(0);
  });

  it('liefert 0 wenn Distanz ≥ maxUsefulKm', () => {
    // Berlin ↔ Köln ist ~480 km, weit über 20 km
    const r = scoreProximity(52.52, 13.4, 50.94, 6.96, 20);
    expect(r.score).toBe(0);
    expect(r.distanceKm).toBeGreaterThan(400);
  });

  it('liefert 50 (neutral) wenn home-Koordinaten null', () => {
    const r = scoreProximity(null, null, 50.94, 6.96, 20);
    expect(r.score).toBe(50);
    expect(r.distanceKm).toBe(null);
  });

  it('liefert 50 (neutral) wenn property-Koordinaten null', () => {
    const r = scoreProximity(50.94, 6.96, null, null, 20);
    expect(r.score).toBe(50);
  });

  it('liefert ~95 bei ~1 km Distanz und maxUsefulKm=20', () => {
    const r = scoreProximity(50.94, 6.96, 50.95, 6.96, 20);
    expect(r.score).toBeGreaterThan(94);
    expect(r.score).toBeLessThan(96);
  });
});

// ─── scoreQualification ────────────────────────────────────────────────────

describe('scoreQualification', () => {
  it('0 Qualifikationen → 0', () => {
    expect(scoreQualification(0)).toBe(0);
  });

  it('1 Qualifikation → 33.33', () => {
    expect(scoreQualification(1)).toBeCloseTo(33.33, 1);
  });

  it('3+ Qualifikationen sättigen auf 100', () => {
    expect(scoreQualification(3)).toBe(100);
    expect(scoreQualification(5)).toBe(100);
    expect(scoreQualification(10)).toBe(100);
  });
});

// ─── scoreExperience ────────────────────────────────────────────────────────

describe('scoreExperience', () => {
  it('0 Visits → 0', () => {
    expect(scoreExperience(0, 6)).toBe(0);
  });

  it('3 Visits bei sat=6 → 50', () => {
    expect(scoreExperience(3, 6)).toBe(50);
  });

  it('6+ Visits sättigen auf 100', () => {
    expect(scoreExperience(6, 6)).toBe(100);
    expect(scoreExperience(20, 6)).toBe(100);
  });

  it('saturationMonths=0 → score 0 (Schutz gegen Div/0)', () => {
    expect(scoreExperience(5, 0)).toBe(0);
  });
});

// ─── scoreFairness ──────────────────────────────────────────────────────────

describe('scoreFairness', () => {
  it('0 Reassignments → 100', () => {
    expect(scoreFairness(0, 8)).toBe(100);
  });

  it('4 Reassignments bei max=8 → 50', () => {
    expect(scoreFairness(4, 8)).toBe(50);
  });

  it('8+ Reassignments sättigen auf 0', () => {
    expect(scoreFairness(8, 8)).toBe(0);
    expect(scoreFairness(20, 8)).toBe(0);
  });

  it('maxFair=0 → score 100 (Schutz, sollte nicht passieren)', () => {
    expect(scoreFairness(5, 0)).toBe(100);
  });
});

// ─── applyContingencyBonus ──────────────────────────────────────────────────

describe('applyContingencyBonus', () => {
  it('ohne Match → keine Änderung', () => {
    const r = applyContingencyBonus(60, null);
    expect(r.score).toBe(60);
    expect(r.bonus).toBe(0);
  });

  it('Priority 1 → +10 Bonus', () => {
    const r = applyContingencyBonus(60, 1);
    expect(r.score).toBe(70);
    expect(r.bonus).toBe(10);
  });

  it('Priority 10 → +1 Bonus', () => {
    const r = applyContingencyBonus(60, 10);
    expect(r.score).toBe(61);
    expect(r.bonus).toBe(1);
  });

  it('Cap auf 100', () => {
    const r = applyContingencyBonus(95, 1);
    expect(r.score).toBe(100);
  });
});

// ─── hardFilterBlockerKeys ──────────────────────────────────────────────────

describe('hardFilterBlockerKeys', () => {
  it('aktiver Kandidat ohne Absence → keine Blocker', () => {
    expect(hardFilterBlockerKeys(BASE_CANDIDATE)).toEqual([]);
  });

  it('inaktiv → inactive-Blocker', () => {
    const blockers = hardFilterBlockerKeys({ ...BASE_CANDIDATE, isActive: false });
    expect(blockers.find((b) => b.key === 'reassignment.blockers.inactive')).toBeTruthy();
  });

  it('Absence am Tag → hasAbsence-Blocker mit absenceType', () => {
    const blockers = hardFilterBlockerKeys({
      ...BASE_CANDIDATE,
      hasAbsenceOnDate: true,
      absenceType: 'SICK',
    });
    const b = blockers.find((x) => x.key === 'reassignment.blockers.hasAbsence');
    expect(b).toBeTruthy();
    expect(b?.vars?.absenceType).toBe('SICK');
  });

  it('Time-Conflict → timeConflict-Blocker mit startTime', () => {
    const blockers = hardFilterBlockerKeys({
      ...BASE_CANDIDATE,
      hasTimeConflict: true,
      conflictingStartTime: '08:00',
    });
    const b = blockers.find((x) => x.key === 'reassignment.blockers.timeConflict');
    expect(b?.vars?.startTime).toBe('08:00');
  });

  it('Self-Reassignment → selfReassignment-Blocker', () => {
    const blockers = hardFilterBlockerKeys({ ...BASE_CANDIDATE, isSameAsOrigin: true });
    expect(blockers.find((b) => b.key === 'reassignment.blockers.selfReassignment')).toBeTruthy();
  });
});

// ─── scoreCandidate (Composite) ─────────────────────────────────────────────

describe('scoreCandidate', () => {
  it('liefert deterministisch denselben Score bei identischen Inputs', () => {
    const a = scoreCandidate({ candidate: BASE_CANDIDATE, entry: BASE_ENTRY });
    const b = scoreCandidate({ candidate: BASE_CANDIDATE, entry: BASE_ENTRY });
    expect(a.score).toBe(b.score);
    expect(a.factorScores).toEqual(b.factorScores);
  });

  it('idealer Kandidat (alle 100) → Score ~100', () => {
    const candidate: CandidateInput = {
      ...BASE_CANDIDATE,
      plannedMinutesThisWeek: 0,
      visitsAtPropertyLast6Mo: 10,
      reassignmentsInWindow: 0,
      validQualificationCount: 5,
      homeLat: 50.95,
      homeLng: 6.96, // gleich Property
    };
    const r = scoreCandidate({
      candidate,
      entry: { ...BASE_ENTRY, propertyLat: 50.95, propertyLng: 6.96 },
    });
    expect(r.score).toBeGreaterThan(95);
    expect(r.blockerKeys).toEqual([]);
  });

  it('Hard-Filter setzt finalen Score auf 0', () => {
    const r = scoreCandidate({
      candidate: { ...BASE_CANDIDATE, hasAbsenceOnDate: true, absenceType: 'SICK' },
      entry: BASE_ENTRY,
    });
    expect(r.score).toBe(0);
    expect(r.blockerKeys.length).toBeGreaterThan(0);
    expect(r.reasonKeys).toEqual([]);
  });

  it('Contingency-Match boostet Score', () => {
    const without = scoreCandidate({ candidate: BASE_CANDIDATE, entry: BASE_ENTRY });
    const withMatch = scoreCandidate({
      candidate: { ...BASE_CANDIDATE, contingencyPriority: 1 },
      entry: BASE_ENTRY,
    });
    expect(withMatch.score).toBeGreaterThan(without.score);
    expect(withMatch.factorScores.contingencyBonus).toBe(10);
  });

  it('reasonKeys enthält contingencyMatch wenn priority gesetzt', () => {
    const r = scoreCandidate({
      candidate: { ...BASE_CANDIDATE, contingencyPriority: 3 },
      entry: BASE_ENTRY,
    });
    expect(
      r.reasonKeys.find((x) => x.key === 'reassignment.reasons.contingencyMatch')
    ).toBeTruthy();
  });

  it('Faktor-Scores sind auf 1 Nachkommastelle gerundet', () => {
    const r = scoreCandidate({ candidate: BASE_CANDIDATE, entry: BASE_ENTRY });
    expect(Number.isInteger(r.factorScores.capacity * 10)).toBe(true);
    expect(Number.isInteger(r.factorScores.proximity * 10)).toBe(true);
  });
});

// ─── splitSuggestions ──────────────────────────────────────────────────────

describe('splitSuggestions', () => {
  const makeSugg = (score: number, blockers: Suggestion['blockerKeys'] = []): Suggestion => ({
    employeeId: `emp-${score}`,
    employeeName: `Name ${score}`,
    score,
    factorScores: {
      capacity: score,
      proximity: 0,
      qualification: 0,
      experience: 0,
      fairness: 0,
      contingencyBonus: 0,
    },
    reasonKeys: [],
    blockerKeys: blockers,
  });

  it('sortiert nach Score absteigend', () => {
    const r = splitSuggestions([makeSugg(50), makeSugg(80), makeSugg(60)]);
    expect(r.suggestions.map((s) => s.score)).toEqual([80, 60, 50]);
  });

  it('Hard-Geblockte landen in blocked-Array', () => {
    const r = splitSuggestions([
      makeSugg(80),
      makeSugg(70, [{ key: 'reassignment.blockers.hasAbsence' }]),
    ]);
    expect(r.suggestions.length).toBe(1);
    expect(r.blocked.length).toBe(1);
  });

  it('Score < MIN_SCORE_TO_SUGGEST landet in blocked mit lowScore-Key', () => {
    const r = splitSuggestions([makeSugg(80), makeSugg(20)]);
    expect(r.suggestions.length).toBe(1);
    expect(r.blocked[0].blockerKeys[0].key).toBe('reassignment.blockers.lowScore');
  });

  it('respektiert MAX_SUGGESTIONS (Default 3)', () => {
    const r = splitSuggestions([
      makeSugg(90),
      makeSugg(85),
      makeSugg(80),
      makeSugg(75),
      makeSugg(70),
    ]);
    expect(r.suggestions.length).toBe(3);
    expect(r.blocked.length).toBe(2);
    expect(
      r.blocked.every((b) => b.blockerKeys[0].key === 'reassignment.blockers.outsideTopN')
    ).toBe(true);
  });
});
