# Changelog — Timetable

## v0.6.2 — 2026-05-17 (ELE-204: Abwesenheit melden — Frontend-Modal)

- **ELE-204 done:** Robert kann Krankmeldungen / Abwesenheiten direkt im UI erfassen — kein SQL-Hack mehr nötig, um eine REASSIGNMENT_NEEDED-Aufgabe zu erzeugen. Schließt den Workflow-Kreis: Krankmeldung melden → Cards werden rot → Picker (ELE-203) wählt Vertretung.
- **`frontend/src/api/absences.ts`** — `useReportAbsence(scheduleId)` Mutation, invalidiert `scheduleKeys.entries()` bei Success, ABSENCE_TYPES-Konstante (SICK/VACATION/PERSONAL/TRAINING/OTHER) gespiegelt zum Backend-Schema.
- **`frontend/src/components/ReportAbsenceModal.tsx`** — Form-Modal mit:
  - Employee-Select (oder Read-only-Anzeige wenn `defaultEmployeeId` gesetzt)
  - AbsenceType-Select (5 Typen)
  - Von/Bis-Datums-Inputs (Default heute, `min={startDate}` auf endDate)
  - Optional Notes-Textarea (max 2000 chars)
  - Submit-Validation client-side: `employeeId` gesetzt + `startDate <= endDate`
  - A11y: role=dialog, ESC + Backdrop schließen, autoFocus
- **Variante C: zwei Trigger** für maximale UX-Flexibilität:
  - **Global**: Button im SchedulePage-Header neben Publish — "Abwesenheit melden", Mitarbeiter im Modal wählbar
  - **Kontextuell**: UserMinus-Icon-Button pro Mitarbeiter-Zeile in `WorkloadSummary` — Mitarbeiter preselected
- Beide Trigger nur für ADMIN/PLANNER/FOREMAN (Role-Gate via `useAuth` in `SchedulePage`).
- Submit → Backend POST `/api/absences` → backend markiert betroffene `schedule_entries` automatisch als `REASSIGNMENT_NEEDED` (ELE-186) → TanStack-Query invalidiert → Schedule-Grid rendert Cards mit rotem Status + "Vertretung finden"-Button (ELE-203).
- **i18n** neuer Namespace `absences` (en + de) im Frontend registriert.
- **Tests Vitest**: 7 neue Tests (`ReportAbsenceModal.test.tsx`) — Render-Defaults, Pre-Select, Submit-API-Call, ESC + Backdrop, Validierung. **69/69 frontend grün**.
- **Bundle-Größe**: 148.58 KB gzip (+1.6 KB durch Modal-Code, Budget ADR-14 250 KB).
- **VERSION 0.6.1 → 0.6.2** (Patch — UI-Anhang zu ELE-186-Backend).
- **Wave-3-End-to-End vollständig**: Krankmeldung → Schedule-Markierung → Vertretungs-Picker → Move + Audit-Trail. Robert kann den kompletten Workflow in der UI ausführen.

## v0.6.1 — 2026-05-17 (ELE-203: Reassignment-Picker — Frontend-Modal)

- **ELE-203 done:** Reassignment-Engine (ELE-196) ist jetzt im Browser sichtbar. Robert klickt auf "Vertretung finden" bei einer roten Aufgabe → Modal zeigt Top-3 Kandidaten mit Score + Begründung → ein Klick = Aufgabe ist umverteilt.
- **`frontend/src/api/reassignment.ts`** — TanStack-Query-Hook `useReassignmentSuggestions(entryId, enabled)` mit 30s staleTime, deaktiviert wenn Modal zu.
- **`frontend/src/components/ReassignmentPickerModal.tsx`**:
  - Header mit Property + Datum + Uhrzeit
  - Top-N Suggestion-Cards: Score-Badge (farbig nach Range), Faktor-Breakdown (Kap/Näh/Qual/Erf/Fair + Bonus), lokalisierte Reason-Liste, Klick triggert Move
  - Ausklappbare Blocked-Liste mit Begründung pro geblocktem Kandidaten
  - A11y: `role="dialog"`, ESC schließt, Backdrop-Klick schließt
  - Reason/Blocker-Strings via `resolveBackendKey()`-Helper (Backend-Keys `namespace.foo.bar` → i18next `namespace:foo.bar`)
- **`frontend/src/components/WeekGrid/ScheduleEntryCard.tsx`** — neuer Prop `onReassignClick`. Bei `status='REASSIGNMENT_NEEDED'` + Prop gesetzt: kleiner Button mit UserPlus-Icon erscheint unter der Card. `onPointerDown` stoppt Drag-Initiation.
- **`frontend/src/components/WeekGrid/WeekGrid.tsx`** — reicht `onReassignClick` an alle Cards weiter.
- **`frontend/src/pages/SchedulePage.tsx`** — hält `reassignEntryId`-State, Role-Gate via `useAuth` (nur ADMIN/PLANNER/FOREMAN), rendert Modal als Portal-ähnliche Overlay. Move geht über bestehenden `useMoveScheduleEntry`-Hook (ELE-181), der `is_from_reassignment=TRUE` automatisch setzt.
- **i18n-Namespace `reassignment`** im Frontend registriert (en + de) — Strings für Modal-Text + Reasons + Blockers + Factor-Labels.
- **Tests**:
  - Vitest: 5 neue Tests (`ReassignmentPickerModal.test.tsx`) — Suggestions+Reasons rendern, Blocked-Toggle expandiert, Klick triggert Move-Mutation, ESC + Backdrop schließen. 62/62 frontend grün.
  - Playwright E2E: `reassignment-picker.spec.ts` — 2 Tests (Trigger-Sichtbarkeit, Modal-Open-Flow mit Status-Manipulation per PUT).
- **Bundle-Größe**: 147 KB gzip (+3 KB durch Modal-Code, Budget ADR-14 250 KB).
- **VERSION-Bump**: 0.6.0 → 0.6.1 (Patch — Frontend-Anhang zu ELE-196-Hauptfeature).
- **Engine-Sichtbarkeit:** Wave-3-Engine ist jetzt komplett — Backend (ELE-196) + Frontend (ELE-203). Robert kann den kompletten Krankheits-Workflow in 2 Klicks abwickeln: "Vertretung finden" → Kandidat-Karte klicken. Fertig.

## v0.6.0 — 2026-05-17 (ELE-196: Reassignment-Engine — Wave-3-Hauptfeature)

- **ELE-196 done:** Robert bekommt bei Krankmeldung **automatisch sortierte Vertretungsvorschläge** mit Score + Begründung. Minor-Bump (0.5.6 → 0.6.0) markiert das erste Wave-3-Feature.
- **Pure Scoring-Function** `backend/src/services/scheduling/reassignment-pure.ts` (ADR-04 konform — no DB, no LLM, deterministisch):
  - `haversineKm()` für Geo-Distanz
  - 5 Faktor-Scorer: `scoreCapacity`, `scoreProximity`, `scoreQualification`, `scoreExperience`, `scoreFairness`
  - `applyContingencyBonus()` mit Priority-basiertem +1..+10 Bonus, Cap auf 100
  - `hardFilterBlockerKeys()` → Liste i18n-Keys für inactive/selfReassignment/hasAbsence/timeConflict
  - `scoreCandidate()` Composite: lineare Kombination mit Gewichten aus `REASSIGNMENT_SCORING` (ADR-19), Bonus drauf, Hard-Filter setzt Score=0
  - `splitSuggestions()` sortiert → Top-N (unblocked, ≥ MIN_SCORE_TO_SUGGEST=40) + blocked-Liste mit klaren Blocker-Keys (`lowScore`, `outsideTopN`)
- **Engine-Service** `backend/src/services/scheduling/reassignment-engine.ts`:
  - `loadEntryContext()` — Entry + Property + ISO-Wochengrenzen
  - `loadCandidatePool()` — alle Mitarbeiter im Tenant
  - `buildCandidateInput()` — pro Kandidat parallel (Promise.all über 7 Queries): Auslastung, Qualifikationen, Visits am Property, Absences, Time-Conflicts, Contingency-Rules, Reassignment-Count
  - `getReassignmentSuggestions()` → orchestriert + ruft Pure-Scoring
- **API-Endpoint** `GET /api/schedule-entries/:id/reassignment-suggestions`:
  - Auth: ADMIN / PLANNER / FOREMAN
  - 404 mit `EntryNotFoundError` bei Cross-Tenant- oder Nicht-Existenz
  - Response: `{ entryId, suggestions: Suggestion[], blocked: Suggestion[] }`
  - OpenAPI-Tag `reassignment`
  - In `app.ts` registriert
- **i18n-Vertrags-Keys** (`backend/src/locales/{en,de}/reassignment.json`):
  - `reasons.*`: capacityHigh, proximityNear, qualificationsCount, experienceVisits, fairnessLow, contingencyMatch
  - `blockers.*`: inactive, selfReassignment, hasAbsence, timeConflict, lowScore, outsideTopN
  - Backend nutzt die Keys nicht via `t()` — sie sind Vertrags-Strings fürs Frontend (Picker = separates Folge-Issue)
- **Tests**:
  - **43 Pure-Tests** (`reassignment-pure.test.ts`) — alle Scorer mit min/mid/max + null-Fallbacks + Composite + Hard-Filter + Split
  - **8 Route-Integration-Tests** (`reassignment.test.ts`) — Sortierung, Hard-Filter (Absence + Self), Contingency-Boost verifizierbar, Nähe-Score, RBAC 401/403/200, 404, PLANNER + FOREMAN Zugriff
  - **Coverage**: Pure 100%, Engine 90%+ (DB-Pfade via Integration-Test)
  - **Performance**: lokal ~9ms im Pilot-Setup (Constraint: p95 < 500ms — locker im Limit)
