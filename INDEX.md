# Timetable — Docs Index

**Version:** 0.2.8 | **Stand:** 2026-05-16

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

## ADRs / Strategie-Dokumente

| Datei                          | Zweck                                      |
| ------------------------------ | ------------------------------------------ |
| `docs/ADR-16-i18n-strategy.md` | Internationalisierungs-Strategie (i18next) |

## i18n (Backend)

| Datei                                            | Zweck                                               |
| ------------------------------------------------ | --------------------------------------------------- |
| `backend/src/lib/i18n.ts`                        | i18next-Setup + `t(key, locale, vars)` Helper       |
| `backend/src/lib/locale.ts`                      | `setInitialLocale` + `applyUserLocale` (Middleware) |
| `backend/src/locales/{en,de}/common.json`        | Allgemeine Texte                                    |
| `backend/src/locales/{en,de}/errors.json`        | Error-Messages (Hauptnamespace)                     |
| `backend/src/locales/{en,de}/auth.json`          | Auth-bezogene Strings                               |
| `backend/src/locales/{en,de}/users.json`         | User-Module + Plurals                               |
| `backend/src/locales/{en,de}/validation.json`    | Validation-Error-Variations                         |
| `backend/tests/lib/i18n.test.ts`                 | Interpolation + Plural Tests                        |
| `backend/tests/lib/locale.test.ts`               | setInitialLocale + applyUserLocale Tests            |
| `backend/tests/routes/locale-middleware.test.ts` | E2E: Error-Message in Request-Locale                |

## Backend Routes & Schemas

| Datei                                              | Zweck                                             |
| -------------------------------------------------- | ------------------------------------------------- |
| `backend/src/routes/tenants.ts`                    | Tenant-CRUD (ELE-170)                             |
| `backend/src/routes/users.ts`                      | User-CRUD + change-password + me/locale (ELE-170) |
| `backend/src/routes/service-types.ts`              | Service-Types CRUD (ELE-171)                      |
| `backend/src/routes/employees.ts`                  | Employees CRUD mit DSGVO-Filter (ELE-173)         |
| `backend/src/routes/qualification-types.ts`        | Qualification-Types CRUD (ELE-172)                |
| `backend/src/routes/equipment-types.ts`            | Equipment-Types CRUD (ELE-172)                    |
| `backend/src/routes/employee-skills.ts`            | Quali / Equipment / Availability nested (ELE-174) |
| `backend/src/routes/properties.ts`                 | Properties + nested Zones (ELE-176)               |
| `backend/src/routes/property-services.ts`          | Leistungsverzeichnis + frequency_detail (ELE-177) |
| `backend/src/routes/property-managers.ts`          | Hausverwaltungen + pg_trgm-Schnellsuche (ELE-175) |
| `backend/src/routes/contracts.ts`                  | Verträge + monthly_value-Filter (ELE-175)         |
| `backend/src/routes/waste-bin-types.ts`            | Tonnentypen-Stammdaten (ELE-178)                  |
| `backend/src/routes/waste-schedules.ts`            | Abfuhrpläne + collection_days JSONB (ELE-178)     |
| `backend/src/schemas/tenants.ts`                   | Zod Tenant                                        |
| `backend/src/schemas/users.ts`                     | Zod User + Passwort-Policy                        |
| `backend/src/schemas/service-types.ts`             | Zod Service-Type + Hex-Color                      |
| `backend/src/schemas/employees.ts`                 | Zod Employee + filterEmployeeForActor             |
| `backend/src/schemas/qualification-types.ts`       | Zod Qualification-Type                            |
| `backend/src/schemas/equipment-types.ts`           | Zod Equipment-Type + factor 0.30–2.00             |
| `backend/src/schemas/employee-skills.ts`           | Zod Quali/Equipment/Availability                  |
| `backend/src/schemas/properties.ts`                | Zod Property + Zone                               |
| `backend/src/schemas/property-services.ts`         | Zod + validateFrequencyDetail                     |
| `backend/src/schemas/property-managers.ts`         | Zod PropertyManager                               |
| `backend/src/schemas/contracts.ts`                 | Zod Contract + filterContractForActor             |
| `backend/src/schemas/waste-bin-types.ts`           | Zod WasteBinType + Codes (EN)                     |
| `backend/src/schemas/waste-schedules.ts`           | Zod WasteSchedule + collectionDaysSchema          |
| `backend/src/auth/authorize.ts`                    | requireRole + canActOnUser Helper                 |
| `backend/tests/routes/tenants.test.ts`             | Tenant-Routes Tests                               |
| `backend/tests/routes/users.test.ts`               | User-Routes Tests                                 |
| `backend/tests/routes/service-types.test.ts`       | Service-Types Tests                               |
| `backend/tests/routes/employees.test.ts`           | Employees Tests + Role-Filter + Audit-Log         |
| `backend/tests/routes/qualification-types.test.ts` | Qualification-Types Tests + IN_USE-Check          |
| `backend/tests/routes/equipment-types.test.ts`     | Equipment-Types Tests + factor-range              |
| `backend/tests/routes/employee-skills.test.ts`     | Quali/Equipment/Availability Tests                |
| `backend/tests/routes/properties.test.ts`          | Properties + Zones + ILIKE-Suche                  |
| `backend/tests/routes/property-services.test.ts`   | frequency_detail-Validation + alle Frequenzen     |
| `backend/tests/routes/property-managers.test.ts`   | PM-CRUD + Trigram-Suche + IN_USE-Block            |
| `backend/tests/routes/contracts.test.ts`           | Contracts + monthly_value-Filter + Cross-Tenant   |
| `backend/tests/routes/waste-bin-types.test.ts`     | Waste-Bin-Types CRUD + IN_USE-Block               |
| `backend/tests/routes/waste-schedules.test.ts`     | Waste-Schedules + JSONB-Validation                |

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
| `Components/i18n.md`                | Internationalisierung (ADR-16)                 |
