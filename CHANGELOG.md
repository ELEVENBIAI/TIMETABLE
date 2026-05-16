# Changelog — Timetable

## v0.1.0 — 2026-05-16 (TT-00: Test-Infrastruktur)

- **TT-00 implementiert:** Vitest (Backend + Frontend) + Playwright + Testcontainers
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
- 20 MVP-Specs angelegt (TT-00 + TT-01a..e + TT-02..TT-19)
- WAVE_DEFINITION.md mit einheitlicher 5-Wellen-Definition
- TESTING_STRATEGY.md mit Vitest + Playwright + Testcontainers
