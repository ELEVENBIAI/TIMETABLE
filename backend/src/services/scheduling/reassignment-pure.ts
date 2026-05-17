// Reassignment-Engine — Pure Scoring (ELE-196 / ADR-04 + ADR-19).
//
// Pure Functions berechnen Score und Reasons für einen Vertretungs-Kandidaten.
// KEIN DB-Zugriff, KEIN LLM, deterministisch — voll unit-testbar.
//
// Faktoren + Gewichte aus REASSIGNMENT_SCORING (lib/config.js, gesetzt in ADR-19):
//   Kapazität 30 / Nähe 25 / Qualifikation 20 / Erfahrung 15 / Fairness 10
//   + Contingency-Bonus bis +10 (final cap auf 100)
//
// Skalierung: jeder Faktor liefert 0..100, dann Linearkombination mit Gewichten.
// ────────────────────────────────────────────────────────────────────────────

import { REASSIGNMENT_SCORING } from '../../config.js';

export type AbsenceType = 'SICK' | 'VACATION' | 'PERSONAL' | 'TRAINING' | 'OTHER';

export interface I18nKey {
  key: string;
  vars?: Record<string, unknown>;
}

export interface CandidateInput {
  employeeId: string;
  employeeName: string;
  isActive: boolean;
  isDeleted: boolean;
  weeklyHoursTarget: number | null;
  plannedMinutesThisWeek: number;
  homeLat: number | null;
  homeLng: number | null;
  validQualificationCount: number;
  visitsAtPropertyLast6Mo: number;
  reassignmentsInWindow: number;
  hasAbsenceOnDate: boolean;
  absenceType: AbsenceType | null;
  hasTimeConflict: boolean;
  conflictingStartTime: string | null;
  isSameAsOrigin: boolean;
  contingencyPriority: number | null; // 1..10 (lower = higher precedence); null = no match
}

export interface EntryInput {
  durationMin: number;
  propertyLat: number | null;
  propertyLng: number | null;
}

export interface Suggestion {
  employeeId: string;
  employeeName: string;
  score: number;
  factorScores: {
    capacity: number;
    proximity: number;
    qualification: number;
    experience: number;
    fairness: number;
    contingencyBonus: number;
  };
  reasonKeys: I18nKey[];
  blockerKeys: I18nKey[];
}

// ─── Geo-Helper ────────────────────────────────────────────────────────────

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Erdradius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

// ─── Faktor-Scorer (jeder liefert 0..100) ─────────────────────────────────

/**
 * Kapazität: 100 wenn voll frei, 0 wenn voll ausgelastet.
 * Bei `weeklyHoursTarget=null` (kein Vertrag): 50 (neutral).
 */
export function scoreCapacity(
  plannedMinutesThisWeek: number,
  weeklyHoursTarget: number | null
): number {
  if (weeklyHoursTarget === null || weeklyHoursTarget <= 0) return 50;
  const plannedHours = plannedMinutesThisWeek / 60;
  const ratio = plannedHours / weeklyHoursTarget;
  return Math.max(0, Math.min(100, 100 * (1 - ratio)));
}

/**
 * Nähe: 100 wenn Distanz 0 km, 0 wenn ≥ maxUsefulKm. Linear dazwischen.
 * Bei null lat/lng auf einer Seite: 50 (neutral — wir wissen nicht).
 */
export function scoreProximity(
  empLat: number | null,
  empLng: number | null,
  propLat: number | null,
  propLng: number | null,
  maxUsefulKm: number
): { score: number; distanceKm: number | null } {
  if (empLat === null || empLng === null || propLat === null || propLng === null) {
    return { score: 50, distanceKm: null };
  }
  const km = haversineKm(empLat, empLng, propLat, propLng);
  const clamped = Math.max(0, Math.min(1, km / maxUsefulKm));
  return { score: 100 * (1 - clamped), distanceKm: km };
}

/**
 * Qualifikation: Sättigung bei 3 Qualifikationen.
 * 0 Quals → 0, 1 → 33, 2 → 67, ≥3 → 100.
 */
export function scoreQualification(validQualificationCount: number): number {
  return Math.min(100, (validQualificationCount / 3) * 100);
}

