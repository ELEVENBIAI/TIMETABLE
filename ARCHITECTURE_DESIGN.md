# Timetable — Architecture Design

**Version:** 0.6.1 | **Stand:** 2026-05-17

## Übersicht

**Digitale Plattform für Hausmeisterservice (Gepard / Immobilienbutler / Paul) — Franchise-Ready.**

Welle 1 (MVP, Wochen 1–4): Robert's Excel-basierte Wochenplanung digital ersetzen.
Welle 2–5: Templates, KI-Vertretungsvorschläge, Zeiterfassung, Reporting, langfristig Voicebot/Wissensdatenbank/Franchise-Portal.

Quelle: `developer_input/` (Tool-Beschreibung, Datenmodell, Feature-Spec, Linear-Issues).

## Quality Attributes

| Attribut              | Priorität | Beschreibung                                                                                   |
| --------------------- | --------- | ---------------------------------------------------------------------------------------------- |
| Reliability           | Hoch      | Stundenplan ist betriebskritisch — Ausfall = manuelles Chaos                                   |
| Data Integrity        | Hoch      | PostgreSQL-Constraints + Zod-Validierung + RLS                                                 |
| Security              | Hoch      | JWT mit Rollen, RLS Multi-Tenancy, Rate Limiting, Audit-Log                                    |
| Performance           | Mittel    | Fastify, Vite-Bundle, indexierte Queries                                                       |
| Observability         | Mittel    | Pino-Logger, OpenAPI-Doku, REASSIGNMENT_LOG                                                    |
| Maintainability       | Mittel    | TypeScript end-to-end, Pure-Function-Services                                                  |
| Privacy / DSGVO       | Hoch      | Mitarbeiterdaten + GPS-Tracking — Datenminimierung, Audit-Log, Löschkonzept                    |
| Cost Efficiency       | Mittel    | Regelbasiertes Scoring statt LLM, bewusste API-Wahl (OSRM vs Google)                           |
| Signal Quality        | Mittel    | Soll/Ist-Abweichung als KPI, Auslastungsmessung als Basis für bessere Kalkulation              |
| Internationalisierung | Hoch      | i18next (FE+BE), Default `en`, erste übersetzte Sprache `de`, User-Locale in JWT + DB (ADR-16) |

## ADRs (Architecture Decision Records)

| Nr     | Datum      | Titel                                                        | Status |
| ------ | ---------- | ------------------------------------------------------------ | ------ |
| ADR-01 | 2026-05-16 | Monolith mit Fastify + React statt Microservices             | Active |
| ADR-02 | 2026-05-16 | PostgreSQL RLS für Multi-Tenancy                             | Active |
| ADR-03 | 2026-05-16 | Zod als einheitliche Validierungsschicht                     | Active |
| ADR-04 | 2026-05-16 | Regelbasiertes Scoring statt LLM für Vertretungsvorschlag    | Active |
| ADR-05 | 2026-05-16 | date-fns + ISO-Kalenderwochen für Frequenz-Engine            | Active |
| ADR-06 | 2026-05-16 | PWA statt native App (Offline + Mobile via Service Worker)   | Active |
| ADR-07 | 2026-05-16 | Soft-Delete + Audit-Felder auf allen Tabellen                | Active |
| ADR-08 | 2026-05-16 | Zwei DB-Rollen (owner / app) für RLS-Erzwingung              | Active |
| ADR-09 | 2026-05-16 | USERS-Tabelle + 6 Rollen als CHECK-Constraint                | Active |
| ADR-10 | 2026-05-16 | Vitest + Playwright + Testcontainers — Coverage 70% min      | Active |
| ADR-11 | 2026-05-16 | OpenRouteService primär für Geocoding + Routing (DSGVO)      | Active |
| ADR-12 | 2026-05-16 | Backup-Strategie + Feature-Flags + Graceful Degradation      | Active |
| ADR-13 | 2026-05-16 | Migration-Tooling Drizzle Kit                                | Active |
| ADR-14 | 2026-05-16 | Performance-Budgets (Backend / Frontend / DB)                | Active |
| ADR-15 | 2026-05-16 | Logging-Schema (Pino strukturiert + AUDIT_LOG)               | Active |
| ADR-16 | 2026-05-16 | i18n-Strategie (i18next, BCP 47, User-Locale in JWT)         | Active |
| ADR-17 | 2026-05-17 | Error-Tracking (GlitchTip self-hosted, Sentry SaaS Backup)   | Active |
| ADR-18 | 2026-05-17 | JWT-Secret-Rotation (Multi-Secret primary + previous)        | Active |
| ADR-19 | 2026-05-17 | Reassignment-Scoring-Gewichte (30/25/20/15/10 + Hard-Filter) | Active |

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

| Rolle            | Sieht / Darf                                      |
| ---------------- | ------------------------------------------------- |
| SUPER_ADMIN      | Alle Tenants — nur für Zentrale (Franchise-Geber) |
| ADMIN            | Eigener Tenant — User-Verwaltung, alle CRUDs      |
| PLANNER          | Wochenpläne erstellen, umplanen, veröffentlichen  |
| FOREMAN          | Eigenes Team — Umplanung, Krankmeldung erfassen   |
| EMPLOYEE         | Nur eigenen Plan + Check-in/out                   |
| PROPERTY_MANAGER | Eigene Objekte (readonly): Wann war wer da?       |

## 4. Layer-to-Pipeline Mapping

Jeder API-Request durchläuft die folgende Pipeline. Cross-Cutting-Concerns (Logging, Locale, Rate-Limit) sind als Fastify-Hooks/Plugins quer eingehängt und nicht Teil der Domain-Schichten.

```
┌──────────────────────────────────────────────────────────────────┐
│  HTTPS-Request (Browser PWA / Mobile)                            │
└────────────────────────────┬─────────────────────────────────────┘
                             │  Bearer-Token (JWT, 7d, ADR-09)
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  Fastify-Hooks (cross-cutting, app.ts)                           │
│  ├── onRequest: setInitialLocale()      (lib/locale.ts)          │
│  ├── @fastify/rate-limit (200/min global, 10/min auth)           │
│  ├── @fastify/cors                       (env.CORS_ORIGINS)      │
│  └── onResponse: Pino-Timing-Log         (ADR-14, ADR-15)        │
└────────────────────────────┬─────────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  Route-PreHandler-Chain (routes/*.ts)                            │
│  ├── requireAuth       (auth/middleware.ts)                      │
│  │     - verifyJwt → request.user = { userId, tenantId, role }   │
│  │     - applyUserLocale() überschreibt Accept-Language          │
│  └── requireRole(...)  (auth/authorize.ts)                       │
│        - prüft request.user.role ∈ allowed ∨ isSuperAdmin        │
└────────────────────────────┬─────────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  Route-Handler (routes/*.ts)                                     │
│  ├── parseOr400(zodSchema, request.body)  → ValidationError      │
│  ├── Cross-Tenant-FK-Checks (assertFksInTenant)                  │
│  └── Business-Call → Service oder direkt Pool                    │
└────────────────────────────┬─────────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  Service-Layer (services/scheduling/*.ts)                        │
│  ├── Pure Functions (-pure.ts: conflict-check, frequency-engine, │
│  │     plan-generator-pure, reassignment-pure) — KEIN DB-Zugriff │
│  └── DB-Loader (schedule-generator, frequency-engine)            │
│        - akzeptiert PoolClient als Parameter                     │
│        - eigene BEGIN/COMMIT/ROLLBACK für Multi-Step             │
└────────────────────────────┬─────────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  Pool-Wrapper (db/pools.ts)                                      │
│  ├── ownerPool  → hmservice_owner  (BYPASSRLS, nur Migration)    │
│  └── appPool    → hmservice_app    (NOBYPASSRLS, alle Requests)  │
│        - SET LOCAL app.current_tenant_id = $1 vor jeder Query    │
└────────────────────────────┬─────────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  PostgreSQL 16 (RLS-Enforcement)                                 │
│  ├── 26 Tabellen mit `tenant_id = current_setting(...)`-Policy   │
│  ├── Triggers: fn_set_updated_at()                               │
│  └── AUDIT_LOG: Append-Only, RLS, eigener INSERT-Trigger         │
└──────────────────────────────────────────────────────────────────┘
```

