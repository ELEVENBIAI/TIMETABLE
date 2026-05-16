# Changelog — Timetable

## v0.2.2 — 2026-05-16 (ELE-170: Tenants + Users CRUD)

- **ELE-170 done (Backend):** Tenant-CRUD + komplette User-Verwaltung mit Authorization-Matrix
- Routes:
  - `GET /api/tenants` + `GET/PUT /api/tenants/:id` (ADMIN eigener, SUPER_ADMIN alle)
  - `GET /api/users` + `GET/POST/PUT/DELETE /api/users/:id`
  - `POST /api/users/:id/change-password` (Self mit oldPassword, Admin-Reset setzt must_change_password)
  - `PATCH /api/users/me/locale` (i18n, ELE-195-Vorbereitung)
- Authorization-Helper `backend/src/auth/authorize.ts`: `requireRole`, `canActOnUser`, `ForbiddenError` mit messageKey
- Passwort-Policy via Zod: ≥8 Zeichen, ≥1 Großbuchstabe, ≥1 Zahl (NIST-konform, kein Sonderzeichen-Zwang)
- Self-Delete blockiert (400 `SELF_DELETE_FORBIDDEN`)
- Self-Update darf weder `role` noch `email` ändern (403 mit messageKey)
- Email-Unique-Violation → 409 `EMAIL_EXISTS`
- AUDIT-LOG-Einträge bei `user.create` + `user.delete` (DSGVO Art. 30)
- bcryptjs cost 12 (aus `SECURITY.BCRYPT_COST`)
- `loginAs()`-Test-Helper produktiv mit echter JWT-Generierung
- **Frontend deferred** → wandert zu ELE-180 (Frontend-Grundgerüst)
- 27 neue Tests (Total 99/99 grün), TypeScript clean
- ARCHITECTURE_DESIGN §9 + INDEX + COMPONENT_INVENTORY um neue Files erweitert

## v0.2.1 — 2026-05-16 (i18n-Nachtrag: ADR-16 + Foundation)

- **ADR-16 angelegt:** `docs/ADR-16-i18n-strategy.md` — i18next FE+BE, Default `en`, erste übersetzte Sprache `de`, BCP 47 Codes
- **Migration 0006:** `users.locale VARCHAR(10) NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'de'))`
- **JWT-Payload erweitert:** neuer Pflicht-Claim `locale: 'en' | 'de'` mit Backwards-Compat-Fallback auf `en` für Pre-ADR-16-Tokens
- **Backend-Foundation:**
  - `backend/src/lib/i18n.ts` Mini-i18n-Map mit `t(key, locale)` + `resolveLocaleFromAcceptLanguage()`
  - `backend/src/locales/{en,de}/index.ts` Resource-Maps (errors + auth Namespaces)
  - Error-Klassen um `messageKey` erweitert — Format `{ error: { code, messageKey, message } }`
  - Login-Endpoint signiert JWT mit `users.locale`
- **Governance:** CLAUDE.md Regel 11 ergänzt — keine Inline-Strings im UI- oder API-Error-Code
- **Doku-Updates:** ARCHITECTURE_DESIGN, SYSTEM_ARCHITECTURE (Cross-Cutting Concerns), COMPONENT_INVENTORY (i18n Backend/Frontend), INDEX, Obsidian `Components/i18n.md`
- **Folge-Issues:**
  - ELE-194: i18n Backend Full (i18next + Locale-Middleware)
  - ELE-195: i18n Frontend (react-i18next + Locale-Selector im Profil)
- **Tests:** 4 i18n-Unit-Tests + 1 JWT-Backwards-Compat-Test — Total 72/72 grün, TypeScript clean

## v0.2.0 — 2026-05-16 (ELE-169: Backend-Skeleton mit Fastify + Auth + Swagger)

- **ELE-169 done:** Fastify-Backend produktiv mit komplettem Auth-Stack
- Routes: `GET /api/health`, `GET /api/config`, `POST /api/auth/login`, `GET /api/docs` (Swagger UI)
- Auth: JWT (jsonwebtoken) mit Pflicht-Claims `{userId, tenantId, role, isSuperAdmin}`
- bcryptjs cost 12 + DUMMY_HASH für Timing-Attack-Schutz
- Login-Lockout nach 5 Fehlversuchen (15 Min) inkl. Reset bei erfolgreichem Login
- Plugins: @fastify/cors, @fastify/jwt, @fastify/rate-limit, @fastify/swagger, @fastify/sensible
- Pino-Logging strukturiert mit Pflicht-Feldern (ADR-15): requestId, tenantId, userId, route, duration, status
- PII-Sanitize-Helper: redacted password/token, maskEmail
- Zod-Validation-Helper + strukturierte HttpError-Klassen
- Feature-Flags via /api/config (whitelisted Subset aus lib/config.js)
- DB-Pools (owner + app) mit RLS-Erzwingung — process.env zur Laufzeit (test-friendly)
- Dev-Password-Seed-Script: bcrypt-Hashes für Pilot-User (Passwort "ChangeMe123!")
- Smoke: Server startet, Robert@pilot.local Login → JWT mit allen Claims
- 22 neue Tests (Total: 63/63 grün), TypeScript + ESLint clean
- lib/config.js: neue Sektionen FEATURES, SECURITY, PERFORMANCE

## v0.1.5 — 2026-05-16 (ELE-165..168: DB-Schichten 2-5 + Pilot-Seed)

- **ELE-165 done:** Schicht 2 — Fähigkeiten (5 Tabellen)
  - `qualification_types`, `equipment_types`, `employee_qualifications` (M:N),
    `employee_equipment` (M:N), `employee_availability`
  - CHECK-Constraints: equipment_types.hourly_rate_factor 0.30-2.00, day_of_week 1-7,
    available_from < available_until
- **ELE-166 done:** Schicht 3 — Leistungen + Müllabfuhr (3 Tabellen)
  - `property_services` (Leistungsverzeichnis mit Frequenz + Saison),
    `waste_bin_types` (Restmüll/Papier/Gelb/Bio/Glas/Sperrmüll),
    `waste_schedules` (Abfuhrpläne pro Objekt)
- **ELE-167 done:** Schicht 4 — Planung (6 Tabellen)
  - `schedule_templates` + `template_entries` — Basis-Wochen
  - `schedules` + `schedule_entries` — konkrete Wochenpläne (DRAFT/PUBLISHED/ARCHIVED)
  - `absence_records` — Krankheit/Urlaub
  - `contingency_rules` — Vordefinierte Vertretungen (CK_NOT_SELF)
- **ELE-168 done:** Schicht 5 — Ausführung + Pilot-Seed (2 Tabellen + Seed)
  - `time_logs` — Ist-Zeiterfassung mit GPS
  - `reassignment_log` — KI-Vertretungsvorschläge mit Confidence
  - **Pilot-Seed:** 1 Tenant, 6 Users, 4 Employees (Daniel/Anna/Gabi/Jürgen),
    9 Service-Types, 5 Qualifications, 9 Equipment-Types, 6 Waste-Bin-Types, 4 Properties
- 16 zusätzliche Backend-Tests (insgesamt 41 grün)
- `db:check` aktualisiert auf 26 Tabellen
- Test-Setup: initial-cleanDb nach Migration (Pilot-Seed kollidiert sonst mit Fixtures)

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