/**
 * Erfahrung: 0 Visits → 0, sättigt nach saturationMonths Besuchen.
 * Beispiel saturationMonths=6: 0→0, 3→50, 6+→100.
 */
export function scoreExperience(visitsAtPropertyLast6Mo: number, saturationMonths: number): number {
  if (saturationMonths <= 0) return 0;
  return Math.min(100, (visitsAtPropertyLast6Mo / saturationMonths) * 100);
}

/**
 * Fairness: weniger Vertretungen in den letzten N Wochen = höher.
 * 0 Vertretungen → 100, maxFair+ → 0.
 */
export function scoreFairness(reassignmentsInWindow: number, maxFair: number): number {
  if (maxFair <= 0) return 100;
  const ratio = Math.max(0, Math.min(1, reassignmentsInWindow / maxFair));
  return 100 * (1 - ratio);
}

/**
 * Contingency-Bonus: bei einer Match-Rule wird (11 − priority) Punkte
 * auf den Composite-Score addiert. Priority 1 (höchste) → +10, Priority 10 → +1.
 * Final-Cap auf 100.
 */
export function applyContingencyBonus(
  baseScore: number,
  contingencyPriority: number | null
): { score: number; bonus: number } {
  if (contingencyPriority === null) return { score: baseScore, bonus: 0 };
  const bonus = Math.max(0, Math.min(10, 11 - contingencyPriority));
  return { score: Math.min(100, baseScore + bonus), bonus };
}

// ─── Hard-Filter ──────────────────────────────────────────────────────────

export function hardFilterBlockerKeys(candidate: CandidateInput): I18nKey[] {
  const blockers: I18nKey[] = [];
  if (!candidate.isActive || candidate.isDeleted) {
    blockers.push({ key: 'reassignment.blockers.inactive' });
  }
  if (candidate.isSameAsOrigin) {
    blockers.push({ key: 'reassignment.blockers.selfReassignment' });
  }
  if (candidate.hasAbsenceOnDate) {
    blockers.push({
      key: 'reassignment.blockers.hasAbsence',
      vars: { absenceType: candidate.absenceType ?? 'OTHER' },
    });
  }
  if (candidate.hasTimeConflict) {
    blockers.push({
      key: 'reassignment.blockers.timeConflict',
      vars: { startTime: candidate.conflictingStartTime ?? 'unknown' },
    });
  }
  return blockers;
}

// ─── Reason-Generator ─────────────────────────────────────────────────────

function reasonsFromScores(
  factorScores: Suggestion['factorScores'],
  candidate: CandidateInput,
  distanceKm: number | null
): I18nKey[] {
  const reasons: I18nKey[] = [];

  // Top-Gründe (Schwelle ≥ 60): wir zeigen die stärksten Argumente an
  if (factorScores.capacity >= 60 && candidate.weeklyHoursTarget) {
    const plannedH = candidate.plannedMinutesThisWeek / 60;
    const freeH = Math.max(0, candidate.weeklyHoursTarget - plannedH);
    reasons.push({
      key: 'reassignment.reasons.capacityHigh',
      vars: { hoursFree: Math.round(freeH) },
    });
  }
  if (factorScores.proximity >= 60 && distanceKm !== null) {
    reasons.push({
      key: 'reassignment.reasons.proximityNear',
      vars: { km: Math.round(distanceKm) },
    });
  }
  if (factorScores.qualification >= 60) {
    reasons.push({
      key: 'reassignment.reasons.qualificationsCount',
      vars: { count: candidate.validQualificationCount },
    });
  }
  if (factorScores.experience >= 60) {
    reasons.push({
      key: 'reassignment.reasons.experienceVisits',
      vars: { visits: candidate.visitsAtPropertyLast6Mo },
    });
  }
  if (factorScores.fairness >= 60) {
    reasons.push({
      key: 'reassignment.reasons.fairnessLow',
      vars: { count: candidate.reassignmentsInWindow },
    });
  }
  if (candidate.contingencyPriority !== null) {
    reasons.push({
      key: 'reassignment.reasons.contingencyMatch',
      vars: { priority: candidate.contingencyPriority },
    });
  }

  return reasons;
}

// ─── Composite ────────────────────────────────────────────────────────────

export interface ScoreCandidateInput {
  candidate: CandidateInput;
  entry: EntryInput;
}