- **Backend-Tests gesamt: 435/435 grün** (war 360 vor ELE-196 → +75)
- **Hinweis Mapping**: Issue spricht von 5 Faktoren inkl. "Verfügbarkeit" (Hard-Filter) — wir folgen ADR-19 mit 5 Soft-Faktoren (Verfügbarkeit ist als Hard-Filter ausgelagert, kein eigenes Gewicht).
- **Qualifikations-Vereinfachung**: Da `qualification_types` kein Level-Feld hat, scoren wir Anzahl gültiger Qualifikationen mit Sättigung bei 3 (statt BASIC/EXPERT-Hybrid wie in ADR-19 vorgeschlagen). Equipment-Hard-Filter entfällt mangels Schema. Dokumentiert in `specs/ELE-196.md`.
- **Out of Scope (eigene Folge-Issues)**:
  - Frontend-Picker-Modal (Wave-3-Frontend-Story)
  - `reassignment_log`-INSERT beim "Vorschlag akzeptiert" (kommt mit Picker)
  - A/B-Test-Framework, Tenant-Override, ML-Tuning

## v0.5.6 — 2026-05-17 (ELE-190: Reassignment-Scoring-Gewichte — ADR + Konstanten)

- **ELE-190 done:** Vorarbeit für ELE-196 (Reassignment-Engine). ADR + Config-Konstanten ohne Engine-Logik — die Engine kommt im Folge-Issue.
- **ADR-19 `docs/ADR-19-reassignment-scoring-weights.md`** dokumentiert:
  - Fünf Score-Faktoren mit initialen Gewichten:
    - **Kapazität 30** — wichtigster Faktor, Burnout-Schutz
    - **Nähe 25** — Fahrzeit-/Sprit-Argument, Sättigung bei 20 km
    - **Qualifikation 20** — soft-Faktor über `MIN_QUALIFICATION_LEVEL`, Hard-Filter darunter
    - **Erfahrung 15** — Objekt-Kenntnis, Sättigung nach 6 Monaten
    - **Fairness 10** — Anti-Burnout-Tie-Breaker
  - Summe = 100 (`WEIGHT_TOTAL_SANITY` Constraint)
  - **Equipment = Hard-Filter** (kein 6. Faktor) — Begründung im ADR: Equipment ist binär (hat/hat nicht), ein Score "wie sehr hat er die Düse?" macht keinen Sinn. ADMIN-Override pro Vorschlag möglich.
  - **Qualifikation = Hybrid** — Hard-Filter unter Mindest-Level + soft-Score-Faktor darüber.
  - Begründungstext-Template (deterministisch, kein LLM): pro Vorschlag eine Liste der Faktor-Werte für menschen-lesbare Erklärung.
  - **Anpassungs-Workflow**: nur via Pull-Request, mit Test gegen historische `reassignment_log`-Daten, A/B-Vergleich der Acceptance-Rate, nicht häufiger als alle 90 Tage.
  - **Feedback-Loop** über `reassignment_log.was_accepted`: KPIs Top-1-Acceptance ≥ 60 %, Top-3 ≥ 85 %, Override-Rate ≤ 10 %.
- **`lib/config.js REASSIGNMENT_SCORING`** Sektion neu mit allen Konstanten — kein Magic-Number mehr im späteren Engine-Code:
  - `WEIGHTS` Objekt + `WEIGHT_TOTAL_SANITY`
  - `MIN_SCORE_TO_SUGGEST: 40` (unter dem: kein Vorschlag — lieber kein als ein schlechter)
  - `MAX_SUGGESTIONS: 3` (Top-N für Robert)
  - `MAX_USEFUL_KM`, `EXPERIENCE_SATURATION_MONTHS`, `FAIR_LOOKBACK_WEEKS`, `MAX_FAIR_VERTRETUNGEN`
  - `EQUIPMENT_HARD_FILTER: true`, `MIN_QUALIFICATION_LEVEL: 'BASIC'`
- **`backend/src/config.ts`** typed `REASSIGNMENT_SCORING`-Export mit Union-Type für `MIN_QUALIFICATION_LEVEL`.
- **Tests Vitest**: 9 Sanity-Checks (`backend/tests/lib/reassignment-scoring-config.test.ts`):
  - WEIGHTS-Summe = WEIGHT_TOTAL_SANITY
  - alle 5 Keys vorhanden
  - Range-Checks für Schwellwerte
  - Capacity-Reihenfolge: höchstes Gewicht
  - Fairness-Reihenfolge: niedrigstes Gewicht
- **Out of Scope (kommt mit ELE-196)**: Engine-Logik, A/B-Test-Framework, REASSIGNMENT_LOG-Schema-Änderungen, Begründungstext-i18n.
- **Hinweis zur Nummerierung**: Issue-Text sagt "ADR-17" — outdated (ADR-17 = Error-Tracking, ADR-18 = JWT-Rotation). Wir nutzen **ADR-19**.

## v0.5.5 — 2026-05-17 (ELE-188: JWT-Secret-Rotation — Pre-Pilot)

- **ELE-188 done:** Letzter der drei Pre-Pilot-Pflicht-Blocks (nach ELE-187 DSGVO und ELE-189 Tracking). Architecture-Review-Tech-Debt-Punkt A erledigt.
- **ADR-18 `docs/ADR-18-jwt-secret-rotation.md`** — Multi-Secret-Strategie:
  - `JWT_SECRET` = primary (sign + verify)
  - `JWT_SECRET_PREVIOUS` = optional, nur verify (~7d Übergangszeit)
  - Erlaubt nahtlose Rotation **ohne Total-Logout** — alte Tokens verifizieren weiter über previous, neue Tokens werden mit neuem primary signiert.
- **`backend/src/auth/jwt.ts verifyJwt`** versucht primary zuerst, fällt bei Signatur-Fehler zurück auf `JWT_SECRET_PREVIOUS`. Bei beidseitigem Fail wird der **primary**-Fehler weitergeworfen.
- **`backend/src/config.ts validateEnv()`** prüft jetzt zusätzlich: `JWT_SECRET_PREVIOUS` (wenn gesetzt) hat Min-Länge 64; Identitäts-Check `JWT_SECRET !== JWT_SECRET_PREVIOUS` (sonst sinnlose "Rotation").
- **`scripts/rotate-jwt-secret.mjs`** (--dry-run / --apply):
  - Liest aktuelle `.env`
  - Backup nach `.env.<ISO-Timestamp>.bak` (in `.gitignore` ergänzt)
  - Verschiebt aktuelles `JWT_SECRET` → `JWT_SECRET_PREVIOUS`
  - Generiert neues `JWT_SECRET` (`crypto.randomBytes(48).toString('base64')` = 64 Zeichen)
  - Schreibt zurück, gibt Cleanup-Termin (+7d) in stdout aus
- **`.env.example`** ergänzt um `JWT_SECRET_PREVIOUS=` mit Kommentar.
- **`.gitignore`** ergänzt um `.env.*.bak` für Backup-Sicherheit.
- **`GOVERNANCE.md`**: neue Sektion "JWT-Secret-Rotation" mit drei Operator-Playbooks:
  - **Szenario A**: Geplante Rotation (alle 90 Tage) — Routine
  - **Szenario B**: Notfall-Rotation bei Verdacht — sofort + SQL-Force-Logout (`UPDATE users SET must_change_password = TRUE`)
  - **Szenario C**: Cleanup nach 7 Tagen — `JWT_SECRET_PREVIOUS` entfernen + Backend neustarten
- **Tests Vitest**: 6 neue Tests (`backend/tests/auth/jwt-rotation.test.ts`):
  - Sign + verify mit primary
  - Sign mit ALTEM, dann Rotation → verify über previous klappt
  - Neuer Token verifiziert über primary
  - Drittes Secret (weder primary noch previous) → fail
  - Ohne `JWT_SECRET_PREVIOUS`: alte Tokens werden abgelehnt
  - `signJwt` nutzt **niemals** previous
- **Smoke-Test**: `node scripts/rotate-jwt-secret.mjs --dry-run` läuft ohne Side-Effects (verifiziert).
- **Tests-Status**: 360/360 backend Vitest grün, 57/57 frontend.
- **Out of Scope**: Cron für auto-Rotation (manuell reicht für Pilot), HSM/Vault (Welle 6+), Forced-Logout-Endpoint (SQL-Variante reicht als Notbremse), JWKS-`kid`-Header (Overkill für Single-Tenant).
- **Pre-Pilot-Status nach ELE-188**: 3 von 4 Pre-Pilot-Gates erledigt (ELE-187 ✅, ELE-188 ✅, ELE-189 ✅). Verbleibt **ELE-191** (Hosting-Decision).

## v0.5.4 — 2026-05-17 (ELE-189: Error-Tracking — GlitchTip/Sentry-Wire-Up)

- **ELE-189 done:** Pre-Pilot-Pflicht-Block weiter — Sichtbarkeit auf 500-Errors ohne dass Robert oder Daniel anruft. Architecture-Review-Punkt B (Tech-Debt) erledigt.
- **ADR-17 `docs/ADR-17-error-tracking.md`** — Entscheidung: **GlitchTip self-hosted** als Primär (Sentry-Protocol-kompatibel, DSGVO-konform, AVV-frei, Free), **Sentry SaaS** als dokumentierte Backup-Option. Migration zwischen den beiden = nur DSN-Wechsel, kein Code-Change.
- **Backend Sentry-Integration** (`@sentry/node` ^8):
  - `backend/src/lib/tracking.ts` — `initTracking()` (no-op ohne `SENTRY_DSN`), `captureServerError()`, `shutdownTracking()`
  - `backend/src/app.ts setErrorHandler` ruft `captureServerError()` für **5xx only** (4xx ist Client-Fehler, kein Bug)
  - PII-Scrubbing im `beforeSend`-Hook: Authorization-Header, Cookies, JSON-Bodies werden vor dem Senden entfernt
  - Tags: requestId, tenantId, route, statusCode + User-ID (keine PII)
