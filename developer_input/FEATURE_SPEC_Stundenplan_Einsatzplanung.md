# Feature-Spezifikation: Stundenplan & Einsatzplanung

**Modul:** Scheduling & Workforce Planning
**Version:** 1.0.0
**Stand:** 2026-05-06
**Status:** Spezifikation — bereit fuer Entwicklung mit Claude Code

---

## 0. Ueberblick

Dieses Modul ersetzt die manuelle Excel-basierte Wochenplanung durch ein digitales System.
Robert erstellt aktuell jeden Freitag in Excel Stundenpläne fuer alle Mitarbeiter, druckt sie aus,
und schreibt bei Krankheit handschriftlich Aenderungen drauf. Das kostet mehrere Stunden pro Woche
und ist fehleranfaellig, nicht nachvollziehbar, nicht auswertbar.

**Kern-Versprechen:** Wochenplan in 15 Minuten statt 3 Stunden. Bei Krankheit: 2 Klicks statt 45 Minuten Telefonkette.

---

## 1. Datenmodell

### 1.1 Entity-Relationship-Uebersicht

```
TENANTS (Mandant/Firma)
  └── EMPLOYEES (Mitarbeiter/Lizenznehmer)
  └── PROPERTIES (Objekte)
        └── PROPERTY_SERVICES (Was wird am Objekt gemacht, in welcher Frequenz)
              └── SERVICE_TYPES (Treppenhaus, Garten, Muelltonnen, etc.)
  └── SCHEDULE_TEMPLATES (Wiederkehrende Basis-Wochen)
        └── TEMPLATE_ENTRIES (Einzelne Eintraege im Template)
  └── SCHEDULES (Konkrete Wochenplaene)
        └── SCHEDULE_ENTRIES (Einzelne Eintraege = 1 Mitarbeiter, 1 Tag, 1 Objekt, 1 Taetigkeit)
              └── TIME_LOGS (Ist-Zeiten, Check-in/Check-out)
  └── ABSENCE_RECORDS (Krankheit, Urlaub, etc.)
  └── REASSIGNMENT_LOG (Protokoll: Wer hat wessen Aufgaben uebernommen)
```

### 1.2 Tabellen-Definitionen

#### TENANTS (Mandanten — Multi-Tenancy-Wurzel)

```sql
CREATE TABLE TENANTS (
    ID                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    NAME              VARCHAR(200) NOT NULL,           -- "Hausmeisterservice Gepard GmbH"
    SLUG              VARCHAR(50) NOT NULL UNIQUE,     -- "gepard" (fuer Subdomain/Routing)
    BRAND             VARCHAR(50) NOT NULL,            -- "GEPARD" | "IMMOBILIENBUTLER" | "PAUL"
    TIMEZONE          VARCHAR(50) DEFAULT 'Europe/Berlin',
    SETTINGS          JSONB DEFAULT '{}',              -- Mandant-spezifische Config
    CREATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    UPDATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    IS_DELETED        BOOLEAN DEFAULT FALSE,
    DELETED_AT        TIMESTAMPTZ
);
```

**Hinweis:** In der Franchise-Phase wird jeder Lizenznehmer ein eigener Tenant.
Die Zentrale hat einen Super-Admin-Zugang ueber alle Tenants.

---

#### EMPLOYEES (Mitarbeiter / Einsatzkraefte)

```sql
CREATE TABLE EMPLOYEES (
    ID                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    TENANT_ID         UUID NOT NULL REFERENCES TENANTS(ID),
    USER_ID           UUID REFERENCES USERS(ID),       -- Verknuepfung zum Auth-System (optional)
    FIRST_NAME        VARCHAR(100) NOT NULL,
    LAST_NAME         VARCHAR(100) NOT NULL,
    DISPLAY_NAME      VARCHAR(200),                    -- Kurzname fuer Kalender ("Daniel K.")
    EMPLOYEE_TYPE     VARCHAR(30) NOT NULL,            -- "FULLTIME" | "PARTTIME" | "MINIJOB" | "SUBCONTRACTOR" | "FRANCHISEE"
    WEEKLY_HOURS      DECIMAL(5,2),                    -- Vertragsarbeitszeit (z.B. 20.00, 40.00, 10.00)
    HOURLY_RATE       DECIMAL(8,2),                    -- Interner Stundensatz (fuer Kalkulation)
    COLOR_CODE        VARCHAR(7),                      -- Hex-Farbe fuer Kalender-Darstellung
    PHONE             VARCHAR(30),                     -- Fuer Benachrichtigungen
    EMAIL             VARCHAR(200),
    HOME_ADDRESS      TEXT,                            -- Start-/Endpunkt fuer Tourenberechnung
    HOME_LAT          DECIMAL(10,7),                   -- Geokoordinate Wohnort
    HOME_LNG          DECIMAL(10,7),
    QUALIFICATIONS    JSONB DEFAULT '[]',              -- ["WINTERDIENST", "GARTENPFLEGE", "TREPPENHAUSREINIGUNG"]
    IS_ACTIVE         BOOLEAN DEFAULT TRUE,
    CREATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    UPDATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    CREATED_BY        UUID,
    UPDATED_BY        UUID,
    IS_DELETED        BOOLEAN DEFAULT FALSE,
    DELETED_AT        TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IDX_EMPLOYEES_TENANT ON EMPLOYEES(TENANT_ID) WHERE IS_DELETED = FALSE;
CREATE INDEX IDX_EMPLOYEES_TYPE ON EMPLOYEES(TENANT_ID, EMPLOYEE_TYPE) WHERE IS_DELETED = FALSE;
```

**Feld-Erlaeuterungen:**

- `EMPLOYEE_TYPE`: Wichtig fuer Kapazitaetsberechnung. Minijobber haben z.B. max. 538 EUR/Monat.
- `WEEKLY_HOURS`: Bei Minijob = 10h, Teilzeit = 20h, Vollzeit = 40h. Basis fuer Auslastungsberechnung.
- `QUALIFICATIONS`: JSONB-Array. Nicht jeder Mitarbeiter kann alles. Winterdienst erfordert z.B. Fuehrerschein + Raeumfahrzeug-Schulung. Wird bei KI-Vorschlaegen beruecksichtigt.
- `HOME_ADDRESS` + Koordinaten: Fuer Tourenoptimierung — Startpunkt der Tagestour.

---

#### SERVICE_TYPES (Taetigkeitsarten — Stammdaten)

```sql
CREATE TABLE SERVICE_TYPES (
    ID                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    TENANT_ID         UUID NOT NULL REFERENCES TENANTS(ID),
    NAME              VARCHAR(100) NOT NULL,           -- "Treppenhaus Reinigung"
    SHORT_NAME        VARCHAR(30) NOT NULL,            -- "Treppenhaus"
    CATEGORY          VARCHAR(50) NOT NULL,            -- "CLEANING" | "GARDEN" | "WASTE" | "WINTER" | "MAINTENANCE" | "OTHER"
    COLOR_CODE        VARCHAR(7) NOT NULL,             -- Farbkodierung: Orange=#F97316, Gruen=#22C55E, etc.
    ICON              VARCHAR(50),                     -- Lucide-Icon-Name fuer UI
    DEFAULT_DURATION_MIN  INTEGER NOT NULL DEFAULT 30, -- Durchschnittliche Dauer in Minuten
    REQUIRES_EQUIPMENT    JSONB DEFAULT '[]',          -- ["WISCHMOPP", "RASENMAEHER_ELEKTRO"]
    REQUIRES_QUALIFICATION VARCHAR(50),                -- Pflicht-Qualifikation (z.B. "WINTERDIENST")
    SORT_ORDER        INTEGER DEFAULT 0,
    IS_ACTIVE         BOOLEAN DEFAULT TRUE,
    CREATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    UPDATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    IS_DELETED        BOOLEAN DEFAULT FALSE,
    DELETED_AT        TIMESTAMPTZ
);
```

**Standard-Taetigkeitstypen (Seed-Daten aus Transkript):**

| NAME | CATEGORY | COLOR_CODE | DEFAULT_DURATION_MIN | Kontext |
|------|----------|-----------|---------------------|---------|
| Treppenhaus Reinigung | CLEANING | #F97316 (Orange) | 30 | "5 Min pro Etage" — 6 Etagen = 30 Min |
| Gartenpflege | GARDEN | #22C55E (Gruen) | 60 | Rasen, Hecke, Beete — stark variabel |
| Hofflaechenpflege | CLEANING | #FFFFFF (Weiss) | 30 | Pflasterflaechen kehren/reinigen |
| Muelltonnen rausstellen | WASTE | #8B5CF6 (Lila) | 10 | Muss am Abfuhrtag morgens passieren |
| Muelltonnen reinstellen | WASTE | #8B5CF6 (Lila) | 10 | Muss am Abfuhrtag oder Tag danach passieren |
| Winterdienst | WINTER | #3B82F6 (Blau) | 45 | Saisonal, wetterabhaengig, Haftungsthema |
| Fensterreinigung | CLEANING | #F97316 (Orange) | 45 | Meist monatlich oder quartalsweise |
| Dachrinne | MAINTENANCE | #6B7280 (Grau) | 30 | Halbjaehrlich |
| Kellerreinigung | CLEANING | #F97316 (Orange) | 20 | Quartalsweise |

**Farbkodierung** kommt direkt aus dem Transkript: "Orange steht immer fuer Treppenhaus, Gruen fuer Gartenpflege, Weiss fuer Hoffpflasterflaeche, Lila fuer Muelltonnen."

---

#### PROPERTIES (Objekte)

