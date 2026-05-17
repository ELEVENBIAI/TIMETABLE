// lib/config.js — Single Source of Truth
'use strict';

const VERSION = '0.6.2';

// Dokumentationsdateien — Self-Healing überwacht Versions-Sync
const DOC_FILES = {
  'CLAUDE.md': {
    path: 'CLAUDE.md',
    versionPattern: /\*\*Version:\*\*\s*([\d.]+)/,
  },
  'SYSTEM_ARCHITECTURE.md': {
    path: 'SYSTEM_ARCHITECTURE.md',
    versionPattern: /\*\*Version:\*\*\s*([\d.]+)/,
  },
  'ARCHITECTURE_DESIGN.md': {
    path: 'ARCHITECTURE_DESIGN.md',
    versionPattern: /\*\*Version:\*\*\s*([\d.]+)/,
  },
  'COMPONENT_INVENTORY.md': {
    path: 'COMPONENT_INVENTORY.md',
    versionPattern: /\*\*Version:\*\*\s*([\d.]+)/,
  },
  'DEVELOPMENT_PROCESS.md': {
    path: 'DEVELOPMENT_PROCESS.md',
    versionPattern: /\*\*Version:\*\*\s*([\d.]+)/,
  },
  'GOVERNANCE.md': {
    path: 'GOVERNANCE.md',
    versionPattern: /\*\*Version:\*\*\s*([\d.]+)/,
  },
};

const CONFIG = {
  PROJECT_NAME: 'Timetable',
  ISSUE_PREFIX: 'ELE-',
  GITHUB_REPO: 'https://github.com/ELEVENBIAI/TIMETABLE',
};

// Feature-Flags (ADR-12)
const FEATURES = {
  PLAN_GENERATOR_ENABLED: true, // Wave 2 — Notbremse bei Bug
  REASSIGNMENT_AI_ENABLED: false, // Wave 3 — initial off
  TIME_LOGS_GPS_REQUIRED: false, // Pilot optional
  ROUTING_PROVIDER: 'ORS', // 'ORS' | 'GOOGLE' | 'NONE' (Wave 5)
  MAINTENANCE_MODE: false, // True → API antwortet 503 mit Wartungs-Banner
};

// Auth-/Security-Parameter (ADR-09)
const SECURITY = {
  JWT_SECRET_MIN_LENGTH: 64,
  JWT_EXPIRES_IN: '7d',
  BCRYPT_COST: 12,
  LOGIN_MAX_FAILED_ATTEMPTS: 5,
  LOGIN_LOCKOUT_MINUTES: 15,
};

// Performance-Budgets (ADR-14)
const PERFORMANCE = {
  REQUEST_TIMEOUT_MS: 10_000,
  RATE_LIMIT_GLOBAL_PER_MINUTE: 200,
  RATE_LIMIT_AUTH_PER_MINUTE: 10,
};

// DSGVO-Aufbewahrungsfristen (ELE-187)
// Werte in Tagen. Retention-Cron (backend/scripts/dsgvo-retention.mjs) liest diese.
const DSGVO_RETENTION = {
  // Phase-2 Hard-Delete: Wieviele Tage nach Soft-Delete wird der User PHYSICAL gelöscht
  EMPLOYEE_DATA_AFTER_LEAVING_DAYS: 30,
  // Zeiterfassungs-Logs anonymisieren nach 1 Jahr (Klartext-Felder → NULL)
  TIME_LOGS_DAYS: 365,
  // GPS-Koordinaten in TIME_LOGS (oder SCHEDULE_ENTRIES) löschen — Soll-Ist-Stats bleiben
  GPS_DATA_DAYS: 90,
  // AUDIT_LOG: 5 Jahre (Compliance HGB + DSGVO Art. 30 Aufbewahrung)
  AUDIT_LOG_DAYS: 365 * 5,
};

// Reassignment-Scoring-Konstanten (ELE-190 / ADR-19)
// Wird von der Reassignment-Engine (ELE-196) konsumiert.
const REASSIGNMENT_SCORING = {
  // Gewichte pro Score-Faktor — Summe muss = WEIGHT_TOTAL_SANITY sein.
  WEIGHTS: {
    capacity: 30,
    proximity: 25,
    qualification: 20,
    experience: 15,
    fairness: 10,
  },
  WEIGHT_TOTAL_SANITY: 100,

  // Schwellwerte
  MIN_SCORE_TO_SUGGEST: 40, // unter dem: kein Vorschlag
  MAX_SUGGESTIONS: 3, // Top-N für Robert

  // Skalierungs-Sättigungen
  MAX_USEFUL_KM: 20, // Nähe-Score sättigt bei 20 km
  EXPERIENCE_SATURATION_MONTHS: 6, // Erfahrung sättigt nach 6 Mon
  FAIR_LOOKBACK_WEEKS: 4, // Fairness-Fenster
  MAX_FAIR_VERTRETUNGEN: 8, // Fairness-Score-Boden

  // Hard-Filter (vor Scoring)
  EQUIPMENT_HARD_FILTER: true, // ADMIN kann pro Vorschlag overriden
  MIN_QUALIFICATION_LEVEL: 'BASIC', // unter dem Level kein Kandidat
};

module.exports = {
  VERSION,
  DOC_FILES,
  CONFIG,
  FEATURES,
  SECURITY,
  PERFORMANCE,
  DSGVO_RETENTION,
  REASSIGNMENT_SCORING,
};
