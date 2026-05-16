# Timetable — Component Inventory

**Version:** 0.1.0 | **Stand:** 2026-05-16

| Komponente | Datei / Pfad | Status | Beschreibung |
|-----------|-------------|--------|-------------|
| Config | `lib/config.js` | Active | SSoT alle Parameter |
| DocSync | `lib/doc-sync.js` | Active | Spiegelung Repo → Obsidian |
| Frontend | `frontend/` | planned | React + Vite + Tailwind + PWA + @dnd-kit |
| Backend | `backend/` | planned | Fastify + TypeScript + OpenAPI |
| API | `backend/src/routes/` | planned | REST + Zod-Schemas + Rate-Limit |
| Datenbank | PostgreSQL 16+ | planned | 25 Tabellen, 5 Schichten, RLS Multi-Tenancy |
| Auth | `backend/src/auth/` | planned | JWT + bcryptjs + 6 Rollen |
| Scheduling | `backend/src/services/scheduling/` | planned | **Kern: Frequenz-Engine + Plan-Generator + Reassignment-Scoring** |
| Frequenz-Engine | `backend/src/services/scheduling/frequency-engine.ts` | planned | Pure Functions: WEEKLY/BIWEEKLY/MONTHLY/.../Saison |
| Plan-Generator | `backend/src/services/scheduling/schedule-generator.ts` | planned | Generiert Wochenplan aus Template |
| Reassignment-Engine | `backend/src/services/scheduling/reassignment-engine.ts` | planned | Regelbasiertes Scoring (kein LLM) |
| Time-Logs | `backend/src/services/time-logs.ts` | planned | GPS Check-in/out, Soll-Ist-Berechnung |
| Reporting | `backend/src/services/reporting/` | planned | Auslastung, Soll-Ist-Analyse |
| Test-Infrastruktur | `backend/tests/`, `frontend/tests/`, `e2e/`, `.husky/`, `.github/workflows/` | planned | Vitest + Playwright + Testcontainers, Coverage-Gate 70% |
| Routing | `backend/src/services/routing/` | planned | OpenRouteService-Adapter, DISTANCE_CACHE, TSP-Solver (Welle 5) |
