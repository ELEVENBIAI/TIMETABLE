# Timetable — Architecture Design

**Version:** 0.1.0 | **Stand:** 2026-05-16

## Übersicht

**Digitale Plattform für Hausmeisterservice (Gepard / Immobilienbutler / Paul) — Franchise-Ready.**

Welle 1 (MVP, Wochen 1–4): Robert's Excel-basierte Wochenplanung digital ersetzen.
Welle 2–5: Templates, KI-Vertretungsvorschläge, Zeiterfassung, Reporting, langfristig Voicebot/Wissensdatenbank/Franchise-Portal.

Quelle: `developer_input/` (Tool-Beschreibung, Datenmodell, Feature-Spec, Linear-Issues).

## Quality Attributes

| Attribut | Priorität | Beschreibung |
|----------|-----------|-------------|
| Reliability | Hoch | Stundenplan ist betriebskritisch — Ausfall = manuelles Chaos |
| Data Integrity | Hoch | PostgreSQL-Constraints + Zod-Validierung + RLS |
| Security | Hoch | JWT mit Rollen, RLS Multi-Tenancy, Rate Limiting, Audit-Log |
| Performance | Mittel | Fastify, Vite-Bundle, indexierte Queries |
| Observability | Mittel | Pino-Logger, OpenAPI-Doku, REASSIGNMENT_LOG |
| Maintainability | Mittel | TypeScript end-to-end, Pure-Function-Services |
| Privacy / DSGVO | Hoch | Mitarbeiterdaten + GPS-Tracking — Datenminimierung, Audit-Log, Löschkonzept |
| Cost Efficiency | Mittel | Regelbasiertes Scoring statt LLM, bewusste API-Wahl (OSRM vs Google) |
| Signal Quality | Mittel | Soll/Ist-Abweichung als KPI, Auslastungsmessung als Basis für bessere Kalkulation |

## ADRs (Architecture Decision Records)

| Nr | Datum | Titel | Status |
|----|-------|-------|--------|
| ADR-01 | 2026-05-16 | Monolith mit Fastify + React statt Microservices | Active |
| ADR-02 | 2026-05-16 | PostgreSQL RLS für Multi-Tenancy | Active |
| ADR-03 | 2026-05-16 | Zod als einheitliche Validierungsschicht | Active |
| ADR-04 | 2026-05-16 | Regelbasiertes Scoring statt LLM für Vertretungsvorschlag | Active |
| ADR-05 | 2026-05-16 | date-fns + ISO-Kalenderwochen für Frequenz-Engine | Active |
| ADR-06 | 2026-05-16 | PWA statt native App (Offline + Mobile via Service Worker) | Active |
| ADR-07 | 2026-05-16 | Soft-Delete + Audit-Felder auf allen Tabellen | Active |
| ADR-08 | 2026-05-16 | Zwei DB-Rollen (owner / app) für RLS-Erzwingung | Active |
| ADR-09 | 2026-05-16 | USERS-Tabelle + 6 Rollen als CHECK-Constraint | Active |
| ADR-10 | 2026-05-16 | Vitest + Playwright + Testcontainers — Coverage 70% min | Active |
| ADR-11 | 2026-05-16 | OpenRouteService primär für Geocoding + Routing (DSGVO) | Active |

### ADR-01: Monolith mit Fastify + React
**Kontext:** Team < 10, < 100k Nutzer, schneller MVP-Bedarf.
**Entscheidung:** Single Fastify-Prozess + React-SPA. Kein Microservices-Overhead.
**Verworfen:** Express (langsamer), NestJS (Overhead), Microservices (zu früh).

### ADR-02: PostgreSQL RLS für Multi-Tenancy
**Kontext:** Zentrale + Lizenznehmer brauchen strikte Mandanten-Trennung.
**Entscheidung:** Row Level Security auf DB-Ebene. Zwei DB-Rollen: `hmservice_owner` (umgeht RLS für Migration/Admin), `hmservice_app` (RLS erzwungen).
**Verworfen:** Separate DBs pro Mandant (Ops-Overhead), App-Layer-Filter (Sicherheitsrisiko).