```sql
CREATE TABLE PROPERTIES (
    ID                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    TENANT_ID         UUID NOT NULL REFERENCES TENANTS(ID),
    NAME              VARCHAR(200) NOT NULL,           -- "Deutschlandstrasse 7"
    STREET            VARCHAR(200) NOT NULL,
    HOUSE_NUMBER      VARCHAR(20),
    ZIP_CODE          VARCHAR(10) NOT NULL,
    CITY              VARCHAR(100) NOT NULL,
    LAT               DECIMAL(10,7),                   -- Geokoordinate fuer Tourenplanung
    LNG               DECIMAL(10,7),
    PROPERTY_TYPE     VARCHAR(50) NOT NULL,            -- "APARTMENT_BUILDING" | "SINGLE_FAMILY" | "DUPLEX" | "COMMERCIAL" | "MIXED"
    UNIT_COUNT        INTEGER DEFAULT 1,               -- Anzahl Wohneinheiten (1 bis 80+)
    FLOOR_COUNT       INTEGER,                         -- Anzahl Etagen (fuer Treppenhaus-Zeitberechnung)
    GREEN_AREA_SQM    INTEGER,                         -- Rasenflaeche in qm (fuer Gartenpflege-Kalkulation)
    PROPERTY_MANAGER_ID  UUID,                         -- FK zur Hausverwaltung (separate Tabelle oder CONTACTS)
    BRAND             VARCHAR(50),                     -- "IMMOBILIENBUTLER" | "GEPARD" | "PAUL"
    CONTRACT_START    DATE,
    CONTRACT_END      DATE,
    IS_BAIT_PROPERTY  BOOLEAN DEFAULT FALSE,           -- "Koederobjekt" — strategisch, nicht profitabel
    ACCESS_INFO       TEXT,                            -- Schluesselverwaltung, Codes, Zugangshinweise
    NOTES             TEXT,
    IS_ACTIVE         BOOLEAN DEFAULT TRUE,
    CREATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    UPDATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    CREATED_BY        UUID,
    UPDATED_BY        UUID,
    IS_DELETED        BOOLEAN DEFAULT FALSE,
    DELETED_AT        TIMESTAMPTZ
);

CREATE INDEX IDX_PROPERTIES_TENANT ON PROPERTIES(TENANT_ID) WHERE IS_DELETED = FALSE;
CREATE INDEX IDX_PROPERTIES_CITY ON PROPERTIES(TENANT_ID, CITY) WHERE IS_DELETED = FALSE;
CREATE INDEX IDX_PROPERTIES_GEO ON PROPERTIES(LAT, LNG) WHERE IS_DELETED = FALSE;
```

**Feld-Erlaeuterungen:**

- `UNIT_COUNT`: Kritisch fuer Kalkulation. "Ein Objekt kann eine Doppelhaushaelfte sein oder ein Hochhaus mit 80 Einheiten."
- `FLOOR_COUNT`: Direkt fuer Treppenhaus-Zeitberechnung (5 Min × Etagen).
- `GREEN_AREA_SQM`: Fuer Gartenpflege-Kalkulation (welcher Rasenmaeher, wie lange).
- `BRAND`: Bestimmt Service-Level. Immobilienbutler = Premium ("geht mit dem Lappen ueber die Leisten"), Gepard = Standard.
- `IS_BAIT_PROPERTY`: "Koederobjekte — lohnen sich nicht, aber Tuer zum Kunden ist auf."

---

#### PROPERTY_SERVICES (Was wird an einem Objekt gemacht — Leistungsverzeichnis)

```sql
CREATE TABLE PROPERTY_SERVICES (
    ID                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    TENANT_ID         UUID NOT NULL REFERENCES TENANTS(ID),
    PROPERTY_ID       UUID NOT NULL REFERENCES PROPERTIES(ID),
    SERVICE_TYPE_ID   UUID NOT NULL REFERENCES SERVICE_TYPES(ID),
    FREQUENCY         VARCHAR(30) NOT NULL,            -- "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "BIANNUAL" | "ANNUAL" | "ON_DEMAND"
    FREQUENCY_DETAIL  JSONB,                           -- z.B. {"days_of_week": [1,4]} = Mo+Do fuer Muelltonnen
    ESTIMATED_DURATION_MIN  INTEGER NOT NULL,           -- Geschaetzte Dauer FUER DIESES OBJEKT (ueberschreibt Default)
    TIME_WINDOW_START TIME,                            -- Fruehester Beginn (z.B. 06:00 fuer Muelltonnen)
    TIME_WINDOW_END   TIME,                            -- Spaetester Beginn
    PRIORITY          INTEGER DEFAULT 3,               -- 1=Kritisch (Winterdienst/Haftung), 2=Hoch, 3=Normal, 4=Niedrig
    NOTES             TEXT,                            -- "Muelltonne wird um 6 Uhr geleert — vorher rausstellen!"
    SEASONAL_START    INTEGER,                         -- Monat (1-12), ab wann relevant (z.B. 11 fuer Winterdienst)
    SEASONAL_END      INTEGER,                         -- Monat (1-12), bis wann relevant (z.B. 3 fuer Winterdienst)
    IS_ACTIVE         BOOLEAN DEFAULT TRUE,
    CREATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    UPDATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    IS_DELETED        BOOLEAN DEFAULT FALSE,
    DELETED_AT        TIMESTAMPTZ
);

CREATE INDEX IDX_PROP_SERVICES_PROPERTY ON PROPERTY_SERVICES(PROPERTY_ID) WHERE IS_DELETED = FALSE;
CREATE INDEX IDX_PROP_SERVICES_FREQUENCY ON PROPERTY_SERVICES(TENANT_ID, FREQUENCY) WHERE IS_DELETED = FALSE;
```

**`FREQUENCY_DETAIL` Beispiele:**

```json
// Muelltonnen: Dienstag raus, Mittwoch rein
{"days_of_week": [2], "type": "WASTE_OUT"}
{"days_of_week": [3], "type": "WASTE_IN"}

// Treppenhaus: Jeden Montag
{"days_of_week": [1]}

// Fenster: Erster Montag im Monat
{"week_of_month": 1, "day_of_week": 1}

// Dachrinne: April und Oktober
{"months": [4, 10]}
```

**Dieses Design ist der Kern des Frequenz-Managements.** Die `FREQUENCY` gibt den groben Rhythmus vor, `FREQUENCY_DETAIL` die exakte Steuerung. Damit kann der Plan-Generator automatisch erkennen, welche Taetigkeiten in einer konkreten Kalenderwoche faellig sind.

---

#### SCHEDULE_TEMPLATES (Wiederkehrende Basis-Wochenplaene)

```sql
CREATE TABLE SCHEDULE_TEMPLATES (
    ID                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    TENANT_ID         UUID NOT NULL REFERENCES TENANTS(ID),
    NAME              VARCHAR(200) NOT NULL,           -- "Standard-Woche Daniel" oder "Winterdienst-Woche Team A"
    DESCRIPTION       TEXT,
    IS_DEFAULT        BOOLEAN DEFAULT FALSE,           -- Wird als Ausgangsbasis fuer neue Wochen genutzt
    VALID_FROM        DATE,                            -- Saisonale Templates: gueltig ab
    VALID_UNTIL       DATE,                            -- Saisonale Templates: gueltig bis
    CREATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    UPDATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    CREATED_BY        UUID,
    IS_DELETED        BOOLEAN DEFAULT FALSE,
    DELETED_AT        TIMESTAMPTZ
);
```

---

#### TEMPLATE_ENTRIES (Einzelne Eintraege im Template)

```sql
CREATE TABLE TEMPLATE_ENTRIES (
    ID                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    TENANT_ID         UUID NOT NULL REFERENCES TENANTS(ID),
    TEMPLATE_ID       UUID NOT NULL REFERENCES SCHEDULE_TEMPLATES(ID),
    EMPLOYEE_ID       UUID NOT NULL REFERENCES EMPLOYEES(ID),
    DAY_OF_WEEK       INTEGER NOT NULL CHECK (DAY_OF_WEEK BETWEEN 1 AND 7), -- 1=Mo, 7=So
    PROPERTY_ID       UUID NOT NULL REFERENCES PROPERTIES(ID),
    SERVICE_TYPE_ID   UUID NOT NULL REFERENCES SERVICE_TYPES(ID),
    START_TIME        TIME NOT NULL,                   -- Geplanter Beginn (z.B. 08:00)
    DURATION_MIN      INTEGER NOT NULL,                -- Geplante Dauer in Minuten
    SORT_ORDER        INTEGER DEFAULT 0,               -- Reihenfolge innerhalb des Tages
    NOTES             TEXT,
    CREATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    UPDATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    IS_DELETED        BOOLEAN DEFAULT FALSE,
    DELETED_AT        TIMESTAMPTZ
);

CREATE INDEX IDX_TEMPLATE_ENTRIES_TEMPLATE ON TEMPLATE_ENTRIES(TEMPLATE_ID) WHERE IS_DELETED = FALSE;
CREATE INDEX IDX_TEMPLATE_ENTRIES_EMPLOYEE ON TEMPLATE_ENTRIES(EMPLOYEE_ID, DAY_OF_WEEK) WHERE IS_DELETED = FALSE;
```

---

#### SCHEDULES (Konkrete Wochenplaene)