### File-Mapping pro Layer

| Layer           | Verantwortung                            | Konkrete Files                                                                                       |
| --------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| App-Bootstrap   | Fastify, Hooks, Error-Handler            | `src/app.ts`, `src/server.ts`, `src/config.ts`                                                       |
| Cross-Cutting   | Logging, Locale, i18n                    | `src/lib/{i18n,locale,log-sanitize,errors}.ts`                                                       |
| Auth            | JWT-Verify, Rollen-Check, Self-Reporting | `src/auth/{jwt,middleware,authorize,password,roles}.ts`                                              |
| Routing         | HTTP-Endpoints, Schema-Doku              | `src/routes/*.ts` (23 Module)                                                                        |
| Validation      | Zod-Schemas, Cross-Field-Checks          | `src/schemas/*.ts` (15 Module)                                                                       |
| Services (Pure) | Domain-Logik ohne Seiteneffekte          | `src/services/scheduling/{conflict-check,frequency-engine,plan-generator-pure,reassignment-pure}.ts` |
| Services (DB)   | Transaktionale Multi-Step-Operationen    | `src/services/scheduling/{schedule-generator,reassignment-engine}.ts`                                |
| Persistence     | Pool-Management, RLS-Enforcement         | `src/db/pools.ts`, `src/db/migrate.ts`                                                               |
| Migrations      | DDL, RLS-Policies, GRANTs                | `src/db/migrations/*.sql`                                                                            |
| i18n-Resources  | Locale-Strings (en, de)                  | `src/locales/{en,de}/*.json` (5 Namespaces)                                                          |

### Plan-Generator: 6-Phasen-Flow als Pipeline (Cross-Link: `services/scheduling/schedule-generator.ts`, ELE-185)

```
POST /api/schedules/generate
  │
  ├─ requireAuth + requireRole(ADMIN, PLANNER)
  ├─ parseOr400(generateScheduleSchema, body)  → { templateId, weekStart, weekNumber, year }
  │
  └─ BEGIN TRANSACTION
       │
       ├─ Phase 1: INSERT schedules (status=DRAFT, generation_method='FROM_TEMPLATE')
       │                          ↓ schedule_id
       ├─ Phase 2: Template-Entries laden, jedes → schedule_entries
       │   ├─ 3a: frequency-engine.getDueServicesForWeek()
       │   │       - matchet fällige Property-Services gegen Template-Entries
       │   │       - kein Match → NO_TEMPLATE_MATCH-Warning
       │   └─ 3b: frequency-engine.getDueWasteSchedulesForWeek()
       │           - 2 Entries pro Termin (put-out -1, take-in +1)
       │           - erster aktiver Mitarbeiter → Reassignment-Engine später
       │
       ├─ Phase 4: Absences-Check → status=REASSIGNMENT_NEEDED + ABSENCE-Warning
       ├─ Phase 5: Availability-Check → OUTSIDE_AVAILABILITY-Warning
       └─ Phase 6: Overload + Quali-Expiry → OVERLOAD + QUALIFICATION_EXPIRY-Warnings
       │
       └─ Bei JEDEM Fehler → ROLLBACK (kein partial state)
     COMMIT
       │
       └─ Response 201: { schedule, entries[], warnings[], stats }
```

Performance-Budget: gesamte 6-Phasen-Sequenz < 5s für Pilot-Tenant (<50 Entries), siehe ADR-14.

## 5. Failure Mode Analysis

Pro kritische Komponente: Was kann brechen, wer merkt es, was ist die Mitigation. Cross-Links zu ADR-12 (Backup, Feature-Flags, Graceful Degradation) und ADR-15 (Logging-Schema).

| #   | Failure                                                                    | Trigger                                                                    | Detection                                                     | Aktuelle Mitigation                                                                               | Offene Lücken                                                              |
| --- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | **Postgres komplett down**                                                 | Crash, OOM, Disk-Full                                                      | Connection-Timeout (10s, ADR-14) → 503 von allen Routes       | Health-Check `/api/health/db` failt, Pino-Error-Log. MAINTENANCE_MODE-Flag (ADR-12) als Notbremse | Kein Auto-Restart, kein Replica-Failover (Wave 5, siehe ELE-191 Hosting)   |
| 2   | **Pool-Exhaustion**                                                        | Long-running Queries, Connection-Leak                                      | pg Pool wirft `acquireTimeout`                                | Fastify connectionTimeout = 10s, Rate-Limit 200/min global                                        | Kein Pool-Size-Monitoring, kein pg-Bouncer                                 |
| 3   | **JWT-Secret-Rotation falsch deployt**                                     | Neuer Secret aktiv, alte Tokens noch in Umlauf                             | User bekommt 401 INVALID_TOKEN bei jedem Request              | Bei nächstem Login → frischer Token                                                               | **Rotation-Strategie nicht definiert** → ELE-188                           |
| 4   | **Plan-Generator wirft mid-Transaction**                                   | Inkonsistente Stammdaten (z.B. Employee gelöscht zwischen Read und Insert) | Try/catch → ROLLBACK + 500                                    | Komplette TX wird zurückgerollt, kein partial schedule                                            | Kein Retry, kein Idempotency-Key — User muss manuell neu starten           |
| 5   | **Tenant-Scoping vergessen in neuer Route**                                | Entwickler vergisst `WHERE tenant_id = $1`                                 | RLS-Layer fängt es ab (POSTGRES setzt LEERE-Resultset zurück) | `hmservice_app` ist NOBYPASSRLS (ADR-08)                                                          | Bei BYPASSRLS-Fehler in Migrationen kein Schutz — Migration-Review-Pflicht |
| 6   | **i18n-Key fehlt für eine Locale**                                         | Neuer messageKey in Code, aber locale-File nicht synchron                  | i18next Fallback → returnt den Key als String                 | Default-Fallback `en` greift                                                                      | Keine automatische Sync-Validierung — wird Bug erst nach Deploy gefunden   |
| 7   | **date-fns liefert falsche ISO-KW über Jahreswechsel**                     | Plan-Gen für KW 1/53 grenzwertig                                           | Wäre stillschweigender Bug — kein direkter Error              | Tests in `frequency-engine.test.ts` decken Jahreswechsel ab (23 Cases)                            | Kein Property-Based-Testing für alle Datums-Grenzfälle                     |
| 8   | **Doppel-Generierung gleiche Woche**                                       | Race-Condition zweier User                                                 | UNIQUE(tenant_id, week_start) → DB-Constraint-Violation       | 409 DUPLICATE_WEEK, sauberer Error                                                                | —                                                                          |
| 9   | **Absence-Side-Effect kollidiert mit gleichzeitiger Schedule-Bearbeitung** | User A löscht Absence, User B publisht Schedule parallel                   | Wird durch TX-Isolation (Read Committed Default) zur Race     | Kein Optimistic Locking                                                                           | Optimistic-Locking via `updated_at`-Check noch nicht implementiert         |
| 10  | **OpenRouteService API down (Wave 5)**                                     | Externer Dienst nicht erreichbar                                           | Wave-5-Code: try/catch → Fallback auf Distance-Cache          | Routing-Provider als Feature-Flag (`ROUTING_PROVIDER` in ADR-12)                                  | Implementation steht noch aus (Wave 5)                                     |
| 11  | **Audit-Log voll**                                                         | DSGVO-Lesezugriffe akkumulieren                                            | Disk-Space-Warning auf DB-Host                                | Append-Only-Tabelle, manuelle Rotation                                                            | Keine automatische Archivierung → ELE-187 (DSGVO-Workflows)                |
| 12  | **Rate-Limit zu aggressiv**                                                | Pilot-User mit Bulk-Imports                                                | 429 RATE_LIMITED                                              | Konstanten in `lib/config.js` SSoT, per-Tenant override fehlt                                     | Per-User-Rate-Limit nicht möglich (nur per-IP)                             |