### ADR-03: Zod für Validierung
**Kontext:** TypeScript end-to-end — Schemas auf Client und Server identisch.
**Entscheidung:** Zod für API-Inputs, Forms, Config-Loading.
**Verworfen:** Joi (kein TypeScript-First), Yup (langsamer).

### ADR-04: Regelbasiertes Scoring (kein LLM)
**Kontext:** Vertretungsvorschläge bei Krankheit müssen schnell, deterministisch und kostenlos sein.
**Entscheidung:** Scoring-Algorithmus mit 5 Faktoren (Kapazität × Nähe × Qualifikation × Erfahrung × Fairness). Begründungstext = Template-String. KEIN OpenAI/Anthropic-Call.
**Verworfen:** LLM-basierte Vorschläge (Latenz, Kosten, nicht-deterministisch).
**Später:** LLM nur für komplexe Szenarien oder natürlichsprachige Begründungen in Welle 5+.

### ADR-05: date-fns + ISO-Kalenderwochen
**Kontext:** Frequenz-Engine muss "ist Service in KW X fällig" berechnen — gerade/ungerade KW, Woche-im-Monat, Quartalsanfang, Saisonalitäts-Wrap-Around (Nov–Mär).
**Entscheidung:** `date-fns` (`getISOWeek`, `getWeekOfMonth`). Pure Functions, kein DB-Zugriff in Berechnungs-Logik.
**Verworfen:** Moment.js (EOL), Luxon (overkill), nativ Date (zu fehleranfällig).

### ADR-06: PWA statt native App
**Kontext:** Mitarbeiter im Feld brauchen Mobile-View — Tagesplan, Check-in/out, Navigation.
**Entscheidung:** Progressive Web App mit Service Worker + Manifest. Installierbar ohne App Store.
**Verworfen:** React Native (Maintenance-Overhead, Doppelte Codebase), Native iOS/Android (zu früh, zu teuer).

### ADR-07: Soft-Delete + Audit-Felder
**Kontext:** DSGVO + Nachvollziehbarkeit + Datenwiederherstellung.
**Entscheidung:** Alle Tabellen mit `IS_DELETED`, `DELETED_AT`, `CREATED_BY`, `UPDATED_BY`. Partial Indexes für Performance (`WHERE IS_DELETED = FALSE`).
**Trade-off:** Mehr Speicher, etwas mehr Query-Logik. Wert: DSGVO-Konformität, Recovery, Audit.

### ADR-08: Zwei DB-Rollen
**Kontext:** RLS erzwingen ist Sicherheit — aber Migrations dürfen RLS umgehen.
**Entscheidung:** `hmservice_owner` (Owner, BYPASSRLS) für Migrationen / Admin-Scripts. `hmservice_app` (NOBYPASSRLS) für alle API-Requests.
**Erzwingung:** App-Pool und Owner-Pool in Backend strikt getrennt.

## Datenmodell — 5 Schichten

Komplettes Datenmodell siehe `developer_input/DATENMODELL_Erklaerung_Stundenplan.md`.

```
Schicht 5: TIME_LOGS, REASSIGNMENT_LOG (Ausführung)
Schicht 4: SCHEDULES, SCHEDULE_ENTRIES, TEMPLATES, ABSENCES, CONTINGENCY (Planung)
Schicht 3: PROPERTY_SERVICES, WASTE_SCHEDULES, WASTE_BIN_TYPES (Leistungen)
Schicht 2: QUALIFICATIONS, EQUIPMENT, EMPLOYEE_AVAILABILITY (Fähigkeiten)
Schicht 1: TENANTS, EMPLOYEES, PROPERTIES, CONTRACTS, REGIONS, SERVICE_TYPES (Grunddaten)
```

## Roles & Authorization

