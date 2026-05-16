# Timetable — System Architecture

**Version:** 0.3.0 | **Stand:** 2026-05-16

## Übersicht

Digitale Plattform für Hausmeisterservice (Marken: Gepard / Immobilienbutler / Paul) — Franchise-Ready. Ersetzt Roberts manuelle Excel-Wochenplanung und schafft die Basis für KI-gestützte Vertretungsvorschläge, Tourenoptimierung und Multi-Tenant-Franchise-Setup.

Detaillierte Anforderungsanalyse: `developer_input/Tool_Beschreibung_Hausmeisterservice.md`.
Quality Attributes + ADRs: `ARCHITECTURE_DESIGN.md`.
Wellen-Definition: `WAVE_DEFINITION.md`.

## Komponenten — aktueller Status

| Komponente             | Technologie                          | Pfad                                                                         | Status                         |
| ---------------------- | ------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------ |
| **Test-Infrastruktur** | Vitest + Playwright + Testcontainers | `backend/tests/`, `frontend/tests/`, `e2e/`, `.husky/`, `.github/workflows/` | **Active** (ELE-163 done)      |
| Backend API            | Fastify + TypeScript                 | `backend/src/`                                                               | **Active** (ELE-169 + ELE-170) |
| Frontend SPA           | React + Vite + Tailwind + PWA        | `frontend/src/`                                                              | planned (ELE-180/182)          |
| Datenbank              | PostgreSQL 16+ mit RLS               | `backend/src/db/`                                                            | planned (ELE-164 in progress)  |
| Auth                   | JWT + bcryptjs + 6 Rollen            | `backend/src/auth/`                                                          | **Active** (ELE-169 + ELE-170) |
| Scheduling-Engine      | TypeScript Pure Functions            | `backend/src/services/scheduling/`                                           | planned (ELE-184/185)          |
| Routing-Engine         | OpenRouteService-Adapter             | `backend/src/services/routing/`                                              | planned (Wave 5)               |
| DocSync                | Repo → Obsidian Mirror               | `lib/doc-sync.js`                                                            | Active                         |
| Linear-Helper          | CLI-Tooling für API                  | `scripts/linear.mjs`                                                         | Active                         |

Detaillierte Komponenten-Docs: `TIMETABLE/Components/*.md` im Obsidian-Vault. Komplette Inventur: `COMPONENT_INVENTORY.md`.

## Architektur-Prinzip

Monolith mit klaren Layern — kein Microservices-Overhead bei < 100k Nutzern (siehe ADR-01).

```
┌────────────────────────────────────────────────────────────────┐
│  Browser (React PWA, installierbar)                            │
│  ├── Desktop:  Wochenplan-Grid + Drag&Drop                    │
│  └── Mobile:   Tagesplan + Check-in/out (Service Worker)       │
└────────────────────────┬───────────────────────────────────────┘
                         │ HTTPS / JWT Bearer
                         ▼
┌────────────────────────────────────────────────────────────────┐
│  Fastify REST API  (OpenAPI/Swagger Doku)                      │
│  ├── Auth-Middleware (JWT, Rollen, withTenant)                 │
│  ├── Rate-Limit (@fastify/rate-limit)                          │
│  ├── Zod-Validation (Request + Response)                       │
│  ├── Pino-Logger (strukturiert, requestId/tenantId/userId)     │
│  └── Routes/Services Pro-Domain                                │
│      ├── Auth / Users / Tenants                                │
│      ├── Properties / Property-Services / Waste                │
│      ├── Schedules / Templates                                 │
│      ├── Absences / Contingency                                │
│      ├── Scheduling-Engine (Frequenz + Plan-Generator)         │
│      └── Reassignment-Scoring (Wave 3+)                        │
└────────────────────────┬───────────────────────────────────────┘
                         │ pg-Pools (owner + app)
                         ▼
┌────────────────────────────────────────────────────────────────┐
│  PostgreSQL 16+                                                │
│  ├── 25+ Tabellen in 5 Schichten                               │
│  ├── Row Level Security (Multi-Tenancy via app.current_tenant) │
│  ├── AUDIT_LOG (DSGVO-Lesezugriffe + Schreibzugriffe)          │
│  ├── Extensions: pgcrypto, pg_trgm, cube, earthdistance        │
│  └── Soft-Delete + Audit-Felder auf allen Tabellen             │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼ (Wave 5)
              ┌─────────────────────────┐
              │  OpenRouteService API   │
              │  (Geocoding, Routing,   │
              │   DSGVO-konform,        │
              │   Heidelberg)           │
              └─────────────────────────┘
```