```sql
CREATE TABLE SCHEDULES (
    ID                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    TENANT_ID         UUID NOT NULL REFERENCES TENANTS(ID),
    WEEK_START        DATE NOT NULL,                   -- Montag der Woche (ISO-Woche)
    WEEK_NUMBER       INTEGER NOT NULL,                -- ISO-Kalenderwoche
    YEAR              INTEGER NOT NULL,
    STATUS            VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- "DRAFT" | "PUBLISHED" | "ARCHIVED"
    TEMPLATE_ID       UUID REFERENCES SCHEDULE_TEMPLATES(ID), -- Von welchem Template generiert?
    GENERATION_METHOD VARCHAR(30),                     -- "MANUAL" | "FROM_TEMPLATE" | "AI_GENERATED" | "AI_ADJUSTED"
    PUBLISHED_AT      TIMESTAMPTZ,                     -- Wann wurde der Plan veroeffentlicht?
    PUBLISHED_BY      UUID,
    NOTES             TEXT,                            -- Interne Notizen ("KW12: Daniel im Urlaub, Anna vertritt")
    CREATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    UPDATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    CREATED_BY        UUID,
    IS_DELETED        BOOLEAN DEFAULT FALSE,
    DELETED_AT        TIMESTAMPTZ,
    CONSTRAINT UQ_SCHEDULES_WEEK UNIQUE (TENANT_ID, WEEK_START)
);

CREATE INDEX IDX_SCHEDULES_WEEK ON SCHEDULES(TENANT_ID, YEAR, WEEK_NUMBER);
```

---

#### SCHEDULE_ENTRIES (Einzelne Planeintraege = 1 Aufgabe)

```sql
CREATE TABLE SCHEDULE_ENTRIES (
    ID                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    TENANT_ID         UUID NOT NULL REFERENCES TENANTS(ID),
    SCHEDULE_ID       UUID NOT NULL REFERENCES SCHEDULES(ID),
    EMPLOYEE_ID       UUID NOT NULL REFERENCES EMPLOYEES(ID),
    ENTRY_DATE        DATE NOT NULL,                   -- Konkretes Datum
    DAY_OF_WEEK       INTEGER NOT NULL,                -- 1=Mo .. 7=So (redundant, aber nuetzlich fuer Queries)
    PROPERTY_ID       UUID NOT NULL REFERENCES PROPERTIES(ID),
    SERVICE_TYPE_ID   UUID NOT NULL REFERENCES SERVICE_TYPES(ID),
    PROPERTY_SERVICE_ID UUID REFERENCES PROPERTY_SERVICES(ID), -- Link zum Leistungsverzeichnis
    START_TIME        TIME,                            -- Geplanter Beginn
    DURATION_MIN      INTEGER NOT NULL,                -- Geplante Dauer
    SORT_ORDER        INTEGER DEFAULT 0,               -- Reihenfolge im Tagesplan
    STATUS            VARCHAR(30) DEFAULT 'PLANNED',   -- "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED" | "REASSIGNED"
    IS_EXTRA          BOOLEAN DEFAULT FALSE,           -- Zusatzauftrag (nicht aus Template)
    IS_FROM_REASSIGNMENT BOOLEAN DEFAULT FALSE,        -- Durch Umplanung entstanden
    ORIGINAL_EMPLOYEE_ID UUID,                         -- Wer war urspruenglich geplant (bei Umplanung)
    REASSIGNMENT_REASON VARCHAR(50),                   -- "SICK" | "VACATION" | "EMERGENCY" | "OPTIMIZATION"
    NOTES             TEXT,                            -- Handschriftliche Notizen-Ersatz
    CREATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    UPDATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    CREATED_BY        UUID,
    UPDATED_BY        UUID,
    IS_DELETED        BOOLEAN DEFAULT FALSE,
    DELETED_AT        TIMESTAMPTZ
);

CREATE INDEX IDX_ENTRIES_SCHEDULE ON SCHEDULE_ENTRIES(SCHEDULE_ID) WHERE IS_DELETED = FALSE;
CREATE INDEX IDX_ENTRIES_EMPLOYEE_DATE ON SCHEDULE_ENTRIES(EMPLOYEE_ID, ENTRY_DATE) WHERE IS_DELETED = FALSE;
CREATE INDEX IDX_ENTRIES_PROPERTY_DATE ON SCHEDULE_ENTRIES(PROPERTY_ID, ENTRY_DATE) WHERE IS_DELETED = FALSE;
CREATE INDEX IDX_ENTRIES_DATE ON SCHEDULE_ENTRIES(TENANT_ID, ENTRY_DATE) WHERE IS_DELETED = FALSE;
```

**Dieses ist die zentrale Tabelle.** Jede Zeile = "Mitarbeiter X macht am Datum Y bei Objekt Z die Taetigkeit W fuer N Minuten."

---

#### ABSENCE_RECORDS (Abwesenheiten)

```sql
CREATE TABLE ABSENCE_RECORDS (
    ID                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    TENANT_ID         UUID NOT NULL REFERENCES TENANTS(ID),
    EMPLOYEE_ID       UUID NOT NULL REFERENCES EMPLOYEES(ID),
    ABSENCE_TYPE      VARCHAR(30) NOT NULL,            -- "SICK" | "VACATION" | "PERSONAL" | "TRAINING" | "OTHER"
    START_DATE        DATE NOT NULL,
    END_DATE          DATE NOT NULL,                   -- Inklusive
    IS_FULL_DAY       BOOLEAN DEFAULT TRUE,
    START_TIME        TIME,                            -- Bei Teilzeit-Abwesenheit
    END_TIME          TIME,
    NOTES             TEXT,
    REPORTED_AT       TIMESTAMPTZ DEFAULT NOW(),       -- Wann wurde die Abwesenheit gemeldet
    REPORTED_BY       UUID,                            -- Wer hat gemeldet (Selbst oder Vorarbeiter)
    IS_HANDLED        BOOLEAN DEFAULT FALSE,           -- Wurde die Umplanung bereits vorgenommen?
    HANDLED_AT        TIMESTAMPTZ,
    HANDLED_BY        UUID,
    CREATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    UPDATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    IS_DELETED        BOOLEAN DEFAULT FALSE,
    DELETED_AT        TIMESTAMPTZ
);

CREATE INDEX IDX_ABSENCE_EMPLOYEE ON ABSENCE_RECORDS(EMPLOYEE_ID, START_DATE, END_DATE) WHERE IS_DELETED = FALSE;
CREATE INDEX IDX_ABSENCE_UNHANDLED ON ABSENCE_RECORDS(TENANT_ID) WHERE IS_HANDLED = FALSE AND IS_DELETED = FALSE;
```

---

#### TIME_LOGS (Ist-Zeiten — Zeiterfassung)

```sql
CREATE TABLE TIME_LOGS (
    ID                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    TENANT_ID         UUID NOT NULL REFERENCES TENANTS(ID),
    SCHEDULE_ENTRY_ID UUID NOT NULL REFERENCES SCHEDULE_ENTRIES(ID),
    EMPLOYEE_ID       UUID NOT NULL REFERENCES EMPLOYEES(ID),
    CHECK_IN          TIMESTAMPTZ,                     -- Tatsaechlicher Beginn
    CHECK_OUT         TIMESTAMPTZ,                     -- Tatsaechliches Ende
    ACTUAL_DURATION_MIN INTEGER,                       -- Berechnete Ist-Dauer
    CHECK_IN_LAT      DECIMAL(10,7),                   -- GPS bei Check-in
    CHECK_IN_LNG      DECIMAL(10,7),
    CHECK_OUT_LAT     DECIMAL(10,7),
    CHECK_OUT_LNG     DECIMAL(10,7),
    DEVIATION_MIN     INTEGER,                         -- Abweichung von Soll (positiv = laenger, negativ = kuerzer)
    STATUS            VARCHAR(30) DEFAULT 'PENDING',   -- "PENDING" | "CHECKED_IN" | "CHECKED_OUT" | "AUTO_CLOSED"
    NOTES             TEXT,                            -- Besonderheiten ("Treppenhaus war stark verschmutzt")
    CREATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    UPDATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    IS_DELETED        BOOLEAN DEFAULT FALSE,
    DELETED_AT        TIMESTAMPTZ
);

CREATE INDEX IDX_TIMELOGS_ENTRY ON TIME_LOGS(SCHEDULE_ENTRY_ID) WHERE IS_DELETED = FALSE;
CREATE INDEX IDX_TIMELOGS_EMPLOYEE_DATE ON TIME_LOGS(EMPLOYEE_ID, CHECK_IN) WHERE IS_DELETED = FALSE;
```

---

#### REASSIGNMENT_LOG (Umplanungs-Protokoll)

```sql
CREATE TABLE REASSIGNMENT_LOG (
    ID                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    TENANT_ID         UUID NOT NULL REFERENCES TENANTS(ID),
    SCHEDULE_ID       UUID NOT NULL REFERENCES SCHEDULES(ID),
    ABSENCE_RECORD_ID UUID REFERENCES ABSENCE_RECORDS(ID),
    ABSENT_EMPLOYEE_ID UUID NOT NULL REFERENCES EMPLOYEES(ID),
    REASSIGNED_TO_ID  UUID NOT NULL REFERENCES EMPLOYEES(ID),
    SCHEDULE_ENTRY_ID UUID NOT NULL REFERENCES SCHEDULE_ENTRIES(ID),
    REASON            VARCHAR(50) NOT NULL,            -- "SICK" | "VACATION" | "OPTIMIZATION"
    METHOD            VARCHAR(30) NOT NULL,            -- "MANUAL" | "AI_SUGGESTED" | "AI_AUTO"
    AI_CONFIDENCE     DECIMAL(3,2),                    -- 0.00 - 1.00 (wie sicher war die KI)
    AI_REASONING      TEXT,                            -- Begruendung der KI ("Daniel hat Kapazitaet, ist naechster am Objekt")
    WAS_ACCEPTED      BOOLEAN,                         -- Wurde der KI-Vorschlag akzeptiert?
    CREATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    CREATED_BY        UUID
);
```