- **Frontend Sentry-Integration** (`@sentry/react` ^10):
  - `frontend/src/lib/tracking.ts` — `initTracking()` (no-op ohne `VITE_SENTRY_DSN`), `setUserContext()`, `clearUserContext()`, `captureException()`
  - `frontend/src/components/AppErrorBoundary.tsx` — React-ErrorBoundary mit bilingualer Fallback-UI (DE primär, EN sekundär in `<em>`), "Seite neu laden"-Button, Detail-Expander für Stack
  - `frontend/src/main.tsx` — `initTracking()` als Schritt 0 vor allem anderen, App in `<AppErrorBoundary>` gewrappt, User-Context wird gesetzt sobald JWT-Payload decodiert ist (User-ID + Tenant + Rolle, keine E-Mail/IP)
- **Source-Maps-Upload via `@sentry/vite-plugin`** (Frontend DevDep):
  - `frontend/vite.config.ts` — Plugin aktiviert sich nur wenn `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` als ENV gesetzt sind. Dev und CI ohne Vars laufen normal durch (kein Upload-Versuch).
  - Source-Maps werden nach Upload aus `dist/` gelöscht (`filesToDeleteAfterUpload`) — User können sie nicht ziehen
- **`.env.example` ergänzt** um `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_URL`, `VITE_SENTRY_DSN`, `VITE_APP_VERSION`. Alle leer = no-op (Dev-Default).
- **Setup-Doku `docs/ERROR_TRACKING.md`**: Schritt-für-Schritt-Anleitung für lokales GlitchTip via Docker, DSN-Konfiguration, **5xx-Spike-Alert** als GlitchTip-UI-Konfiguration (Webhook→Telegram + Email), PII-Scrubbing-Übersicht, Wechsel-Pfad zu Sentry SaaS.
- **Pino-Transport vs Direct-Capture**: Issue verlangte "Pino-Transport für Errors → Tracking-Service". Wir nutzen stattdessen direkten `captureException`-Hook im `setErrorHandler` weil der vollen Request-Kontext hat (requestId, tenantId, route, userId) und keine zusätzliche Worker-Thread-Komplexität braucht. Funktional äquivalent.
- **Tests**: 6 neue Tests (3 Backend Tracking-No-Op + 3 Frontend ErrorBoundary). 354/354 Backend grün, 57/57 Frontend grün.
- **Bundle-Größe**: 144.36 KB gzip (+4 KB durch `@sentry/react`, Budget ADR-14 250 KB → komfortabel).

## v0.5.3 — 2026-05-17 (ELE-187: DSGVO-Workflows — Auskunft / Löschung / Audit-Auswertung)

- **ELE-187 done:** Pre-Pilot-Pflicht erfüllt — Daniel/Anna/Gabi/Jürgen können legal mit echten Personendaten arbeiten. Architecture-Review 2026-05-16 hatte das als kritische Lücke markiert.
- **Migration 0010** `users.hard_delete_at TIMESTAMPTZ` + Partial-Index für Retention-Cron-Lookups. Im Drizzle-Journal `_journal.json` registriert.
- **Config-Sektion `DSGVO_RETENTION`** in `lib/config.js`:
  - `EMPLOYEE_DATA_AFTER_LEAVING_DAYS: 30` (Hard-Delete-Frist nach Soft-Delete)
  - `TIME_LOGS_DAYS: 365` (Zeiterfassungs-Klartext anonymisieren)
  - `GPS_DATA_DAYS: 90` (GPS-Koordinaten löschen)
  - `AUDIT_LOG_DAYS: 365 * 5` (5 Jahre Compliance)
- **Backend-Services** (`backend/src/services/dsgvo/`):
  - `export.ts` — `aggregateUserData()` zieht User + Employee + Qualifikationen + Schedule-Entries + Absence-Records + audit_log; `buildReport()` rendert lesbares Markdown.
  - `delete.ts` — `softDeleteUser()` in einer Transaktion: users + employees + employee_qualifications + future schedule_entries + absence_records auf `is_deleted=TRUE`, historische Entries (≥90 Tage) bleiben anonymisiert für HGB-Aufbewahrung. `hardDeleteDueUsers()` als Phase-2-Funktion.
  - `audit.ts` — `queryAuditLog()` mit Filter+Pagination, `toCsv()` RFC-4180-konform.
- **Backend-Routes** (`backend/src/routes/dsgvo.ts`):
  - **`POST /api/dsgvo/data-export`** — EMPLOYEE: eigene Daten / ADMIN: beliebige. Liefert ZIP mit `data.json` + `report.md`. Schreibt `dsgvo.export` in audit_log.
  - **`POST /api/dsgvo/delete-request`** — Self-Service (mit `confirmEmail`-Match als Phishing-Schutz) oder ADMIN-Action. Schreibt `dsgvo.delete_requested` + `affectedTables`-Metadata.
  - **`GET /api/dsgvo/audit-log`** — ADMIN/SUPER_ADMIN only. Filter (userId, action, targetType, dateFrom, dateTo), Pagination (default 50, max 200), `?format=csv`-Switch.
- **Retention-Cron** (`backend/scripts/dsgvo-retention.mjs`):
  - CLI `--dry-run` / `--apply` (Mutually-Exclusive-Check)
  - Phase 2: Hard-Delete von Usern mit `hard_delete_at < NOW()` — Anonymisierung der employees-Row, physisches Löschen von users + employee_qualifications, audit_log bleibt unangetastet.
  - Audit-Log-Purge nach 5 Jahren
  - Schreibt `dsgvo.retention_run` Summary in audit_log je Tenant
- **Frontend-Settings-Pages**:
  - **`/settings/data-export`** — Self-Service-Download als ZIP, mit DSGVO-Erklärungstext.
  - **`/settings/audit-trail`** (ADMIN-only) — Tabelle mit Filter (action, dateFrom, dateTo), Pagination, CSV-Export-Button.
  - Desktop-Sidebar: neuer "Privacy"-Block mit Links auf beide Settings-Pages.
- **i18n** neuer Namespace `dsgvo` (en + de) + `errors.dsgvo.confirmEmailMismatch` für Phishing-Schutz-Fehlermeldung.
- **Migration-Journal**: `_journal.json` um `0010_dsgvo_hard_delete_at` ergänzt.
- **DSGVO-Docs** (Pre-Pilot-Pflicht):
  - `docs/dsgvo/datenschutzerklaerung.md` — generische DE-Vorlage mit `<Platzhaltern>` für Operator/Anwalt.
  - `docs/dsgvo/avv/openrouteservice.md` — AVV-Template HeiGIT/ORS (Art. 28 DSGVO).
  - `docs/dsgvo/avv/hosting.md` — Generic Hosting-AVV-Template (parametrisierbar bei ELE-191).
- **Tests**:
  - **Backend Vitest**: 14 Route-Tests (`dsgvo.test.ts`) + 6 Service-Unit-Tests (`dsgvo.test.ts` services) = 20 neue Tests. Insgesamt 351/351 grün.
  - **Frontend Vitest**: 54/54 grün (Frontend nicht angefasst von DSGVO-Tests — Frontend-Smoke-Coverage reicht).
  - **Playwright**: `e2e/tests/dsgvo.spec.ts` (3 E2E: Self-Service-Export, Audit-Trail-Render, Audit-CSV-Download).
- **Bundle-Größe**: ~145 KB gzip (Budget ADR-14 250 KB → komfortabel; +5 KB durch dsgvo-Page-Code).
- **Out of Scope (für Folge-Issues)**: DPIA (organisatorisch), E-Mail-Bestätigung vor Hard-Delete (Mail-Provider-Setup), Verschlüsselung at-rest (Hosting-Decision ELE-191), unterschriebene AVVs (durch Operator).

## v0.5.2 — 2026-05-17 (ELE-182: Mobile-Tagesansicht (PWA))