## Multi-Tenancy

PostgreSQL Row Level Security trennt Mandanten strikt auf DB-Ebene. Jeder API-Request setzt vor jeder Query `SET LOCAL app.current_tenant_id = <uuid>` via `withTenant()`-Helper. Die App-DB-Rolle `hmservice_app` ist `NOBYPASSRLS` — kein Mandanten-Cross-Read möglich, auch nicht durch Bugs.

Super-Admin-Bypass (für Zentrale/Franchise-Geber) über `app.is_super_admin` + entsprechende RLS-Policy.

## Rollen-Modell

| Rolle            | Scope          | Hauptaufgaben                                    |
| ---------------- | -------------- | ------------------------------------------------ |
| SUPER_ADMIN      | Cross-Tenant   | Franchise-Onboarding, Audit                      |
| ADMIN            | Eigener Tenant | User-Verwaltung, alle CRUDs                      |
| PLANNER          | Eigener Tenant | Wochenpläne erstellen, umplanen, veröffentlichen |
| FOREMAN          | Eigenes Team   | Umplanung, Krankmeldung erfassen                 |
| EMPLOYEE         | Eigene Daten   | Tagesplan, Check-in/out                          |
| PROPERTY_MANAGER | Eigene Objekte | Read-only Leistungsnachweis                      |

Details: `docs/ADR-09-users-table-and-roles.md`.

## Cross-Cutting Concerns

| Concern               | Lösung                                                      | Referenz       |
| --------------------- | ----------------------------------------------------------- | -------------- |
| Authentifizierung     | JWT mit 7d-Expiry, bcryptjs cost 12, FAILED_LOGIN_COUNT     | ADR-09         |
| Multi-Tenancy         | RLS + zwei DB-Rollen                                        | ADR-02, ADR-08 |
| Validierung           | Zod (Server + Client)                                       | ADR-03         |
| Logging               | Pino strukturiert, Pflicht-Felder requestId/tenantId/userId | ADR-15         |
| Performance-Budgets   | API p95 < 200ms, Plan-Gen < 5s, PWA Bundle < 250KB gzip     | ADR-14         |
| Migrations            | Drizzle Kit, reversibel                                     | ADR-13         |
| Backup / Recovery     | Daily-Snapshot + WAL-Archiving für Point-in-Time-Recovery   | ADR-12         |
| Routing-Provider      | OpenRouteService primär, Google als Fallback                | ADR-11         |
| Internationalisierung | i18next FE+BE, BCP 47 Locales, User-Locale in JWT + DB      | ADR-16         |

## Datenmodell — 5 Schichten

```
Schicht 5: TIME_LOGS, REASSIGNMENT_LOG, AUDIT_LOG (Ausführung + Compliance)
Schicht 4: SCHEDULES, SCHEDULE_ENTRIES, TEMPLATES, ABSENCES, CONTINGENCY (Planung)
Schicht 3: PROPERTY_SERVICES, WASTE_SCHEDULES, WASTE_BIN_TYPES (Leistungen)
Schicht 2: QUALIFICATIONS, EQUIPMENT, EMPLOYEE_AVAILABILITY (Fähigkeiten)
Schicht 1: TENANTS, USERS, EMPLOYEES, PROPERTIES, CONTRACTS, REGIONS, SERVICE_TYPES (Grunddaten)
```

Vollständig: `developer_input/DATENMODELL_Erklaerung_Stundenplan.md`.

## Config

Alle Parameter und Feature-Flags in `lib/config.js`. VERSION ist SSoT.
Doku-Versions-Sync durch `doc-version-sync.sh` Pre-Commit-Hook erzwungen.
