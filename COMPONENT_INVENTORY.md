# Timetable — Component Inventory

**Version:** 0.2.2 | **Stand:** 2026-05-16

| Komponente          | Datei / Pfad                                                                 | Status     | Beschreibung                                                                        |
| ------------------- | ---------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------- |
| Config              | `lib/config.js`                                                              | Active     | SSoT alle Parameter                                                                 |
| DocSync             | `lib/doc-sync.js`                                                            | Active     | Spiegelung Repo → Obsidian                                                          |
| Frontend            | `frontend/`                                                                  | planned    | React + Vite + Tailwind + PWA + @dnd-kit                                            |
| Backend             | `backend/`                                                                   | **Active** | Fastify + TypeScript + OpenAPI (ELE-169 done)                                       |
| API                 | `backend/src/routes/`                                                        | **Active** | REST + Zod-Schemas + Rate-Limit (auth, tenants, users) — ELE-169 + ELE-170          |
| Datenbank           | PostgreSQL 16+                                                               | **Active** | **26 Tabellen (Schicht 1-5) + Pilot-Seed, RLS Multi-Tenancy** (ELE-164..168)        |
| Auth                | `backend/src/auth/`                                                          | **Active** | JWT + bcryptjs + 6 Rollen + requireRole/canActOnUser (ELE-169 + ELE-170)            |
| Scheduling          | `backend/src/services/scheduling/`                                           | planned    | **Kern: Frequenz-Engine + Plan-Generator + Reassignment-Scoring**                   |
| Frequenz-Engine     | `backend/src/services/scheduling/frequency-engine.ts`                        | planned    | Pure Functions: WEEKLY/BIWEEKLY/MONTHLY/.../Saison                                  |
| Plan-Generator      | `backend/src/services/scheduling/schedule-generator.ts`                      | planned    | Generiert Wochenplan aus Template                                                   |
| Reassignment-Engine | `backend/src/services/scheduling/reassignment-engine.ts`                     | planned    | Regelbasiertes Scoring (kein LLM)                                                   |
| Time-Logs           | `backend/src/services/time-logs.ts`                                          | planned    | GPS Check-in/out, Soll-Ist-Berechnung                                               |
| Reporting           | `backend/src/services/reporting/`                                            | planned    | Auslastung, Soll-Ist-Analyse                                                        |
| Test-Infrastruktur  | `backend/tests/`, `frontend/tests/`, `e2e/`, `.husky/`, `.github/workflows/` | **Active** | Vitest + Playwright + Testcontainers, Coverage-Gate 70% (ELE-163 done)              |
| Routing             | `backend/src/services/routing/`                                              | planned    | OpenRouteService-Adapter, DISTANCE_CACHE, TSP-Solver (Welle 5)                      |
| i18n Backend        | `backend/src/lib/i18n.ts`, `backend/src/locales/{en,de}/`                    | foundation | Mini-i18n-Map + JWT-Claim + Migration 0006 (ELE-169-Nachtrag), Full via Folge-Issue |
| i18n Frontend       | `frontend/src/lib/i18n.ts`, `frontend/src/locales/{en,de}/`                  | planned    | react-i18next + Locale-Selector im Profil (eigenes Folge-Issue, ADR-16)             |