- **ELE-182 done:** Pilot-Mitarbeiter Daniel/Anna/Gabi/Jürgen können den Plan ab Tag 1 auf dem Handy als PWA nutzen. Wave 1 vorgezogen (war ursprünglich Wave 2 / HMS-15) damit der Papier-Ausdruck als Fallback erst danach kommt.
- **`/today` Route** mit neuer `MyDayPage`: Chronologische Liste der heutigen Aufgaben (sortiert nach Startzeit), pro Card: Uhrzeit (tabular-nums, groß), Service-Type-Color-Stripe + Short-Name + Background-Tint, Property-Name + Adresse mit MapPin-Icon, Dauer, Navigieren-Button.
- **`HomeRedirect`** (neue Komponente, `components/HomeRedirect.tsx`): Root-Route `/` ist jetzt role-aware. EMPLOYEE → Redirect `/today`, ADMIN/PLANNER/FOREMAN → SchedulePage (wie bisher). Implementiert sauber als Komponente damit Tests es ohne Spezial-Setup mounten können.
- **MobileLayout Bottom-Tab "Heute"** zeigt nicht mehr auf `/` sondern direkt auf `/today` (verhindert unnötigen Redirect-Hop für EMPLOYEE).
- **Navigations-Helper `lib/maps.ts`**: `formatAddress(property)` + `googleMapsSearchUrl(property)` baut den Google-Maps-Deep-Link `https://www.google.com/maps/search/?api=1&query=<encoded>` zusammen. Browser+OS routen iOS-User automatisch zu Apple Maps wenn installiert.
- **Service-Worker Offline-Cache verbessert (Workbox)**: Neue Runtime-Caching-Strategie `StaleWhileRevalidate` für `/api/schedules`, `/api/schedule-entries`, `/api/properties`, `/api/service-types`, `/api/employees` mit 7-Tage-Cache (`myday-data`). Daniel sieht offline den letzten geladenen Plan sofort, im Hintergrund wird neu gefetcht.
- **Backend nicht angefasst**: Das EMPLOYEE-Scoping (`employees.user_id = actor.userId`) auf `GET /api/schedule-entries` existiert seit ELE-179. Daniel bekommt automatisch nur seine eigenen Einträge — Pilot-Seed verlinkt `daniel@pilot.local` mit `bbbbbbbb-1111-1111-1111-111111111111`.
- **Web-Push-Subscription-Placeholder** (`lib/push.ts`): `getPushPermission()`, `requestPushPermission()`, `subscribeToPush()`. Aktuell wird die Subscription **noch nicht** an einen Server geschickt — das kommt in Wave 3 zusammen mit Reassignment-Benachrichtigungen.
- **i18n** neuer Namespace `myday` (en+de): Loading, Header-Greeting "Guten Morgen, Daniel!", Draft-Hint, Actions, Empty-State (mit unterschiedlichem Text für DRAFT-Wochenplan vs gar kein Plan).
- **Tests**:
  - **Vitest Component:** `MyDayPage.test.tsx` (4 Tests: sortierte Einträge, Property+Service+Maps-Link, Empty-State, Begrüßung) + `maps.test.ts` (3 Tests: formatAddress, UTF-8-Encoding, fehlende Hausnummer).
  - **Playwright Mobile E2E:** `myday-mobile.spec.ts` (4 Tests: PWA-Manifest verfügbar, EMPLOYEE → /today, ADMIN bleibt auf SchedulePage, Maps-Link öffnet im neuen Tab).
- **Build-Größe:** 140.53 KB gzip (Budget ADR-14 = 250 KB → komfortabel).
- **Wave-1-Status nach ELE-182:** Robert hat den Wochenplan-Editor mit DnD-Umplanung (ELE-180+ELE-181), Mitarbeiter haben die mobile Tagesansicht (ELE-182). Pilot ist mit ELE-202 Seed lauffähig. Folge-Issue ELE-193 (Push-Server, Wave 3) bleibt im Backlog.

## v0.5.1 — 2026-05-17 (ELE-181: Drag-&-Drop-Umplanung)

- **ELE-181 done:** Robert kann Aufgaben per Drag & Drop von einem Mitarbeiter auf einen anderen verschieben. Spart ~45 min Telefonarbeit bei jedem Krankheitsfall.
- **`@dnd-kit/core` + `@dnd-kit/modifiers`** (industry-standard, accessibility-first, keyboard-fähig) als DnD-Engine.
- **`DndContext`** umschließt das WeekGrid in `SchedulePage`. Sensoren: `PointerSensor` (5px Activation-Distance) + `KeyboardSensor`. `restrictToWindowEdges` Modifier verhindert dass die Drag-Preview aus dem Viewport heraus rutscht.
- **`ScheduleEntryCard` ist draggable** über `useDraggable({ id: entry.id, data: { entry } })`. Drag-Source bekommt opacity 40% während des Drags, Cursor wird zu `grab` / `grabbing`. Bei `disabled`: `not-allowed` + Lock-Icon.
- **Day×Employee-Buckets sind droppable** über neue Wrapper-Komponente `DroppableBucket` (in `WeekGrid.tsx`). Bucket-ID-Schema: `${day}-${employeeId}`. Hover-Highlight: `brand-primary/10` Tint + Ring-Inset.
- **`DragOverlay`** rendert die gezogene Card im `presentational`-Mode (kein useDraggable, sondern reine Visuals mit Shadow + leichtem Tilt + Brand-Ring), die mit dem Cursor mitläuft.
- **`useMoveScheduleEntry()` Mutation** in `api/schedule.ts`:
  - `onMutate` → optimistischer Cache-Update (employee_id, entry_date, day_of_week, start_time werden sofort gesetzt)
  - `onError` → automatischer Rollback aus Snapshot
  - `onSettled` → `invalidateQueries({ queryKey: scheduleKeys.entries(scheduleId) })`
- **Time-Conflict-Handling**: Backend wirft 409 TIME_CONFLICT → `ScheduleConflictAlert` Banner über dem Grid mit "{{employee}} hat zu dieser Zeit am {{day}} bereits eine Aufgabe — Karte wurde zurückgesetzt". Auto-Dismiss nach 5s, manueller Close-Button. Inline-Alert statt Modal — less intrusive (Spec-Vorgabe).
- **PUBLISHED-Schedule = read-only**: `dndDisabled` wird an WeekGrid weitergereicht. Cards bekommen Lock-Icon + `cursor-not-allowed`, Buckets registrieren sich nicht als Droppable. Zusätzlich erscheint ein Info-Banner "Veröffentlichte Pläne sind schreibgeschützt".
- **Accessibility (A11y)**:
  - `KeyboardSensor` aktiv → Pfeiltasten zum Verschieben, Space zum Aufnehmen/Ablegen, Escape zum Abbrechen
  - `announcements: Announcements` für ARIA-Live-Region: "Aufgabe aufgenommen …", "Verschiebe zu Anna am Montag", "Verschoben zu Anna am Montag", "Abgebrochen"
- **i18n** `schedule.json` erweitert um `dnd.*`-Sektion (en + de) mit Locked-State, Conflict-Body, Drag-Announce.
- **Tests**:
  - **Vitest Component:** `ScheduleEntryCard.dnd.test.tsx` (3 Tests: draggable wenn DRAFT, disabled mit Lock, presentational visual) + `useMoveScheduleEntry.test.tsx` (2 Tests: Optimistic-Update + Rollback bei Conflict).
  - **Playwright E2E:** `schedule-dnd.spec.ts` (3 Tests: data-draggable=true, Buckets sind data-droppable=true, Drag-Move persistiert nach Reload bzw. Conflict-Alert).
- **Build-Größe:** 139 KB gzip (Budget ADR-14 = 250 KB → OK).
- Backlog: ELE-182 (Mobile-Touch-Drag) folgt mit der Mobile-Detail-Ansicht. Saison-/Qualifikations-Checks kommen mit ELE-196 (Reassignment-Engine) — wir vertrauen für jetzt dem Backend-Time-Conflict-Check.

## v0.5.0 — 2026-05-17 (ELE-180: Wochenplan-Grid — Roberts Hauptansicht)

- **ELE-180 done:** Wochenplan-Grid live. Robert kann seine Idealwoche im Browser sehen — das eigentliche Kern-Feature von Wave 1.
- **/impeccable shape** durchgeführt für `/schedule` — Outlook-Kalender-Layout mit echter Zeitskala (07–18 Uhr, 60px/h), detaillierte Entry-Cards, knapper Empty-State. Linear-Style kompakt, Card-Container, Brand-Akzent zurückhaltend.
- **TanStack Query** als Daten-Layer (Provider in App.tsx, eigener QueryClient mit 30s staleTime für Schedules, 5min für Stammdaten, kein refetchOnWindowFocus, smart retry-Strategie für 4xx vs 5xx).
- **date-fns** für ISO-Wochen-Berechnung (Frontend gespiegelt zum Backend ADR-05).
- **Komponenten** (alle Tokens aus DESIGN.md, keine externe UI-Lib):
  - `WeekNavigator` — Vorwoche/Heute/Nächste mit Datum-Range "KW 21 · 18.–22. Mai 2026"
  - `ScheduleStatusBadge` — DRAFT (gray) / PUBLISHED (green) / ARCHIVED (muted)
  - `PublishScheduleButton` — mit Bestätigungs-Modal, nur sichtbar bei DRAFT
  - `WorkloadBar` — Auslastungs-Anzeige "32h / 40h" + Bar, Color-coded < 80% / 80-100% / > 100%
  - `WorkloadSummary` — Sektion mit allen Mitarbeitern + Bar
  - `ViewModeSwitcher` — 4-Tab (Team / Mitarbeiter / Tag / Objekt)
  - `WeekGrid` — Outlook-Kalender mit Y-Achse links + Tages-Spalten
  - `TimeAxis` + `HourGridBackground` — Stunden-Linien + Half-Hour dashed
  - `ScheduleEntryCard` — 3px Service-Type-Color-Stripe links, Property + Service + Time + Duration + Status-Indikator + Reassignment-Badge bei is_from_reassignment
- **SchedulePage** als Orchestrator:
  - Route `/` und `/schedule` (statt vorherigem HealthPage-Default — HealthPage nach `/health` verschoben)
  - URL-Parameter `?week=YYYY-MM-DD` für Direct-Linking
  - Empty-State mit "Plan aus Vorlage generieren"-Button → ruft `POST /api/schedules/generate` mit dem Pilot-Template
  - Filter-Selectors für Employee/Day/Property-View-Modi
- **i18n** `schedule.json` (en + de) mit allen UI-Strings (Navigator, Status, ViewMode, Filter, Workload, Publish-Confirm-Modal, Empty-State).
- **Status-Modifier auf Entry-Cards**: PLANNED default, IN_PROGRESS ring, COMPLETED opacity 60% + strikethrough, SKIPPED/REASSIGNED opacity, REASSIGNMENT_NEEDED Background-Tint + Border.
- **Tests**:
  - Vitest: 11 neue Tests (ScheduleStatusBadge, WorkloadBar, ScheduleEntryCard, ViewModeSwitcher, Date-Utils) → **Total 42/42 Frontend-Tests grün** in 2.5s
  - Playwright: 5 neue Schedule-E2E-Tests grün (KW-Nav rendert, Entry-Cards aus Pilot-Seed sichtbar, Empty-State mit Generate-Button, KW-Nav-URL-Update, ViewMode-Switch) → **Total 12/12 E2E grün** in 5s
