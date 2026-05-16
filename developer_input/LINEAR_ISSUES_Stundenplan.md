# Linear Issues — Hausmeisterservice Scheduling Platform

**Projekt:** HM-Service
**Linear-Team:** HMSERVICE
**Issue-Prefix:** HMS-
**Stand:** 2026-05-07

---

## Uebersicht: Entwicklungsreihenfolge

### Wave 1 — Fundament & Stammdaten (Woche 1–2)
- HMS-01: Build DB-Schema
- HMS-02: Build Backend-Grundgeruest
- HMS-03: Add Mandantenverwaltung (TENANTS + USERS)
- HMS-04: Add Taetigkeitstypen-Verwaltung (SERVICE_TYPES)
- HMS-05: Add Qualifikations- und Geraetetypen (QUALIFICATION_TYPES, EQUIPMENT_TYPES)
- HMS-06: Add Mitarbeiterverwaltung (EMPLOYEES)
- HMS-07: Add Mitarbeiter-Faehigkeiten (Qualifikationen, Equipment, Verfuegbarkeit)
- HMS-08: Add Hausverwaltungen und Vertraege (PROPERTY_MANAGERS, CONTRACTS)
- HMS-09: Add Objektverwaltung (PROPERTIES, PROPERTY_ZONES)
- HMS-10: Add Leistungsverzeichnis (PROPERTY_SERVICES)
- HMS-11: Add Muelltonnen-Management (WASTE_BIN_TYPES, WASTE_SCHEDULES)

### Wave 2 — Stundenplan-MVP (Woche 3–4)
- HMS-12: Add Wochenplan-CRUD (SCHEDULES, SCHEDULE_ENTRIES)
- HMS-13: Add Wochenplan-Grid-Ansicht (Frontend)
- HMS-14: Add Drag-and-Drop-Umplanung
- HMS-15: Add Mobile-Tagesansicht fuer Mitarbeiter

### Wave 3 — Templates & Automatisierung (Woche 5–7)
- HMS-16: Add Wochenplan-Templates (SCHEDULE_TEMPLATES, TEMPLATE_ENTRIES)
- HMS-17: Build Frequenz-Engine — Faelligkeitspruefung
- HMS-18: Build Plan-Generator — Woche aus Template erzeugen
- HMS-19: Add Abwesenheitsverwaltung (ABSENCE_RECORDS)
- HMS-20: Add Contingency-Regeln (CONTINGENCY_RULES)

### Wave 4 — KI-Vertretung & Zeiterfassung (Woche 8–10)
- HMS-21: Build Vertretungs-Scoring — KI-Vorschlaege bei Krankmeldung
- HMS-22: Add Umplanungs-Workflow — Accept/Reject/Modify
- HMS-23: Add Zeiterfassung — Check-in/Check-out (TIME_LOGS)
- HMS-24: Add Stundenplan-PDF-Export

### Wave 5 — Reporting & Lerneffekt (Woche 11–12)
- HMS-25: Add Auslastungs-Dashboard
- HMS-26: Build Soll-Ist-Analyse — Zeitanpassungsvorschlaege
- HMS-27: Doc Projekt-Dokumentation — CLAUDE.md, README, User-Guide

---

## Wave 1 — Fundament & Stammdaten

---

### HMS-01: Build DB-Schema — PostgreSQL mit RLS und Seed-Daten

**Label:** `infra`
**Priority:** 1 (Urgent)
**State:** Todo

## Was

Komplettes Datenbankschema aufsetzen: 25 Tabellen, RLS-Policies, Indexes, Trigger, Seed-Daten. Basis ist die Datei `schema.sql` aus der Spezifikation. Zwei DB-Rollen (`hmservice_owner`, `hmservice_app`) gemaess Infrastructure Playbook.

## Warum

Alles steht und faellt mit dem Datenmodell. Ohne Schema kein Backend, ohne Backend kein Frontend. Dieses Issue blockiert ALLE anderen Issues.

## Akzeptanzkriterien

- [ ] PostgreSQL 16+ laeuft lokal (Docker-Compose)
- [ ] Alle 25 Tabellen angelegt (TENANTS bis REASSIGNMENT_LOG)
- [ ] RLS-Policy auf jeder Tabelle mit TENANT_ID
- [ ] Zwei DB-Rollen: `hmservice_owner` (umgeht RLS), `hmservice_app` (RLS erzwungen)
- [ ] 52 Indexes angelegt (Partial Indexes mit `WHERE IS_DELETED = FALSE`)
- [ ] 20 `updated_at`-Trigger funktionieren
- [ ] `fn_set_updated_at()` Trigger-Funktion existiert
- [ ] `fn_get_due_waste_schedules()` Hilfsfunktion existiert
- [ ] Extensions aktiviert: pgcrypto, pg_trgm, cube, earthdistance
- [ ] Seed-Daten eingefuegt (~70 Datensaetze: Tenant, Users, Employees, Properties, etc.)
- [ ] `db-reset.sh` Script setzt DB komplett neu auf (Drop + Create + Schema + Seed)
- [ ] `db-check.sh` prueft: Tabellen, RLS-Status, Seed vorhanden
- [ ] `.env.example` Template mit allen DB-Variablen

## Technischer Ansatz

- Docker-Compose fuer lokale PostgreSQL-Instanz
- `schema.sql` direkt ausfuehren (kein ORM-Migration in Phase 1)
- Reihenfolge beachten: Extensions → Rollen → Hilfsfunktionen → Tabellen (Abhaengigkeitsreihenfolge) → RLS → Indexes → Grants → Seed
- RLS-Policies mit `current_setting('app.current_tenant_id', true)::uuid` (true = kein Error wenn nicht gesetzt)

## Tests

- [ ] Test: `hmservice_app` sieht nur Daten mit passendem TENANT_ID
- [ ] Test: `hmservice_app` sieht KEINE Daten ohne gesetztes `app.current_tenant_id`
- [ ] Test: `hmservice_owner` sieht ALLE Daten
- [ ] Test: `updated_at` wird bei UPDATE automatisch aktualisiert
- [ ] Test: `fn_get_due_waste_schedules` gibt korrekte Muellabfuhr-Faelligkeiten zurueck

## Definition of Done

- [ ] Schema laeuft fehlerfrei auf frischer PostgreSQL-Instanz
- [ ] RLS-Tests bestanden
- [ ] db-reset.sh + db-check.sh funktionieren
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

---

### HMS-02: Build Backend-Grundgeruest — Fastify + TypeScript + Auth

**Label:** `infra`
**Priority:** 1 (Urgent)
**State:** Todo

## Was

Backend-Skeleton mit Fastify, TypeScript, PostgreSQL-Connection-Pool, JWT-Auth, CORS, Rate-Limiting, Swagger-Doku. Inkl. `withTenant()` Helper fuer Multi-Tenancy.

## Warum

Grundgeruest, auf dem alle API-Endpoints aufbauen. Ohne Backend keine Daten fuers Frontend. Auth muss von Anfang an stehen, damit RLS korrekt funktioniert.

## Akzeptanzkriterien

- [ ] `backend/src/server.ts` startet Fastify mit TypeScript
- [ ] PostgreSQL-Pool konfiguriert (Owner-Pool + App-Pool)
- [ ] `withTenant(tenantId, fn)` Helper setzt `app.current_tenant_id` pro Request
- [ ] JWT-Auth-Middleware: Token validieren, `tenantId` + `userId` + `role` extrahieren
- [ ] Login-Endpoint: `POST /api/auth/login` (Email + Password → JWT)
- [ ] CORS auf erlaubte Origins beschraenkt (aus `.env`)
- [ ] Rate-Limiting: 200 req/min global, 10 req/min auf Auth-Endpoints
- [ ] Swagger/OpenAPI unter `/api/docs` erreichbar
- [ ] Health-Check: `GET /api/health` → `{ status: "ok", db: "connected" }`
- [ ] Zod-Validierung Setup (`validation.ts` mit `validateBody()` Helper)
- [ ] Error-Handling: Standardisierte Error-Responses (`{ error: "ERROR_CODE" }`)
- [ ] `tsconfig.json` mit `strict: true`

## Technischer Ansatz

- Fastify 5+ mit `@fastify/cors`, `@fastify/rate-limit`, `@fastify/swagger`, `@fastify/jwt`
- Zwei Connection-Pools: `ownerPool` (Migrationen), `appPool` (alle API-Requests, RLS erzwungen)
- JWT-Payload: `{ userId, tenantId, isAdmin, isSuperAdmin, role }`
- JWT_SECRET aus `.env` (min. 64 Zeichen, Server bricht ab ohne)
- Route-Registrierung: Eine Datei pro Entitaet (`routes/auth.ts`, `routes/users.ts`, ...)
- Standard-Pattern: Authorization → Validation → Business Logic via withTenant() → Response

## Tests

- [ ] Test: Health-Check gibt 200 zurueck
- [ ] Test: Login mit gueltigem Passwort gibt JWT zurueck
- [ ] Test: Login mit falschem Passwort gibt 401 zurueck
- [ ] Test: Geschuetzte Route ohne JWT gibt 401 zurueck
- [ ] Test: Rate-Limiting blockt nach 10 Login-Versuchen

## Definition of Done

- [ ] Backend startet mit `npx tsx backend/src/server.ts`
- [ ] Auth-Flow funktioniert (Login → JWT → geschuetzte Route)
- [ ] Swagger-Doku zeigt alle Endpoints
- [ ] API-Tests in `scripts/api-tests.js` ergaenzt
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-01

---

### HMS-03: Add Mandantenverwaltung — TENANTS + USERS CRUD

**Label:** `feature`
**Priority:** 2 (High)
**State:** Backlog

## Was

CRUD-Endpoints fuer Mandanten (TENANTS) und Benutzer (USERS). Mandanten sind die Wurzel der Multi-Tenancy. Users sind an einen Tenant gebunden und haben Rollen.

## Warum

Super-Admin muss neue Tenants anlegen koennen (fuer Franchise-Onboarding). Innerhalb eines Tenants muessen Admins Benutzer verwalten koennen (Planer, Vorarbeiter, Mitarbeiter).

## Akzeptanzkriterien

- [ ] `GET /api/tenants` — Eigenen Tenant abrufen (normaler User sieht nur seinen)
- [ ] `PUT /api/tenants/:id` — Tenant-Einstellungen aendern (nur Admin)
- [ ] `GET /api/users` — Alle User des eigenen Tenants
- [ ] `POST /api/users` — Neuen User anlegen (nur Admin)
- [ ] `PUT /api/users/:id` — User bearbeiten (Admin oder Self)
- [ ] `DELETE /api/users/:id` — User soft-deleten (nur Admin, nicht sich selbst)
- [ ] `POST /api/users/:id/change-password` — Passwort aendern
- [ ] Rollen: SUPER_ADMIN, ADMIN, PLANNER, FOREMAN, EMPLOYEE, PROPERTY_MANAGER
- [ ] Passwort-Hashing mit bcrypt (cost 10+)
- [ ] Input-Validierung: Email-Format, Passwort-Komplexitaet (8 Zeichen, 1 Gross, 1 Zahl)