---

### 1.3 RLS-Policies (Standard fuer alle Tabellen)

```sql
-- Beispiel fuer EMPLOYEES, analog fuer alle Tabellen
ALTER TABLE EMPLOYEES ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON EMPLOYEES
    USING (TENANT_ID = current_setting('app.current_tenant_id')::uuid);
```

---

## 2. Feature-Spezifikationen

---

### F01: Digitaler Wochenplan

**Prioritaet:** MUST HAVE
**Quelle:** Transkript ("Robert macht jeden Freitag Excel, druckt aus, jeder Mitarbeiter kriegt einen Stundenplan")

#### 2.1.1 Beschreibung

Kalenderartige Wochenansicht (Montag bis Sonntag), die pro Mitarbeiter alle geplanten Einsaetze zeigt.
Layout orientiert sich bewusst am "Schulstundenplan", weil die Mitarbeiter dieses Format kennen.

#### 2.1.2 UI-Spezifikation

**Hauptansicht: Wochenplan (Desktop)**

```
┌─────────────────────────────────────────────────────────────────────┐
│  KW 19 / 2026          [◀ Vorwoche] [Heute] [Naechste ▶]          │
│  05.05. – 11.05.2026    Status: ENTWURF  [Veroeffentlichen]       │
├─────────┬──────────┬──────────┬──────────┬──────────┬──────────┬───┤
│         │ Montag   │ Dienstag │ Mittwoch │ Donnerstag│ Freitag │...│
│         │ 05.05.   │ 06.05.   │ 07.05.   │ 08.05.   │ 09.05.  │   │
├─────────┼──────────┼──────────┼──────────┼──────────┼──────────┤   │
│ Daniel  │ ████████ │ ████████ │ ████████ │ ████████ │ ████████ │   │
│ K.      │ Porzer   │ Lorweg 3 │ KRANK    │          │ Porzer   │   │
│ 38h/40h │ Str. 12  │ Treppen  │ ░░░░░░░░ │          │ Str. 12  │   │
│         │ 🟠Trepp  │ 🟢Garten │          │          │ 🟣Muell  │   │
│         │ 08-10:30 │ 08-12:00 │          │          │ 06-06:30 │   │
│         ├──────────┤          │          │          │          │   │
│         │ Deutsch- │          │          │          │          │   │
│         │ landstr 7│          │          │          │          │   │
│         │ 🟢Garten │          │          │          │          │   │
│         │ 11-13:00 │          │          │          │          │   │
├─────────┼──────────┼──────────┼──────────┼──────────┼──────────┤   │
│ Anna    │ ████████ │ ████████ │ ████████ │ ████████ │          │   │
│ S.      │ ...      │ ...      │+Lorweg 3 │ ...      │ Frei    │   │
│ 18h/20h │          │          │ Treppen  │          │          │   │
│         │          │          │(vertritt │          │          │   │
│         │          │          │ Daniel)  │          │          │   │
└─────────┴──────────┴──────────┴──────────┴──────────┴──────────┴───┘
```

**Visuelle Elemente:**
- Zeilen = Mitarbeiter (mit Name, Auslastung der Woche: "38h/40h")
- Spalten = Wochentage
- Zellen = Aufgabenbloecke, farbkodiert nach SERVICE_TYPE.COLOR_CODE
- Jeder Block zeigt: Objektname, Taetigkeitstyp-Icon, Zeitraum
- Kranke Tage: Schraffiert/grau mit Label "KRANK"
- Vertretungs-Aufgaben: Markiert mit "(vertritt Daniel)"
- Auslastungsbalken pro Mitarbeiter (links): visuell % der Wochenstunden belegt

**Ansichtsmodi:**
1. **Team-Wochenplan** (Default): Alle Mitarbeiter, eine Woche — wie oben
2. **Einzelmitarbeiter-Woche**: Detailansicht fuer einen Mitarbeiter mit Routing-Karte
3. **Tagesansicht**: Ein Tag, alle Mitarbeiter — fuer Tages-Disposition
4. **Objekt-Ansicht**: Ein Objekt, alle geplanten Besuche der Woche

#### 2.1.3 Interaktionen

| Aktion | Ausloeser | Verhalten |
|--------|----------|-----------|
| Neuer Eintrag | Klick auf leere Zelle | Modal: Objekt auswaehlen → Taetigkeit → Dauer → Speichern |
| Eintrag bearbeiten | Klick auf Block | Modal mit allen Feldern, inkl. Notizen |
| Eintrag verschieben | Drag & Drop auf anderen Mitarbeiter/Tag | Verschiebt den Entry, aktualisiert EMPLOYEE_ID + ENTRY_DATE |
| Eintrag loeschen | Rechtsklick → Loeschen | Soft-Delete, verschwindet aus Ansicht |
| Woche veroeffentlichen | Button "Veroeffentlichen" | Status DRAFT → PUBLISHED, Push-Benachrichtigung an alle Mitarbeiter |
| Woche duplizieren | Button "Naechste Woche vorbereiten" | Kopiert alle Entries in neue SCHEDULE mit naechster WEEK_START |

#### 2.1.4 API-Endpoints

```
GET    /api/schedules?week_start=2026-05-05          → Wochenplan laden
POST   /api/schedules                                 → Neuen Wochenplan anlegen
PUT    /api/schedules/:id                             → Wochenplan aktualisieren (Status, Notes)
POST   /api/schedules/:id/publish                     → Veroeffentlichen

GET    /api/schedule-entries?schedule_id=...           → Alle Entries einer Woche
POST   /api/schedule-entries                           → Neuen Entry anlegen
PUT    /api/schedule-entries/:id                       → Entry bearbeiten
PATCH  /api/schedule-entries/:id/reassign              → Entry umplanen (Mitarbeiter wechseln)
DELETE /api/schedule-entries/:id                       → Entry loeschen (Soft-Delete)

POST   /api/schedule-entries/bulk                      → Mehrere Entries auf einmal anlegen (fuer Template-Generierung)
```

#### 2.1.5 Validierungsregeln (Zod)

```typescript
const scheduleEntrySchema = z.object({
  employee_id: z.string().uuid(),
  entry_date: z.string().date(),
  property_id: z.string().uuid(),
  service_type_id: z.string().uuid(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  duration_min: z.number().int().min(5).max(480),
  notes: z.string().max(500).optional(),
})
```

---

### F02: Wiederkehrende Plaene (Templates)

**Prioritaet:** MUST HAVE
**Quelle:** Transkript ("Wenn alle gesund bleiben... ist es eigentlich immer der gleiche Plan")

#### 2.2.1 Beschreibung

Templates sind "ideale Wochen" — der Normalfall ohne Krankheit, ohne Sonderauftraege.
Sie dienen als Ausgangsbasis, von der jede konkrete Woche abgeleitet wird.

#### 2.2.2 Workflow

```
[Template anlegen]
       │
       ▼
[Template mit Eintraegen befuellen]  ← Das ist die Arbeit, die man EINMAL macht
       │
       ▼
[Template als Default markieren]
       │
       ▼
[Jeden Freitag: "Naechste Woche generieren"]
       │
       ▼
[System erzeugt SCHEDULE + ENTRIES aus Template]
       │
       ├─── Prueft: Welche PROPERTY_SERVICES sind in KW faellig?
       │    (z.B. "Fenster monatlich" → nur wenn KW 1 des Monats)
       │
       ├─── Prueft: Hat jemand Urlaub eingetragen?
       │    → Markiert betroffene Entries als "Vertretung noetig"
       │
       └─── Ergebnis: Konkreter Wochenplan im Status DRAFT
              │
              ▼
       [Planer prueft, passt an, veroeffentlicht]
```

#### 2.2.3 Template-Verwaltung UI

- Liste aller Templates mit Name, Beschreibung, Gueltigkeitszeitraum
- Template bearbeiten: Gleiche Grid-Ansicht wie Wochenplan, aber mit "Mo/Di/Mi/Do/Fr/Sa/So" statt konkreten Daten
- Button: "Woche aus Template generieren" → erzeugt konkreten Plan
- Saisonale Templates: z.B. "Winter-Template" (Nov–Maerz) vs. "Sommer-Template" (Apr–Okt)

#### 2.2.4 Generierungs-Logik (Backend-Service)

```typescript
// services/schedule-generator.ts (Pseudocode)

async function generateWeekFromTemplate(
  tenantId: string,
  templateId: string,
  weekStart: Date // Montag der Zielwoche
): Promise<Schedule> {

  // 1. Template-Entries laden
  const templateEntries = await getTemplateEntries(templateId)

  // 2. Abwesenheiten in der Zielwoche pruefen
  const absences = await getAbsencesForWeek(tenantId, weekStart)
  const absentEmployeeIds = new Set(absences.map(a => a.employee_id))

  // 3. Frequenz-Check: Welche PROPERTY_SERVICES sind in dieser KW faellig?
  const dueServices = await getDueServicesForWeek(tenantId, weekStart)

  // 4. Schedule + Entries erzeugen
  const schedule = await createSchedule(tenantId, weekStart, templateId)

  for (const entry of templateEntries) {
    const entryDate = addDays(weekStart, entry.day_of_week - 1)

    // Frequenz-Check: Ist diese Taetigkeit in dieser Woche ueberhaupt faellig?
    const service = dueServices.find(s =>
      s.property_id === entry.property_id &&
      s.service_type_id === entry.service_type_id
    )
    if (!service && !isWeeklyService(entry)) continue // Nicht faellig → ueberspringen

    // Abwesenheits-Check
    const isAbsent = absentEmployeeIds.has(entry.employee_id)

    await createScheduleEntry({
      schedule_id: schedule.id,
      employee_id: entry.employee_id,
      entry_date: entryDate,
      property_id: entry.property_id,
      service_type_id: entry.service_type_id,
      start_time: entry.start_time,
      duration_min: entry.duration_min,
      status: isAbsent ? 'REASSIGNMENT_NEEDED' : 'PLANNED',
      original_employee_id: isAbsent ? entry.employee_id : null,
      reassignment_reason: isAbsent ? absences[0].absence_type : null,
    })
  }

  return schedule
}
```

