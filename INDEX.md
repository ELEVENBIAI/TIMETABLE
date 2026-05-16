# Timetable — Docs Index

**Version:** 0.2.0 | **Stand:** 2026-05-16

> Alle Dokumente des Projekts kategorisiert.
> **Pflicht:** Jede neue Datei sofort hier eintragen — vor dem git commit.

## Core

| Datei                    | Zweck                             | Aktualisiert |
| ------------------------ | --------------------------------- | ------------ |
| `CLAUDE.md`              | AI-Kontext, Regeln, Governance    | v0.1.0       |
| `SYSTEM_ARCHITECTURE.md` | Komponenten, Flows, Konfiguration | v0.1.0       |
| `ARCHITECTURE_DESIGN.md` | ADRs, Quality Attributes (Hub)    | v0.1.0       |
| `INDEX.md`               | Dieses Verzeichnis                | v0.1.0       |

## Governance

| Datei                    | Zweck                        |
| ------------------------ | ---------------------------- |
| `GOVERNANCE.md`          | Entwicklungs-Prozess, Regeln |
| `DEVELOPMENT_PROCESS.md` | Kurz-Verweis auf Governance  |
| `SECURITY.md`            | Security-Policy, DSGVO       |
| `CHANGELOG.md`           | Version-History              |
| `specs/TEMPLATE.md`      | Story-Template               |

## Komponenten

| Datei                    | Zweck                       |
| ------------------------ | --------------------------- |
| `COMPONENT_INVENTORY.md` | Alle Komponenten mit Status |
| `lib/config.js`          | SSoT Konfiguration          |
| `lib/doc-sync.js`        | DocSync zu Obsidian         |

## Source-Input (developer_input/)

| Datei                                                        | Zweck                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------ |
| `developer_input/Tool_Beschreibung_Hausmeisterservice.md`    | Tool-Beschreibung, Pain Points, Wellen, Marktvergleich |
| `developer_input/DATENMODELL_Erklaerung_Stundenplan.md`      | Datenmodell-Erklärung (5 Schichten)                    |
| `developer_input/FEATURE_SPEC_Stundenplan_Einsatzplanung.md` | Feature-Spec F01–F11                                   |
| `developer_input/LINEAR_ISSUES_Stundenplan.md`               | 27 Linear-Issues (Wave 1–5)                            |

## Test-Infrastruktur

| Datei                        | Zweck                                         |
| ---------------------------- | --------------------------------------------- |
| `README.md`                  | Projekt-Setup + Testing-Quickstart            |
| `package.json`               | npm-Workspaces (backend/frontend/e2e)         |
| `backend/vitest.config.ts`   | Vitest-Config Backend (70%, Services 90%)     |
| `backend/tests/`             | Setup + Helpers + Smoke-Tests                 |
| `frontend/vitest.config.ts`  | Vitest-Config Frontend (50%)                  |
| `frontend/tests/`            | Setup + Smoke                                 |
| `e2e/playwright.config.ts`   | Playwright (chromium-desktop + webkit-mobile) |
| `e2e/tests/`                 | E2E-Specs                                     |
| `.husky/pre-commit`          | Pre-Commit-Hook                               |
| `.github/workflows/test.yml` | CI                                            |

## Learning

| Datei                  | Zweck            |
| ---------------------- | ---------------- |
| `journal/learnings.md` | Learning-Loop L1 |

## Obsidian (SecondBrain)

| Pfad                                | Zweck                                          |
| ----------------------------------- | ---------------------------------------------- |
| `TIMETABLE - PMO HUB.md`            | Projekt-Hub                                    |
| `Architektur-Vorgaben.md`           | Stack-Entscheidungen                           |
| `Components/frontend.md`            | Frontend                                       |
| `Components/backend.md`             | Backend                                        |
| `Components/api.md`                 | API-Layer                                      |
| `Components/db.md`                  | Datenbank — 25 Tabellen, 5 Schichten           |
| `Components/auth.md`                | Auth + 6 Rollen                                |
| `Components/scheduling.md`          | **Kern: Plan-Generator + Vertretungs-Scoring** |
| `Components/routing.md`             | Tourenoptimierung Welle 5                      |
| `Components/test-infrastructure.md` | Test-Infrastruktur (Vitest + Playwright)       |