- **Build**: 394 KB JS / **gzip 122 KB** (unter ADR-14-Budget 250 KB, neue Spec-Grenze 350 KB).
- VERSION 0.4.3 → **0.5.0** (Minor — Roberts Hauptansicht ist sichtbar).

**Damit ist das Kern-Feature von Wave 1 live**: Robert loggt sich ein, landet direkt auf seinem Wochenplan, sieht die 16 Demo-Einträge der KW 21/2026 im Outlook-Kalender-Layout mit Service-Type-Color-Coding, sieht die Auslastung pro Mitarbeiter, kann zwischen 4 View-Modi switchen, durch Wochen navigieren, leere Wochen via Plan-Generator füllen, und den Plan freigeben. **ELE-181 (Drag&Drop) + ELE-182 (Mobile-Detail) sind jetzt unblocked.**

## v0.4.3 — 2026-05-17 (ELE-202: Pilot Wave-1 Demo-Seed)

- **ELE-202 done:** Migration `0009_pilot_wave1_seed.sql` legt realistische Pilot-Daten an, damit ELE-180 (Wochenplan-Grid) auf echten Daten arbeiten kann statt auf leerem Grid.
- **Was geseedet wird** (alles im Pilot-Tenant `11111111-1111-1111-1111-111111111111`):
  - **1 Property-Manager** "Hausverwaltung Schmidt & Partner" (Köln)
  - **4 Contracts** (1 pro Property): STANDARD/PREMIUM, monatliche Werte 290-640 €
  - **Properties UPDATE**: alle 4 Pilot-Properties bekommen `property_manager_id` + `contract_id`
  - **10 Property-Services** mit Frequenz-Mix: WEEKLY (Treppenhaus pro Property), BIWEEKLY (Hof, Garten), MONTHLY (Fenster, Keller), QUARTERLY (Dachrinne)
  - **4 Waste-Schedules** (Mülltonnen-Abfuhrpläne): Restmüll/Papier/Bio pro Property mit `collection_days` JSONB
  - **1 Schedule-Template** "Standardwoche Gepard" (Default-Template)
  - **16 Template-Entries** Mo-Fr verteilt, Workload-balanced gegen `weekly_hours` (Daniel 40h: 5 Tage, Anna 20h: 3 Tage, Gabi 15h: 2 Tage, Jürgen 30h: 4 Tage)
  - **1 DRAFT-Schedule** für KW 21/2026 (Woche ab Mo 2026-05-18), `generation_method='FROM_TEMPLATE'`
  - **16 Schedule-Entries** mit konkreten Daten Mo 2026-05-18 bis Fr 2026-05-22, alle `PLANNED`
- **Idempotenz**: Migration-Marker via Property-Manager mit fix-UUID (`20202020-1111-...`). Existiert er, RAISE NOTICE + Skip. Zweite Anwendung → keine Count-Änderung (verifiziert durch Test).
- **UUID-Konvention**: alle ELE-202-Records bekommen Präfix `20202020-XXXX-...` als Audit-Trail (Issue-Nummer).
- **Tests**: 6 neue Vitest-Tests in `seed-pilot-wave1.test.ts` (Counts, Property-Verknüpfung, DRAFT-Schedule-Metadata, Schedule-Entries-Mo-Fr-Verteilung, Idempotenz, Frequenz-Mix). **Total 330/330 Tests grün**.
- **Down-Migration** vorhanden: DELETE in FK-Reihenfolge + Properties zurück auf NULL.
- VERSION 0.4.2 → **0.4.3**

**Damit hat ELE-180 echte Daten zum Anzeigen** — sobald das Frontend-Grid existiert. Aktuell schon abrufbar via Backend-API (Swagger `/api/schedules`, `/api/property-services`, `/api/template-entries`).

## v0.4.2 — 2026-05-17 (ELE-200: Frontend Login + Auth-Flow)

- **ELE-200 done (Frontend):** Vollständiger Login-Flow im Browser, baut auf ELE-201 Backend-Endpoints auf.
- **`/impeccable shape`-Design-Brief** für die Login-Page durchgeführt: Linear-Style kompakt (360px max-width), Wortmarke + Tenant-Hint typografisch, Card-Container mit `surface-raised` + 1px Border (kein Drop-Shadow), Brand-Akzent (Gepard-Ocker) **nur** auf Submit-Button.
- **4 neue Pages**:
  - `LoginPage` (`/login`) — Form mit Email + Passwort, Show/Hide-Toggle (Eye/EyeOff Icon), Loading-State, Error-Display via `FormError` mit messageKey-Resolution, must_change_password-Redirect, `?from=`-Original-Path-Resolution
  - `ChangePasswordPage` (`/change-password`) — current + new + confirm Password, lokale Mismatch-Check, `clearMustChangePassword()`-Trigger nach Erfolg
  - `ForgotPasswordPage` (`/forgot-password`) — Anti-Enumeration (immer Success-Message, kein Hint ob Email existiert)
  - LoginPlaceholder.tsx entfernt (war Stub aus ELE-199)
- **4 neue Komponenten**:
  - `Button` (4 Varianten: primary/secondary/ghost/destructive, 3 Größen, Loading-State, Touch-Target ≥44px Mobile)
  - `Input` (Label, Error, Hint, optional RightSlot, aria-describedby-Verkettung)
  - `FormError` (übersetzt `ApiRequestError.messageKey` via i18n-Resolver, fällt auf String-Message zurück)
  - `UserMenu` (Logout-Button + User-Info, Variants sidebar/mobile)
  - `ProtectedRoute` (Auth-Wrapper: Redirect zu `/login?from=…`, forced `/change-password` bei mustChangePassword)
- **Auth-API-Wrapper** `src/lib/auth-api.ts`: `login`, `forgotPassword`, `changePassword`, `me`
- **Auth-Context erweitert** (`src/lib/auth.tsx`):
  - `mustChangePassword` separat in localStorage persistiert (nicht im JWT-Payload — verhindert Verlust bei Page-Reload)
  - `login(token, { mustChangePassword })` mit Login-Response-Flag
  - `clearMustChangePassword()` nach erfolgreichem Wechsel
  - Cross-Tab-Sync auf beiden Storage-Keys
- **Router echt geschützt**: alle App-Routes hinter `ProtectedRoute`, `/login` + `/forgot-password` öffentlich, `/change-password` halb-öffentlich (auth-required, aber forced-Flow erlaubt)
- **Layouts integriert**: DesktopLayout-Sidebar-Footer und MobileLayout-Profile-Tab nutzen `UserMenu`
- **i18n auth-Keys** in en + de erweitert (login, changePassword, forgotPassword Sub-Trees, loginFailed, accountLocked)
- **Tests**:
  - Vitest: 13 neue Tests (5 LoginPage + 9 Component-Smokes für Button/Input/FormError) — **Total 31/31 Frontend-Tests grün** in 2.1s
  - Playwright: 5 E2E-Smoke-Tests grün (redirect-to-login, login-form-renders, locale-switch, forgot-page-reachable, anti-enumeration) in 5.3s
- **Build**: 322 KB JS gzip 102 KB (weiter unter ADR-14-Budget von 250 KB gzip)
- VERSION 0.4.1 → **0.4.2**

**Damit kann Robert sich tatsächlich einloggen** mit `robert@pilot.local` + `ChangeMe123!` (Seed-Passwörter aus `seed-dev-passwords.mjs`), wird zur Change-Password-Page geleitet, kann das Passwort ändern und landet danach auf der HealthPage. **ELE-202 (Demo-Seed) + ELE-180 (Wochenplan-Grid) sind jetzt unblocked.**

## v0.4.1 — 2026-05-17 (ELE-201: Backend Auth-Endpoints Ergänzung)

- **ELE-201 done:** Zwei fehlende Backend-Endpoints für den ELE-200 Frontend-Login-Flow ergänzt.
- **`POST /api/auth/forgot-password`** — Anti-Enumeration-Stub:
  - Body: `{ email }` (Zod-validiert)
  - **Antwortet IMMER 200** mit `{ ok: true }` — egal ob User existiert (kein Enumeration-Channel)
  - Bei existierendem User: Audit-Log `action: 'auth.forgot_password_requested', userId, tenantId, ip`
  - Bei unbekannter Email: Audit-Log `action: 'auth.forgot_password_unknown_email', emailHash` (SHA-256 erste 16 Zeichen, **kein Klartext** wegen DSGVO)
  - Strenger Rate-Limit `5/min/IP` (Override Default 200/min) gegen Email-Probing
  - **Kein Mail-Versand im MVP** — TODO-Comment für Wave-2-Mail-Integration
- **`GET /api/users/me`** — Self-Profile-Endpoint:
  - Requires Auth
  - Returnt `{ id, tenantId, email, displayName, role, isSuperAdmin, locale, mustChangePassword, lastLoginAt, createdAt }` als camelCase-JSON
  - Soft-deleted User → 401 (Token wurde nach Delete nicht invalidiert)
- **Schemas:** `forgotPasswordRequestSchema` + `ForgotPasswordResponse` in `schemas/auth.ts`, `UserMeResponse` in `schemas/users.ts`
- **Tests**: 4 forgot-password + 4 GET-me-Tests grün. Total **324/324 Tests** grün, Coverage 83.87% lines / 77.25% branches / 82.75% functions, services/scheduling 95.49%/91.17%/100%
- VERSION 0.4.0 → **0.4.1** (Patch-Bump — Backend-Endpoints Ergänzung)