## Technischer Ansatz

- `routes/tenants.ts` und `routes/users.ts`
- Super-Admin-Check: `request.isSuperAdmin` fuer Tenant-uebergreifende Operationen
- Passwort: `bcryptjs` mit Salt-Rounds 10
- Email-Eindeutigkeit: DB-Constraint `UQ_USERS_EMAIL`

## Tests

- [ ] Test: Admin kann User anlegen
- [ ] Test: Employee kann keinen User anlegen (403)
- [ ] Test: Passwort wird gehasht gespeichert (kein Klartext)
- [ ] Test: Soft-Delete setzt IS_DELETED + DELETED_AT
- [ ] Test: Geloeschte User koennen sich nicht einloggen

## Definition of Done

- [ ] Code implementiert + getestet
- [ ] API-Tests ergaenzt
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-02

---

### HMS-04: Add Taetigkeitstypen-Verwaltung — SERVICE_TYPES CRUD

**Label:** `feature`
**Priority:** 2 (High)
**State:** Backlog

## Was

CRUD-Endpoints und Frontend-Verwaltungsseite fuer Taetigkeitstypen (Treppenhaus, Garten, Muelltonnen, Winterdienst, etc.). Inkl. Farbkodierung, Standard-Dauer, Qualifikationsanforderung.

## Warum

Taetigkeitstypen sind Stammdaten, die ueberall referenziert werden: Im Leistungsverzeichnis, in Planeintraegen, in der Farbkodierung des Stundenplans. Ohne sie funktioniert kein Stundenplan.

## Akzeptanzkriterien