**Querverweise:**

- Logging aller obigen Failures: strukturiert via Pino mit `requestId/tenantId/userId` (ADR-15)
- Feature-Flag-basierte Notbremsen: `MAINTENANCE_MODE`, `PLAN_GENERATOR_ENABLED` (ADR-12, `lib/config.js`)
- Performance-Trigger: API p95 < 200ms überwacht, sonst Pool-Exhaustion-Verdacht (ADR-14)

## 6. Component Relationships

Layering-Regeln definieren die erlaubte Dependency-Richtung. Verletzungen führen zu zyklischen Imports oder testbarkeitskillenden Side-Effects (z.B. Pure Function importiert `pg` → kann nicht mehr ohne DB getestet werden).

### Erlaubte Dependency-Richtung

```
┌───────────────────────────────────────────────────────────────────┐
│ Bootstrap (app.ts, server.ts)                                     │
│   darf importieren: alles unten                                   │
└────────────────────────────┬──────────────────────────────────────┘
                             ▼
┌───────────────────────────────────────────────────────────────────┐
│ Routes (routes/*.ts)                                              │
│   darf: schemas, auth, services, db/pools, lib                    │
│   darf NICHT: andere routes/* (würde Layering brechen)            │
└────────────────────────────┬──────────────────────────────────────┘
                             ▼
┌───────────────────────────────────────────────────────────────────┐
│ Services-DB (services/.../schedule-generator.ts,                  │
│              reassignment-engine.ts)                              │
│   darf: services/.../-pure, schemas, db/pools, lib                │
│   darf NICHT: routes, auth, fastify                               │
└────────────────────────────┬──────────────────────────────────────┘
                             ▼
┌───────────────────────────────────────────────────────────────────┐
│ Services-Pure (services/.../conflict-check.ts,                    │
│                frequency-engine.ts, plan-generator-pure.ts,       │
│                reassignment-pure.ts)                              │
│   darf: nur date-fns, eigene Types                                │
│   darf NICHT: pg, fastify, db/*, routes, auth, schemas/Network    │
└────────────────────────────┬──────────────────────────────────────┘
                             ▼
┌───────────────────────────────────────────────────────────────────┐
│ Lib (lib/errors, lib/i18n, lib/locale, lib/log-sanitize)          │
│   Leaf-Layer — keine eigenen Imports aus Domain                   │
└───────────────────────────────────────────────────────────────────┘
```

### Konkrete Regeln (mit Beispielen)

| #   | Regel                                                                  | Beispiel ✓                                                                 | Beispiel ✗                                                                                           |
| --- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | **Routes importieren keine anderen Routes**                            | `routes/absences.ts` ruft Services, nicht `routes/schedules.ts`            | `routes/absences.ts` importiert Funktion aus `routes/schedule-entries.ts`                            |
| 2   | **Pure Functions importieren niemals `pg` oder `fastify`**             | `conflict-check.ts` nutzt nur `date-fns` + lokale Types                    | `frequency-engine.ts` macht direkt `client.query(...)` (gehört in DB-Loader-Function im selben File) |
| 3   | **DB-Loader-Functions akzeptieren `client: PoolClient` als Parameter** | `getDueServicesForWeek(client, tenantId, weekStart)`                       | `getDueServicesForWeek(tenantId, weekStart)` ruft selbst `pool.connect()`                            |
| 4   | **Cross-Tenant-FK-Checks sind im Route-Handler, nicht im Service**     | `assertFksInTenant()` in `routes/template-entries.ts` vor dem Service-Call | Service checkt selbst — würde RLS-Tests brechen                                                      |
| 5   | **Locale-Resolution nur in `lib/locale.ts` + `auth/middleware.ts`**    | `applyUserLocale(request, payload.locale)`                                 | Route liest direkt `request.headers['accept-language']`                                              |
| 6   | **Error-Klassen nur in `lib/errors.ts` + `auth/authorize.ts`**         | `throw new NotFoundError('errors.absenceNotFound')`                        | Route definiert eigene `class FooError extends Error`                                                |
| 7   | **Schemas (Zod) sind reine Type-/Validation-Definitionen**             | `createAbsenceSchema = z.object({...})`                                    | Schema-File importiert `pg` für Type-Erweiterung                                                     |

### Verbotene Imports (Beispiele, die NIE auftauchen dürfen)

```typescript
// ✗ Pure Function importiert pg
// services/scheduling/conflict-check.ts
import type { PoolClient } from 'pg'; // ← VERBOTEN

// ✗ Service importiert Fastify-Request
// services/scheduling/schedule-generator.ts
import type { FastifyRequest } from 'fastify'; // ← VERBOTEN

// ✗ Route importiert andere Route
// routes/absences.ts
import { scheduleEntryRoutes } from './schedule-entries.js'; // ← VERBOTEN

// ✗ Schema importiert DB-Pool
// schemas/employees.ts
import { getOwnerPool } from '../db/pools.js'; // ← VERBOTEN
```

### Dependency-Diagramm Plan-Generator (ELE-185)

```
routes/schedule-generator.ts
  └─ services/scheduling/schedule-generator.ts (DB-Loader, TX-Manager)
       ├─ services/scheduling/plan-generator-pure.ts (Pure)
       ├─ services/scheduling/frequency-engine.ts (Pure + DB-Loader)
       │    └─ services/scheduling/frequency-engine pure helpers
       ├─ db/pools.ts (Pool-Wrapper)
       └─ schemas/schedule-generator.ts (Warning-Types)
```

Keine zyklischen Imports, klare Layering-Richtung Top→Down. ADR-01 (Monolith mit klaren Layern) wird durch diese Regeln operationalisiert.

## 9. Referenzen (alle Dateien)

> **Pflicht:** Jede neue Datei sofort hier eintragen — vor dem git commit.
> (Erzwungen durch `orphan-check.sh`)

### Docs (Repo)

