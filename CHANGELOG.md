# Changelog — Timetable

## v0.1.1 — 2026-05-16 (ELE-164: DB-Schicht 1 + AUDIT_LOG)

- **ELE-164 done:** PostgreSQL 16 mit RLS Multi-Tenancy, 10 Schicht-1-Tabellen produktiv
- Tabellen: TENANTS, USERS, REGIONS, EMPLOYEES, PROPERTY_MANAGERS, CONTRACTS, PROPERTIES, PROPERTY_ZONES, SERVICE_TYPES, **AUDIT_LOG**
- AUDIT_LOG Append-Only per GRANT (App-Rolle nur INSERT+SELECT, kein UPDATE/DELETE/TRUNCATE) — DSGVO Art. 30
- DB-Rollen: `hmservice_owner` (BYPASSRLS) für Migrations, `hmservice_app` (NOBYPASSRLS) für API
- Extensions: pgcrypto, pg_trgm, cube, earthdistance
- Drizzle-Kit-Migration-Runner: `backend/src/db/migrations/0001_schicht1.sql` + Up→Down-Skeleton
- docker-compose.yml + db-reset.sh + db-check.sh
- 25 Backend-Tests grün (18 neu für DB, 7 Smoke aus ELE-163)
- Test-Helper `withTestTenant` korrigiert (PostgreSQL `set_config()` statt `SET LOCAL` — Parameter-Support)

## v0.1.0 — 2026-05-16 (ELE-163: Test-Infrastruktur)

- **ELE-163 implementiert:** Vitest (Backend + Frontend) + Playwright + Testcontainers
- npm-Workspaces eingerichtet (backend, frontend, e2e)
- Test-Helpers: db.ts (Testcontainers PostgreSQL), withTestTenant (RLS-Tests), loginAs (Stub), seedFixture (Stub)
- Coverage-Gates: 70% gesamt, 90% für `services/**` (Backend), 50% Frontend
- husky + lint-staged Pre-Commit-Hook (ESLint + Prettier + Typecheck)
- GitHub Actions Workflow: Lint, Typecheck, Backend-Tests, Frontend-Tests, E2E
- Smoke-Tests grün: Backend (Postgres + Pools), Frontend (React-Render), E2E (Browser-Launch)
- README mit Testing-Quickstart erweitert

## v0.1.0 — 2026-05-16 (Bootstrap)

- Initial project setup mit OpenCLAW Governance Framework
- Governance-Hooks installiert: spec-gate.sh, doc-version-sync.sh, orphan-check.sh
- 3-Schichten-Doku-Architektur eingerichtet (Repo + Obsidian)
- Component-Skelette angelegt: frontend, backend, api, db, auth, scheduling, routing, test-infrastructure
- Add-ons aktiviert: Privacy/DSGVO, Cost Efficiency, Signal Quality
- developer_input/ Quell-Material integriert (Tool-Beschreibung, Datenmodell, Feature-Spec, Linear-Issues)
- 20 MVP-Specs angelegt (ELE-163 + ELE-164..e + ELE-169..ELE-186)
- WAVE_DEFINITION.md mit einheitlicher 5-Wellen-Definition
- TESTING_STRATEGY.md mit Vitest + Playwright + Testcontainers