#### 2.2.5 API-Endpoints

```
GET    /api/schedule-templates                        → Alle Templates
POST   /api/schedule-templates                        → Neues Template
PUT    /api/schedule-templates/:id                    → Template bearbeiten
DELETE /api/schedule-templates/:id                    → Template loeschen

GET    /api/template-entries?template_id=...           → Entries eines Templates
POST   /api/template-entries                           → Entry hinzufuegen
PUT    /api/template-entries/:id                       → Entry aendern
DELETE /api/template-entries/:id                       → Entry loeschen

POST   /api/schedules/generate                        → Woche aus Template generieren
  Body: { template_id: string, week_start: string }
  Response: { schedule: Schedule, entries: ScheduleEntry[], warnings: Warning[] }
  Warnings z.B.: "Daniel K. hat am Mi Urlaub — 3 Aufgaben brauchen Vertretung"
```

---

### F03: Drag & Drop Umplanung

**Prioritaet:** MUST HAVE
**Quelle:** Transkript ("Handschriftlich hingeschrieben und verschoben")

#### 2.3.1 Beschreibung

Im Wochenplan koennen Aufgabenbloecke per Drag & Drop zwischen Mitarbeitern und Tagen verschoben werden.
Das ist die schnellste Art, auf Aenderungen zu reagieren.

#### 2.3.2 Technische Umsetzung

**Frontend:**
- Library: `@dnd-kit/core` + `@dnd-kit/sortable` (React DnD Kit — besser als react-beautiful-dnd, das EOL ist)
- Jeder Aufgabenblock ist ein `Draggable`
- Jede Mitarbeiter-Tag-Zelle ist ein `Droppable`
- Beim Drop: PATCH-Request an Backend mit neuer `employee_id` + `entry_date`

**Drag-Constraints:**
| Regel | Beschreibung | Durchsetzung |
|-------|-------------|-------------|
| Kapazitaets-Check | Ziel-Mitarbeiter darf nicht ueber WEEKLY_HOURS kommen | Warnung (gelb), kein Hard-Block |
| Qualifikations-Check | Mitarbeiter muss Qualifikation fuer Taetigkeit haben | Hard-Block (rot), Drop wird abgelehnt |
| Zeitfenster-Check | Muelltonnen muessen vor 06:00 raus → nur morgens einplanbar | Warnung |
| Zeitkonflikt | Zwei Aufgaben gleichzeitig beim selben Mitarbeiter | Hard-Block |
| Saison-Check | Winterdienst nur Nov–Maerz | Hard-Block |

**Visuelles Feedback beim Drag:**
- Gruene Markierung: Drop erlaubt, keine Konflikte
- Gelbe Markierung: Drop erlaubt, aber Warnung (z.B. Ueberkapazitaet)
- Rote Markierung: Drop nicht erlaubt (fehlende Qualifikation, Zeitkonflikt)

#### 2.3.3 API-Endpoint fuer Verschiebung

```
PATCH /api/schedule-entries/:id/move
Body: {
  target_employee_id: string,
  target_date: string,
  target_start_time?: string
}
Response: {
  success: boolean,
  entry: ScheduleEntry,
  warnings: Warning[],      // z.B. "Anna hat jetzt 42h/40h eingeplant"
  conflicts: Conflict[]     // z.B. "Zeitkonflikt mit Entry XYZ"
}
```

---

### F04: Krankmeldung mit KI-Vertretungsvorschlag

**Prioritaet:** SHOULD HAVE (Welle 1: manuell, Welle 2: KI-gestuetzt)
**Quelle:** Transkript + Berater-Ergaenzung

#### 2.4.1 Beschreibung

Wenn ein Mitarbeiter krank gemeldet wird, muessen dessen Aufgaben auf andere Mitarbeiter verteilt werden.
Heute passiert das per Telefon und handschriftlichen Notizen. Das System soll:

1. **Sofort:** Alle betroffenen SCHEDULE_ENTRIES markieren
2. **Welle 1 (manuell):** Uebersicht zeigen: "Diese 5 Aufgaben brauchen Vertretung"
3. **Welle 2 (KI):** Vorschlaege generieren: "Daniel uebernimmt 3, Anna uebernimmt 2"

#### 2.4.2 Workflow

```
[Krankmeldung erfassen]  ← Planer oder Mitarbeiter selbst (Mobile)
         │
         ▼
[System markiert betroffene Entries als "REASSIGNMENT_NEEDED"]
         │
         ▼
[Umplanungs-Ansicht oeffnet sich automatisch]
         │
         ├── Zeigt: Welche Aufgaben sind betroffen?
         ├── Zeigt: Welche Mitarbeiter haben Kapazitaet?
         ├── Zeigt: Wer ist geografisch am naechsten?
         ├── Zeigt: Wer hat die richtige Qualifikation?
         │
         ▼ (Welle 2)
[KI generiert Vorschlag]
         │
         ├── Vorschlag 1: Daniel uebernimmt Porzer Str (ist eh in der Naehe)
         ├── Vorschlag 2: Anna uebernimmt Deutschlandstr (hat noch 4h frei)
         ├── Vorschlag 3: Lorweg → auf Donnerstag verschieben (nicht zeitkritisch)
         │
         ▼
[Planer akzeptiert / passt an / lehnt ab]
         │
         ▼
[Entries werden umgeplant, Mitarbeiter werden benachrichtigt]
```

#### 2.4.3 KI-Ranking-Algorithmus (Welle 2)

Fuer jeden betroffenen Entry: Welcher verfuegbare Mitarbeiter ist am besten geeignet?

**Scoring-Modell (gewichtete Faktoren):**

```typescript
interface ReassignmentCandidate {
  employee_id: string
  score: number          // 0–100, hoeher = besser geeignet
  factors: {
    capacity_score: number     // 0–30: Wie viel freie Kapazitaet? (30 = viel frei, 0 = voll)
    proximity_score: number    // 0–25: Wie nah ist das Objekt an seiner heutigen Route?
    qualification_score: number // 0–20: Hat er die Qualifikation? (20 = ja, 0 = nein → Ausschluss)
    history_score: number      // 0–15: Kennt er das Objekt? (War schon mal dort?)
    workload_fairness: number  // 0–10: Wurde er diese Woche schon oft als Vertretung eingesetzt?
  }
  reasoning: string       // Menschenlesbare Begruendung
}
```

**Berechnung im Detail:**

```typescript
function calculateReassignmentScore(
  candidate: Employee,
  entry: ScheduleEntry,
  weekContext: WeekContext
): ReassignmentCandidate {

  // 1. Kapazitaet (30 Punkte)
  const currentHours = weekContext.getPlannedHours(candidate.id)
  const maxHours = candidate.weekly_hours
  const freeHours = maxHours - currentHours
  const additionalHours = entry.duration_min / 60
  const capacity_score = freeHours >= additionalHours
    ? Math.min(30, (freeHours / maxHours) * 30)
    : 0 // Kein Platz → 0 Punkte (aber kein harter Ausschluss)

  // 2. Naehe (25 Punkte)
  // Berechne: Ist das Objekt in der Naehe eines Objekts, das der Kandidat am selben Tag bereits besucht?
  const candidateDayEntries = weekContext.getEntriesForDay(candidate.id, entry.entry_date)
  const nearestDistance = calculateNearestDistance(entry.property, candidateDayEntries.map(e => e.property))
  const proximity_score = nearestDistance < 1 ? 25  // < 1km = perfekt
                        : nearestDistance < 5 ? 20  // < 5km = gut
                        : nearestDistance < 15 ? 10 // < 15km = ok
                        : 0                         // > 15km = schlecht

  // 3. Qualifikation (20 Punkte — harter Faktor)
  const requiredQual = entry.serviceType.requires_qualification
  const qualification_score = !requiredQual ? 20                               // Keine Qual noetig = voll
    : candidate.qualifications.includes(requiredQual) ? 20                     // Hat Qual = voll
    : 0                                                                         // Fehlt = 0 (quasi Ausschluss)

  // 4. Objekt-Erfahrung (15 Punkte)
  const hasWorkedAtProperty = await checkHistoricalEntries(candidate.id, entry.property_id)
  const history_score = hasWorkedAtProperty ? 15 : 5 // Kennt das Objekt = Bonus

  // 5. Fairness (10 Punkte)
  const reassignmentsThisWeek = weekContext.getReassignmentCount(candidate.id)
  const workload_fairness = reassignmentsThisWeek === 0 ? 10
    : reassignmentsThisWeek === 1 ? 7
    : reassignmentsThisWeek === 2 ? 3
    : 0 // Schon 3+ Vertretungen diese Woche = unfair

  const totalScore = capacity_score + proximity_score + qualification_score
    + history_score + workload_fairness

  return {
    employee_id: candidate.id,
    score: totalScore,
    factors: { capacity_score, proximity_score, qualification_score, history_score, workload_fairness },
    reasoning: generateReasoning(...) // "Daniel hat 4h frei, ist 2km entfernt, kennt das Objekt"
  }
}
```