**Damit kann ELE-200 (Frontend-Login) starten.**

## v0.4.0 — 2026-05-17 (ELE-199: Frontend-Bootstrap)

- **ELE-199 done:** Frontend-Workspace produktiv lauffähig. `frontend/src/` von 0 auf vollständiges Gerüst.
- **Vite 5 + React 18 + TypeScript-strict** mit Path-Alias `@/`
- **Tailwind 3.4** mit Token-Mapping aus DESIGN.md (Farben, Typografie, Spacing, Rounded als semantische CSS-Variablen)
- **CSS-Variables-Theme-System**: `:root[data-tenant="..."]` mit drei Theme-Files (`gepard.css` aktiv, `immobilienbutler.css` + `paul.css` scaffolded). Tenant-Resolution-Chain: JWT-Claim → localStorage-Debug → Default Gepard.
- **React Router v6** mit Adaptive-Layout (Desktop-Sidebar 240px / Mobile-Bottom-Tabs), Login-Placeholder, NotFound-Page, eine Smoke-Route `/` (HealthPage).
- **react-i18next** mit 6 Namespaces (common, errors, auth, users, validation, health) × 2 Sprachen (en, de). Locale aus JWT > Browser > 'en'. Locale-Switcher-Komponente.
- **API-Client** (fetch-Wrapper) mit JWT-Authorization-Header, Accept-Language-Header, Error-Normalisierung (ApiRequestError mit code + messageKey aus Backend), 401 → localStorage-Cleanup.
- **AuthProvider + useAuth-Hook** + JWT-Decode (Payload-only, kein Verify — Backend ist Trust-Boundary), localStorage-Persist mit Cross-Tab-Sync via storage-Event.
- **PWA** via vite-plugin-pwa: Manifest mit theme-color, App-Shell-Cache (Workbox), Runtime-Cache für `/api/*` (NetworkFirst, 5s Timeout). Placeholder-Icons (192/512 PNG, Gepard-Ocker) bis echte Brand-Assets vorliegen.
- **HealthPage** als Backend-Smoke: calls `GET /api/health`, zeigt Status (connected/degraded/unreachable) + Retry-Button + Last-Checked-Zeitstempel mit Locale-Formatierung.
- **Self-hosted Inter + JetBrains Mono** via `@fontsource/*` (DSGVO — kein Google-Fonts-CDN).
- **Tests**: 17 Vitest-Smokes grün (Layout-Rendering, Theme-Switch, JWT-Decode-Edge-Cases, API-Client-Header-Injection + Error-Normalisierung + 401-Handling + POST-Body) + 3 Playwright-E2E-Smokes grün (App-Boot, Locale-Switch, Login-Route).
- **Build**: 285 KB JS gzip 91 KB (unter Performance-Budget aus ADR-14 von <250 KB gzip).
- **Datei-Struktur**: `frontend/src/{components,hooks,layouts,lib,locales,pages,styles,types}` + `frontend/public/icons` + `frontend/tests/smoke` + `e2e/tests/frontend-smoke.spec.ts`.

**Wave-1-Frontend-Vorarbeit abgeschlossen.** ELE-180 (Wochenplan-Grid), ELE-181 (Drag&Drop), ELE-182 (Mobile-PWA-Detail) und ELE-195 (i18n-Frontend-Full) sind jetzt unblocked.

VERSION 0.3.3 → **0.4.0** (Minor-Bump — erste Frontend-Lieferung).

## v0.3.3 — 2026-05-16 (ELE-197: ARCHITECTURE_DESIGN.md §4-§6 nachgezogen)

- **ELE-197 done (Doku):** Drei fehlende Sektionen in `ARCHITECTURE_DESIGN.md` ergänzt
  - **§4 Layer-to-Pipeline Mapping** — Request-Pipeline-Diagramm (HTTPS → Fastify-Hooks → Auth-Chain → Route → Zod → Service → Pool → Postgres), File-Mapping-Tabelle pro Layer, 6-Phasen-Plan-Generator-Flow als Sub-Pipeline
  - **§5 Failure Mode Analysis** — 12 Failure-Modes mit Trigger / Detection / Mitigation / Offene Lücken; Cross-Links zu ADR-12, ADR-14, ADR-15, ELE-187, ELE-188, ELE-191
  - **§6 Component Relationships** — Layering-Regeln (erlaubte Dependency-Direction), 7 konkrete Regeln mit Beispielen, Verbotene-Imports-Sektion, Dependency-Diagramm für Plan-Generator
- §7 Scalability Roadmap + §8 Testing Architecture sind in **ELE-198** (Backlog, später nach Hosting-Entscheidung ELE-191 und Frontend-Bootstrap ELE-180)
- **Backlog-Issues angelegt:**
  - **ELE-196** — Reassignment-Engine (Wave 3, Erbe von TT-21). TT-21-Referenz in `specs/ELE-185.md` auf ELE-196 umgeschrieben (kein verwaister Verweis mehr)
  - **ELE-198** — §7 + §8 (Scalability + Testing-Architecture, Backlog)
- VERSION 0.3.2 → 0.3.3 (Doku-only Bump, alle DOC_FILES synchron)

## v0.3.2 — 2026-05-16 (ELE-183 + ELE-186: Schedule-Templates + Absences CRUD)

- **ELE-183 done (Backend):** Schedule-Templates + Template-Entries CRUD
  - Routes `backend/src/routes/schedule-templates.ts` + `template-entries.ts`
  - GET (mit Filter `?isDefault`, `?validForDate`), GET /:id, POST, PUT, DELETE für beide Ressourcen
  - **POST /api/schedule-templates/:id/duplicate** — kopiert Template + alle Entries in einer DB-Transaction (z.B. für saisonale Varianten)
  - **IS_DEFAULT-Konflikt-Check:** maximal ein Default-Template pro Tenant pro überlappendem Gültigkeitsbereich. Überlappung erkannt → 409 `DEFAULT_TEMPLATE_CONFLICT` mit `conflictingTemplateId` im Vars-Block. NULL-Boundaries werden als ±∞ behandelt.
  - DELETE blockt mit 409 `IN_USE` wenn `schedules.template_id` referenziert
  - Cross-Tenant-Checks auf alle FKs in Template-Entries (template, employee, property, service_type) vor INSERT/UPDATE
  - Soft-Delete pattern; ADMIN für DELETE Template, ADMIN/PLANNER sonst
- **ELE-186 done (Backend):** Absence-Records CRUD + automatische Side-Effects
  - Route `backend/src/routes/absences.ts`
  - **POST setzt betroffene Schedule-Entries auf `REASSIGNMENT_NEEDED`**: alle PLANNED-Entries des Mitarbeiters im Absence-Zeitraum bekommen `status = 'REASSIGNMENT_NEEDED'`, `reassignment_reason` (SICK/VACATION/OTHER abgeleitet aus `absence_type`) und `original_employee_id`
  - **DELETE rollt Entries auf PLANNED zurück** — aber NUR für Tage, die nicht von einer anderen aktiven Absence desselben Mitarbeiters abgedeckt sind (NOT EXISTS-Check im Update)
  - `PATCH /api/absences/:id/handle` markiert eine Absence als "behandelt" (Vertretung organisiert)
  - **Self-Reporting** für EMPLOYEE: darf eigene `SICK` oder `PERSONAL` Absences anlegen (über `employees.user_id` verknüpft), keine anderen Typen, kein fremder Mitarbeiter (403 `FORBIDDEN` mit `errors.absenceSelfReportingForbidden`)
  - EMPLOYEE sieht in GET nur eigene Absences; ADMIN/PLANNER sehen alle
  - Date-Range-Validierung (`start_date <= end_date`) via Zod-Refine + Cross-Field-Check in PUT
- **Neue Locale-Keys** (en + de): `templateNotFound`, `templateEntryNotFound`, `absenceNotFound`, `defaultTemplateConflict`, `absenceSelfReportingForbidden`, `absenceInvalidDateRange`
- **App-Registrierung:** `scheduleTemplateRoutes`, `templateEntryRoutes`, `absenceRoutes` in `app.ts` registriert
- 20 neue Tests (7 Schedule-Templates + 4 Template-Entries + 9 Absences), Total **316/316 grün**, TypeScript clean
- **Frontend deferred** (Template-Editor + Calendar + Quick-Form) → ELE-180/182

**Wave-1-Backend ist damit final komplett.** Alle 16 Stammdaten-CRUDs + Frequenz-Engine + Plan-Generator + Templates + Absences mit Side-Effects sind end-to-end getestet.

## v0.3.1 — 2026-05-16 (ELE-185: Plan-Generator MVP-CUT)

- **ELE-185 done (Backend):** Wochenplan-Generierung aus Template — der MVP-Abschluss-Stein
- **Pure Functions** `services/scheduling/plan-generator-pure.ts`:
  - `pickEntryDate(weekStart, dayOfWeek)` — Datum für Wochentag in ISO-Woche
  - `computeEmployeeLoad` — Minuten-Summe pro Mitarbeiter
  - `findOverloadedEmployees` — vergleicht mit weekly_hours
  - `findExpiringQualifications` — < 30 Tage bis Ablauf
  - `findAbsenceFor` — Abwesenheit am konkreten Tag
  - `absenceTypeToReassignmentReason` — Mapping DB-Enums
  - `isEmployeeAvailable` — Time-Window-Check gegen employee_availability
