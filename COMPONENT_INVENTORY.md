# Timetable — Component Inventory

**Version:** 0.6.8 | **Stand:** 2026-05-18

| Komponente          | Datei / Pfad                                                                 | Status     | Beschreibung                                                                                                |
| ------------------- | ---------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| Config              | `lib/config.js`                                                              | Active     | SSoT alle Parameter                                                                                         |
| DocSync             | `lib/doc-sync.js`                                                            | Active     | Spiegelung Repo → Obsidian                                                                                  |
| Frontend            | `frontend/`                                                                  | **Active** | React 18 + Vite 5 + Tailwind 3.4 + PWA + i18next + Router v6 (ELE-199 done) — Wochenplan-Grid folgt ELE-180 |
| Backend             | `backend/`                                                                   | **Active** | Fastify + TypeScript + OpenAPI (ELE-169 done)                                                               |
| API                 | `backend/src/routes/`                                                        | **Active** | REST + Zod + Rate-Limit — 21 Routen-Module inkl. schedule-templates + absences (ELE-183 + ELE-186)          |
| Datenbank           | PostgreSQL 16+                                                               | **Active** | **26 Tabellen (Schicht 1-5) + Pilot-Seed, RLS Multi-Tenancy** (ELE-164..168)                                |
| Auth                | `backend/src/auth/`                                                          | **Active** | JWT + bcryptjs + 6 Rollen + requireRole/canActOnUser (ELE-169 + ELE-170)                                    |
| Scheduling          | `backend/src/services/scheduling/`                                           | **Active** | conflict-check + frequency-engine + plan-generator (ELE-179 + ELE-184 + ELE-185)                            |
| Frequenz-Engine     | `backend/src/services/scheduling/frequency-engine.ts`                        | **Active** | Pure Functions: alle 7 Frequenzen + Saison-Wrap + Waste-Logik, 100% Coverage (ELE-184 done)                 |
| Plan-Generator      | `backend/src/services/scheduling/schedule-generator.ts`                      | **Active** | 6-Phasen aus Template + Frequenz-Engine + Warnings (ELE-185 done)                                           |
| Reassignment-Engine | `backend/src/services/scheduling/reassignment-engine.ts`                     | planned    | Regelbasiertes Scoring (kein LLM)                                                                           |
| Time-Logs           | `backend/src/services/time-logs.ts`                                          | planned    | GPS Check-in/out, Soll-Ist-Berechnung                                                                       |
| Reporting           | `backend/src/services/reporting/`                                            | planned    | Auslastung, Soll-Ist-Analyse                                                                                |
| Test-Infrastruktur  | `backend/tests/`, `frontend/tests/`, `e2e/`, `.husky/`, `.github/workflows/` | **Active** | Vitest + Playwright + Testcontainers, Coverage-Gate 70% (ELE-163 done)                                      |
| Routing             | `backend/src/services/routing/`                                              | planned    | OpenRouteService-Adapter, DISTANCE_CACHE, TSP-Solver (Welle 5)                                              |
| i18n Backend        | `backend/src/lib/{i18n,locale}.ts`, `backend/src/locales/{en,de}/*.json`     | **Active** | i18next + 5 Namespaces + Locale-Middleware + Interpolation/Plural (ELE-194 done)                            |
| i18n Frontend       | `frontend/src/lib/i18n.ts`, `frontend/src/locales/{en,de}/`                  | **Active** | react-i18next + 6 Namespaces + Locale-Switcher (ELE-199 done) — Profile-Locale-Selector folgt ELE-195       |