**Wichtig:** Der Algorithmus ist regelbasiert, NICHT LLM-basiert. Kein API-Call an GPT/Claude noetig.
Das ist schnell, deterministisch, und kostet nichts pro Aufruf. LLM kommt spaeter fuer natuerlichsprachige
Begruendungen oder komplexere Szenarien (z.B. "Verschiebe Aufgaben zwischen Tagen, nicht nur zwischen Personen").

#### 2.4.4 API-Endpoints

```
POST   /api/absences                                  → Abwesenheit erfassen
  Body: { employee_id, absence_type, start_date, end_date, notes? }
  Response: { absence: AbsenceRecord, affected_entries: ScheduleEntry[] }

GET    /api/schedules/:id/reassignment-needed          → Alle Entries die Vertretung brauchen
  Response: { entries: ScheduleEntry[], available_employees: Employee[] }

POST   /api/schedules/:id/suggest-reassignment         → KI-Vorschlag anfordern (Welle 2)
  Body: { entry_ids: string[] }
  Response: { suggestions: ReassignmentSuggestion[] }
  // Jeder Suggestion: { entry_id, candidates: ReassignmentCandidate[], recommended: string }

POST   /api/schedules/:id/apply-reassignment           → Vorschlag umsetzen
  Body: { reassignments: { entry_id: string, new_employee_id: string }[] }
  Response: { updated_entries: ScheduleEntry[], reassignment_log: ReassignmentLog[] }
```

---

### F05: Verschiedene Taetigkeitstypen

**Prioritaet:** MUST HAVE
**Quelle:** Transkript ("Orange = Treppenhaus, Gruen = Gartenpflege, Weiss = Hof, Lila = Muelltonnen")

#### 2.5.1 Beschreibung

Stammdaten-Verwaltung der Taetigkeitsarten. Jede Taetigkeit hat:
- Farbkodierung (fuer den visuellen Plan)
- Standard-Dauer (ueberschreibbar pro Objekt)
- Benoetigtes Equipment
- Benoetigte Qualifikation
- Kategorie (Reinigung, Garten, Muell, Winter, Wartung)

#### 2.5.2 UI: Verwaltungsseite

Einfache CRUD-Tabelle unter "Einstellungen → Taetigkeitstypen":

```
┌──────────────────────────────────────────────────────────────────┐
│  Taetigkeitstypen                            [+ Neue Taetigkeit]│
├───────┬──────────────────────┬───────────┬───────┬──────────────┤
│ Farbe │ Name                 │ Kategorie │ Dauer │ Qualifikation│
├───────┼──────────────────────┼───────────┼───────┼──────────────┤
│ 🟠    │ Treppenhaus Reinigung│ Reinigung │ 30min │ —            │
│ 🟢    │ Gartenpflege         │ Garten    │ 60min │ —            │
│ ⬜    │ Hofflaechenpflege    │ Reinigung │ 30min │ —            │
│ 🟣    │ Muelltonnen raus     │ Muell     │ 10min │ —            │
│ 🟣    │ Muelltonnen rein     │ Muell     │ 10min │ —            │
│ 🔵    │ Winterdienst         │ Winter    │ 45min │ WINTERDIENST │
│ 🟠    │ Fensterreinigung     │ Reinigung │ 45min │ —            │
│ ⚫    │ Dachrinne            │ Wartung   │ 30min │ —            │
└───────┴──────────────────────┴───────────┴───────┴──────────────┘
```

#### 2.5.3 API-Endpoints

```
GET    /api/service-types                              → Alle Taetigkeitstypen
POST   /api/service-types                              → Neuen Typ anlegen
PUT    /api/service-types/:id                          → Typ bearbeiten
DELETE /api/service-types/:id                          → Typ loeschen (nur wenn nirgends verwendet)
```

---

### F06: Frequenz-Management

**Prioritaet:** MUST HAVE
**Quelle:** Transkript ("Wöchentlich, monatlich, quartalsweise, zweimal jährlich")

#### 2.6.1 Beschreibung

Jedes Objekt hat ein Leistungsverzeichnis: Welche Taetigkeiten werden in welchem Rhythmus ausgefuehrt.
Das System muss bei der Wochenplan-Generierung automatisch erkennen, welche Taetigkeiten in der
konkreten Kalenderwoche faellig sind.

#### 2.6.2 Frequenz-Engine (Backend-Service)

```typescript
// services/frequency-engine.ts

function isServiceDueInWeek(
  service: PropertyService,
  weekStart: Date  // Montag der Zielwoche
): { isDue: boolean; dueOnDays: number[] } {

  const detail = service.frequency_detail as FrequencyDetail

  switch (service.frequency) {
    case 'WEEKLY':
      // Jede Woche faellig, an den definierten Tagen
      return { isDue: true, dueOnDays: detail.days_of_week || [1] } // Default Montag

    case 'BIWEEKLY':
      // Alle 2 Wochen — basierend auf Referenzdatum (Vertragsstart)
      const weeksSinceStart = differenceInWeeks(weekStart, service.created_at)
      return { isDue: weeksSinceStart % 2 === 0, dueOnDays: detail.days_of_week || [1] }

    case 'MONTHLY':
      // Bestimmte Woche im Monat (z.B. "1. Woche" oder "letzte Woche")
      const weekOfMonth = getWeekOfMonth(weekStart)
      return {
        isDue: detail.week_of_month === weekOfMonth,
        dueOnDays: detail.day_of_week ? [detail.day_of_week] : [1]
      }

    case 'QUARTERLY':
      // Bestimmte Monate (z.B. Jan, Apr, Jul, Okt)
      const month = getMonth(weekStart) + 1
      const isQuarterMonth = detail.months?.includes(month)
        || [1, 4, 7, 10].includes(month) // Default: Quartalsanfang
      const isFirstWeek = getWeekOfMonth(weekStart) === 1
      return { isDue: isQuarterMonth && isFirstWeek, dueOnDays: [detail.day_of_week || 1] }

    case 'BIANNUAL':
      // 2x im Jahr
      const biMonth = getMonth(weekStart) + 1
      return {
        isDue: (detail.months || [4, 10]).includes(biMonth) && getWeekOfMonth(weekStart) === 1,
        dueOnDays: [detail.day_of_week || 1]
      }

    case 'ANNUAL':
      // 1x im Jahr
      const annMonth = getMonth(weekStart) + 1
      return {
        isDue: (detail.months || [4]).includes(annMonth) && getWeekOfMonth(weekStart) === 1,
        dueOnDays: [detail.day_of_week || 1]
      }

    case 'ON_DEMAND':
      return { isDue: false, dueOnDays: [] } // Nur manuell einplanbar

    default:
      return { isDue: false, dueOnDays: [] }
  }
}

// Saisonalitaets-Check
function isInSeason(service: PropertyService, weekStart: Date): boolean {
  if (!service.seasonal_start && !service.seasonal_end) return true
  const month = getMonth(weekStart) + 1
  if (service.seasonal_start <= service.seasonal_end) {
    return month >= service.seasonal_start && month <= service.seasonal_end
  }
  // Wrap-around (z.B. Nov–Maerz = 11–3)
  return month >= service.seasonal_start || month <= service.seasonal_end
}
```

#### 2.6.3 UI: Leistungsverzeichnis pro Objekt

Unter Objekt-Detail → Tab "Leistungen":

```
┌────────────────────────────────────────────────────────────────────────┐
│  Objekt: Porzer Strasse 12           Immobilienbutler                 │
│  Hausverwaltung: Mueller & Partner   12 Wohneinheiten, 4 Etagen      │
├────────────────────────────────────────────────────────────────────────┤
│  Leistungsverzeichnis                             [+ Leistung]       │
├──────────────────────┬────────────┬────────┬──────┬──────────────────┤
│ Taetigkeit           │ Frequenz   │ Tag(e) │ Dauer│ Saison           │
├──────────────────────┼────────────┼────────┼──────┼──────────────────┤
│ 🟠 Treppenhaus       │ Woechentl. │ Mo     │ 20m  │ Ganzjaehrig     │
│ 🟢 Gartenpflege      │ Woechentl. │ Mo     │ 45m  │ Apr–Okt         │
│ 🟣 Muelltonnen raus  │ Woechentl. │ Di,Do  │ 10m  │ Ganzjaehrig     │
│ 🟣 Muelltonnen rein  │ Woechentl. │ Mi,Fr  │ 10m  │ Ganzjaehrig     │
│ 🟠 Fensterreinigung  │ Monatlich  │ 1.Mo   │ 60m  │ Ganzjaehrig     │
│ ⚫ Dachrinne         │ Halbjaehrl.│ Apr,Okt│ 30m  │ —               │
│ 🔵 Winterdienst      │ Bei Bedarf │ —      │ 45m  │ Nov–Maerz       │
└──────────────────────┴────────────┴────────┴──────┴──────────────────┘
```

#### 2.6.4 API-Endpoints

```
GET    /api/properties/:id/services                    → Leistungsverzeichnis eines Objekts
POST   /api/property-services                          → Leistung hinzufuegen
PUT    /api/property-services/:id                      → Leistung aendern
DELETE /api/property-services/:id                      → Leistung entfernen

GET    /api/due-services?week_start=2026-05-05         → Alle in KW faelligen Leistungen (fuer Plan-Generator)
```

---

### F07: Mehrfachbesuche pro Objekt

**Prioritaet:** MUST HAVE
**Quelle:** Transkript ("Ich bin dreimal in dem Objekt")

#### 2.7.1 Beschreibung

Ein Objekt kann in einer Woche mehrfach besucht werden — fuer verschiedene Taetigkeiten an verschiedenen
Tagen. Das ist KEIN Bug, sondern der Normalfall (Muelltonnen Mo raus, Di rein, Mi Treppenhaus).