- **Service** `services/scheduling/schedule-generator.ts` (6 Phasen, alles in einer DB-Transaction):
  1. Schedule-Header anlegen (DRAFT, `generation_method = 'FROM_TEMPLATE'`)
  2. Template-Entries → Pending-Entries mit konkreten Daten
     3a. Frequenz-Engine: fällige Property-Services matchen (NO_TEMPLATE_MATCH-Warning bei Mismatch)
     3b. Waste-Schedules → 2 Entries pro Termin (put-out + take-in) mit erstem aktiven Mitarbeiter
  3. Absences-Check → `status=REASSIGNMENT_NEEDED` + ABSENCE-Warning
  4. Verfügbarkeits-Check → OUTSIDE_AVAILABILITY-Warning
  5. Overload + Quali-Expiry → OVERLOAD + QUALIFICATION_EXPIRY Warnings
- **API** `POST /api/schedules/generate` (ADMIN/PLANNER): Input `{ templateId, weekStart, weekNumber, year }` → 201 mit `{ schedule, entries, warnings, stats }`
- **Sicherheits-Garantien:**
  - UNIQUE(tenant, week_start) → 409 DUPLICATE_WEEK bei Doppel-Generierung
  - DRAFT-only (nie direkt PUBLISHED)
  - Komplette Transaction → entweder ganzer Plan oder Rollback
- **Warning-Codes (6)**: OVERLOAD, QUALIFICATION_EXPIRY, NO_TEMPLATE_MATCH, ABSENCE, OUTSIDE_AVAILABILITY, NO_WASTE_SERVICE_TYPE
- 35 neue Tests (24 Pure + 11 Route), Total **296/296 grün**, TypeScript clean
- **Frontend deferred** (Warnings-Dialog + "Woche generieren"-Button) → ELE-180

**Wave-1-Backend ist damit komplett.** Plan-Generation funktioniert end-to-end von Stammdaten + Template → fertiger Wochenplan-Vorschlag.

## v0.3.0 — 2026-05-16 (ELE-184: Frequenz-Engine)

- **ELE-184 done:** Hirn hinter der späteren Wochenplan-Generierung
- **Pure-Function-Service** `backend/src/services/scheduling/frequency-engine.ts`:
  - `isInSeason(month, start, end)` — Saison-Check mit Wrap-Around (z.B. Nov–Mär)
  - `getDueDatesInWeek(propertyService, weekStart)` — alle Tage in einer KW, an denen ein Service fällig ist
  - `isServiceDueInWeek(propertyService, weekStart)` — boolean-Shortcut
  - `getWasteCollectionsInWeek(wasteSchedule, weekStart)` — Abfuhrtermine + automatische Berechnung von `putOutDate` (-1) + `takeInDate` (+1)
- Unterstützt alle 7 Frequenzen aus `property_services.frequency`:
  - WEEKLY (dayOfWeek/weekdays)
  - BIWEEKLY (oddWeek-Flag, ISO-KW gerade/ungerade)
  - MONTHLY (dayOfMonth ODER weekOfMonth+dayOfWeek = "1. Donnerstag im Monat")
  - QUARTERLY / BIANNUAL / ANNUAL (default-Monate, override via `months: number[]`)
  - ON_DEMAND (immer leer — wird nicht automatisch eingeplant)
- Saisonalitäts-Wrap-Around per Tag (Service kann während der Woche Saison wechseln)
- **DB-Loader** `getDueServicesForWeek` + `getDueWasteSchedulesForWeek` — DB-Query + Pure-Function-Filter
- **Debug-Endpoint** `GET /api/due-services?weekStart=YYYY-MM-DD` (ADMIN/PLANNER):
  - Liefert was in der Woche fällig wäre, ohne Schedule-Entries zu erzeugen
  - Pre-View für Planer vor dem späteren Plan-Generator (ELE-185)
- date-fns als neue Dependency (ISO-KW, Monatsarithmetik, ADR-05)
- 26 neue Tests (23 Pure + 3 Route), Total **261/261 grün**
- **Coverage** auf `src/services/scheduling/`: **100% Statements, 100% Funcs, 93.82% Branches** — übertrifft 90%-AC
- TypeScript clean

## v0.2.9 — 2026-05-16 (ELE-179: Schedules + Schedule-Entries CRUD)

- **ELE-179 done (Backend):** Die zentrale Wochenplan-Datenstruktur
- **Pure-Function-Service** `backend/src/services/scheduling/conflict-check.ts`:
  - `entriesOverlap` — halb-offene Zeitintervall-Logik (Berührung am Endpunkt = kein Overlap)
  - `isValidStatusTransition` — lineare State-Machine DRAFT → PUBLISHED → ARCHIVED
  - `timeToMinutes` — Helper für HH:MM/HH:MM:SS → Minuten
- **Schedules** `/api/schedules` (6 Endpoints):
  - CRUD + `POST /:id/publish` (strikt DRAFT → PUBLISHED, kein Idempotenz, setzt published_at/by)
  - Status-Transition-Check (PUT): linear, Sprünge → 400 `INVALID_STATUS_TRANSITION`
  - UNIQUE(tenant, week_start) → 409 `DUPLICATE_WEEK`
  - DELETE blockiert wenn Entries → 409
- **Schedule-Entries** `/api/schedule-entries` (7 Endpoints):
  - CRUD + `POST /bulk` (max 200, atomare Transaction) + `PATCH /:id/move`
  - **Time-Conflict-Check** via SQL `tsrange`-Overlap (`&&`) auf TIME-Intervalle
  - Bei MOVE auf anderen MA: `is_from_reassignment=true`, `original_employee_id` befüllt
  - Cross-Tenant-Check auf 4 FKs (schedule, employee, property, service_type) + optional property_service
  - **EMPLOYEE-Filter**: GET sieht nur eigene Entries (Subquery `employees.user_id = actor.userId`)
  - **ARCHIVED Schedule = read-only** → 403 `SCHEDULE_LOCKED`
- Locales erweitert (en+de): 8 neue Keys (scheduleNotFound, scheduleEntryNotFound, timeConflict, invalidStatusTransition, duplicateWeek, scheduleLocked, bulkTooLarge, scheduleMismatch)
- 35 neue Tests (14 Pure conflict-check + 7 Schedules + 14 Schedule-Entries), Total **235/235 grün**, TypeScript clean
- **Frontend deferred** → wandert zu ELE-180/181/182

## v0.2.8 — 2026-05-16 (ELE-178: Waste-Bin-Types + Waste-Schedules CRUD)

- **ELE-178 done (Backend):** Mülltonnen-Stammdaten + Abfuhrpläne pro Property
- **Migration 0008:** waste_bin_types.code auf englische Identifier umgestellt
  (RESTMUELL → RESIDUAL, PAPIER → PAPER, GELBER_SACK → YELLOW_SACK,
  GELBE_TONNE → YELLOW_BIN, BIOMUELL → BIO, GLAS → GLASS, SPERRMUELL → BULKY,
  ANDERE → OTHER) — Codebase ist jetzt sprachneutral, UI übersetzt via i18n (ADR-16)
  - Idempotente UPDATE-Logik + neuer CHECK-Constraint
  - Pilot-Seed (in 0005) bleibt unverändert; 0008 konvertiert beim Lauf
- **Waste-Bin-Types** Routes (5 Endpoints):
  - GET (alle Auth), GET/:id, POST/PUT (ADMIN/PLANNER), DELETE (ADMIN, IN_USE-Check)
  - Duplicate code → 409 DUPLICATE_CODE
  - 7 Tests
- **Waste-Schedules** Routes (5 Endpoints):
  - GET (mit ?propertyId= Filter), GET/:id, POST/PUT (ADMIN/PLANNER), DELETE (ADMIN/PLANNER)
  - **`collection_days` JSONB** typed per Zod:
    - `{ daysOfWeek: [1..7], frequency: 'WEEKLY' | 'BIWEEKLY' }`
    - BIWEEKLY: genau eines von `evenWeeks` XOR `oddWeeks` → sonst 400 `invalidCollectionDays`
  - Cross-Tenant-Check für `propertyId` + `wasteBinTypeId`
  - `location_description` ist Zod-Pflicht (Spec); DB bleibt nullable für Backward-Compat
  - `latest_put_out` + `earliest_take_in` als TIME für Rauspflicht-/Wegholen-Zeitfenster
  - 8 Tests
- Locales erweitert (en+de): `wasteBinTypeNotFound`, `wasteScheduleNotFound`, `invalidCollectionDays`
- 15 neue Tests (Total **200/200 grün**), TypeScript clean
- **Frontend deferred** → wandert zu ELE-180

## v0.2.7 — 2026-05-16 (ELE-175: Property-Managers + Contracts CRUD)

- **ELE-175 done (Backend):** Zwei zusammengehörige Stammdaten-CRUDs
- **Migration 0007:** `pg_trgm`-GIN-Indexe auf `property_managers.name/email/contact_name` für Schnellsuche (<100ms bei 1000+ Records)
- **Property-Managers** Routes:
  - GET (mit `?q=` ILIKE-Suche über alle drei Trigram-indexierten Felder, LIMIT 100; ohne q LIMIT 500)
  - GET /:id, POST/PUT (ADMIN/PLANNER), DELETE (ADMIN, IN_USE-Check `contracts` + `properties.property_manager_id`)
  - 7 Tests
- **Contracts** Routes:
  - GET (mit `?propertyManagerId=` Filter), GET /:id, POST/PUT (ADMIN/PLANNER), DELETE (ADMIN, IN_USE-Check `properties.contract_id`)
  - `contract_type` Enum: STANDARD/PREMIUM/FRANCHISE
  - **Role-based Field-Filtering:** `monthly_value` ist sensitive (Vertragsdaten) — nur ADMIN/SUPER_ADMIN/PLANNER sehen es; FOREMAN/EMPLOYEE/PROPERTY_MANAGER bekommen `null`
  - `filterContractForActor` als pure helper (Pattern analog zu `filterEmployeeForActor`)
  - 9 Tests