| Rolle | Sieht / Darf |
|-------|--------------|
| SUPER_ADMIN | Alle Tenants — nur für Zentrale (Franchise-Geber) |
| ADMIN | Eigener Tenant — User-Verwaltung, alle CRUDs |
| PLANNER | Wochenpläne erstellen, umplanen, veröffentlichen |
| FOREMAN | Eigenes Team — Umplanung, Krankmeldung erfassen |
| EMPLOYEE | Nur eigenen Plan + Check-in/out |
| PROPERTY_MANAGER | Eigene Objekte (readonly): Wann war wer da? |

## 9. Referenzen (alle Dateien)

> **Pflicht:** Jede neue Datei sofort hier eintragen — vor dem git commit.
> (Erzwungen durch `orphan-check.sh`)

### Docs (Repo)

| Datei | Zweck |
|-------|-------|
| `CLAUDE.md` | AI-Kontext, Regeln, Governance |
| `SYSTEM_ARCHITECTURE.md` | Komponenten-Tabelle, Flows, Config |
| `ARCHITECTURE_DESIGN.md` | ADRs, Quality Attributes, Referenzen (Hub) |
| `INDEX.md` | Alle Docs kategorisiert |
| `COMPONENT_INVENTORY.md` | Alle Komponenten mit Status |
| `GOVERNANCE.md` | Entwicklungs-Prozess, Regeln |
| `DEVELOPMENT_PROCESS.md` | Verweis auf Governance |
| `SECURITY.md` | Security-Policy, DSGVO, API-Key-Regeln |
| `CHANGELOG.md` | Version-History |
| `specs/TEMPLATE.md` | Story-Template |
| `lib/config.js` | SSoT alle Parameter |
| `lib/doc-sync.js` | DocSync zu Obsidian |
| `journal/learnings.md` | Learning-Loop L1 |
| `WAVE_DEFINITION.md` | Endgültige Wellen-Definition (löst Inkonsistenzen) |
| `TESTING_STRATEGY.md` | Test-Pyramide, Tools (Vitest, Playwright), Coverage-Ziele |
| `docs/ADR-09-users-table-and-roles.md` | USERS-Tabelle + 6 Rollen |
| `specs/TT-01a.md` bis `specs/TT-19.md` | 20 MVP-Specs |

### Source-Input (Repo)

| Pfad | Zweck |
|------|-------|
| `developer_input/Tool_Beschreibung_Hausmeisterservice.md` | Anforderungsanalyse, Pain Points, Wellen, Marktvergleich |
| `developer_input/DATENMODELL_Erklaerung_Stundenplan.md` | Datenmodell-Erklärung (5 Schichten, 24+ Entitäten) |
| `developer_input/FEATURE_SPEC_Stundenplan_Einsatzplanung.md` | Feature-Spec F01–F11, SQL CREATE TABLEs, UI-Mockups |
| `developer_input/LINEAR_ISSUES_Stundenplan.md` | 27 Linear-Issues (HMS-01 bis HMS-27, Wave 1–5) |

### Docs (Obsidian SecondBrain)

| Pfad | Zweck |
|------|-------|
| `TIMETABLE/TIMETABLE - PMO HUB.md` | Projekt-Hub |
| `TIMETABLE/Architektur-Vorgaben.md` | Konsolidierte Stack-Entscheidungen |
| `TIMETABLE/Components/frontend.md` | Frontend (React + Vite + Tailwind + PWA + @dnd-kit) |
| `TIMETABLE/Components/backend.md` | Backend (Fastify + TypeScript + OpenAPI) |
| `TIMETABLE/Components/api.md` | REST-API + Zod-Schemas |
| `TIMETABLE/Components/db.md` | PostgreSQL + Drizzle + RLS, 25 Tabellen |
| `TIMETABLE/Components/auth.md` | JWT + bcryptjs + 6 Rollen |
| `TIMETABLE/Components/scheduling.md` | **Kern-Komponente: Plan-Generator, Frequenz-Engine, Vertretungs-Scoring** |
| `TIMETABLE/Components/routing.md` | Tourenoptimierung Welle 5 (OpenRouteService primär, Google fallback) |