#### 2.7.2 Technisches Design

Wird bereits durch das Datenmodell geloest: `PROPERTY_SERVICES` hat multiple Eintraege pro Property,
die zu verschiedenen `SCHEDULE_ENTRIES` fuehren. Kein zusaetzlicher Code noetig.

**Wichtig fuer UI:** In der Objekt-Ansicht des Wochenplans muessen alle Besuche klar sichtbar sein:

```
Objekt: Porzer Strasse 12 — KW 19
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│ Montag   │ Dienstag │ Mittwoch │ Donnerstag│ Freitag │
├──────────┼──────────┼──────────┼──────────┼──────────┤
│ 🟠Trepp  │ 🟣Muell  │ 🟣Muell  │ 🟣Muell  │ 🟣Muell  │
│ Daniel   │ raus     │ rein     │ raus     │ rein     │
│ 08:00    │ Daniel   │ Daniel   │ Daniel   │ Daniel   │
│          │ 06:00    │ 10:00    │ 06:00    │ 10:00    │
├──────────┤          │          │          │          │
│ 🟢Garten │          │          │          │          │
│ Daniel   │          │          │          │          │
│ 09:00    │          │          │          │          │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

#### 2.7.3 Tourenrelevanz

Mehrfachbesuche eroeffnen Optimierungspotenzial: Wenn Daniel am Montag eh in der Porzer Str. ist,
kann man die Dienstag-Muelltonne vielleicht auf Montag vorziehen (falls Abfuhr Dienstag ist).
→ Das ist Welle 2/3 Tourenoptimierung, hier nur Datenmodell-Readiness sicherstellen.

---

### F08: Kontingenz-/Vertretungsplan

**Prioritaet:** SHOULD HAVE (Aufbauend auf F04)
**Quelle:** Transkript ("In der Logistik gab es klare Contingency-Plaene... Haben wir nicht.")

#### 2.8.1 Beschreibung

Vordefinierte Vertretungsregeln: "Wenn Daniel ausfaellt, uebernimmt Anna die Objekte X, Y;
wenn Anna ausfaellt, uebernimmt Juergen die Objekte A, B."

#### 2.8.2 Datenmodell-Erweiterung

```sql
CREATE TABLE CONTINGENCY_RULES (
    ID                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    TENANT_ID         UUID NOT NULL REFERENCES TENANTS(ID),
    PRIMARY_EMPLOYEE_ID   UUID NOT NULL REFERENCES EMPLOYEES(ID), -- Wer faellt aus?
    BACKUP_EMPLOYEE_ID    UUID NOT NULL REFERENCES EMPLOYEES(ID), -- Wer springt ein?
    PROPERTY_ID       UUID REFERENCES PROPERTIES(ID),             -- Fuer welches Objekt? (NULL = alle)
    SERVICE_TYPE_ID   UUID REFERENCES SERVICE_TYPES(ID),          -- Fuer welche Taetigkeit? (NULL = alle)
    PRIORITY          INTEGER DEFAULT 1,                          -- 1 = erste Wahl, 2 = zweite Wahl
    NOTES             TEXT,
    IS_ACTIVE         BOOLEAN DEFAULT TRUE,
    CREATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    UPDATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    IS_DELETED        BOOLEAN DEFAULT FALSE,
    DELETED_AT        TIMESTAMPTZ
);
```

#### 2.8.3 Integration mit F04

Wenn KI-Vorschlaege (F04) generiert werden, werden zuerst die CONTINGENCY_RULES geprueft.
Nur wenn keine Regel greift (oder der Backup-Mitarbeiter selbst nicht verfuegbar ist),
springt der Scoring-Algorithmus ein.

```typescript
async function suggestReassignment(entry: ScheduleEntry): Promise<ReassignmentCandidate[]> {
  // 1. Contingency-Rules pruefen
  const rules = await getContingencyRules(entry.employee_id, entry.property_id, entry.service_type_id)
  const availableBackups = rules.filter(r => !isAbsent(r.backup_employee_id, entry.entry_date))

  if (availableBackups.length > 0) {
    return availableBackups.map(r => ({
      employee_id: r.backup_employee_id,
      score: 100, // Contingency-Rule = hoechste Prioritaet
      reasoning: `Vordefinierte Vertretung fuer ${entry.employee.display_name}`,
      method: 'CONTINGENCY_RULE'
    }))
  }

  // 2. Fallback: Scoring-Algorithmus aus F04
  return calculateAllCandidateScores(entry)
}
```

#### 2.8.4 UI

Unter "Einstellungen → Vertretungsplaene":

```
┌────────────────────────────────────────────────────────────────┐
│  Vertretungsplaene                          [+ Neue Regel]    │
├──────────────┬──────────────┬──────────────┬─────────────────┤
│ Wenn ... aus │ Dann ...     │ Fuer Objekt  │ Fuer Taetigkeit │
├──────────────┼──────────────┼──────────────┼─────────────────┤
│ Daniel K.    │ Anna S. (#1) │ Alle         │ Alle            │
│              │ Juergen (#2) │              │                 │
├──────────────┼──────────────┼──────────────┼─────────────────┤
│ Anna S.      │ Daniel K.(#1)│ Alle         │ Alle ausser     │
│              │              │              │ Winterdienst    │
├──────────────┼──────────────┼──────────────┼─────────────────┤
│ Anna S.      │ Juergen (#1) │ Alle         │ Winterdienst   │
└──────────────┴──────────────┴──────────────┴─────────────────┘
```

---

### F09: Zeiterfassung (Soll vs. Ist)

**Prioritaet:** SHOULD HAVE
**Quelle:** Berater-Ergaenzung ("Basis fuer statistische Werte" — im Transkript explizit gewuenscht)

#### 2.9.1 Beschreibung

Mitarbeiter checken ein/aus per Mobile App. Das System erfasst:
- Tatsaechliche Arbeitszeit pro Taetigkeit
- GPS-Position bei Check-in (Nachweis: "War vor Ort")
- Abweichung von Soll-Zeit

#### 2.9.2 Mobile UI (PWA)

```
┌──────────────────────────────┐
│  Mein Tagesplan — Mo 05.05.  │
├──────────────────────────────┤
│                              │
│  ✅ 08:00 Porzer Str. 12    │
│     🟠 Treppenhaus           │
│     Soll: 20min | Ist: 18min │
│     [Erledigt um 08:18]      │
│                              │
│  ▶️ 09:00 Porzer Str. 12     │
│     🟢 Gartenpflege          │
│     Soll: 45min              │
│     [Jetzt starten]          │
│                              │
│  ⏳ 10:30 Deutschlandstr. 7  │
│     🟠 Treppenhaus           │
│     Soll: 30min              │
│                              │
│  ⏳ 11:30 Lorweg 3           │
│     🟣 Muelltonnen raus      │
│     Soll: 10min              │
│                              │
└──────────────────────────────┘
```

**Interaktionen:**
- "Jetzt starten" → Check-in mit GPS, Timer laeuft
- "Fertig" → Check-out mit GPS, Ist-Zeit berechnet
- Optional: Notiz/Foto hinzufuegen ("Hecke konnte nicht geschnitten werden, zu nass")

#### 2.9.3 API-Endpoints

```
POST   /api/time-logs/check-in
  Body: { schedule_entry_id, lat?, lng? }

POST   /api/time-logs/check-out
  Body: { schedule_entry_id, lat?, lng?, notes?, duration_override_min? }

GET    /api/time-logs?employee_id=...&date_from=...&date_to=...
  Response: { logs: TimeLog[], summary: { total_planned_min, total_actual_min, deviation_min } }
```

#### 2.9.4 Auswertungen (Basis fuer BI)

Ueber die TIME_LOGS entstehen erstmals statistische Werte:
- Durchschnittliche Dauer pro Taetigkeitstyp pro Objekt
- Abweichung Soll/Ist → Erkennung: "Treppenhaus in Porzer Str. braucht immer 25min statt geplante 20min"
- Basis fuer bessere Kalkulation neuer Angebote
- Auslastungsreports pro Mitarbeiter/Woche/Monat

---

### F10: Mobile Ansicht fuer Mitarbeiter

**Prioritaet:** MUST HAVE
**Quelle:** Transkript ("App, die die Leute vor Ort auf ihrem Handy aufmachen")

#### 2.10.1 Beschreibung

Mitarbeiter sehen ihren persoenlichen Tagesplan auf dem Smartphone.
Kein Papier-Ausdruck mehr noetig. PWA = installierbar ohne App Store.

#### 2.10.2 PWA-Features

| Feature | Beschreibung |
|---------|-------------|
| Tagesplan | Wie F09 Mobile UI — chronologische Liste aller Aufgaben heute |
| Wochenplan | Vereinfachte Ansicht: "Meine Woche auf einen Blick" |
| Offline-Faehig | Service Worker cached den aktuellen Wochenplan — auch ohne Netz abrufbar |
| Push-Benachrichtigung | Neuer Plan veroeffentlicht / Plan geaendert / Neue Vertretungsaufgabe |
| Navigation | Button "Route starten" → oeffnet Google Maps mit Adresse des naechsten Objekts |
| Check-in/out | Zeiterfassung (F09) |
| Meldung | Einfaches Formular: "Problem am Objekt" → geht an Buero |

#### 2.10.3 Rollen-basierte Sichten

| Rolle | Sieht was |
|-------|----------|
| ADMIN / PLANER | Alle Mitarbeiter, alle Objekte, alle Funktionen |
| VORARBEITER | Eigenes Team, eigene Objekte, Umplanungsfunktion |
| MITARBEITER | Nur eigenen Plan, Check-in/out, Meldungen |
| HAUSVERWALTUNG | Nur eigene Objekte (readonly): Wann war wer da? |

---

### F11: Stundenplan-Export/Druck

**Prioritaet:** SHOULD HAVE
**Quelle:** Berater-Ergaenzung (Uebergangsphase fuer nicht-digitale Mitarbeiter)

#### 2.11.1 Beschreibung

PDF-Export des Wochenplans im gewohnten Papier-Format.
"Stundenplan wie in der Schule" — pro Mitarbeiter eine Seite.

#### 2.11.2 PDF-Layout

Orientiert sich am bestehenden Papierformat:
- Oben: Mitarbeitername, Datum (KW / Montag–Sonntag)
- Tabelle: Tage als Spalten, Zeitbloecke als Zeilen
- Farbkodierung beibehalten (Druckfreundliche Farben)
- Raum fuer handschriftliche Notizen (leere Zeile pro Tag)
- Footer: "Generiert am DD.MM.YYYY um HH:MM — Bei Aenderungen siehe App"

#### 2.11.3 API-Endpoint

```
GET /api/schedules/:id/export/pdf?employee_id=...
  → PDF-Download (einzelner Mitarbeiter)

GET /api/schedules/:id/export/pdf
  → PDF-Download (alle Mitarbeiter, mehrseitig)
```

---

## 3. KI-Integration — Zusammenfassung

| Feature | KI-Typ | Welle | Beschreibung |
|---------|--------|-------|-------------|
| Plan-Generierung aus Template | Regelbasiert | 1 | Frequenz-Engine prueft, was faellig ist |
| Vertretungsvorschlag | Scoring-Algorithmus | 2 | Kapazitaet × Naehe × Qualifikation × Fairness |
| Contingency-Regeln | Lookup | 2 | Vordefinierte Vertretungsketten zuerst |
| Begruendungs-Text | LLM (optional) | 3 | Natuerlichsprachig: "Daniel uebernimmt, weil..." |
| Soll-Zeit-Anpassung | Statistisch | 3 | Aus TIME_LOGS: "Treppenhaus braucht hier 25min, nicht 20min" |
| Optimierungsvorschlag | Algorithmus | 3 | "Wenn du Montag zuerst zum Lorweg faehrst, sparst du 12km" |
| Kapazitaetswarnung | Regel | 2 | "Nächste Woche hat keiner Kapazitaet fuer die Fensterreinigung" |

**Architektur-Prinzip:** KI ist ein SERVICE, kein Monolith. Alles funktioniert auch ohne KI.
Der Planer kann immer manuell arbeiten. KI liefert VORSCHLAEGE, keine Automatik.
Das ist bewusst so, weil: "Die menschliche Erfahrung ist einfach unbezahlbar." (Transkript)

---

## 4. Entwicklungsplan fuer Claude Code

### Wave 1 (MVP — Wochen 1–4)

**Ziel:** Robert kann Freitag den Wochenplan digital erstellen statt in Excel.

| Woche | Tasks |
|-------|-------|
| W1 | DB-Schema aufsetzen (alle Tabellen), Seed-Daten, RLS |
| W1 | Backend: CRUD fuer TENANTS, EMPLOYEES, SERVICE_TYPES |
| W2 | Backend: CRUD fuer PROPERTIES, PROPERTY_SERVICES |
| W2 | Frontend: Stammdaten-Verwaltung (einfache Tabellen + Formulare) |
| W3 | Backend: SCHEDULES + SCHEDULE_ENTRIES CRUD + Bulk-Create |
| W3 | Frontend: Wochenplan-Grid (Zeilen=Mitarbeiter, Spalten=Tage) |
| W4 | Frontend: Drag & Drop fuer Entries (Verschieben zwischen Mitarbeitern/Tagen) |
| W4 | Frontend: Mobile View (Tagesplan fuer Mitarbeiter) |

**Definition of Done Wave 1:**
- [ ] Planer kann Wochenplan erstellen mit Mitarbeitern, Objekten, Taetigkeiten
- [ ] Aufgaben koennen per Drag & Drop verschoben werden
- [ ] Mitarbeiter sehen ihren Tagesplan auf dem Handy
- [ ] PDF-Export funktioniert (fuer Papier-Uebergang)

### Wave 2 (Templates + Abwesenheit — Wochen 5–7)

| Woche | Tasks |
|-------|-------|
| W5 | Backend: SCHEDULE_TEMPLATES + TEMPLATE_ENTRIES CRUD |
| W5 | Backend: Frequenz-Engine (isServiceDueInWeek) |
| W5 | Backend: generateWeekFromTemplate Service |
| W6 | Frontend: Template-Editor (gleiche Grid-Ansicht) |
| W6 | Frontend: "Woche generieren" Button + Warnings |
| W7 | Backend: ABSENCE_RECORDS + betroffene Entries markieren |
| W7 | Frontend: Abwesenheits-Verwaltung + Umplanungs-Ansicht |

### Wave 3 (KI-Vorschlaege + Zeiterfassung — Wochen 8–10)

| Woche | Tasks |
|-------|-------|
| W8 | Backend: Scoring-Algorithmus fuer Vertretungsvorschlaege |
| W8 | Backend: CONTINGENCY_RULES + Integration |
| W9 | Frontend: KI-Vorschlagsansicht ("Daniel uebernimmt weil...") |
| W9 | Frontend: Accept/Reject/Modify Workflow |
| W10 | Backend: TIME_LOGS + Check-in/Check-out |
| W10 | Frontend: Mobile Check-in/out mit GPS |

---

## 5. Seed-Daten fuer Entwicklung

Basierend auf dem Transkript — realistische Testdaten:

```sql
-- Tenant
INSERT INTO TENANTS (ID, NAME, SLUG, BRAND) VALUES
  ('t1', 'Hausmeisterservice Gepard GmbH', 'gepard', 'GEPARD');

-- Mitarbeiter (aus Transkript)
INSERT INTO EMPLOYEES (ID, TENANT_ID, FIRST_NAME, LAST_NAME, DISPLAY_NAME, EMPLOYEE_TYPE, WEEKLY_HOURS) VALUES
  ('e1', 't1', 'Daniel',  'K.',     'Daniel K.',  'FULLTIME',      40),
  ('e2', 't1', 'Anna',    'S.',     'Anna S.',    'PARTTIME',      20),
  ('e3', 't1', 'Gabi',    'M.',     'Gabi M.',    'PARTTIME',      15), -- "geht in Teilzeit"
  ('e4', 't1', 'Juergen', 'SubU',   'Juergen',    'SUBCONTRACTOR', 30); -- Subunternehmer

-- Objekte (aus Transkript)
INSERT INTO PROPERTIES (ID, TENANT_ID, NAME, STREET, ZIP_CODE, CITY, UNIT_COUNT, FLOOR_COUNT, BRAND) VALUES
  ('p1', 't1', 'Porzer Strasse 12',     'Porzer Strasse',      '51143', 'Koeln', 12, 4, 'IMMOBILIENBUTLER'),
  ('p2', 't1', 'Deutschlandstrasse 7',  'Deutschlandstrasse',  '51149', 'Koeln',  4, 2, 'GEPARD'),
  ('p3', 't1', 'Lorweg 3',             'Lorweg',              '51147', 'Koeln',  8, 3, 'GEPARD'),
  ('p4', 't1', 'Hochhaus Am Park',     'Parkstrasse',         '51145', 'Koeln', 80, 12,'IMMOBILIENBUTLER');

-- Taetigkeitstypen (Farben aus Transkript)
INSERT INTO SERVICE_TYPES (ID, TENANT_ID, NAME, SHORT_NAME, CATEGORY, COLOR_CODE, DEFAULT_DURATION_MIN) VALUES
  ('st1', 't1', 'Treppenhaus Reinigung', 'Treppenhaus',  'CLEANING',    '#F97316', 30),
  ('st2', 't1', 'Gartenpflege',          'Garten',       'GARDEN',      '#22C55E', 60),
  ('st3', 't1', 'Hofflaechenpflege',     'Hof',          'CLEANING',    '#E5E7EB', 30),
  ('st4', 't1', 'Muelltonnen rausstellen','Muell raus',  'WASTE',       '#8B5CF6', 10),
  ('st5', 't1', 'Muelltonnen reinstellen','Muell rein',  'WASTE',       '#8B5CF6', 10),
  ('st6', 't1', 'Winterdienst',          'Winter',       'WINTER',      '#3B82F6', 45),
  ('st7', 't1', 'Fensterreinigung',      'Fenster',      'CLEANING',    '#F97316', 45),
  ('st8', 't1', 'Dachrinne reinigen',    'Dachrinne',    'MAINTENANCE', '#6B7280', 30);
```

---

## 6. Nicht-funktionale Anforderungen

| Anforderung | Ziel | Begruendung |
|-------------|------|-------------|
| Ladezeit Wochenplan | < 2 Sekunden | Robert will schnell arbeiten — "Dauert ein bisschen, ja" (Pain Point) |
| Offline Mobile | Tagesplan cached | Mitarbeiter im Keller ohne Empfang |
| Responsive | Mobile-First | 80% der Mitarbeiter-Nutzung ist mobil |
| Concurrent Access | Optimistic Locking | Robert und Daniel koennten gleichzeitig den Plan sehen/aendern |
| Browser-Support | Chrome, Safari (iOS), Samsung Internet | Praxis: Android-Smartphones + iPhones |
| Sprache | Deutsch (UI), Englisch (Code) | Wie im Coding Style Guide |
| Datenschutz | GPS nur bei Check-in/out, nicht permanent | DSGVO — "Grundstein legen" |