- [ ] `GET /api/service-types` — Alle aktiven Taetigkeitstypen
- [ ] `POST /api/service-types` — Neuen Typ anlegen (nur Admin/Planner)
- [ ] `PUT /api/service-types/:id` — Typ bearbeiten
- [ ] `DELETE /api/service-types/:id` — Typ soft-deleten (nur wenn nirgends verwendet)
- [ ] Pflichtfelder: NAME, SHORT_NAME, CATEGORY, COLOR_CODE, DEFAULT_DURATION_MIN
- [ ] Optionale FK: REQUIRED_QUALIFICATION_ID
- [ ] Frontend: Tabelle mit allen Typen, Farbvorschau, Inline-Bearbeitung
- [ ] Frontend: Color-Picker fuer COLOR_CODE
- [ ] Seed-Daten werden korrekt angezeigt (9 Standard-Typen aus Transkript)
- [ ] Validierung: COLOR_CODE muss Hex-Format (#RRGGBB) haben

## Technischer Ansatz

- `routes/service-types.ts`
- Frontend: `pages/ServiceTypesPage.tsx`
- Loeschpruefung: COUNT auf PROPERTY_SERVICES + SCHEDULE_ENTRIES mit dieser SERVICE_TYPE_ID

## Tests

- [ ] Test: CRUD-Zyklus (Create → Read → Update → Delete)
- [ ] Test: Loeschen schlaegt fehl wenn Typ in PROPERTY_SERVICES verwendet wird
- [ ] Test: Nur Admin/Planner darf anlegen (Employee bekommt 403)
- [ ] Test: Validierung lehnt ungueltige Farbcodes ab

## Definition of Done

- [ ] Backend + Frontend implementiert
- [ ] API-Tests ergaenzt
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-02

---

### HMS-05: Add Qualifikations- und Geraetetypen — Stammdaten CRUD

**Label:** `feature`
**Priority:** 3 (Medium)
**State:** Backlog

## Was

CRUD-Endpoints und Frontend fuer QUALIFICATION_TYPES und EQUIPMENT_TYPES. Inkl. der M:N-Tabelle SERVICE_TYPE_EQUIPMENT (welche Taetigkeit braucht welches Geraet).

## Warum

Qualifikationen und Equipment sind harte Constraints fuer die KI-Planung. Winterdienst erfordert Qualifikation + Raeumfahrzeug. Gartenpflege variiert in der Dauer je nach Rasenmaeher-Typ (Faktor 0.3 bis 2.0). Ohne diese Daten kann die KI keine validen Vertretungsvorschlaege machen.

## Akzeptanzkriterien

- [ ] `GET /api/qualification-types` — Alle Qualifikationstypen
- [ ] `POST /api/qualification-types` — Neuen Typ anlegen
- [ ] `PUT /api/qualification-types/:id` — Typ bearbeiten
- [ ] `DELETE /api/qualification-types/:id` — Typ soft-deleten
- [ ] `GET /api/equipment-types` — Alle Geraetetypen
- [ ] `POST /api/equipment-types` — Neuen Typ anlegen
- [ ] `PUT /api/equipment-types/:id` — Typ bearbeiten (inkl. HOURLY_RATE_FACTOR)
- [ ] `DELETE /api/equipment-types/:id` — Typ soft-deleten
- [ ] `GET /api/service-types/:id/equipment` — Benoetigtes Equipment fuer eine Taetigkeit
- [ ] `POST /api/service-types/:id/equipment` — Equipment-Zuordnung anlegen
- [ ] `DELETE /api/service-type-equipment/:id` — Zuordnung entfernen
- [ ] Frontend: Verwaltungsseiten unter Einstellungen → Qualifikationen / Geraete
- [ ] Seed-Daten korrekt (4 Qualifikationstypen, 9 Geraetetypen)
- [ ] HOURLY_RATE_FACTOR wird mit Erklaerung angezeigt ("0.3 = 3x schneller")

## Technischer Ansatz

- `routes/qualification-types.ts`, `routes/equipment-types.ts`
- Frontend: `pages/QualificationTypesPage.tsx`, `pages/EquipmentTypesPage.tsx`

## Tests

- [ ] Test: CRUD-Zyklus fuer beide Typen
- [ ] Test: SERVICE_TYPE_EQUIPMENT Zuordnung anlegen und abrufen
- [ ] Test: Unique-Constraint auf SERVICE_TYPE_EQUIPMENT verhindert Doppeleintraege

## Definition of Done

- [ ] Backend + Frontend implementiert
- [ ] API-Tests ergaenzt
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-04

---

### HMS-06: Add Mitarbeiterverwaltung — EMPLOYEES CRUD

**Label:** `feature`
**Priority:** 2 (High)
**State:** Backlog

## Was

CRUD-Endpoints und Frontend fuer Mitarbeiter. Zentrale Ressourcenverwaltung: Name, Typ (Vollzeit/Teilzeit/Minijob/Subunternehmer), Wochenstunden, Stundensatz, Wohnort-Koordinaten, Farbcode fuer Kalender, Regions-Zuordnung.

## Warum

Mitarbeiter sind die zentrale Ressource. Ohne Mitarbeiter-Stammdaten keine Stundenplan-Erstellung. Wochenstunden werden fuer Kapazitaetsberechnung gebraucht, Wohnort-Koordinaten fuer Tourenoptimierung, Typ fuer arbeitsrechtliche Constraints (Minijob-Grenze).

## Akzeptanzkriterien

- [ ] `GET /api/employees` — Alle aktiven Mitarbeiter mit optionalem Filter (?type=FULLTIME&region_id=...)
- [ ] `GET /api/employees/:id` — Einzelner Mitarbeiter mit allen Details
- [ ] `POST /api/employees` — Neuen Mitarbeiter anlegen (nur Admin/Planner)
- [ ] `PUT /api/employees/:id` — Mitarbeiter bearbeiten
- [ ] `DELETE /api/employees/:id` — Soft-Delete (nur Admin)
- [ ] Pflichtfelder: FIRST_NAME, LAST_NAME, EMPLOYEE_TYPE, WEEKLY_HOURS
- [ ] DISPLAY_NAME wird auto-generiert wenn leer ("Vorname Nachname-Initial")
- [ ] Frontend: Mitarbeiterliste mit Farbpunkt, Typ-Badge, Wochenstunden
- [ ] Frontend: Detail-/Bearbeitungsformular mit allen Feldern
- [ ] Frontend: Adress-Eingabe mit Geocoding (Lat/Lng automatisch aus Adresse)
- [ ] Frontend: Regions-Dropdown (aus REGIONS geladen)
- [ ] RLS: Mitarbeiter sind nur innerhalb ihres Tenants sichtbar

## Technischer Ansatz

- `routes/employees.ts`
- Frontend: `pages/EmployeesPage.tsx`, `components/EmployeeForm.tsx`
- Geocoding: Nominatim API (kostenlos, Open Source) oder Google Geocoding API
- Regions-Dropdown: Separater Endpoint `GET /api/regions`

## Tests

- [ ] Test: CRUD-Zyklus
- [ ] Test: RLS — Tenant A sieht keine Mitarbeiter von Tenant B
- [ ] Test: Filter nach EMPLOYEE_TYPE funktioniert
- [ ] Test: Soft-Delete setzt IS_DELETED + DELETED_AT
- [ ] Test: Employee kann keine anderen Employees anlegen (403)

## Definition of Done

- [ ] Backend + Frontend implementiert
- [ ] API-Tests ergaenzt
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-02

---

### HMS-07: Add Mitarbeiter-Faehigkeiten — Qualifikationen, Equipment, Verfuegbarkeit

**Label:** `feature`
**Priority:** 2 (High)
**State:** Backlog

## Was

Sub-Verwaltung pro Mitarbeiter: Qualifikationen (mit Ablaufdatum), zugewiesenes Equipment (mit Status), und regulaere Wochenverfuegbarkeit (welche Tage, welche Uhrzeiten). Dargestellt als Tabs in der Mitarbeiter-Detailseite.

## Warum

Ohne Qualifikationen kann die KI keine Winterdienst-Vertretung korrekt vorschlagen (harter Ausschluss). Ohne Equipment-Info keine korrekte Zeitkalkulation (Handrasenmaeher = 120min vs. Fahrrasenmaeher = 20min fuer 800qm). Ohne Verfuegbarkeit keine korrekte Planung von Minijobbern.

## Akzeptanzkriterien

- [ ] `GET /api/employees/:id/qualifications` — Qualifikationen eines MA
- [ ] `POST /api/employees/:id/qualifications` — Qualifikation zuweisen
- [ ] `PUT /api/employee-qualifications/:id` — Bearbeiten (Ablaufdatum, Zertifikatsnummer)
- [ ] `DELETE /api/employee-qualifications/:id` — Entfernen
- [ ] `GET /api/employees/:id/equipment` — Equipment eines MA
- [ ] `POST /api/employees/:id/equipment` — Equipment zuweisen
- [ ] `PUT /api/employee-equipment/:id` — Status aendern (ASSIGNED → RETURNED → MAINTENANCE)
- [ ] `DELETE /api/employee-equipment/:id` — Entfernen
- [ ] `GET /api/employees/:id/availability` — Wochenverfuegbarkeit
- [ ] `PUT /api/employees/:id/availability` — Verfuegbarkeit als Array setzen (Bulk-Update, alle 7 Tage)
- [ ] Frontend Tab "Qualifikationen": Liste mit Name, Erworben am, Gueltig bis, Zertifikatsnummer
- [ ] Frontend Tab "Equipment": Liste mit Geraet, Status-Badge, Zugewiesen seit
- [ ] Frontend Tab "Verfuegbarkeit": Wochentags-Grid (Mo–So) mit Zeitraum oder "Nicht verfuegbar"
- [ ] Warnung wenn Qualifikation in <30 Tagen ablaeuft (gelb) oder abgelaufen (rot)
- [ ] Unique-Constraint: Ein MA kann dieselbe Qualifikation nur einmal haben

## Technischer Ansatz

- Erweitere `routes/employees.ts` mit Sub-Routen
- Frontend: Tabs in `EmployeeDetailPage.tsx`: Stammdaten | Qualifikationen | Equipment | Verfuegbarkeit
- Verfuegbarkeit: Bulk-Update per PUT mit Array von 7 Eintraegen (Mo–So)
- Equipment-Status als Dropdown: ASSIGNED | RETURNED | MAINTENANCE | LOST

## Tests

- [ ] Test: Qualifikation zuweisen und abrufen
- [ ] Test: Doppelte Qualifikation wird abgelehnt (Unique-Constraint)
- [ ] Test: Equipment-Status aendern (ASSIGNED → RETURNED)
- [ ] Test: Verfuegbarkeit Bulk-Update (alle 7 Tage in einem Request)
- [ ] Test: Abgelaufene Qualifikation wird korrekt als "abgelaufen" markiert

## Definition of Done

- [ ] Backend + Frontend implementiert
- [ ] API-Tests ergaenzt
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-05, HMS-06

---

### HMS-08: Add Hausverwaltungen und Vertraege — PROPERTY_MANAGERS + CONTRACTS CRUD

**Label:** `feature`
**Priority:** 3 (Medium)
**State:** Backlog

## Was

CRUD fuer Hausverwaltungen (Kunden) und deren Vertraege. Hausverwaltungen sind die Auftraggeber, Vertraege definieren Laufzeit, Kuendigungsfrist und monatlichen Wert.

## Warum

Objektzuordnung braucht eine Hausverwaltung. Vertragsdaten werden fuer Kuendigungs-Warnungen und Umsatzreporting gebraucht. Bei telefonischer Rueckfrage muss der Planer schnell Vertragsdetails sehen koennen.

## Akzeptanzkriterien

- [ ] `GET /api/property-managers` — Alle Hausverwaltungen
- [ ] `GET /api/property-managers/:id` — Detail mit zugehoerigen Objekten und Vertraegen
- [ ] `POST /api/property-managers` — Neue HV anlegen
- [ ] `PUT /api/property-managers/:id` — HV bearbeiten
- [ ] `DELETE /api/property-managers/:id` — Soft-Delete (nur wenn keine aktiven Objekte)
- [ ] `GET /api/contracts` — Alle Vertraege (?status=ACTIVE&manager_id=...)
- [ ] `POST /api/contracts` — Neuen Vertrag anlegen
- [ ] `PUT /api/contracts/:id` — Vertrag bearbeiten
- [ ] Frontend: Hausverwaltungsliste mit Firma, Kontaktperson, Telefon, Anzahl Objekte
- [ ] Frontend: Vertragsliste unter HV-Detail mit Status-Badge, Laufzeitanzeige
- [ ] Warnung bei Vertraegen die in <6 Monaten auslaufen

## Technischer Ansatz

- `routes/property-managers.ts`, `routes/contracts.ts`
- Frontend: `pages/PropertyManagersPage.tsx` mit Detail-View
- Vertragsstatus-Logik: ACTIVE wenn heute zwischen START_DATE und END_DATE, sonst EXPIRED

## Tests

- [ ] Test: CRUD-Zyklus fuer beide Entitaeten
- [ ] Test: Loeschen einer HV mit aktiven Objekten wird abgelehnt
- [ ] Test: Vertrag mit END_DATE < heute wird als EXPIRED angezeigt
- [ ] Test: RLS — nur eigener Tenant

## Definition of Done

- [ ] Backend + Frontend implementiert
- [ ] API-Tests ergaenzt
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-02

---

### HMS-09: Add Objektverwaltung — PROPERTIES + PROPERTY_ZONES CRUD

**Label:** `feature`
**Priority:** 2 (High)
**State:** Backlog

## Was

CRUD fuer Objekte (Immobilien) und deren Zonen (Treppenhaeuser, Gaerten, Hoefe). Objekte sind das zentrale Geschaeftsobjekt — alles dreht sich um sie. Inkl. Geocoding, Hausverwaltungs-Zuordnung, Vertragszuordnung, Marken-Zuordnung.

## Warum

Ohne Objekte kein Leistungsverzeichnis, ohne Leistungsverzeichnis kein Stundenplan. Geokoordinaten werden fuer Tourenplanung gebraucht. Etagen- und Flaechenangaben fuer Zeitkalkulation.

## Akzeptanzkriterien

- [ ] `GET /api/properties` — Alle Objekte (?city=...&brand=...&manager_id=...&region_id=...)
- [ ] `GET /api/properties/:id` — Detail mit Zonen, Leistungen, Muellplaene
- [ ] `POST /api/properties` — Neues Objekt anlegen
- [ ] `PUT /api/properties/:id` — Objekt bearbeiten
- [ ] `DELETE /api/properties/:id` — Soft-Delete (nur wenn keine aktiven Planeintraege)
- [ ] `GET /api/properties/:id/zones` — Zonen eines Objekts
- [ ] `POST /api/properties/:id/zones` — Zone hinzufuegen
- [ ] `PUT /api/property-zones/:id` — Zone bearbeiten
- [ ] `DELETE /api/property-zones/:id` — Zone loeschen
- [ ] Pflichtfelder: NAME, STREET, ZIP_CODE, CITY, PROPERTY_TYPE
- [ ] Geocoding: Bei Adresseingabe automatisch LAT/LNG ermitteln
- [ ] Frontend: Objektliste mit Kartenansicht (Pins auf Karte)
- [ ] Frontend: Detail-Seite mit Tabs: Stammdaten | Zonen | Leistungen | Muellplaene
- [ ] Frontend: Brand-Badge (Immobilienbutler gold, Gepard gruen, Paul grau)
- [ ] Frontend: Koederobjekt-Markierung visuell sichtbar

## Technischer Ansatz

- `routes/properties.ts`
- Frontend: `pages/PropertiesPage.tsx` mit Tabelle + Kartenansicht (Leaflet oder Google Maps)
- Geocoding: POST-Hook nach Adressaenderung — Nominatim oder Google Geocoding
- Kartenansicht: Cluster-Pins fuer viele Objekte

## Tests

- [ ] Test: CRUD-Zyklus
- [ ] Test: Filter nach City, Brand, Manager
- [ ] Test: Geocoding setzt LAT/LNG bei neuem Objekt
- [ ] Test: Loeschen mit aktiven Planeintraegen wird abgelehnt
- [ ] Test: RLS — nur eigener Tenant
- [ ] Test: Zonen-CRUD innerhalb eines Objekts

## Definition of Done

- [ ] Backend + Frontend implementiert
- [ ] API-Tests ergaenzt
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-08

---

### HMS-10: Add Leistungsverzeichnis — PROPERTY_SERVICES CRUD

**Label:** `feature`
**Priority:** 2 (High)
**State:** Backlog

## Was

CRUD fuer Leistungsverzeichnisse pro Objekt. Jeder Eintrag definiert: Welche Taetigkeit, in welcher Frequenz, mit welcher geschaetzten Dauer, in welchem Zeitfenster, mit welcher Prioritaet, in welcher Saison.

## Warum

Das Leistungsverzeichnis ist das digitale Abbild der Papier-Plaene. Es definiert, WAS an einem Objekt gemacht werden muss. Die Frequenz-Engine (HMS-17) liest diese Daten, um automatisch zu erkennen, welche Aufgaben in einer konkreten Kalenderwoche faellig sind.

## Akzeptanzkriterien

- [ ] `GET /api/properties/:id/services` — Leistungsverzeichnis eines Objekts
- [ ] `POST /api/property-services` — Leistung hinzufuegen
- [ ] `PUT /api/property-services/:id` — Leistung bearbeiten
- [ ] `DELETE /api/property-services/:id` — Leistung entfernen
- [ ] Pflichtfelder: PROPERTY_ID, SERVICE_TYPE_ID, FREQUENCY, ESTIMATED_DURATION_MIN
- [ ] FREQUENCY: Dropdown mit WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, BIANNUAL, ANNUAL, ON_DEMAND
- [ ] FREQUENCY_DETAIL: Dynamisches JSON-Formular je nach FREQUENCY:
  - WEEKLY: Wochentage auswaehlen (Mo–So Checkboxen)
  - BIWEEKLY: Wochentage + gerade/ungerade KW
  - MONTHLY: Woche im Monat (1–4) + Wochentag
  - QUARTERLY/BIANNUAL/ANNUAL: Monate auswaehlen
- [ ] SEASONAL_START/END: Monats-Dropdown (optional, z.B. "April bis Oktober")
- [ ] TIME_WINDOW_START/END: Zeitpicker (optional, z.B. "06:00 bis 08:00" fuer Muelltonnen)
- [ ] PRIORITY: Dropdown 1–4 mit Erklaerung
- [ ] Frontend: Tab "Leistungen" in Objekt-Detail mit Tabelle: Taetigkeit (farbig) | Frequenz | Tag(e) | Dauer | Saison
- [ ] Frontend: Formular-Modal mit dynamischem FREQUENCY_DETAIL-Editor
- [ ] Validierung: ESTIMATED_DURATION_MIN muss zwischen 5 und 480 liegen

## Technischer Ansatz

- `routes/property-services.ts`
- Frontend: `components/PropertyServiceForm.tsx` mit dynamischem Formular
- FREQUENCY_DETAIL-Editor: Switch/Case auf FREQUENCY-Wert → passende Formularfelder rendern
- JSONB-Validierung im Backend: Schema-Check auf FREQUENCY_DETAIL-Struktur

## Tests

- [ ] Test: CRUD-Zyklus
- [ ] Test: FREQUENCY_DETAIL wird korrekt als JSON gespeichert und gelesen
- [ ] Test: Saisonale Einschraenkung (SEASONAL_START=11, SEASONAL_END=3 fuer Winterdienst)
- [ ] Test: Validierung lehnt ungueltige FREQUENCY_DETAIL ab
- [ ] Test: Dauer-Validierung (min 5, max 480)

## Definition of Done

- [ ] Backend + Frontend implementiert
- [ ] API-Tests ergaenzt
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-04, HMS-09

---

### HMS-11: Add Muelltonnen-Management — WASTE_BIN_TYPES + WASTE_SCHEDULES CRUD

**Label:** `feature`
**Priority:** 2 (High)
**State:** Backlog

## Was

CRUD fuer Muelltonnentypen (Restmuell, Papier, Gelbe Tonne, Bio, Glas) und Muellabfuhrplaene pro Objekt. Jeder Plan definiert: Welche Tonne, an welchen Tagen, um welche Uhrzeit wird geleert, wann spaetestens rausstellen, wann fruehestens reinstellen, wie viele Tonnen, wo stehen sie.

## Warum

Muelltonnen sind der komplexeste Teil der Planung. Sie erzeugen harte Zeitfenster-Constraints: "Muelltonne muss vor 06:00 rausstehen, Muellabfuhr kommt um 06:00." Ausserdem erzeugen sie Mehrfachbesuche: "Dienstag raus, Mittwoch rein." Ohne korrekte Muellabfuhr-Daten plant die KI falsch.

## Akzeptanzkriterien

- [ ] `GET /api/waste-bin-types` — Alle Muelltonnentypen
- [ ] `POST /api/waste-bin-types` — Neuen Typ anlegen
- [ ] `PUT /api/waste-bin-types/:id` — Typ bearbeiten
- [ ] `DELETE /api/waste-bin-types/:id` — Soft-Delete
- [ ] `GET /api/properties/:id/waste-schedules` — Muellabfuhrplaene eines Objekts
- [ ] `POST /api/waste-schedules` — Neuen Plan anlegen
- [ ] `PUT /api/waste-schedules/:id` — Plan bearbeiten
- [ ] `DELETE /api/waste-schedules/:id` — Plan entfernen
- [ ] COLLECTION_DAYS: JSON-Editor mit Tagesauswahl + Frequenz (woechentlich/14-taegig/gerade/ungerade KW)
- [ ] COLLECTION_TIME: Zeitpicker ("Wann wird geleert?")
- [ ] LATEST_PUT_OUT: Zeitpicker ("Wann spaetestens rausstellen?")
- [ ] EARLIEST_TAKE_IN: Zeitpicker ("Wann fruehestens reinstellen?")
- [ ] BIN_COUNT: Anzahl Tonnen dieses Typs (beeinflusst Zeitkalkulation)
- [ ] LOCATION_DESCRIPTION: Freitext ("Hinterhof links, hinter der Garage")
- [ ] Frontend: Tab "Muellplaene" in Objekt-Detail
- [ ] Frontend: Visuelle Wochenansicht der Abfuhrtermine (Mini-Kalender Mo–So mit Tonnen-Icons)
- [ ] Seed-Daten: 5 Tonnentypen, 4 Abfuhrplaene fuer Porzer Str.

## Technischer Ansatz

- `routes/waste-bin-types.ts`, `routes/waste-schedules.ts`
- Frontend: `components/WasteScheduleForm.tsx`
- Mini-Kalender-Komponente: Zeigt fuer jede Tonne an, an welchen Tagen sie rausgestellt/reingestellt wird
- COLLECTION_DAYS-Editor: Checkboxen fuer Tage + Radio fuer Frequenz

## Tests

- [ ] Test: CRUD-Zyklus fuer beide Entitaeten
- [ ] Test: COLLECTION_DAYS JSON-Struktur (woechentlich, 14-taegig, gerade/ungerade)
- [ ] Test: LATEST_PUT_OUT muss vor COLLECTION_TIME liegen (Validierung)
- [ ] Test: EARLIEST_TAKE_IN muss nach COLLECTION_TIME liegen (Validierung)
- [ ] Test: Mehrere Tonnentypen pro Objekt moeglich

## Definition of Done

- [ ] Backend + Frontend implementiert
- [ ] API-Tests ergaenzt
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-09

---

## Wave 2 — Stundenplan-MVP

---

### HMS-12: Add Wochenplan-CRUD — SCHEDULES + SCHEDULE_ENTRIES

**Label:** `feature`
**Priority:** 2 (High)
**State:** Backlog

## Was

CRUD-Endpoints fuer konkrete Wochenplaene und deren Eintraege. Ein Wochenplan gehoert zu einer Kalenderwoche (WEEK_START = Montag). Eintraege sind einzelne Aufgaben: "Daniel macht am Montag 05.05. bei Porzer Str. 12 Treppenhaus fuer 20 Minuten."

## Warum

Das ist der Kern des gesamten Tools — der digitale Wochenplan. Ohne diesen Endpoint kein Grid, kein Drag-and-Drop, kein PDF. Alle vorherigen Issues liefern die Stammdaten, die hier zusammenkommen.

## Akzeptanzkriterien

- [ ] `GET /api/schedules?week_start=2026-05-05` — Wochenplan fuer eine bestimmte Woche
- [ ] `GET /api/schedules/:id` — Wochenplan-Detail mit allen Entries
- [ ] `POST /api/schedules` — Neuen Wochenplan anlegen (leer, Status DRAFT)
- [ ] `PUT /api/schedules/:id` — Wochenplan bearbeiten (Notes, Status)
- [ ] `POST /api/schedules/:id/publish` — Status DRAFT → PUBLISHED + PUBLISHED_AT setzen
- [ ] `GET /api/schedule-entries?schedule_id=...` — Alle Entries mit JOINs (Employee, Property, ServiceType)
- [ ] `GET /api/schedule-entries?employee_id=...&date_from=...&date_to=...` — Entries pro Mitarbeiter/Zeitraum
- [ ] `POST /api/schedule-entries` — Neuen Entry anlegen
- [ ] `POST /api/schedule-entries/bulk` — Mehrere Entries auf einmal (fuer Template-Generierung)
- [ ] `PUT /api/schedule-entries/:id` — Entry bearbeiten
- [ ] `DELETE /api/schedule-entries/:id` — Entry soft-deleten
- [ ] PATCH `/api/schedule-entries/:id/reassign` — Mitarbeiter wechseln (setzt ORIGINAL_EMPLOYEE_ID)
- [ ] Unique-Constraint: Pro Tenant nur EIN Wochenplan pro Woche (UQ_SCHEDULES_WEEK)
- [ ] Response enthaelt berechnete Felder: Auslastung pro Mitarbeiter (Summe DURATION_MIN / WEEKLY_HOURS)
- [ ] Bulk-Create Response enthaelt Warnings (z.B. "Kapazitaetsueberschreitung bei Anna")

## Technischer Ansatz

- `routes/schedules.ts`, `routes/schedule-entries.ts`
- GET Schedule mit Entries: JOIN auf EMPLOYEES, PROPERTIES, SERVICE_TYPES — alles in einem Response
- Response-Format fuer Grid:
  ```json
  {
    "schedule": { "id": "...", "status": "DRAFT", ... },
    "entries": [...],
    "employees": [...],
    "utilization": { "employee_id": { "planned_min": 480, "contract_min": 2400, "pct": 20 } }
  }
  ```
- Bulk-Create: Transaction — entweder alle Entries oder keiner
- Publish: Setzt Status + PUBLISHED_AT, spaeter Push-Notification (nicht in diesem Issue)

## Tests

- [ ] Test: Schedule anlegen + Entries hinzufuegen + abrufen
- [ ] Test: Unique-Constraint — zweiter Plan fuer gleiche Woche schlaegt fehl
- [ ] Test: Bulk-Create legt alle Entries in einer Transaction an
- [ ] Test: Reassign setzt ORIGINAL_EMPLOYEE_ID + IS_FROM_REASSIGNMENT
- [ ] Test: Publish setzt STATUS="PUBLISHED" und PUBLISHED_AT
- [ ] Test: Auslastungs-Berechnung im Response korrekt
- [ ] Test: RLS — nur eigener Tenant

## Definition of Done

- [ ] Backend implementiert + getestet
- [ ] API-Tests ergaenzt
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-04, HMS-06, HMS-09, HMS-10

---

### HMS-13: Add Wochenplan-Grid-Ansicht — Kalender-UI

**Label:** `feature`
**Priority:** 2 (High)
**State:** Backlog

## Was

Frontend: Kalenderartige Wochenansicht — Zeilen sind Mitarbeiter, Spalten sind Wochentage (Mo–So). Zellen enthalten farbkodierte Aufgabenbloecke. Inkl. Wochen-Navigation, Status-Anzeige, Auslastungsbalken pro Mitarbeiter.

## Warum

DAS User-Interface, das Roberts Excel-Tabelle ersetzt. Muss auf den ersten Blick zeigen: Wer macht was, wann, wo. Farbkodierung sorgt fuer sofortige Orientierung (Orange = Treppenhaus, Gruen = Garten, etc.).

## Akzeptanzkriterien

- [ ] Wochenplan-Grid: Zeilen = Mitarbeiter, Spalten = Mo–So
- [ ] Jede Zelle zeigt Aufgabenbloecke mit: Objektname, Taetigkeitstyp-Icon/Farbe, Zeitraum
- [ ] Farbkodierung aus SERVICE_TYPES.COLOR_CODE
- [ ] Auslastungsbalken links pro Mitarbeiter: "38h / 40h" mit Farbindikator (gruen < 100%, gelb = 100%, rot > 100%)
- [ ] Wochen-Navigation: [Vorwoche] [Heute] [Naechste Woche] + Kalenderwochen-Anzeige
- [ ] Status-Badge oben: "ENTWURF" / "VEROEFFENTLICHT"
- [ ] Button "Veroeffentlichen" (nur im DRAFT-Status)
- [ ] Klick auf leere Zelle → Modal zum Erstellen eines neuen Entries
- [ ] Klick auf Aufgabenblock → Modal zum Bearbeiten/Loeschen
- [ ] Entry-Erstell-Modal: Objekt-Dropdown (mit Suche), Taetigkeitstyp-Dropdown, Zeitraum-Picker, Dauer, Notizen
- [ ] Ansichtsmodi: Team-Woche (Default), Einzelmitarbeiter, Tagesansicht
- [ ] Leer-Zustand: "Noch kein Wochenplan fuer KW X. [Plan anlegen] oder [Aus Template generieren]"
- [ ] Responsive: Ab Tablet-Breite horizontal scrollbar, auf Desktop volle Ansicht
- [ ] Kranke Tage: Betroffene Zellen schraffiert/grau mit Label "KRANK"
- [ ] Vertretungs-Aufgaben: Markiert mit Badge "(vertritt Daniel)"

## Technischer Ansatz

- Frontend: `pages/SchedulePage.tsx` als Hauptkomponente
- `components/ScheduleGrid.tsx` — Das Grid
- `components/ScheduleCell.tsx` — Einzelne Zelle (Mitarbeiter × Tag)
- `components/EntryBlock.tsx` — Farbkodierter Aufgabenblock
- `components/EntryModal.tsx` — Erstellen/Bearbeiten Modal
- Daten: Ein API-Call pro Woche, Frontend cached aktuelle + vorherige + naechste Woche
- State-Management: `useState` fuer lokale Optimistic Updates, Server-Sync nach Save

## Tests

- [ ] Test: Grid zeigt Seed-Daten korrekt an
- [ ] Test: Neuen Entry erstellen ueber leere Zelle
- [ ] Test: Entry bearbeiten und loeschen
- [ ] Test: Wochenwechsel laedt neue Daten
- [ ] Test: Auslastungsbalken berechnet sich korrekt
- [ ] Test: Farbkodierung matched SERVICE_TYPES.COLOR_CODE

## Definition of Done

- [ ] Frontend implementiert
- [ ] Alle Ansichtsmodi funktionieren
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-12

---

### HMS-14: Add Drag-and-Drop-Umplanung — Aufgaben visuell verschieben

**Label:** `feature`
**Priority:** 2 (High)
**State:** Backlog

## Was

Drag-and-Drop im Wochenplan-Grid: Aufgabenbloecke koennen per Maus/Touch zwischen Mitarbeitern und Tagen verschoben werden. Visuelles Feedback zeigt Konflikte (rot), Warnungen (gelb), und erlaubte Drops (gruen).

## Warum

Ersetzt die handschriftlichen Aenderungen auf dem Papier-Stundenplan. Bei Krankheit oder Umplanung muss der Planer schnell Aufgaben umverteilen koennen — 2 Klicks statt 45 Minuten Telefonkette.

## Akzeptanzkriterien

- [ ] Aufgabenbloecke sind draggable (Maus + Touch)
- [ ] Drop-Zonen: Jede Mitarbeiter-Tag-Zelle ist ein gueltiges Drop-Target
- [ ] Beim Drag: Visuelles Feedback am Drop-Target:
  - Gruen: Drop erlaubt, keine Konflikte
  - Gelb: Drop erlaubt, aber Warnung (Kapazitaetsueberschreitung)
  - Rot: Drop nicht erlaubt (fehlende Qualifikation, Zeitkonflikt, MA nicht verfuegbar)
- [ ] Nach Drop: PATCH-Request an Backend mit neuer EMPLOYEE_ID + ENTRY_DATE
- [ ] Backend-Response enthaelt Warnings und Conflicts
- [ ] Optimistic Update: Block verschiebt sich sofort, rollt zurueck bei Server-Error
- [ ] Konflikte anzeigen bei Drop:
  - Qualifikations-Check: MA hat noetige Qualifikation? → Sonst Hard-Block
  - Verfuegbarkeits-Check: MA arbeitet an diesem Tag? → Sonst Hard-Block
  - Kapazitaets-Check: Ueber WEEKLY_HOURS? → Warnung, kein Block
  - Zeitkonflikt: Zwei Aufgaben gleichzeitig? → Hard-Block
- [ ] Touch-Unterstuetzung fuer Tablets (Long-Press zum Starten)
- [ ] Undo-Funktion: Letzte Verschiebung rueckgaengig machen (Ctrl+Z oder Button)

## Technischer Ansatz

- Library: `@dnd-kit/core` + `@dnd-kit/sortable` (nicht react-beautiful-dnd, das ist EOL)
- `components/DraggableEntry.tsx` — Draggable Wrapper
- `components/DroppableCell.tsx` — Droppable Wrapper mit visueller Validierung
- Validierung: Frontend prueft Basis-Constraints (Verfuegbarkeit, Qualifikation) lokal vor dem Drop
- Backend: `PATCH /api/schedule-entries/:id/move` mit Validierung und Warnings im Response
- Undo: Stack der letzten 10 Verschiebungen im Local State

## Tests

- [ ] Test: Block von Daniel Mo → Anna Di verschoben, EMPLOYEE_ID + ENTRY_DATE aktualisiert
- [ ] Test: Drop auf MA ohne Qualifikation wird abgelehnt (roter Indikator)
- [ ] Test: Drop auf Tag an dem MA nicht verfuegbar ist wird abgelehnt
- [ ] Test: Kapazitaetswarnung wird angezeigt bei Ueberschreitung
- [ ] Test: Undo stellt vorherigen Zustand wieder her
- [ ] Test: Touch-Drag funktioniert auf Tablet

## Definition of Done

- [ ] Frontend implementiert
- [ ] Backend-Validierung implementiert
- [ ] API-Tests ergaenzt
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-13

---

### HMS-15: Add Mobile-Tagesansicht — Mitarbeiter sieht seinen Plan auf dem Handy

**Label:** `feature`, `mobile`
**Priority:** 2 (High)
**State:** Backlog

## Was

Mobile-optimierte Tagesansicht (PWA) fuer Mitarbeiter. Chronologische Liste aller Aufgaben des aktuellen Tages mit Objektname, Taetigkeit, geplanter Zeit, und Navigation-Button zum Objekt.

## Warum

Ersetzt den ausgedruckten Papier-Stundenplan. Mitarbeiter muessen unterwegs auf dem Handy sehen koennen, was als naechstes ansteht und wo. Ohne Mobile-View bleibt das Tool ein Buero-Tool.

## Akzeptanzkriterien

- [ ] Route: `/my/today` — Mein Tagesplan (authentifizierter Mitarbeiter)
- [ ] Route: `/my/week` — Meine Woche im Ueberblick
- [ ] Tagesplan zeigt chronologische Liste aller Aufgaben:
  - Farbkodierter Punkt/Streifen pro Taetigkeit
  - Objektname + Adresse
  - Geplante Zeit (08:00 – 08:20)
  - Status-Icon: Geplant | In Bearbeitung | Erledigt
- [ ] Button "Route starten" → Oeffnet Google Maps / Apple Maps mit Adresse
- [ ] Button "Problem melden" → Einfaches Formular (Freitext + optional Foto)
- [ ] Wochenansicht: Vereinfachte Karten pro Tag (Mo–So) mit Anzahl Aufgaben + Gesamtdauer
- [ ] PWA: manifest.json mit App-Icon, display=standalone, theme_color
- [ ] Offline: Service Worker cached aktuellen Wochenplan
- [ ] Push-Benachrichtigung-Grundlage: Service Worker registriert sich (Push-Logik spaeter)
- [ ] Rollen-Check: Mitarbeiter sieht NUR seinen eigenen Plan
- [ ] Bottom-Navigation: Heute | Woche | Meldungen
- [ ] Responsive: Optimiert fuer 375px (iPhone SE) bis 414px (iPhone Plus)

## Technischer Ansatz

- Frontend: `pages/mobile/MyDayPage.tsx`, `pages/mobile/MyWeekPage.tsx`
- API: `GET /api/schedule-entries/my?date=2026-05-05` — Entries des eingeloggten Users
- PWA: `public/manifest.json`, `public/sw.js`
- Navigation: `/my/today` oeffnet Google Maps via `https://maps.google.com/?daddr=LAT,LNG`
- Bottom-Nav: Nur fuer `< md` Breakpoint (768px)
- Offline: Service Worker cached `/api/schedule-entries/my?week_start=...` bei Publish

## Tests

- [ ] Test: Tagesplan zeigt nur Aufgaben des eingeloggten Mitarbeiters
- [ ] Test: Employee A sieht keine Aufgaben von Employee B
- [ ] Test: "Route starten" oeffnet korrekte Adresse in Google Maps
- [ ] Test: Offline-Cache zeigt letzten bekannten Wochenplan
- [ ] Test: PWA ist installierbar auf Android + iOS

## Definition of Done

- [ ] Mobile Frontend implementiert
- [ ] PWA manifest + Service Worker
- [ ] API-Tests ergaenzt
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-12

---

## Wave 3 — Templates & Automatisierung

---

### HMS-16: Add Wochenplan-Templates — Wiederkehrende Basis-Wochen

**Label:** `feature`
**Priority:** 2 (High)
**State:** Backlog

## Was

CRUD fuer Wochenplan-Templates und deren Eintraege. Templates sind "ideale Wochen" — der Normalfall ohne Krankheit. Sie dienen als Ausgangsbasis, von der jede konkrete Woche abgeleitet wird. Saisonale Templates (Sommer vs. Winter) mit Gueltigkeitszeitraum.

## Warum

"Von der Idealwelt aus ist es eigentlich immer der gleiche Plan." Templates eliminieren die Freitags-Neuplanung: Statt 3 Stunden Excel baut man EINMAL das Template, danach sind es 15 Minuten Feintuning pro Woche.

## Akzeptanzkriterien

- [ ] `GET /api/schedule-templates` — Alle Templates
- [ ] `POST /api/schedule-templates` — Neues Template anlegen
- [ ] `PUT /api/schedule-templates/:id` — Template bearbeiten (Name, Gueltigkeit)
- [ ] `DELETE /api/schedule-templates/:id` — Template soft-deleten
- [ ] `POST /api/schedule-templates/:id/set-default` — Als Standard-Template markieren
- [ ] `GET /api/template-entries?template_id=...` — Entries eines Templates
- [ ] `POST /api/template-entries` — Entry hinzufuegen
- [ ] `PUT /api/template-entries/:id` — Entry aendern
- [ ] `DELETE /api/template-entries/:id` — Entry loeschen
- [ ] `POST /api/schedule-templates/:id/duplicate` — Template kopieren (fuer Saison-Variante)
- [ ] Frontend: Template-Editor mit gleicher Grid-Ansicht wie Wochenplan (aber Mo/Di/Mi statt konkreter Daten)
- [ ] Frontend: Template-Liste mit Name, Gueltig von/bis, Default-Markierung
- [ ] Saisonale Templates: VALID_FROM/VALID_UNTIL bestimmen, welches Template automatisch gewaehlt wird
- [ ] Nur EIN Template kann IS_DEFAULT sein (pro Tenant)

## Technischer Ansatz

- `routes/schedule-templates.ts`, `routes/template-entries.ts`
- Frontend: `pages/TemplatesPage.tsx` — Wiederverwendung des ScheduleGrid mit Adapter-Layer
- Grid-Adapter: Statt ENTRY_DATE zeigt das Grid DAY_OF_WEEK (1–7)
- set-default: Altes Default-Template auf IS_DEFAULT=FALSE setzen, neues auf TRUE

## Tests

- [ ] Test: CRUD-Zyklus fuer Templates und Entries
- [ ] Test: Nur ein Default-Template pro Tenant
- [ ] Test: Duplicate kopiert alle Entries
- [ ] Test: Saisonale Gueltigkeit wird korrekt beruecksichtigt

## Definition of Done

- [ ] Backend + Frontend implementiert
- [ ] API-Tests ergaenzt
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-12

---

### HMS-17: Build Frequenz-Engine — Faelligkeitspruefung fuer Kalenderwoche

**Label:** `feature`, `architecture`
**Priority:** 2 (High)
**State:** Backlog

## Was

Backend-Service `frequency-engine.ts` der fuer eine gegebene Kalenderwoche berechnet: Welche PROPERTY_SERVICES und WASTE_SCHEDULES sind faellig? Beruecksichtigt Frequenz (woechentlich, 14-taegig, monatlich, etc.), Saisonalitaet, gerade/ungerade KW, Woche im Monat.

## Warum

Ohne Frequenz-Engine muesste der Planer manuell pruefen: "Ist die Fensterreinigung diese Woche dran? In welcher Woche ist die Dachrinne faellig?" Die Engine automatisiert das — sie ist das Hirn hinter der automatischen Plangenerierung (HMS-18).

## Akzeptanzkriterien

- [ ] Funktion `isServiceDueInWeek(service, weekStart)` → `{ isDue: boolean, dueOnDays: number[] }`
- [ ] Korrekte Berechnung fuer alle Frequenzen:
  - WEEKLY: Immer faellig, an definierten Tagen
  - BIWEEKLY: Gerade/ungerade KW-Logik
  - MONTHLY: Woche-im-Monat-Logik (1. Woche, 2. Woche, etc.)
  - QUARTERLY: In definierten Monaten, erste Woche
  - BIANNUAL: In definierten Monaten
  - ANNUAL: In definiertem Monat
  - ON_DEMAND: Nie automatisch faellig
- [ ] Funktion `isInSeason(service, weekStart)` → Saisonalitaets-Check
- [ ] Funktion `getDueServicesForWeek(tenantId, weekStart)` → Alle faelligen Leistungen
- [ ] Funktion `getDueWasteSchedulesForWeek(tenantId, weekStart)` → Alle faelligen Muellabfuhr-Termine
- [ ] Muellabfuhr-Logik: Generiert ZWEI Aufgaben pro Abfuhr-Termin (rausstellen + reinstellen)
- [ ] API: `GET /api/due-services?week_start=2026-05-05` — Debugging-/Preview-Endpoint
- [ ] Wrap-around Saisonalitaet: SEASONAL_START=11, SEASONAL_END=3 → Nov, Dez, Jan, Feb, Maerz

## Technischer Ansatz

- `services/frequency-engine.ts`
- Pure Functions, kein DB-Zugriff in den Berechnungsfunktionen (Testbarkeit)
- `getDueServicesForWeek` und `getDueWasteSchedulesForWeek` laden Daten und rufen die Pure Functions auf
- ISO-Kalenderwochen: `date-fns` fuer `getISOWeek`, `getWeekOfMonth`
- Muellabfuhr-Doppelaufgabe: Fuer jede WASTE_SCHEDULE mit faelligem Tag → eine "Muell raus"-Entry VOR LATEST_PUT_OUT und eine "Muell rein"-Entry NACH EARLIEST_TAKE_IN

## Tests

- [ ] Test: WEEKLY an Montag → isDue=true, dueOnDays=[1]
- [ ] Test: BIWEEKLY gerade KW → isDue in KW 20, nicht in KW 19
- [ ] Test: MONTHLY 1. Woche Mittwoch → isDue nur in erster Woche des Monats
- [ ] Test: QUARTERLY → isDue in Jan, Apr, Jul, Okt
- [ ] Test: ON_DEMAND → isDue=false immer
- [ ] Test: Saisonalitaet Winterdienst (Nov–Maerz) → isDue in Dezember, nicht in Juni
- [ ] Test: Saisonalitaet Gartenpflege (Apr–Okt) → isDue in Mai, nicht in Januar
- [ ] Test: Muellabfuhr BIWEEKLY ungerade KW → korrekte Tage
- [ ] Test: getDueServicesForWeek gibt nur aktive, nicht geloeschte Leistungen zurueck

## Definition of Done

- [ ] Service implementiert mit Unit-Tests
- [ ] API-Endpoint fuer Debugging
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-10, HMS-11

---

### HMS-18: Build Plan-Generator — Woche aus Template erzeugen

**Label:** `feature`, `architecture`
**Priority:** 2 (High)
**State:** Backlog

## Was

Backend-Service `schedule-generator.ts` der aus einem Template + Frequenz-Engine + Abwesenheiten einen konkreten Wochenplan generiert. Erzeugt SCHEDULE + SCHEDULE_ENTRIES im Status DRAFT mit Warnings.

## Warum

Der eigentliche Automatisierungs-Gewinn. Statt manuell 50 Entries anzulegen, drueckt der Planer "Woche generieren" und bekommt einen vorbefuellten Plan mit allen faelligen Aufgaben, korrekten Mitarbeiter-Zuordnungen, und Warnungen bei Konflikten.

## Akzeptanzkriterien

- [ ] `POST /api/schedules/generate` — Woche aus Template generieren
  - Body: `{ template_id, week_start }`
  - Response: `{ schedule, entries, warnings[] }`
- [ ] Generator-Logik:
  1. Template-Entries laden
  2. Frequenz-Engine: Welche Leistungen sind in KW faellig? (HMS-17)
  3. Muellabfuhr-Termine einfuegen (Raus + Rein mit korrekten Zeitfenstern)
  4. Abwesenheits-Check: Urlaub in der Woche? → Entries als REASSIGNMENT_NEEDED markieren
  5. Verfuegbarkeits-Check: MA arbeitet am Tag? → Warning oder Umzuordnen
  6. Auslastungs-Check: MA ueber WEEKLY_HOURS? → Warning
- [ ] Warnings im Response (Array von Objekten):
  - `{ type: "ABSENCE", employee, date, message: "Daniel hat am Mi Urlaub — 3 Aufgaben brauchen Vertretung" }`
  - `{ type: "OVERLOAD", employee, planned_hours, contract_hours, message: "Anna hat 24h bei 20h Vertrag" }`
  - `{ type: "QUALIFICATION_EXPIRY", employee, qualification, expires_at, message: "Winterdienst-Schulung laeuft am 30.11. ab" }`
  - `{ type: "NO_TEMPLATE_MATCH", service, property, message: "Fensterreinigung Porzer Str. ist faellig, aber nicht im Template" }`
- [ ] Entries ohne Template-Match (faellig laut Frequenz, aber nicht im Template) → als Vorschlag im Response, nicht automatisch eingeplant
- [ ] Frontend: "Woche generieren" Button im Wochenplan → Zeigt Warnings-Dialog → Planer bestaetigt
- [ ] GENERATION_METHOD wird auf "FROM_TEMPLATE" gesetzt
- [ ] Zweimaliges Generieren fuer gleiche Woche wird verhindert (Unique-Constraint)

## Technischer Ansatz

- `services/schedule-generator.ts`
- Orchestriert: `frequency-engine.ts` + DB-Queries fuer Abwesenheiten/Verfuegbarkeit
- Transaction: Gesamter Plan in einer DB-Transaction
- Template-Match: Fuer jeden TEMPLATE_ENTRY pruefen ob die referenzierte PROPERTY_SERVICE in KW faellig ist
- Zusaetzliche faellige Leistungen (nicht im Template): Als `suggested_entries` im Response, IS_EXTRA=TRUE

## Tests

- [ ] Test: Generierung erzeugt korrekten Plan aus Seed-Template
- [ ] Test: Nicht-faellige Leistungen werden uebersprungen (monatliche Fensterreinigung nicht jede Woche)
- [ ] Test: Muellabfuhr erzeugt Raus- + Rein-Entries mit korrekten Zeiten
- [ ] Test: Urlaub wird erkannt und Entries als REASSIGNMENT_NEEDED markiert
- [ ] Test: Auslastungs-Warning wird generiert bei Ueberschreitung
- [ ] Test: Doppel-Generierung wird abgelehnt

## Definition of Done

- [ ] Service implementiert
- [ ] API-Endpoint implementiert
- [ ] Frontend-Integration (Button + Warnings-Dialog)
- [ ] API-Tests ergaenzt
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-16, HMS-17

---

### HMS-19: Add Abwesenheitsverwaltung — ABSENCE_RECORDS CRUD

**Label:** `feature`
**Priority:** 2 (High)
**State:** Backlog

## Was

CRUD fuer Abwesenheiten (Krankheit, Urlaub, Fortbildung). Beim Erfassen einer Abwesenheit werden automatisch alle betroffenen SCHEDULE_ENTRIES markiert (Status → REASSIGNMENT_NEEDED). Kalender-Ansicht aller Abwesenheiten.

## Warum

Abwesenheiten sind der Hauptgrund fuer Umplanungen. "Montagmorgen, 6:30, Daniel ruft an: Ich bin krank." Das System muss sofort zeigen, welche Aufgaben betroffen sind und wer einspringen kann.

## Akzeptanzkriterien

- [ ] `GET /api/absences?employee_id=...&date_from=...&date_to=...` — Abwesenheiten filtern
- [ ] `POST /api/absences` — Abwesenheit erfassen
  - Response: `{ absence, affected_entries: ScheduleEntry[] }`
  - Automatisch: Alle SCHEDULE_ENTRIES im Zeitraum auf STATUS=REASSIGNMENT_NEEDED setzen
- [ ] `PUT /api/absences/:id` — Abwesenheit bearbeiten (z.B. Zeitraum aendern)
- [ ] `DELETE /api/absences/:id` — Abwesenheit loeschen (setzt betroffene Entries zurueck auf PLANNED)
- [ ] `PATCH /api/absences/:id/handle` — Als "behandelt" markieren (IS_HANDLED=TRUE)
- [ ] Frontend: Abwesenheits-Kalender (Monatsansicht, alle MA, farbig nach Typ)
- [ ] Frontend: "Krankmeldung erfassen" Quick-Action auf der Wochenplan-Seite
- [ ] Frontend: Badge auf Wochenplan-Seite: "3 Aufgaben brauchen Vertretung"
- [ ] Frontend: Abwesenheitstyp-Icons: Krank (rot), Urlaub (blau), Fortbildung (gruen), Sonstiges (grau)
- [ ] Planer + Mitarbeiter selbst koennen Abwesenheiten melden
- [ ] Urlaub: Kann im Voraus geplant werden → Plan-Generator (HMS-18) beruecksichtigt sie

## Technischer Ansatz

- `routes/absences.ts`
- Frontend: `pages/AbsencesPage.tsx` (Kalender), `components/AbsenceQuickForm.tsx`
- Bei POST: Query fuer betroffene SCHEDULE_ENTRIES:
  ```sql
  UPDATE SCHEDULE_ENTRIES SET STATUS = 'REASSIGNMENT_NEEDED', ...
  WHERE EMPLOYEE_ID = $1 AND ENTRY_DATE BETWEEN $2 AND $3 AND STATUS = 'PLANNED'
  ```
- Bei DELETE: Entries zurueck auf PLANNED setzen (nur wenn nicht bereits reassigned)

## Tests

- [ ] Test: Krankmeldung markiert 5 betroffene Entries als REASSIGNMENT_NEEDED
- [ ] Test: Loeschen einer Abwesenheit setzt Entries zurueck auf PLANNED
- [ ] Test: Bereits umgeplante Entries (STATUS=REASSIGNED) werden NICHT zurueckgesetzt
- [ ] Test: Mehrere Abwesenheiten fuer gleichen Mitarbeiter moeglich (z.B. 2 Krankheitsphasen)

## Definition of Done

- [ ] Backend + Frontend implementiert
- [ ] API-Tests ergaenzt
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-12

---

### HMS-20: Add Contingency-Regeln — Vordefinierte Vertretungsketten

**Label:** `feature`
**Priority:** 3 (Medium)
**State:** Backlog

## Was

CRUD fuer vordefinierte Vertretungsregeln. "Wenn Daniel ausfaellt → Anna uebernimmt (Prio 1), Juergen uebernimmt (Prio 2). Fuer Winterdienst: Nur Juergen (hat Qualifikation)."

## Warum

Vordefinierte Regeln beschleunigen die Umplanung und werden vom KI-Scoring (HMS-21) als erste Quelle genutzt. Sie bilden das Wissen ab, das heute nur in Roberts Kopf existiert.

## Akzeptanzkriterien

- [ ] `GET /api/contingency-rules?employee_id=...` — Regeln fuer einen Mitarbeiter
- [ ] `POST /api/contingency-rules` — Neue Regel anlegen
- [ ] `PUT /api/contingency-rules/:id` — Regel bearbeiten
- [ ] `DELETE /api/contingency-rules/:id` — Regel loeschen
- [ ] Felder: PRIMARY_EMPLOYEE_ID, BACKUP_EMPLOYEE_ID, PROPERTY_ID (optional), SERVICE_TYPE_ID (optional), PRIORITY
- [ ] CHECK-Constraint: PRIMARY != BACKUP (kann sich nicht selbst vertreten)
- [ ] Frontend: Verwaltungsseite unter Einstellungen → Vertretungsplaene
- [ ] Frontend: Tabelle mit: "Wenn ... ausfaellt | Dann ... | Fuer Objekt | Fuer Taetigkeit | Prioritaet"

## Technischer Ansatz

- `routes/contingency-rules.ts`
- Frontend: `pages/ContingencyRulesPage.tsx`

## Tests

- [ ] Test: Regel anlegen und abrufen
- [ ] Test: CHECK-Constraint verhindert PRIMARY = BACKUP
- [ ] Test: Regel mit PROPERTY_ID=NULL gilt fuer alle Objekte
- [ ] Test: Mehrere Backup-Prioritaeten fuer einen Mitarbeiter

## Definition of Done

- [ ] Backend + Frontend implementiert
- [ ] API-Tests ergaenzt
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-06

---

## Wave 4 — KI-Vertretung & Zeiterfassung

---

### HMS-21: Build Vertretungs-Scoring — KI-Vorschlaege bei Krankmeldung

**Label:** `feature`, `architecture`
**Priority:** 2 (High)
**State:** Backlog

## Was

Backend-Service `reassignment-engine.ts` der fuer jeden Eintrag mit STATUS=REASSIGNMENT_NEEDED den besten Vertretungs-Kandidaten vorschlaegt. Zweistufig: Erst Contingency-Regeln pruefen, dann Scoring-Algorithmus (Kapazitaet × Naehe × Qualifikation × Equipment × Objekt-Erfahrung × Fairness).

## Warum

Das KI-Kernfeature. Statt dass Robert am Montagmorgen 45 Minuten telefoniert, bekommt er Vorschlaege: "Daniel uebernimmt 3 Aufgaben (Score 87), Anna uebernimmt 2 (Score 72), Fensterreinigung kann auf naechste Woche verschoben werden (Prio 4)."

## Akzeptanzkriterien

- [ ] `POST /api/schedules/:id/suggest-reassignment` — KI-Vorschlaege anfordern
  - Body: `{ entry_ids: string[] }` (optional, leer = alle REASSIGNMENT_NEEDED)
  - Response: `{ suggestions: ReassignmentSuggestion[] }`
- [ ] Pro betroffenen Entry: Top-3 Kandidaten mit Score (0–100) und Begruendung
- [ ] Scoring-Faktoren (gewichtet):
  - Kapazitaet (30 Punkte): Wie viel Restkapazitaet hat der MA diese Woche?
  - Naehe (25 Punkte): Ist das Objekt in der Naehe eines anderen Objekts das der MA am selben Tag besucht?
  - Qualifikation (20 Punkte): Hat er die noetige Qualifikation? (0 = harter Ausschluss)
  - Objekt-Erfahrung (15 Punkte): War er schon mal in dem Objekt?
  - Fairness (10 Punkte): Wie oft wurde er diese Woche schon als Vertretung eingesetzt?
- [ ] Equipment-Faktor: Wenn Taetigkeit Equipment erfordert → Pruefe EMPLOYEE_EQUIPMENT → Dauer-Anpassung
- [ ] Contingency-First: Wenn eine CONTINGENCY_RULE greift → Score 100, Method="CONTINGENCY_RULE"
- [ ] Harte Ausschluesse (Score 0):
  - MA hat erforderliche Qualifikation nicht
  - MA ist selbst abwesend
  - MA ist an dem Tag nicht verfuegbar (EMPLOYEE_AVAILABILITY)
- [ ] Verschiebe-Vorschlag fuer niedrig-priorisierte Aufgaben: Prio 4 → "Auf naechste Woche verschieben?"
- [ ] Natuerlichsprachige Begruendung: "Daniel hat 4h frei, ist 2km entfernt, kennt das Objekt seit 3 Monaten"
- [ ] Distanzberechnung: `earth_distance()` PostgreSQL-Funktion oder Haversine im Code

## Technischer Ansatz

- `services/reassignment-engine.ts`
- Scoring: Pure Function, empfaengt vorbereitete Daten (kein DB-Zugriff in Score-Berechnung)
- Datenvorbereitung: Ein DB-Query laedt alle benoetigten Daten (Entries, Employees, Qualifications, Equipment, Availability, aktuelle Wochen-Entries)
- Distanz: `earth_distance(ll_to_earth(lat1, lng1), ll_to_earth(lat2, lng2))` in Metern
- Begruendung: Template-String aus den Score-Faktoren generiert (kein LLM noetig)
- Logging: Jeden Vorschlag in REASSIGNMENT_LOG speichern

## Tests

- [ ] Test: Contingency-Rule wird vor Scoring geprueft
- [ ] Test: MA ohne Qualifikation bekommt Score 0
- [ ] Test: MA mit Abwesenheit wird ausgeschlossen
- [ ] Test: MA mit mehr freier Kapazitaet bekommt hoeheren Score
- [ ] Test: MA naeher am Objekt bekommt hoeheren Score
- [ ] Test: Fairness — MA der schon 3x diese Woche Vertretung hatte bekommt niedrigeren Score
- [ ] Test: Prio-4-Aufgabe wird als "verschiebbar" markiert
- [ ] Test: Begruendungs-String ist menschenlesbar und korrekt

## Definition of Done

- [ ] Service implementiert mit Unit-Tests
- [ ] API-Endpoint implementiert
- [ ] REASSIGNMENT_LOG wird befuellt
- [ ] API-Tests ergaenzt
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-19, HMS-20

---

### HMS-22: Add Umplanungs-Workflow — Accept/Reject/Modify UI

**Label:** `feature`
**Priority:** 2 (High)
**State:** Backlog

## Was

Frontend-Workflow fuer die Umplanung bei Abwesenheit. Zeigt KI-Vorschlaege, laesst den Planer akzeptieren, ablehnen, oder manuell zuweisen. Dokumentiert jede Entscheidung im REASSIGNMENT_LOG.

## Warum

Die KI macht Vorschlaege, aber der Mensch entscheidet. Der Planer muss die Vorschlaege verstehen (Begruendung), bewerten (Score), und umsetzen oder aendern koennen. Jede Entscheidung wird dokumentiert — so lernt das System langfristig.

## Akzeptanzkriterien

- [ ] Umplanungs-Ansicht oeffnet sich automatisch wenn Entries mit STATUS=REASSIGNMENT_NEEDED existieren
- [ ] Zeigt pro betroffener Aufgabe:
  - Aufgabendetails (Objekt, Taetigkeit, Zeit, bisheriger MA)
  - Top-3 KI-Vorschlaege mit Score, Begruendung, Auslastungs-Preview
  - Button "Akzeptieren" (uebernimmt Vorschlag #1)
  - Button "Manuell zuweisen" (Dropdown aller verfuegbarer MA)
  - Button "Verschieben" (fuer niedrig-priorisierte Aufgaben)
  - Button "Ueberspringen" (Aufgabe faellt diese Woche aus)
- [ ] `POST /api/schedules/:id/apply-reassignment` — Vorschlag umsetzen
  - Body: `{ reassignments: [{ entry_id, new_employee_id, method }] }`
  - Aktualisiert SCHEDULE_ENTRIES: EMPLOYEE_ID, IS_FROM_REASSIGNMENT, ORIGINAL_EMPLOYEE_ID
  - Schreibt REASSIGNMENT_LOG: WAS_ACCEPTED, METHOD
- [ ] Batch-Akzeptieren: "Alle Vorschlaege uebernehmen" Button
- [ ] Nach Umplanung: Betroffene Mitarbeiter sehen neue Aufgaben in ihrer Mobile-Ansicht
- [ ] ABSENCE_RECORD wird auf IS_HANDLED=TRUE gesetzt nach vollstaendiger Umplanung
- [ ] Abgelehnte Vorschlaege: WAS_ACCEPTED=FALSE im REASSIGNMENT_LOG

## Technischer Ansatz

- Frontend: `components/ReassignmentPanel.tsx` — Overlay/Panel im Wochenplan
- API: `POST /api/schedules/:id/apply-reassignment` in Transaction
- WAS_ACCEPTED-Tracking: Fuer jeden Vorschlag der NICHT gewaehlt wird: LOG mit WAS_ACCEPTED=FALSE

## Tests

- [ ] Test: Akzeptieren aktualisiert SCHEDULE_ENTRY korrekt
- [ ] Test: Manuelles Zuweisen funktioniert mit Validierung
- [ ] Test: REASSIGNMENT_LOG enthaelt korrekte Eintraege
- [ ] Test: Batch-Akzeptieren verarbeitet alle Entries
- [ ] Test: IS_HANDLED wird gesetzt nach vollstaendiger Umplanung

## Definition of Done

- [ ] Frontend + Backend implementiert
- [ ] API-Tests ergaenzt
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-21

---

### HMS-23: Add Zeiterfassung — Check-in/Check-out mit GPS

**Label:** `feature`, `mobile`
**Priority:** 3 (Medium)
**State:** Backlog

## Was

Mobile Zeiterfassung: Mitarbeiter checkt bei Ankunft am Objekt ein (GPS + Zeitstempel), bei Abschluss aus. System berechnet Ist-Dauer und Abweichung von Soll-Zeit. Basis fuer statistische Auswertungen.

## Warum

"Ich habe keinerlei statistische Werte. Einfach nichts." — Zeiterfassung liefert erstmals echte Daten: Wie lange dauert eine Taetigkeit wirklich? Abweichungen zeigen, wo Soll-Zeiten angepasst werden muessen.

## Akzeptanzkriterien

- [ ] `POST /api/time-logs/check-in` — Check-in mit GPS
  - Body: `{ schedule_entry_id, lat?, lng? }`
  - Setzt TIME_LOG.STATUS = CHECKED_IN, CHECK_IN = NOW()
  - Setzt SCHEDULE_ENTRY.STATUS = IN_PROGRESS
- [ ] `POST /api/time-logs/check-out` — Check-out mit GPS
  - Body: `{ schedule_entry_id, lat?, lng?, notes? }`
  - Berechnet ACTUAL_DURATION_MIN und DEVIATION_MIN
  - Setzt TIME_LOG.STATUS = CHECKED_OUT
  - Setzt SCHEDULE_ENTRY.STATUS = COMPLETED
- [ ] `GET /api/time-logs?employee_id=...&date_from=...&date_to=...` — Zeitlog-Abfrage
  - Response inkl. Summary: `{ total_planned_min, total_actual_min, deviation_min }`
- [ ] Auto-Close: Wenn ein MA nach 8h noch eingecheckt ist → STATUS = AUTO_CLOSED
- [ ] Frontend Mobile: "Jetzt starten" Button → Check-in → Timer laeuft → "Fertig" Button → Check-out
- [ ] Frontend Mobile: Erledigte Aufgaben mit Haekchen und Ist-Zeit angezeigt
- [ ] Optional: Notiz bei Check-out ("Treppenhaus war stark verschmutzt, hat laenger gedauert")
- [ ] GPS wird nur bei Check-in/out erfasst, NICHT permanent (DSGVO)
- [ ] DEVIATION_MIN wird berechnet: positiv = laenger als geplant, negativ = kuerzer

## Technischer Ansatz

- `routes/time-logs.ts`
- Frontend: Erweiterung von `MyDayPage.tsx` mit Check-in/out-Buttons
- GPS: `navigator.geolocation.getCurrentPosition()` im Browser
- Auto-Close: Cron-Job oder Scheduled-Function alle 30 Minuten
- DEVIATION_MIN: `ACTUAL_DURATION_MIN - SCHEDULE_ENTRIES.DURATION_MIN`

## Tests

- [ ] Test: Check-in setzt Status korrekt
- [ ] Test: Check-out berechnet Ist-Dauer korrekt
- [ ] Test: DEVIATION_MIN ist korrekt (positiv wenn laenger, negativ wenn kuerzer)
- [ ] Test: Summary-Berechnung ueber mehrere Logs
- [ ] Test: Doppelter Check-in wird verhindert

## Definition of Done

- [ ] Backend + Mobile Frontend implementiert
- [ ] API-Tests ergaenzt
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-15

---

### HMS-24: Add Stundenplan-PDF-Export — Druckversion fuer Papier-Uebergang

**Label:** `feature`
**Priority:** 3 (Medium)
**State:** Backlog

## Was

PDF-Export des Wochenplans im "Schulstundenplan"-Format. Pro Mitarbeiter eine Seite. Farbkodierung, Zeitbloecke, Raum fuer handschriftliche Notizen.

## Warum

Uebergangsphase: Nicht alle Mitarbeiter haben Smartphones oder wollen die App nutzen. PDF-Ausdruck ist der Fallback, der die Papier-Gewohnheit respektiert.

## Akzeptanzkriterien

- [ ] `GET /api/schedules/:id/export/pdf` — PDF mit allen Mitarbeitern (mehrseitig)
- [ ] `GET /api/schedules/:id/export/pdf?employee_id=...` — PDF fuer einen Mitarbeiter
- [ ] Layout pro Seite: Mitarbeitername + KW oben, Tage als Spalten, Aufgaben als farbige Bloecke
- [ ] Farbkodierung druckfreundlich (nicht zu hell, nicht zu dunkel)
- [ ] Leere Zeile pro Tag fuer handschriftliche Notizen
- [ ] Footer: "Generiert am DD.MM.YYYY um HH:MM — Bei Aenderungen siehe App"
- [ ] Vertretungs-Aufgaben markiert mit "(vertritt [Name])"
- [ ] Dateigrösse: < 2 MB fuer 20 Mitarbeiter

## Technischer Ansatz

- Library: `pdfkit` oder `@react-pdf/renderer` (serverseitig)
- Tabellen-Layout: Fixe Spaltenbreiten fuer 7 Tage
- Farben: Aus SERVICE_TYPES.COLOR_CODE, leicht abgedunkelt fuer Druck

## Tests

- [ ] Test: PDF wird korrekt generiert (kein Error)
- [ ] Test: Alle Entries des Mitarbeiters sind im PDF
- [ ] Test: Farbkodierung ist im PDF sichtbar
- [ ] Test: Mehrseitig bei vielen Mitarbeitern

## Definition of Done

- [ ] Backend implementiert
- [ ] API-Tests ergaenzt
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-12

---

## Wave 5 — Reporting & Lerneffekt

---

### HMS-25: Add Auslastungs-Dashboard — Kapazitaetsuebersicht

**Label:** `feature`
**Priority:** 3 (Medium)
**State:** Backlog

## Was

Dashboard-Seite mit Auslastungsreport: Pro Mitarbeiter geplante vs. Vertragsstunden (Wochen-/Monatsansicht), Gesamtauslastung des Teams, Trend-Verlauf, und Warnungen bei Ueber-/Unterlastung.

## Warum

"Ich habe keinerlei statistische Werte." — Das Dashboard liefert erstmals Transparenz: Wer ist ueberlastet? Wo sind freie Kapazitaeten? Kann ich ein neues Objekt annehmen?

## Akzeptanzkriterien

- [ ] `GET /api/reports/utilization?date_from=...&date_to=...` — Auslastungsdaten
- [ ] Response: Pro MA → geplante Stunden, Vertragsstunden, Auslastung %, Vertretungs-Stunden
- [ ] Frontend: Balkendiagramm pro Mitarbeiter (geplant vs. Vertrag)
- [ ] Farb-Indikator: Gruen (<90%), Gelb (90–110%), Rot (>110%)
- [ ] Team-Gesamtauslastung als Zahl + Trendpfeil
- [ ] View V_WEEKLY_WORKLOAD als Basis
- [ ] Filter: Woche / Monat / Quartal, einzelner MA / alle

## Technischer Ansatz

- `routes/reports.ts`
- Frontend: `pages/UtilizationDashboardPage.tsx` mit Recharts-Balkendiagramm
- Basis: View V_WEEKLY_WORKLOAD

## Tests

- [ ] Test: Auslastung berechnet sich korrekt aus SCHEDULE_ENTRIES
- [ ] Test: Vertretungs-Stunden separat ausgewiesen
- [ ] Test: Filter nach Zeitraum funktioniert

## Definition of Done

- [ ] Backend + Frontend implementiert
- [ ] API-Tests ergaenzt
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-12

---

### HMS-26: Build Soll-Ist-Analyse — Zeitanpassungsvorschlaege aus TIME_LOGS

**Label:** `feature`, `architecture`
**Priority:** 4 (Low)
**State:** Backlog

## Was

Backend-Service der nach 4+ Wochen TIME_LOG-Daten die Durchschnittswerte pro Taetigkeit pro Objekt berechnet und Vorschlaege zur Anpassung der ESTIMATED_DURATION_MIN in PROPERTY_SERVICES macht.

## Warum

Langfristiger Lerneffekt: "Treppenhaus Porzer Str. braucht immer 25min statt geplante 20min." Bessere Soll-Zeiten fuehren zu realistischeren Plaenen und genauerer Kalkulation fuer neue Angebote.

## Akzeptanzkriterien

- [ ] `GET /api/reports/duration-analysis?min_data_points=4` — Analyse
- [ ] Response: Pro PROPERTY_SERVICE → geplante Dauer, Durchschnitt Ist, Abweichung, Vorschlag
- [ ] Nur Vorschlaege mit >15% Abweichung und mind. 4 Datenpunkte
- [ ] Frontend: Tabelle mit Vorschlaegen + "Uebernehmen" Button pro Zeile
- [ ] "Uebernehmen" aktualisiert ESTIMATED_DURATION_MIN in PROPERTY_SERVICES
- [ ] Historische Analyse: Trend ueber die letzten 12 Wochen

## Technischer Ansatz

- `services/duration-analyzer.ts`
- SQL: `AVG(ACTUAL_DURATION_MIN)` gruppiert nach PROPERTY_SERVICE_ID aus TIME_LOGS
- Vorschlag: Nur wenn `ABS(avg - planned) / planned > 0.15` UND `COUNT >= 4`

## Tests

- [ ] Test: Analyse berechnet korrekte Durchschnitte
- [ ] Test: Vorschlaege nur bei >15% Abweichung
- [ ] Test: "Uebernehmen" aktualisiert PROPERTY_SERVICES korrekt

## Definition of Done

- [ ] Service + API + Frontend implementiert
- [ ] API-Tests ergaenzt
- [ ] HANDOVER.md aktualisiert
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-23

---

### HMS-27: Doc Projekt-Dokumentation — CLAUDE.md, README, User-Guide

**Label:** `docs`
**Priority:** 3 (Medium)
**State:** Backlog

## Was

Projekt-Dokumentation vervollstaendigen: CLAUDE.md (AI-Operator-Regeln), README (Setup-Anleitung), User-Guide (Benutzerhandbuch), HANDOVER.md (aktueller Stand), GOVERNANCE.md (Regeln).

## Warum

Ohne Dokumentation ist das Projekt nicht wartbar, nicht uebergebbar, und nicht skalierbar. Insbesondere CLAUDE.md ist kritisch fuer die Weiterentwicklung mit Claude Code.

## Akzeptanzkriterien

- [ ] CLAUDE.md: Projektkontext, Regeln, Namenskonventionen, Tech-Stack, Testprotokoll
- [ ] README.md: Setup-Anleitung (Prerequisites, Docker, DB, Backend, Frontend), Architekturuebersicht
- [ ] User-Guide: Screenshots/Beschreibung aller Seiten, Workflows (Plan erstellen, Krankmeldung, etc.)
- [ ] HANDOVER.md: Aktueller Stand, Was funktioniert, Was fehlt, Naechste Schritte
- [ ] GOVERNANCE.md: Regeln (kein Code ohne Issue, kein Push ohne Test, etc.)
- [ ] Alle Doku-Dateien in Deutsch

## Technischer Ansatz

- Markdown-Dateien im Projekt-Root
- Screenshots: Manuell erstellen nach MVP-Fertigstellung

## Tests

- [ ] Test: Alle Links in README funktionieren
- [ ] Test: Setup-Anleitung ist auf frischem System reproduzierbar

## Definition of Done

- [ ] Alle Dokumente geschrieben
- [ ] Git Push erfolgt
- [ ] Linear-Issue auf Done

**Abhaengig von:** HMS-15 (nach MVP)