| Datei                                                                                                                                         | Zweck                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md`                                                                                                                                   | AI-Kontext, Regeln, Governance                                                                          |
| `SYSTEM_ARCHITECTURE.md`                                                                                                                      | Komponenten-Tabelle, Flows, Config                                                                      |
| `ARCHITECTURE_DESIGN.md`                                                                                                                      | ADRs, Quality Attributes, Referenzen (Hub)                                                              |
| `INDEX.md`                                                                                                                                    | Alle Docs kategorisiert                                                                                 |
| `COMPONENT_INVENTORY.md`                                                                                                                      | Alle Komponenten mit Status                                                                             |
| `GOVERNANCE.md`                                                                                                                               | Entwicklungs-Prozess, Regeln                                                                            |
| `DEVELOPMENT_PROCESS.md`                                                                                                                      | Verweis auf Governance                                                                                  |
| `SECURITY.md`                                                                                                                                 | Security-Policy, DSGVO, API-Key-Regeln                                                                  |
| `CHANGELOG.md`                                                                                                                                | Version-History                                                                                         |
| `specs/TEMPLATE.md`                                                                                                                           | Story-Template                                                                                          |
| `lib/config.js`                                                                                                                               | SSoT alle Parameter                                                                                     |
| `lib/doc-sync.js`                                                                                                                             | DocSync zu Obsidian                                                                                     |
| `journal/learnings.md`                                                                                                                        | Learning-Loop L1                                                                                        |
| `PRODUCT.md`                                                                                                                                  | Frontend-Designkontext (Users, Brand, Tone, Anti-References) — impeccable-Skill-Input                   |
| `DESIGN.md`                                                                                                                                   | Stitch-Format Design-Tokens + 6 Sektionen (Colors, Typography, Elevation, Components, Do/Don't)         |
| `WAVE_DEFINITION.md`                                                                                                                          | Endgültige Wellen-Definition (löst Inkonsistenzen)                                                      |
| `TESTING_STRATEGY.md`                                                                                                                         | Test-Pyramide, Tools (Vitest, Playwright), Coverage-Ziele                                               |
| `docs/ADR-09-users-table-and-roles.md`                                                                                                        | USERS-Tabelle + 6 Rollen                                                                                |
| `docs/ADR-12-backup-feature-flags.md`                                                                                                         | Backup-Strategie + Feature-Flags + Graceful Degradation                                                 |
| `docs/ADR-13-migration-tooling.md`                                                                                                            | Drizzle Kit Migration-Strategie                                                                         |
| `docs/ADR-14-performance-budgets.md`                                                                                                          | Performance-Targets (Backend / Frontend / DB)                                                           |
| `docs/ADR-15-logging-schema.md`                                                                                                               | Pino-Logging-Schema + AUDIT_LOG-Pattern                                                                 |
| `docs/architecture-review-2026-05-16.md`                                                                                                      | System-Review Report mit Tech-Debt-Inventar                                                             |
| `docs/ADR-16-i18n-strategy.md`                                                                                                                | i18n-Strategie (i18next, BCP 47, en+de)                                                                 |
| `specs/ELE-163.md` bis `specs/ELE-186.md`                                                                                                     | 24 MVP-Specs (Wave 1 + Wave 2)                                                                          |
| `specs/ELE-196.md`                                                                                                                            | Reassignment-Engine (Wave 3, ehemals TT-21)                                                             |
| `specs/ELE-197.md`                                                                                                                            | ARCHITECTURE_DESIGN.md §4-§6 Backfill                                                                   |
| `specs/ELE-198.md`                                                                                                                            | ARCHITECTURE_DESIGN.md §7+§8 Backfill (Backlog)                                                         |
| `specs/ELE-199.md`                                                                                                                            | Frontend-Bootstrap (Vite + Tailwind + Theme + i18n + Router + PWA + API + Tests) — Wave 1               |
| `specs/ELE-200.md`                                                                                                                            | Frontend Login + Auth-Flow + Brand-Polish via impeccable craft — Wave 1                                 |
| `specs/ELE-201.md`                                                                                                                            | Backend Auth-Endpoints (forgot-password + GET /users/me) — Wave 1                                       |
| `specs/ELE-202.md`                                                                                                                            | Pilot Wave-1 Demo-Seed Migration — Wave 1                                                               |
| `frontend/package.json` + `tsconfig.json` + `vite.config.ts` + `vitest.config.ts` + `tailwind.config.ts` + `postcss.config.js` + `index.html` | Frontend Build-Setup                                                                                    |
| `frontend/src/main.tsx` + `App.tsx` + `router.tsx` + `vite-env.d.ts`                                                                          | App-Bootstrap + Routing                                                                                 |
| `frontend/src/layouts/{DesktopLayout,MobileLayout,AdaptiveLayout}.tsx`                                                                        | Desktop-Sidebar + Mobile-Bottom-Tabs + Media-Query-Switch (ELE-199)                                     |
| `frontend/src/pages/{HealthPage,LoginPlaceholder,NotFoundPage}.tsx`                                                                           | Smoke + Auth-Placeholder + 404                                                                          |
| `frontend/src/components/LocaleSwitcher.tsx`                                                                                                  | Sprach-Umschalter                                                                                       |
| `frontend/src/hooks/useMediaQuery.ts`                                                                                                         | Media-Query-Hook + useIsDesktop                                                                         |
| `frontend/src/lib/{api,auth,jwt,i18n,theme}.ts(x)`                                                                                            | API-Client, Auth-Context, JWT-Decode, i18n-Setup, Tenant-Theme                                          |
| `frontend/src/types/api.ts`                                                                                                                   | ApiError + ApiRequestError + HealthResponse                                                             |
| `frontend/src/locales/{en,de}/{common,errors,auth,users,validation,health}.json`                                                              | i18n-Resources (6 Namespaces × 2 Sprachen)                                                              |
| `frontend/src/styles/{index,tokens}.css` + `themes/{gepard,immobilienbutler,paul}.css`                                                        | Tailwind-Entry + Token-Layer + 3 Tenant-Theme-Files                                                     |
| `frontend/public/icons/gepard-{192,512}.png`                                                                                                  | PWA-Icons (Placeholder bis echte Brand-Assets)                                                          |
| `frontend/tests/smoke/{layout.test.tsx,api-client.test.ts,jwt.test.ts}`                                                                       | Vitest Component + API + JWT Smokes — ELE-199                                                           |
| `e2e/tests/frontend-smoke.spec.ts`                                                                                                            | Playwright E2E Frontend-Smoke — ELE-199/200                                                             |
| `frontend/src/pages/{LoginPage,ChangePasswordPage,ForgotPasswordPage}.tsx`                                                                    | Auth-Pages (Linear-Style kompakte Form, Card-Container) — ELE-200                                       |
| `frontend/src/components/{Button,Input,FormError,UserMenu,ProtectedRoute}.tsx`                                                                | Komponenten-Basis + Auth-Guards — ELE-200                                                               |
| `frontend/src/lib/auth-api.ts`                                                                                                                | API-Wrapper für /auth/login, /auth/forgot-password, /users/me, /users/:id/change-password — ELE-200     |
| `frontend/tests/smoke/{login,components}.test.tsx`                                                                                            | Vitest Tests für LoginPage + Component-Basis — ELE-200                                                  |
| `frontend/src/pages/SchedulePage.tsx`                                                                                                         | Wochenplan-Grid (Outlook-Kalender + 4 View-Modi + Workload) — ELE-180                                   |
| `frontend/src/components/{WeekNavigator,ScheduleStatusBadge,PublishScheduleButton,WorkloadBar}.tsx`                                           | Header-Komponenten — ELE-180                                                                            |
| `frontend/src/components/WeekGrid/*.tsx`                                                                                                      | Grid-Body (WeekGrid, ScheduleEntryCard, TimeAxis, ViewModeSwitcher, WorkloadSummary) — ELE-180          |
| `frontend/src/api/schedule.ts`                                                                                                                | TanStack Query Hooks (Schedules/Entries/Employees/Properties/ServiceTypes + Publish/Generate) — ELE-180 |
| `frontend/src/lib/{date,queryClient}.ts`                                                                                                      | Date-Utils + QueryClient — ELE-180                                                                      |
| `frontend/src/types/schedule.ts`                                                                                                              | Schedule-Domain-Types                                                                                   |
| `frontend/src/locales/{en,de}/schedule.json`                                                                                                  | i18n Schedule-Namespace — ELE-180                                                                       |
| `frontend/tests/smoke/schedule.test.tsx`                                                                                                      | Vitest Schedule-Smokes — ELE-180                                                                        |
| `e2e/tests/schedule-smoke.spec.ts`                                                                                                            | Playwright Schedule-E2E — ELE-180                                                                       |
| `specs/ELE-181.md`                                                                                                                            | Drag-&-Drop-Umplanung Spec                                                                              |
| `frontend/src/components/ScheduleConflictAlert.tsx`                                                                                           | Inline-Banner für 409 TIME_CONFLICT bei DnD-Move — ELE-181                                              |
| `frontend/tests/components/{ScheduleEntryCard.dnd,useMoveScheduleEntry}.test.tsx`                                                             | Vitest DnD-Behavior + Optimistic-Update Tests — ELE-181                                                 |
| `e2e/tests/schedule-dnd.spec.ts`                                                                                                              | Playwright DnD-E2E — ELE-181                                                                            |
| `specs/ELE-182.md`                                                                                                                            | Mobile-Tagesansicht (PWA) Spec                                                                          |
| `frontend/src/pages/MyDayPage.tsx`                                                                                                            | Mobile-Tagesansicht (EMPLOYEE-Tagesplan + Navigieren-Link) — ELE-182                                    |
| `frontend/src/components/HomeRedirect.tsx`                                                                                                    | Role-aware Default-Landing (EMPLOYEE→/today, sonst SchedulePage) — ELE-182                              |
| `frontend/src/lib/{maps,push}.ts`                                                                                                             | Google-Maps-URL-Helper + Web-Push-Subscription-Placeholder — ELE-182                                    |
| `frontend/src/locales/{en,de}/myday.json`                                                                                                     | i18n Myday-Namespace — ELE-182                                                                          |
| `frontend/tests/components/{MyDayPage,maps}.test.{tsx,ts}`                                                                                    | Vitest MyDay-Page + Maps-URL-Tests — ELE-182                                                            |
| `e2e/tests/myday-mobile.spec.ts`                                                                                                              | Playwright Mobile-MyDay-E2E — ELE-182                                                                   |
| `specs/ELE-187.md`                                                                                                                            | DSGVO-Workflows Spec                                                                                    |
| `backend/src/db/migrations/0010_dsgvo_hard_delete_at.sql` + `.down.sql`                                                                       | Migration `users.hard_delete_at` Spalte + Index — ELE-187                                               |
| `backend/src/services/dsgvo/{audit,delete,export}.ts`                                                                                         | DSGVO-Services (Audit-Log-Query/CSV, Soft-Delete, User-Daten-Aggregation) — ELE-187                     |
| `backend/src/routes/dsgvo.ts` + `backend/src/schemas/dsgvo.ts`                                                                                | DSGVO-Routes (data-export, delete-request, audit-log) — ELE-187                                         |
| `backend/scripts/dsgvo-retention.mjs`                                                                                                         | Retention-Cron-Script (--dry-run / --apply) — ELE-187                                                   |
| `backend/tests/routes/dsgvo.test.ts` + `backend/tests/services/dsgvo.test.ts`                                                                 | Vitest: 14 Route-Tests + 6 Service-Unit-Tests — ELE-187                                                 |
| `frontend/src/pages/settings/{AuditTrailPage,DataExportPage}.tsx`                                                                             | Settings-Pages: Audit-Trail (ADMIN) + Self-Service-Export — ELE-187                                     |
| `frontend/src/api/dsgvo.ts`                                                                                                                   | TanStack-Query-Hooks + downloadDataExport — ELE-187                                                     |
| `frontend/src/locales/{en,de}/dsgvo.json`                                                                                                     | i18n Namespace `dsgvo` — ELE-187                                                                        |
| `e2e/tests/dsgvo.spec.ts`                                                                                                                     | Playwright DSGVO-E2E (Self-Service-Export + Audit-Trail) — ELE-187                                      |
| `docs/dsgvo/datenschutzerklaerung.md`                                                                                                         | Datenschutzerklärung-Vorlage (DE, Pilot-parametrisierbar) — ELE-187                                     |
| `docs/dsgvo/avv/{openrouteservice,hosting}.md`                                                                                                | AVV-Templates (Art. 28 DSGVO) — ELE-187                                                                 |
| `specs/ELE-189.md`                                                                                                                            | Error-Tracking Spec                                                                                     |
| `docs/ADR-17-error-tracking.md`                                                                                                               | ADR: GlitchTip self-hosted vs Sentry SaaS, Sentry-SDK-Wire-Up — ELE-189                                 |
| `docs/ERROR_TRACKING.md`                                                                                                                      | Setup-Doku: lokales GlitchTip, DSN-Konfiguration, Alert-Setup — ELE-189                                 |
| `backend/src/lib/tracking.ts`                                                                                                                 | Backend Sentry-Init + captureServerError + PII-Scrubbing — ELE-189                                      |
| `frontend/src/lib/tracking.ts`                                                                                                                | Frontend Sentry-Init + setUserContext + captureException — ELE-189                                      |
| `frontend/src/components/AppErrorBoundary.tsx`                                                                                                | React-Error-Boundary mit Fallback-UI (DE+EN) — ELE-189                                                  |
| `backend/tests/lib/tracking.test.ts`                                                                                                          | Tracking-Service No-Op-Tests (3 Tests) — ELE-189                                                        |
| `frontend/tests/components/AppErrorBoundary.test.tsx`                                                                                         | ErrorBoundary-Tests (3 Tests) — ELE-189                                                                 |
| `specs/ELE-188.md`                                                                                                                            | JWT-Secret-Rotation Spec                                                                                |
| `docs/ADR-18-jwt-secret-rotation.md`                                                                                                          | ADR: Multi-Secret (JWT_SECRET + JWT_SECRET_PREVIOUS) + Rotation-Playbook — ELE-188                      |
| `scripts/rotate-jwt-secret.mjs`                                                                                                               | Rotation-Skript (--dry-run / --apply, .env-Backup) — ELE-188                                            |
| `backend/tests/auth/jwt-rotation.test.ts`                                                                                                     | 6 Vitest-Tests: primary+previous Verify, Sign nutzt nur primary — ELE-188                               |
| `specs/ELE-190.md`                                                                                                                            | Reassignment-Scoring-Gewichte Spec                                                                      |
| `docs/ADR-19-reassignment-scoring-weights.md`                                                                                                 | ADR: Gewichte 30/25/20/15/10 + Equipment-Hard-Filter + Anpassungs-Workflow — ELE-190                    |
| `backend/tests/lib/reassignment-scoring-config.test.ts`                                                                                       | 9 Vitest-Tests: Summen-Sanity, Range-Checks, Faktor-Reihenfolge — ELE-190                               |
| `specs/ELE-196.md`                                                                                                                            | Reassignment-Engine Spec                                                                                |
| `backend/src/services/scheduling/reassignment-pure.ts`                                                                                        | Pure-Scoring (5 Faktoren + Contingency-Bonus + Hard-Filter + Split-Helper) — ELE-196                    |
| `backend/src/services/scheduling/reassignment-engine.ts`                                                                                      | DB-Loader (Entry-Context + Kandidaten + Promise.all) → ruft Pure-Scoring — ELE-196                      |
| `backend/src/routes/reassignment.ts`                                                                                                          | `GET /api/schedule-entries/:id/reassignment-suggestions` (ADMIN/PLANNER/FOREMAN) — ELE-196              |
| `backend/src/locales/{en,de}/reassignment.json`                                                                                               | i18n-Vertrags-Keys für Frontend-Picker (reasons + blockers) — ELE-196                                   |
| `backend/tests/services/reassignment-pure.test.ts`                                                                                            | 43 Pure-Unit-Tests (alle Scorer + Hard-Filter + Composite + Split) — ELE-196                            |
| `backend/tests/routes/reassignment.test.ts`                                                                                                   | 8 Route-Integration-Tests (Auth, 404, Hard-Filter, Contingency-Boost, Proximity) — ELE-196              |
| `specs/ELE-203.md`                                                                                                                            | Reassignment-Picker Frontend-Modal Spec                                                                 |
| `frontend/src/api/reassignment.ts`                                                                                                            | TanStack-Query-Hook + Suggestion/Response-Types — ELE-203                                               |
| `frontend/src/components/ReassignmentPickerModal.tsx`                                                                                         | Modal mit Score-Cards + Blocker-List + Move-Mutation — ELE-203                                          |
| `frontend/src/locales/{en,de}/reassignment.json`                                                                                              | i18n-Namespace `reassignment` für Modal-Strings + Reasons/Blockers — ELE-203                            |
| `frontend/tests/components/ReassignmentPickerModal.test.tsx`                                                                                  | 5 Vitest-Tests (Render, Blocked-Toggle, Move, ESC, Backdrop) — ELE-203                                  |
| `e2e/tests/reassignment-picker.spec.ts`                                                                                                       | Playwright E2E: Trigger-Sichtbarkeit + Modal-Open — ELE-203                                             |
| `scripts/linear.mjs`                                                                                                                          | Linear-API-CLI-Helper                                                                                   |
| `scripts/linear-bootstrap-mvp.mjs`                                                                                                            | Bulk-Setup-Script der 24 MVP-Issues                                                                     |
| `scripts/linear-mvp-mapping.json`                                                                                                             | Mapping TT-XX → ELE-XXX (Audit-Trail)                                                                   |
| `scripts/linear-tech-debt-issues.mjs`                                                                                                         | Bulk-Setup der 6 Tech-Debt-Issues aus Architecture-Review                                               |
| `scripts/linear-tech-debt-mapping.json`                                                                                                       | Mapping TD-A..H → ELE-188..193                                                                          |
| `docker-compose.yml`                                                                                                                          | PostgreSQL 16-alpine Service mit Init-SQL                                                               |
| `backend/src/db/init/01-extensions.sql`                                                                                                       | pgcrypto, pg_trgm, cube, earthdistance                                                                  |
| `backend/src/db/init/02-roles.sql`                                                                                                            | hmservice_owner (BYPASSRLS) + hmservice_app (NOBYPASSRLS)                                               |
| `backend/src/db/init/03-functions.sql`                                                                                                        | fn_set_updated_at() Trigger-Funktion                                                                    |
| `backend/src/db/migrations/0001_schicht1.sql`                                                                                                 | Schicht-1: 10 Tabellen + RLS + Indexes + GRANTs                                                         |
| `backend/src/db/migrations/0001_schicht1.down.sql`                                                                                            | Rollback Schicht-1                                                                                      |
| `backend/src/db/migrations/0002_schicht2.sql` + `.down.sql`                                                                                   | Schicht-2: Fähigkeiten (5 Tabellen)                                                                     |
| `backend/src/db/migrations/0003_schicht3.sql` + `.down.sql`                                                                                   | Schicht-3: Leistungen + Waste (3 Tabellen)                                                              |
| `backend/src/db/migrations/0004_schicht4.sql` + `.down.sql`                                                                                   | Schicht-4: Planung (6 Tabellen)                                                                         |
| `backend/src/db/migrations/0005_schicht5.sql` + `.down.sql`                                                                                   | Schicht-5: Ausführung (2 Tabellen) + Pilot-Tenant-Seed                                                  |
| `backend/tests/db/schichten2-5.test.ts`                                                                                                       | 16 Tests für Schichten 2-5                                                                              |
| `backend/src/db/scripts/db-check.mjs`                                                                                                         | Health-Check (26 Tabellen, RLS, AUDIT_LOG, Extensions)                                                  |
| `scripts/setup-dev-db.mjs`                                                                                                                    | Einmaliger Setup persistente Dev-DB im eleven_crm_db                                                    |
| `backend/src/db/migrations/meta/_journal.json`                                                                                                | Drizzle Migration-Tracking                                                                              |
| `backend/src/db/migrate.ts`                                                                                                                   | Migration-Runner (drizzle-orm/migrator)                                                                 |
| `backend/src/db/schema.ts`                                                                                                                    | Drizzle-Schema-Stub (Drizzle-Kit-Kompatibilität)                                                        |
| `backend/drizzle.config.ts`                                                                                                                   | Drizzle-Kit-Config                                                                                      |
| `backend/src/db/scripts/db-reset.sh`                                                                                                          | DB-Reset + Init + Migrate                                                                               |
| `backend/src/db/scripts/db-check.sh`                                                                                                          | Health-Check (Tabellen, RLS, GRANTs)                                                                    |
| `backend/tests/db/schicht1.test.ts`                                                                                                           | 9 RLS + Constraint Tests                                                                                |
| `backend/tests/db/audit-log.test.ts`                                                                                                          | 7 AUDIT_LOG Append-Only + RLS Tests                                                                     |
| `backend/tests/db/migrations.test.ts`                                                                                                         | 2 Migration-Tracking Tests                                                                              |
| `scripts/rename-specs-to-ele.mjs`                                                                                                             | Einmaliger Rename TT-XX → ELE-XXX im Repo                                                               |
| `README.md`                                                                                                                                   | Projekt-Setup + Testing-Quickstart                                                                      |
| `package.json`                                                                                                                                | npm-Workspaces (backend/frontend/e2e), Lint-Staged-Config                                               |
| `backend/package.json` + `backend/vitest.config.ts` + `backend/tsconfig.json`                                                                 | Backend Test-Setup                                                                                      |
| `backend/tests/setup.ts`                                                                                                                      | Globaler Vitest-Setup (Testcontainers Boot)                                                             |
| `backend/tests/helpers/db.ts`                                                                                                                 | Testcontainers PostgreSQL + Owner/App-Pools                                                             |
| `backend/tests/helpers/withTestTenant.ts`                                                                                                     | RLS-Test-Helper (`SET app.current_tenant_id`)                                                           |
| `backend/tests/helpers/loginAs.ts`                                                                                                            | JWT-Generierung für Tests (Stub bis ELE-169)                                                            |
| `backend/tests/helpers/seedFixture.ts`                                                                                                        | Fixture-Loader (Stub bis ELE-168)                                                                       |
| `backend/tests/smoke.test.ts`                                                                                                                 | Smoke-Tests für Postgres + Pools + Extensions                                                           |
| `frontend/package.json` + `frontend/vitest.config.ts` + `frontend/tsconfig.json`                                                              | Frontend Test-Setup                                                                                     |
| `frontend/tests/setup.ts` + `frontend/tests/smoke.test.tsx`                                                                                   | Testing-Library + Smoke                                                                                 |
| `e2e/package.json` + `e2e/playwright.config.ts` + `e2e/tsconfig.json`                                                                         | Playwright E2E-Setup                                                                                    |
| `e2e/tests/smoke.spec.ts`                                                                                                                     | Smoke-Test ohne Server                                                                                  |
| `.husky/pre-commit`                                                                                                                           | Pre-Commit-Hook (lint-staged + typecheck)                                                               |
| `.github/workflows/test.yml`                                                                                                                  | CI-Workflow (Lint, Tests, E2E, Coverage)                                                                |
| `backend/src/db/migrations/0006_user_locale.sql` + `.down.sql`                                                                                | users.locale-Spalte (ADR-16, ELE-169-Nachtrag)                                                          |
| `backend/src/lib/i18n.ts`                                                                                                                     | i18next-Setup + `t(key, locale, vars)` (ELE-194)                                                        |
| `backend/src/lib/locale.ts`                                                                                                                   | Locale-Middleware (setInitialLocale + applyUserLocale)                                                  |
| `backend/src/locales/{en,de}/common.json`                                                                                                     | UI-Allgemein                                                                                            |
| `backend/src/locales/{en,de}/errors.json`                                                                                                     | Error-Messages (Hauptnamespace)                                                                         |
| `backend/src/locales/{en,de}/auth.json`                                                                                                       | Auth-Strings                                                                                            |
| `backend/src/locales/{en,de}/users.json`                                                                                                      | User-Module + Plural-Forms                                                                              |
| `backend/src/locales/{en,de}/validation.json`                                                                                                 | Validation-Variations                                                                                   |
| `backend/tests/lib/i18n.test.ts`                                                                                                              | i18n-Tests (Interpolation, Plural)                                                                      |
| `backend/tests/lib/locale.test.ts`                                                                                                            | Locale-Middleware Unit-Tests                                                                            |
| `backend/tests/routes/locale-middleware.test.ts`                                                                                              | E2E: Error-Messages in Request-Locale                                                                   |
| `backend/src/auth/authorize.ts`                                                                                                               | Rollen-Check-Helper (requireRole, canActOnUser, Forbidden)                                              |
| `backend/src/routes/tenants.ts`                                                                                                               | Tenant-CRUD (GET/PUT) — ELE-170                                                                         |
| `backend/src/routes/users.ts`                                                                                                                 | User-CRUD + change-password + me/locale — ELE-170                                                       |
| `backend/src/routes/service-types.ts`                                                                                                         | Service-Types CRUD — ELE-171                                                                            |
| `backend/src/routes/employees.ts`                                                                                                             | Employees CRUD + DSGVO-Filter + Audit-Read — ELE-173                                                    |
| `backend/src/routes/qualification-types.ts`                                                                                                   | Qualification-Types CRUD — ELE-172                                                                      |
| `backend/src/routes/equipment-types.ts`                                                                                                       | Equipment-Types CRUD — ELE-172                                                                          |
| `backend/src/routes/employee-skills.ts`                                                                                                       | Quali / Equipment / Availability nested — ELE-174                                                       |
| `backend/src/routes/properties.ts`                                                                                                            | Properties + nested Zones — ELE-176                                                                     |
| `backend/src/routes/property-services.ts`                                                                                                     | Leistungsverzeichnis + Frequency-Validation — ELE-177                                                   |
| `backend/src/routes/property-managers.ts`                                                                                                     | Hausverwaltungen + pg_trgm-Suche — ELE-175                                                              |
| `backend/src/routes/contracts.ts`                                                                                                             | Verträge mit monthly_value-Filter — ELE-175                                                             |
| `backend/src/db/migrations/0007_pm_trgm.sql` + `.down.sql`                                                                                    | GIN-Trigram-Indexe für PM-Schnellsuche — ELE-175                                                        |
| `backend/src/routes/waste-bin-types.ts`                                                                                                       | Tonnentypen-Stammdaten — ELE-178                                                                        |
| `backend/src/routes/waste-schedules.ts`                                                                                                       | Abfuhrpläne + collection_days JSONB — ELE-178                                                           |
| `backend/src/db/migrations/0008_waste_codes_en.sql` + `.down.sql`                                                                             | waste_bin_types.code DE→EN Migration — ELE-178                                                          |
| `backend/src/db/migrations/0009_pilot_wave1_seed.sql` + `.down.sql`                                                                           | Pilot Wave-1 Demo-Seed (PM, Contracts, Property-Services, Template + Schedule für KW 21/2026) — ELE-202 |
| `backend/tests/db/seed-pilot-wave1.test.ts`                                                                                                   | ELE-202-Seed-Tests: Counts + Idempotenz + Frequenz-Mix                                                  |
| `backend/src/routes/schedules.ts`                                                                                                             | Wochenpläne + Publish-Endpoint — ELE-179                                                                |
| `backend/src/routes/schedule-entries.ts`                                                                                                      | Entries + Bulk + Move + Time-Conflict — ELE-179                                                         |
| `backend/src/services/scheduling/conflict-check.ts`                                                                                           | Pure Funcs (entriesOverlap, isValidStatusTransition) — ELE-179                                          |
| `backend/src/services/scheduling/frequency-engine.ts`                                                                                         | Frequenz-Engine + DB-Loader (alle 7 Freq + Saison) — ELE-184                                            |
| `backend/src/routes/scheduling-debug.ts`                                                                                                      | GET /api/due-services Debug-Endpoint — ELE-184                                                          |
| `backend/tests/services/scheduling/frequency-engine.test.ts`                                                                                  | Pure-Function-Tests (23 Cases, 100% Coverage) — ELE-184                                                 |
| `backend/tests/routes/scheduling-debug.test.ts`                                                                                               | Debug-Route Tests — ELE-184                                                                             |
| `backend/src/services/scheduling/plan-generator-pure.ts`                                                                                      | Pure Helpers (Overload, Quali-Expiry, Available) — ELE-185                                              |
| `backend/src/services/scheduling/schedule-generator.ts`                                                                                       | 6-Phasen-Generator + Transaction — ELE-185                                                              |
| `backend/src/routes/schedule-generator.ts`                                                                                                    | POST /api/schedules/generate — ELE-185                                                                  |
| `backend/src/schemas/schedule-generator.ts`                                                                                                   | Zod Input + Warning-Types — ELE-185                                                                     |
| `backend/tests/services/scheduling/plan-generator-pure.test.ts`                                                                               | Pure Helper Tests (24 Cases) — ELE-185                                                                  |
| `backend/tests/routes/schedule-generator.test.ts`                                                                                             | Plan-Generator E2E (alle Warnings, Doppel-Gen) — ELE-185                                                |
| `backend/src/routes/schedule-templates.ts`                                                                                                    | Templates CRUD + Duplicate + Default-Conflict — ELE-183                                                 |
| `backend/src/routes/template-entries.ts`                                                                                                      | Template-Entries CRUD + Cross-Tenant-Checks — ELE-183                                                   |
| `backend/src/schemas/schedule-templates.ts`                                                                                                   | Zod Schedule-Template + Template-Entry                                                                  |
| `backend/tests/routes/schedule-templates.test.ts`                                                                                             | Templates CRUD + Default-Conflict + Duplicate — ELE-183                                                 |
| `backend/tests/routes/template-entries.test.ts`                                                                                               | Template-Entries CRUD + Cross-Tenant — ELE-183                                                          |
| `backend/src/routes/absences.ts`                                                                                                              | Absences CRUD + Side-Effects (REASSIGNMENT_NEEDED) — ELE-186                                            |
| `backend/src/schemas/absences.ts`                                                                                                             | Zod Absence + Self-Reporting-Types                                                                      |
| `backend/tests/routes/absences.test.ts`                                                                                                       | Absences CRUD + Side-Effects + Self-Reporting — ELE-186                                                 |
| `backend/src/schemas/tenants.ts`                                                                                                              | Zod-Schemas Tenant                                                                                      |
| `backend/src/schemas/users.ts`                                                                                                                | Zod-Schemas User + Passwort-Policy                                                                      |
| `backend/src/schemas/service-types.ts`                                                                                                        | Zod Service-Type + Hex-Color                                                                            |
| `backend/src/schemas/employees.ts`                                                                                                            | Zod Employee + filterEmployeeForActor                                                                   |
| `backend/src/schemas/qualification-types.ts`                                                                                                  | Zod Qualification-Type                                                                                  |
| `backend/src/schemas/equipment-types.ts`                                                                                                      | Zod Equipment-Type + factor 0.30–2.00                                                                   |
| `backend/src/schemas/employee-skills.ts`                                                                                                      | Zod Quali / Equipment / Availability                                                                    |
| `backend/src/schemas/properties.ts`                                                                                                           | Zod Property + Zone                                                                                     |
| `backend/src/schemas/property-services.ts`                                                                                                    | Zod + validateFrequencyDetail (typed JSONB)                                                             |
| `backend/src/schemas/property-managers.ts`                                                                                                    | Zod PropertyManager                                                                                     |
| `backend/src/schemas/contracts.ts`                                                                                                            | Zod Contract + filterContractForActor (monthly_value)                                                   |
| `backend/src/schemas/waste-bin-types.ts`                                                                                                      | Zod WasteBinType + Codes (EN)                                                                           |
| `backend/src/schemas/waste-schedules.ts`                                                                                                      | Zod WasteSchedule + collectionDaysSchema (JSONB-typed)                                                  |
| `backend/src/schemas/schedules.ts`                                                                                                            | Zod Schedule + Status-Enum                                                                              |
| `backend/src/schemas/schedule-entries.ts`                                                                                                     | Zod Entry + bulk + move                                                                                 |
| `backend/tests/routes/tenants.test.ts`                                                                                                        | Tenant-Routes Tests                                                                                     |
| `backend/tests/routes/users.test.ts`                                                                                                          | User-Routes Tests                                                                                       |
| `backend/tests/routes/service-types.test.ts`                                                                                                  | Service-Types-Tests (Color-Validation, In-Use-Block)                                                    |
| `backend/tests/routes/employees.test.ts`                                                                                                      | Employees-Tests (Role-Filter, Tenant-Match, Audit-Log)                                                  |
| `backend/tests/routes/qualification-types.test.ts`                                                                                            | Qualification-Types Tests (IN_USE via 2 Quellen, dup code)                                              |
| `backend/tests/routes/equipment-types.test.ts`                                                                                                | Equipment-Types Tests (factor-range, IN_USE)                                                            |
| `backend/tests/routes/employee-skills.test.ts`                                                                                                | Quali/Equipment/Availability Tests (Upsert, UNIQUE)                                                     |
| `backend/tests/routes/properties.test.ts`                                                                                                     | Properties + Zones + ILIKE-Suche                                                                        |
| `backend/tests/routes/property-services.test.ts`                                                                                              | Alle 7 Frequenzen + frequency_detail-Validation                                                         |
| `backend/tests/routes/property-managers.test.ts`                                                                                              | PM-CRUD + Trigram-Suche + IN_USE-Block (Contracts + Props)                                              |
| `backend/tests/routes/contracts.test.ts`                                                                                                      | Contracts + monthly_value-Filter (Role-based)                                                           |
| `backend/tests/routes/waste-bin-types.test.ts`                                                                                                | Waste-Bin-Types CRUD + IN_USE-Block                                                                     |
| `backend/tests/routes/waste-schedules.test.ts`                                                                                                | Waste-Schedules + collection_days JSONB (WEEKLY/BIWEEKLY)                                               |
| `backend/tests/routes/schedules.test.ts`                                                                                                      | Schedules + Publish + Status-Transition + DUPLICATE_WEEK                                                |
| `backend/tests/routes/schedule-entries.test.ts`                                                                                               | Entries + Bulk + Move + Time-Conflict + Role-Filter                                                     |
| `backend/tests/services/scheduling/conflict-check.test.ts`                                                                                    | Pure Function Tests (Overlap, Status-Transition)                                                        |
| `scripts/linear-ele194-desc.md` / `linear-ele195-desc.md`                                                                                     | Issue-Descriptions i18n Folge-Issues                                                                    |
| `scripts/linear-i18n-mapping.json`                                                                                                            | ELE-194/195 Mapping                                                                                     |

### Source-Input (Repo)

| Pfad                                                         | Zweck                                                    |
| ------------------------------------------------------------ | -------------------------------------------------------- |
| `developer_input/Tool_Beschreibung_Hausmeisterservice.md`    | Anforderungsanalyse, Pain Points, Wellen, Marktvergleich |
| `developer_input/DATENMODELL_Erklaerung_Stundenplan.md`      | Datenmodell-Erklärung (5 Schichten, 24+ Entitäten)       |
| `developer_input/FEATURE_SPEC_Stundenplan_Einsatzplanung.md` | Feature-Spec F01–F11, SQL CREATE TABLEs, UI-Mockups      |
| `developer_input/LINEAR_ISSUES_Stundenplan.md`               | 27 Linear-Issues (HMS-01 bis HMS-27, Wave 1–5)           |

### Docs (Obsidian SecondBrain)

| Pfad                                          | Zweck                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| `TIMETABLE/TIMETABLE - PMO HUB.md`            | Projekt-Hub                                                               |
| `TIMETABLE/Architektur-Vorgaben.md`           | Konsolidierte Stack-Entscheidungen                                        |
| `TIMETABLE/Components/frontend.md`            | Frontend (React + Vite + Tailwind + PWA + @dnd-kit)                       |
| `TIMETABLE/Components/backend.md`             | Backend (Fastify + TypeScript + OpenAPI)                                  |
| `TIMETABLE/Components/api.md`                 | REST-API + Zod-Schemas                                                    |
| `TIMETABLE/Components/db.md`                  | PostgreSQL + Drizzle + RLS, 25 Tabellen                                   |
| `TIMETABLE/Components/auth.md`                | JWT + bcryptjs + 6 Rollen                                                 |
| `TIMETABLE/Components/scheduling.md`          | **Kern-Komponente: Plan-Generator, Frequenz-Engine, Vertretungs-Scoring** |
| `TIMETABLE/Components/routing.md`             | Tourenoptimierung Welle 5 (OpenRouteService primär, Google fallback)      |
| `TIMETABLE/Components/test-infrastructure.md` | Test-Infrastruktur (Vitest + Playwright + Testcontainers)                 |