/**
 * Linear-Kombination der Faktor-Scores mit Gewichten aus REASSIGNMENT_SCORING.
 * Bei Hard-Filter-Block wird score=0 zurückgegeben + blockerKeys gefüllt.
 */
export function scoreCandidate({ candidate, entry }: ScoreCandidateInput): Suggestion {
  const blockerKeys = hardFilterBlockerKeys(candidate);

  // Auch geblockte Kandidaten bekommen ihre Faktor-Scores berechnet — UI
  // kann sie zur Transparenz anzeigen ("Anna wäre stark, aber krank").
  const capacity = scoreCapacity(candidate.plannedMinutesThisWeek, candidate.weeklyHoursTarget);
  const { score: proximity, distanceKm } = scoreProximity(
    candidate.homeLat,
    candidate.homeLng,
    entry.propertyLat,
    entry.propertyLng,
    REASSIGNMENT_SCORING.MAX_USEFUL_KM
  );
  const qualification = scoreQualification(candidate.validQualificationCount);
  const experience = scoreExperience(
    candidate.visitsAtPropertyLast6Mo,
    REASSIGNMENT_SCORING.EXPERIENCE_SATURATION_MONTHS
  );
  const fairness = scoreFairness(
    candidate.reassignmentsInWindow,
    REASSIGNMENT_SCORING.MAX_FAIR_VERTRETUNGEN
  );

  const w = REASSIGNMENT_SCORING.WEIGHTS;
  const weightedBase =
    (capacity * w.capacity +
      proximity * w.proximity +
      qualification * w.qualification +
      experience * w.experience +
      fairness * w.fairness) /
    REASSIGNMENT_SCORING.WEIGHT_TOTAL_SANITY;

  const { score: withBonus, bonus } = applyContingencyBonus(
    weightedBase,
    candidate.contingencyPriority
  );

  // Bei Hard-Filter setzen wir den finalen Score auf 0 — taucht in `blocked`-
  // Liste auf, nicht in `suggestions`.
  const finalScore = blockerKeys.length > 0 ? 0 : Math.round(withBonus * 10) / 10;

  const factorScores = {
    capacity: Math.round(capacity * 10) / 10,
    proximity: Math.round(proximity * 10) / 10,
    qualification: Math.round(qualification * 10) / 10,
    experience: Math.round(experience * 10) / 10,
    fairness: Math.round(fairness * 10) / 10,
    contingencyBonus: Math.round(bonus * 10) / 10,
  };

  const reasonKeys =
    blockerKeys.length > 0 ? [] : reasonsFromScores(factorScores, candidate, distanceKm);

  return {
    employeeId: candidate.employeeId,
    employeeName: candidate.employeeName,
    score: finalScore,
    factorScores,
    reasonKeys,
    blockerKeys,
  };
}

// ─── Sortier-/Split-Helper ────────────────────────────────────────────────

export interface SplitResult {
  suggestions: Suggestion[];
  blocked: Suggestion[];
}

/**
 * Teilt Score-Liste in Top-N (unblocked, ≥ MIN_SCORE_TO_SUGGEST) und
 * blocked (Hard-Filter oder zu niedriger Score).
 */
export function splitSuggestions(all: Suggestion[]): SplitResult {
  const sorted = [...all].sort((a, b) => b.score - a.score);
  const suggestions: Suggestion[] = [];
  const blocked: Suggestion[] = [];

  for (const s of sorted) {
    if (s.blockerKeys.length > 0) {
      blocked.push(s);
      continue;
    }
    if (s.score < REASSIGNMENT_SCORING.MIN_SCORE_TO_SUGGEST) {
      blocked.push({
        ...s,
        blockerKeys: [{ key: 'reassignment.blockers.lowScore', vars: { score: s.score } }],
      });
      continue;
    }
    if (suggestions.length < REASSIGNMENT_SCORING.MAX_SUGGESTIONS) {
      suggestions.push(s);
    } else {
      // Übrige unblocked mit hohem Score landen auch in blocked (UI-Transparenz)
      blocked.push({
        ...s,
        blockerKeys: [{ key: 'reassignment.blockers.outsideTopN' }],
      });
    }
  }

  return { suggestions, blocked };
}