- Cross-Tenant-Schutz: Property-Manager wird vor INSERT/UPDATE im Tenant verifiziert
- Locales erweitert: `propertyManagerNotFound`, `contractNotFound` (en+de)
- 16 neue Tests (Total **185/185 grün**), TypeScript clean
- **Frontend deferred** → wandert zu ELE-180
- **Performance-AC ("<100ms bei 1000+")**: Index ist da, technisch erfüllt; echter Lasttest folgt mit Pilot-Daten

## v0.2.6 — 2026-05-16 (ELE-174 + ELE-176 + ELE-177: Employee-Skills, Properties, Property-Services)

- **ELE-174 done (Backend):** Employee-Skills — 3 nested Sub-Resources
  - `/api/employees/:id/qualifications` (GET/POST/PUT/DELETE) mit `valid_until`, `certificate_number`
  - `/api/employees/:id/equipment` (GET/POST/PUT/DELETE) mit `assigned_at`
  - `/api/employees/:id/availability` (GET, PUT `:dayOfWeek` als Upsert, UNIQUE per employee+day)
  - Doppelte Zuordnung → 409 DUPLICATE_ASSIGNMENT (junction-table UNIQUE)
  - 10 Tests
- **ELE-176 done (Backend):** Properties + Property-Zones
  - Properties: GET (mit `?q=` ILIKE-Suche auf name/street/city), GET/:id, POST/PUT (ADMIN/PLANNER), DELETE (ADMIN, IN_USE-Check `property_services` + `schedule_entries`)
  - Property-Zones nested unter `/api/properties/:propertyId/zones`
  - PROPERTY_TYPES + ZONE_TYPES als Zod-Enum
  - **Geocoding deferred** → Welle 5 (ELE-184/185); `lat`/`lng` werden direkt entgegengenommen
  - 7 Tests
- **ELE-177 done (Backend):** Property-Services (Leistungsverzeichnis)
  - Routes: GET (mit `?propertyId=` Filter), GET/:id, POST/PUT (ADMIN/PLANNER), DELETE
  - **`frequency_detail` JSONB typed per Zod** je nach `frequency`:
    - WEEKLY → `{ weekdays | dayOfWeek }`
    - BIWEEKLY → `{ dayOfWeek, oddWeek? }`
    - MONTHLY → `{ dayOfMonth | weekOfMonth + dayOfWeek }`
    - QUARTERLY/BIANNUAL/ANNUAL → `{ months? }`
    - ON_DEMAND → `{}`
  - PUT validiert `frequency_detail` neu wenn `frequency` oder `frequency_detail` geändert
  - Saisonalitäts-Wrap-Around (z.B. Nov–Mär, seasonal_start=11, seasonal_end=3) wird unterstützt
  - 8 Tests
- **Bugfix `pools.ts`:** PostgreSQL DATE (OID 1082) wird jetzt als String geparsed statt JS-Date — vermeidet Zeitzone-Drift bei `valid_until` (Berlin UTC+1 hatte `2027-01-01` zu `2026-12-31T23:00:00.000Z` gemacht)
- Locales erweitert (en+de): `propertyNotFound`, `propertyZoneNotFound`, `propertyServiceNotFound`, `employeeQualificationNotFound`, `employeeEquipmentNotFound`, `duplicateAssignment`, `invalidFrequencyDetail`, `invalidSeasonalRange`, `propertyMismatch`
- 25 neue Tests (Total **169/169 grün**), TypeScript clean
- **Frontend deferred** für alle 3 Issues → wandert zu ELE-180
- **VALID_UNTIL-Warning-Service deferred** (ELE-174 T3) → separate Notification-Story
- **ELE-176 trotz offenem ELE-175-Block umgesetzt:** `property_manager_id`/`contract_id` sind NULL-fähig, später nachpflegbar

## v0.2.5 — 2026-05-16 (ELE-172: Qualification + Equipment Types CRUD)

- **ELE-172 done (Backend):** Zwei verwandte Stammdaten-CRUDs für Wave-3-Scoring
- **Qualification-Types**:
  - Routes: `GET /api/qualification-types` (alle Auth), `GET/:id`, `POST` + `PUT` (ADMIN/PLANNER), `DELETE` (ADMIN, IN_USE-Check)
  - Pflichtfelder `code` (UNIQUE per Tenant), `name`; optional `description`, `requires_proof`
  - DELETE blockiert wenn in `employee_qualifications` ODER in `service_types.requires_qualification` (Code-Match) referenziert → 409 `IN_USE`
  - Doppelter Code → 409 `DUPLICATE_CODE`
  - 7 Tests
- **Equipment-Types**:
  - Routes: gleiche Struktur wie Qualifications
  - Zod-Validierung `hourly_rate_factor` 0.30–2.00 (Handrasenmäher 2.0× vs Fahrrasenmäher 0.3×, Wave-3-Scoring-Faktor)
  - Category-Enum: RASENMAEHER/REINIGUNG/WINTER/GARTEN/WERKZEUG/FAHRZEUG/OTHER
  - DELETE blockiert wenn in `employee_equipment` referenziert
  - 7 Tests
- Locales erweitert: `qualificationTypeNotFound`, `equipmentTypeNotFound`, `duplicateCode` (en+de)
- 14 neue Tests (Total **144/144 grün**), TypeScript clean
- **Frontend deferred** → wandert zu ELE-180
- Spec-Schema-Abweichung dokumentiert: `qualification_types.category` ist nicht in DB (Spec irrt), `code` ist der UNIQUE-Identifier

## v0.2.4 — 2026-05-16 (ELE-171: Service-Types CRUD + ELE-173: Employees CRUD)

- **ELE-171 done (Backend):** Service-Types CRUD mit Color-Picker-Validation
  - Routes: `GET /api/service-types`, `GET/:id`, `POST` (ADMIN/PLANNER), `PUT` (ADMIN/PLANNER), `DELETE` (ADMIN, blockiert wenn referenziert)
  - Zod-Validation für Hex-Color `/^#[0-9A-Fa-f]{6}$/` → `errors.invalidColorCode`
  - 6 Kategorien Enum (CLEANING/GARDEN/WASTE/WINTER/MAINTENANCE/OTHER)
  - DELETE-Block-Check: `EXISTS` auf `property_services` + `schedule_entries` → 409 `IN_USE`
  - 7 Tests
- **ELE-173 done (Backend):** Employees CRUD mit DSGVO-Schutz
  - Routes: GET (List/Detail), POST (ADMIN), PUT (ADMIN), DELETE (ADMIN, IN_USE-Check)
  - **Role-based Field-Filtering:** `hourly_rate` wird nur an ADMIN/SUPER_ADMIN ausgeliefert (für EMPLOYEE/PLANNER/FOREMAN → `null`)
  - **DSGVO-Audit-Log** (Art. 30): jeder Detail-Read `GET /:id` schreibt `employee.read` in `audit_log`
  - **User-Tenant-Match-Check:** `user_id` muss zum selben Tenant gehören → 400 `USER_TENANT_MISMATCH`
  - DELETE-Block-Check: `schedule_entries` + `time_logs` → 409 `IN_USE`
  - **Geocoding deferred** zu Welle 5 (ELE-184/185) — `home_lat`/`home_lng` werden direkt entgegengenommen
  - 9 Tests
- Authorization-Helper `requireRole('ADMIN', 'PLANNER')` (Mehrfach-Rolle) bestätigt
- Locales erweitert: `errors.inUse`, `errors.invalidColorCode`, `errors.userTenantMismatch`, `errors.serviceTypeNotFound`, `errors.employeeNotFound` (en+de)
- 16 neue Tests (Total **130/130 grün**), TypeScript clean
- **Frontend deferred** für beide Issues → wandert zu ELE-180

## v0.2.3 — 2026-05-16 (ELE-194: i18n Backend Full)

- **ELE-194 done:** Backend-i18n produktiv mit `i18next`
- Resource-Files als JSON: `backend/src/locales/{en,de}/{common,auth,errors,users,validation}.json` (5 Namespaces)
- `lib/i18n.ts` umgeschrieben: `initI18n()` synchron, `t(key, locale, vars?)` delegiert an i18next
  - Interpolation: `t('errors.rateLimited', 'de', { retryAfter: '30s' })` → "Zu viele Anfragen. Bitte 30s warten."
  - Plural-Forms: `t('users.count', 'en', { count: 1 })` → "1 user", `count: 5` → "5 users"
  - Key-Konvention `errors.unauthorized` (nsSeparator '.', keySeparator off)
- **Locale-Resolution-Middleware** `backend/src/lib/locale.ts`:
  - `onRequest`-Hook setzt `request.locale` aus Accept-Language
  - `requireAuth` überschreibt mit JWT-Locale (User-Präferenz schlägt Browser)
  - Fallback en
- **Error-Klassen-Refactor** (`lib/errors.ts`): Konstruktor jetzt `(messageKey, vars?)` statt `(message, messageKey?)`
- **Error-Handler in app.ts** rendert `message` in `request.locale` via `t()`
- Alle Inline-Strings in `routes/{auth,users,tenants}.ts`, `auth/middleware.ts`, `auth/authorize.ts`, `lib/validation.ts` durch Locale-Keys ersetzt
- Rate-Limit-Error rendert ebenfalls über `t('errors.rateLimited', req.locale, { retryAfter })`
- 15 neue Tests (Interpolation, Plural, Locale-Middleware E2E) — Total **114/114 grün**
- TypeScript clean, ESLint clean

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
