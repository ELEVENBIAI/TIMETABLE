# Datenmodell-Erklaerung: Alle Entitaeten fuer die Stundenplan-Einsatzplanung

**Stand:** 2026-05-07
**Zweck:** Grundlage fuer Entwicklung mit Claude Code

---

## Uebersicht: 5 Schichten, 24 Entitaeten

Das Datenmodell ist in 5 logische Schichten organisiert.
Jede Schicht baut auf der darunter liegenden auf.

```
┌─────────────────────────────────────────────────────┐
│  SCHICHT 5: Ausfuehrung & Auswertung               │
│  TIME_LOGS, REASSIGNMENT_LOG                        │
├─────────────────────────────────────────────────────┤
│  SCHICHT 4: Planung & Disposition                   │
│  SCHEDULES, SCHEDULE_ENTRIES, SCHEDULE_TEMPLATES,   │
│  TEMPLATE_ENTRIES, ABSENCE_RECORDS,                 │
│  CONTINGENCY_RULES                                  │
├─────────────────────────────────────────────────────┤
│  SCHICHT 3: Was wird wo gemacht? (Leistungen)       │
│  PROPERTY_SERVICES, WASTE_SCHEDULES,                │
│  WASTE_BIN_TYPES                                    │
├─────────────────────────────────────────────────────┤
│  SCHICHT 2: Wer kann was? (Faehigkeiten)            │
│  EMPLOYEE_QUALIFICATIONS, EMPLOYEE_EQUIPMENT,       │
│  EMPLOYEE_AVAILABILITY, QUALIFICATION_TYPES,        │
│  EQUIPMENT_TYPES                                    │
├─────────────────────────────────────────────────────┤
│  SCHICHT 1: Grunddaten (Organisation)               │
│  TENANTS, EMPLOYEES, PROPERTIES, PROPERTY_MANAGERS, │
│  CONTRACTS, REGIONS, SERVICE_TYPES, PROPERTY_ZONES  │
└─────────────────────────────────────────────────────┘
```

---

## SCHICHT 1: Grunddaten — Wer, Wo, Was grundsaetzlich

### TENANTS (Mandanten)

**Warum:** Multi-Tenancy von Tag 1. Heute ist es EIN Unternehmen mit 3 Marken (Gepard, Immobilienbutler, Paul). Im Franchise wird JEDER Lizenznehmer ein eigener Tenant. Die Zentrale hat einen Super-Admin ueber alle Tenants.

**Fuer die KI:** Der Tenant bestimmt, welche Daten die KI sehen darf. Ein Lizenznehmer-Tenant sieht nur seine Objekte, seine Mitarbeiter, seine Plaene. Die Zentrale sieht alles.

| Feld | Zweck |
|------|-------|
| BRAND | "GEPARD", "IMMOBILIENBUTLER", "PAUL" — bestimmt Service-Level |
| TIMEZONE | Fuer korrekte Zeitberechnung (DE = "Europe/Berlin") |
| SETTINGS | JSONB fuer mandantenspezifische Konfiguration (z.B. Standard-Arbeitszeiten, Feiertage-Region) |

---

### EMPLOYEES (Mitarbeiter / Einsatzkraefte)

**Warum:** Die zentrale Ressource. Ohne Mitarbeiter-Stammdaten keine Planung.

**Fuer die KI:** Die KI muss wissen:
- Wie viele Stunden hat der Mitarbeiter pro Woche? (Kapazitaet)
- Wo wohnt er? (Startpunkt fuer Tourenberechnung)
- Welchen Typ hat er? (Minijobber vs. Vollzeit vs. Subunternehmer)

| Feld | Zweck | KI-Relevanz |
|------|-------|-------------|
| EMPLOYEE_TYPE | FULLTIME, PARTTIME, MINIJOB, SUBCONTRACTOR, FRANCHISEE | Kapazitaetsberechnung: Minijob max 538 EUR/Monat |
| WEEKLY_HOURS | Vertragsarbeitszeit | KI prueft: Hat der MA noch Kapazitaet fuer eine Vertretung? |
| HOME_LAT/LNG | Wohnort-Koordinaten | Startpunkt der Tagestour, Naehe-Berechnung bei Vertretung |
| COLOR_CODE | Hex-Farbe | Visuelle Zuordnung im Kalender |
| REGION_ID | Zugeordnete Region (FK) | KI schlaegt nur MA aus passender Region vor |

**Aus dem Transkript:**
- "15–20 Leute, davon 4 Buero, Rest Flaeche/Subunternehmer"
- "Lieber 5 Minijobber als 1 Vollzeitler — Flexibilitaet"
- "Daniel ist der Vorarbeiter draussen"

---

### PROPERTIES (Objekte)

**Warum:** DAS Kernobjekt des Geschaefts. Alles dreht sich um Objekte.

**Fuer die KI:** Die KI muss wissen:
- Wo liegt das Objekt? (Tourenoptimierung)
- Wie gross ist es? (Zeitkalkulation)
- Welche Marke? (Service-Level)

| Feld | Zweck | KI-Relevanz |
|------|-------|-------------|
| LAT/LNG | Geokoordinaten | Tourenoptimierung: Welche Objekte liegen nah beieinander? |
| UNIT_COUNT | Wohneinheiten (1–80+) | Zeitkalkulation: Mehr Einheiten = mehr Aufwand |
| FLOOR_COUNT | Etagen | Treppenhaus-Zeit: 5 Min × Etagen |
| GREEN_AREA_SQM | Rasenflaeche in qm | Gartenpflege-Zeit + Equipment-Entscheidung |
| PAVED_AREA_SQM | Pflasterflaeche in qm | Hofflaechenpflege-Zeit |
| BRAND | IMMOBILIENBUTLER / GEPARD / PAUL | Service-Level: Butler = Premium, Gepard = Standard |
| IS_BAIT_PROPERTY | Koederobjekt | Kalkulation: Mischkalkulation, nicht profitabel aber strategisch |
| ACCESS_INFO | Schluessel, Codes, Zugang | Mitarbeiter-Info: Wie komme ich rein? |
| PROPERTY_MANAGER_ID | Hausverwaltung | Kundenzuordnung |
| CONTRACT_ID | Vertrag | Vertragsbedingungen, Laufzeit |
| REGION_ID | Region | Gebietsschutz im Franchise |

**Aus dem Transkript:**
- "Ein Objekt kann eine Doppelhaushaelfte sein oder ein Hochhaus mit 80 Einheiten"
- "Koederobjekte — lohnen sich nicht, aber die Tuer zum Kunden ist auf"
- "Immobilienbutler geht mit dem Lappen ueber die Leisten, Gepard putzt den Boden"

---

### PROPERTY_ZONES (Bereiche innerhalb eines Objekts)

**Warum:** Ein grosses Objekt hat verschiedene Bereiche: Treppenhaus A, Treppenhaus B, Vorgarten, Hinterhof, Tiefgarage. Die Zeitkalkulation muss pro Zone funktionieren, nicht nur pro Objekt.

**Fuer die KI:** Ermoeglicht praezisere Zeitschaetzung. "Treppenhaus A hat 6 Etagen, Treppenhaus B nur 3 — verschiedene Zeiten."

| Feld | Zweck |
|------|-------|
| ZONE_TYPE | "STAIRCASE", "GARDEN_FRONT", "GARDEN_BACK", "COURTYARD", "GARAGE", "BASEMENT" |
| AREA_SQM | Flaeche der Zone |
| FLOOR_NUMBER | Bei Treppenhaeusern: Welches Treppenhaus, wie viele Etagen |

---

### PROPERTY_MANAGERS (Hausverwaltungen)

**Warum:** Die Kunden. Ein Verwalter hat viele Objekte, aber man bekommt nicht alle — "individuelle Angebote, erkämpft auf dem Markt."

**Fuer die KI:** Nicht direkt planungsrelevant, aber wichtig fuer:
- Kontakt bei Rueckfragen
- Vertragskontext (Was ist beauftragt?)
- Schnellsuche ("Wenn ich ans Telefon gehe und will schnell beim Kunden rein")

---

### CONTRACTS (Vertraege)

**Warum:** Vertraege bestimmen Laufzeit, Kuendigungsfrist, und Leistungsumfang. Ohne Vertragsdaten kann man nicht kalkulieren.

| Feld | Zweck |
|------|-------|
| CONTRACT_TYPE | "STANDARD", "PREMIUM", "FRANCHISE" |
| START_DATE / END_DATE | Laufzeit — "Minimum 2 Jahre, am liebsten 5" |
| NOTICE_PERIOD_MONTHS | Kuendigungsfrist |
| MONTHLY_VALUE | Monatlicher Vertragswert — fuer Umsatzreporting |
| SCOPE_DESCRIPTION | Leistungsbeschreibung im Freitext |

---

### REGIONS (Regionen / Gebiete)

**Warum:** Im Franchise bekommt jeder Lizenznehmer ein Gebiet ("Regionsschutz"). Auch heute schon: Mitarbeiter haben informelle Gebiete — "Daniel macht Koeln-Porz, Anna macht Koeln-Mitte."

**Fuer die KI:** Bei Vertretungsvorschlag: KI bevorzugt Mitarbeiter aus der gleichen Region (kuerzer Anfahrt).

| Feld | Zweck |
|------|-------|
| BOUNDARY_GEOJSON | GeoJSON-Polygon des Gebiets — fuer Kartenvisualisierung |
| ASSIGNED_EMPLOYEE_ID | Primaer zustaendiger Mitarbeiter/Lizenznehmer |

---

### SERVICE_TYPES (Taetigkeitsarten)

**Warum:** Stammdaten fuer alle moeglichen Taetigkeiten. Die Farbkodierung aus dem Transkript ("Orange = Treppenhaus, Gruen = Garten") wird hier definiert.

**Fuer die KI:** Die KI muss wissen:
- Welche Qualifikation braucht man? (WINTERDIENST → Fuehrerschein + Raeumfahrzeug)
- Wie lange dauert es standardmaessig? (Default, wird pro Objekt ueberschrieben)
- Welches Equipment braucht man?

| Feld | Zweck | KI-Relevanz |
|------|-------|-------------|
| CATEGORY | CLEANING, GARDEN, WASTE, WINTER, MAINTENANCE | Gruppierung und Filterung |
| COLOR_CODE | Hex-Farbe | UI-Darstellung im Stundenplan |
| DEFAULT_DURATION_MIN | Standard-Dauer | Ausgangswert fuer Zeitkalkulation |
| REQUIRED_QUALIFICATION_ID | Pflicht-Qualifikation | KI: Nur MA mit dieser Qualifikation vorschlagen |

---

## SCHICHT 2: Wer kann was? — Faehigkeiten & Verfuegbarkeit

### QUALIFICATION_TYPES (Qualifikationsarten)

**Warum:** Nicht jeder Mitarbeiter kann alles. Winterdienst erfordert Fuehrerschein + Raeumfahrzeug-Schulung. Gartenpflege mit Motorsaege erfordert Kettensaegen-Schein.

**Fuer die KI:** HARTER Ausschluss-Faktor. Wenn eine Taetigkeit eine Qualifikation erfordert und der MA sie nicht hat → Kandidat wird ausgeschlossen.

| Typ | Beispiel | Erfordert Nachweis |
|-----|----------|-------------------|
| WINTERDIENST | Raeumfahrzeug bedienen, Streupflicht kennen | Ja (Schulungsnachweis) |
| MOTORSAEGE | Kettensaegenarbeit | Ja (Kettensaegen-Schein) |
| HEBEBUEHNE | Arbeit auf Hebebuehne | Ja (Bedienungsausweis) |
| GEBAEUDEINIGUNG | Standard-Reinigung | Nein (Einarbeitung reicht) |
| PREMIUM_SERVICE | Immobilienbutler-Level | Nein (interne Schulung) |

---

### EMPLOYEE_QUALIFICATIONS (Mitarbeiter-Qualifikationen — M:N)

**Warum:** Separate Tabelle statt JSONB, weil: Qualifikationen haben Gueltigkeitsdaten (Zertifikate laufen ab) und Nachweise (Nummer).

**Fuer die KI:** Pruefung: Hat der MA die Qualifikation UND ist sie noch gueltig?

| Feld | Zweck |
|------|-------|
| VALID_UNTIL | Ablaufdatum des Zertifikats — KI warnt: "Daniels Winterdienst-Schulung laeuft am 30.11. ab" |
| CERTIFICATE_NUMBER | Nachweis-Nummer fuer Audits |

---

### EQUIPMENT_TYPES (Geraetearten)

**Warum:** "Du kannst Rasen maehen mit Handrasenmaeher, Elektro, Benzin oder Fahrrasenmaeher — und schon weisst du nicht mehr, was deine kalkulatorischen Bedingungen sind." (Transkript)

Die Geraeteart beeinflusst direkt die DAUER der Taetigkeit. 800qm Rasen:
- Handrasenmaeher: 120 Minuten
- Elektro: 60 Minuten
- Benzin: 45 Minuten
- Fahrrasenmaeher: 20 Minuten

**Fuer die KI:** Zeitkalkulation! Wenn die KI einen Plan erstellt, muss sie wissen: Welches Geraet hat der Mitarbeiter? → Davon abhaengig die Dauer.

| Feld | Zweck |
|------|-------|
| CATEGORY | "RASENMAEHER", "REINIGUNG", "WINTER", "GARTEN", "WERKZEUG" |
| HOURLY_RATE_FACTOR | Zeitfaktor: 1.0 = Standard, 0.5 = doppelt so schnell, 2.0 = doppelt so langsam |

**Beispiel-Daten:**

| Name | Kategorie | Faktor |
|------|----------|--------|
| Handrasenmaeher | RASENMAEHER | 2.0 |
| Elektro-Rasenmaeher | RASENMAEHER | 1.0 |
| Benzin-Rasenmaeher | RASENMAEHER | 0.8 |
| Fahrrasenmaeher | RASENMAEHER | 0.3 |
| Wischmopp-Guertel | REINIGUNG | 1.0 |
| Raeumfahrzeug | WINTER | 0.4 |
| Schneeschieber manuell | WINTER | 1.5 |
| Heckenschere elektrisch | GARTEN | 0.7 |
| Heckenschere manuell | GARTEN | 1.5 |

---

### EMPLOYEE_EQUIPMENT (Welcher MA hat welches Geraet)

**Warum:** MA Daniel hat einen Elektro-Rasenmaeher, MA Anna nur einen Handrasenmaeher. Das beeinflusst, wie lange dieselbe Aufgabe dauert.

**Fuer die KI:** Bei Vertretungsvorschlag: "Daniel hat den Fahrrasenmaeher → Er schafft die 800qm Rasen in 20 Min. Anna hat nur den Handmaeher → Sie braucht 120 Min. Daniel ist der bessere Kandidat fuer Gartenpflege-Vertretung."

---

### EMPLOYEE_AVAILABILITY (Regulaere Verfuegbarkeit)

**Warum:** Minijobber arbeiten nur bestimmte Tage/Stunden. "5 Minijobber, die nur ein paar Stunden arbeiten — die Planung ist ein groesserer Aufwand, aber Flexibilitaet ist der groessere Faktor." (Transkript)

**Fuer die KI:** HARTER Filter. Die KI darf einem MA keine Aufgabe zuweisen an einem Tag, an dem er nicht verfuegbar ist.

| Feld | Zweck |
|------|-------|
| DAY_OF_WEEK | 1=Mo, 2=Di, ... 7=So |
| AVAILABLE_FROM | Frueheste Startzeit (z.B. 07:00) |
| AVAILABLE_UNTIL | Spaeteste Endzeit (z.B. 14:00) |
| IS_AVAILABLE | False = Dieser Tag ist grundsaetzlich frei |

**Beispiel:** Minijobber Anna arbeitet Mo, Mi, Fr von 08:00–12:00.

```
DAY_OF_WEEK=1, AVAILABLE_FROM=08:00, AVAILABLE_UNTIL=12:00, IS_AVAILABLE=true
DAY_OF_WEEK=2, IS_AVAILABLE=false
DAY_OF_WEEK=3, AVAILABLE_FROM=08:00, AVAILABLE_UNTIL=12:00, IS_AVAILABLE=true
DAY_OF_WEEK=4, IS_AVAILABLE=false
DAY_OF_WEEK=5, AVAILABLE_FROM=08:00, AVAILABLE_UNTIL=12:00, IS_AVAILABLE=true
```

---

## SCHICHT 3: Was wird wo gemacht? — Leistungsverzeichnis

### PROPERTY_SERVICES (Leistungen pro Objekt)

**Warum:** DAS Herzstück. Hier wird festgelegt: Welche Taetigkeit wird an welchem Objekt in welcher Frequenz ausgefuehrt? Das ist das digitale Leistungsverzeichnis — ersetzt die ausgedruckten Papier-Plaene.

**Fuer die KI:** Wenn die KI einen Wochenplan generiert, geht sie durch ALLE PROPERTY_SERVICES und prueft: "Ist diese Leistung in dieser Kalenderwoche faellig?"

| Feld | Zweck | KI-Relevanz |
|------|-------|-------------|
| FREQUENCY | WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, BIANNUAL, ANNUAL, ON_DEMAND | Wann ist es faellig? |
| FREQUENCY_DETAIL | JSON mit exakten Tagen/Wochen | An welchem Tag genau? |
| ESTIMATED_DURATION_MIN | Geschaetzte Dauer FUER DIESES Objekt | Ueberschreibt den Default aus SERVICE_TYPES |
| TIME_WINDOW_START/END | Zeitfenster | Muelltonnen muessen VOR der Abfuhr raus |
| PRIORITY | 1=Kritisch, 2=Hoch, 3=Normal, 4=Niedrig | KI: Bei Ueberlastung zuerst Prio-1-Aufgaben sicherstellen |
| SEASONAL_START/END | Saison (Monat 1–12) | Winterdienst nur Nov–Maerz, Garten nur Apr–Okt |

**Beispiel FREQUENCY_DETAIL:**

```json
// Treppenhaus: Jeden Montag
{ "days_of_week": [1] }

// Muelltonnen raus: Dienstag und Donnerstag
{ "days_of_week": [2, 4] }

// Fenster: Erster Montag im Monat
{ "week_of_month": 1, "day_of_week": 1 }

// Dachrinne: April und Oktober
{ "months": [4, 10] }

// Alle 2 Wochen: Gerade Kalenderwochen
{ "even_weeks": true }
```

---

### WASTE_BIN_TYPES (Muelltonnen-Typen)

**Warum:** Verschiedene Tonnen haben verschiedene Abfuhrtage und -zeiten. "In der einen Strasse werden die Muelltonnen um 6 Uhr morgens geleert, in der anderen erst um 18 Uhr." (Transkript)

| Typ | Farbe | Typische Frequenz |
|-----|-------|------------------|
| Restmuell | Grau | Woechentlich oder 14-taegig |
| Papier | Blau | 14-taegig oder monatlich |
| Gelber Sack / Gelbe Tonne | Gelb | 14-taegig |
| Biomuell | Braun | Woechentlich |
| Glas | Gruen | Monatlich oder Container |
| Spermuell | — | Auf Anfrage |

---

### WASTE_SCHEDULES (Muellabfuhrplaene pro Objekt)

**Warum:** Das ist der komplexeste Teil der Planung. "Ich muss Dienstag hin, die Muelltonne raus, und Donnerstag hin, die Muelltonne reinstellen. Also ich bin dreimal in dem Objekt." (Transkript)

**KRITISCH fuer die KI:** Die KI muss die Muellabfuhr-Zeitfenster kennen, um korrekt zu planen:
- Restmuell wird Mittwoch um 06:00 geleert → Muelltonne muss Dienstag Abend oder Mittwoch frueh raus
- Nach der Leerung: Tonne muss wieder reingestellt werden → Spaeter am selben Tag oder am naechsten

| Feld | Zweck | KI-Relevanz |
|------|-------|-------------|
| COLLECTION_DAYS | JSON: Welche Tage/Wochen | An welchen Tagen kommt die Muellabfuhr? |
| COLLECTION_TIME | Uhrzeit der Leerung | Tonne muss VOR dieser Zeit draussen stehen |
| LATEST_PUT_OUT | Spaetester Zeitpunkt zum Rausstellen | z.B. 05:30 — HARTER Constraint fuer die KI |
| EARLIEST_TAKE_IN | Fruehester Zeitpunkt zum Reinstellen | z.B. COLLECTION_TIME + 2h |
| BIN_COUNT | Anzahl Tonnen dieses Typs | Zeitkalkulation: 4 Restmuelltonnen = 4× Weg |
| LOCATION_DESCRIPTION | Wo stehen die Tonnen? | "Hinterhof links, hinter der Garage" |

**Beispiel COLLECTION_DAYS:**

```json
// Restmuell: Jeden Mittwoch
{ "days_of_week": [3], "frequency": "WEEKLY" }

// Papier: Alle 2 Wochen Freitag, ungerade KW
{ "days_of_week": [5], "frequency": "BIWEEKLY", "odd_weeks": true }

// Gelbe Tonne: Alle 2 Wochen Montag, gerade KW
{ "days_of_week": [1], "frequency": "BIWEEKLY", "even_weeks": true }
```

**Wie die KI das nutzt:**

Wenn die KI fuer KW 20 (gerade Woche) einen Plan generiert:

1. Prueft WASTE_SCHEDULES fuer jedes Objekt
2. Restmuell = woechentlich Mi → Aufgabe "Muell raus" am Di oder Mi frueh, "Muell rein" am Mi nachmittags
3. Papier = ungerade KW → Nicht faellig in KW 20, ueberspringen
4. Gelbe Tonne = gerade KW Mo → Aufgabe "Muell raus" am Mo frueh, "Muell rein" am Mo nachmittags
5. Fuegt SCHEDULE_ENTRIES mit exakten Zeitfenstern ein
6. Prueft: Welcher MA ist an dem Tag eh in der Naehe? → Optimale Zuordnung

---

## SCHICHT 4: Planung & Disposition

### SCHEDULE_TEMPLATES (Basis-Wochenplaene)

**Warum:** "Von der Idealwelt aus... ist es eigentlich immer der gleiche Plan." (Transkript)
Templates sind die "perfekte Woche" ohne Krankheit, ohne Sonderauftraege. Davon leitet die KI jede konkrete Woche ab.

**Saisonale Templates:** Man braucht mindestens 2:
- Sommer-Template (Apr–Okt): Gartenpflege aktiv, kein Winterdienst
- Winter-Template (Nov–Maerz): Winterdienst aktiv, keine Gartenpflege

---

### TEMPLATE_ENTRIES (Einzelne Eintraege im Template)

**Warum:** Jede Zeile = "Mitarbeiter X macht am Wochentag Y bei Objekt Z die Taetigkeit W." Das ist die gleiche Struktur wie SCHEDULE_ENTRIES, aber ohne konkretes Datum.

---

### SCHEDULES (Konkrete Wochenplaene)

**Warum:** Pro Kalenderwoche EIN Plan. Status-Workflow: DRAFT → PUBLISHED → ARCHIVED.

| Feld | KI-Relevanz |
|------|-------------|
| GENERATION_METHOD | "MANUAL", "FROM_TEMPLATE", "AI_GENERATED", "AI_ADJUSTED" — Nachvollziehbarkeit |
| TEMPLATE_ID | Von welchem Template abgeleitet? |
| STATUS | Nur DRAFT-Plaene duerfen veraendert werden |

---

### SCHEDULE_ENTRIES (Einzelne Planeintraege)

**Warum:** DAS zentrale Datenobjekt. Jede Zeile = eine konkrete Aufgabe fuer einen konkreten Tag.

**Fuer die KI:** Alles kommt hier zusammen:
- WER (EMPLOYEE_ID)
- WANN (ENTRY_DATE + START_TIME)
- WO (PROPERTY_ID)
- WAS (SERVICE_TYPE_ID)
- WIE LANGE (DURATION_MIN)
- WOHER (PROPERTY_SERVICE_ID — aus dem Leistungsverzeichnis)
- STATUS (PLANNED, IN_PROGRESS, COMPLETED, SKIPPED, REASSIGNED)
- VERTRETUNG? (IS_FROM_REASSIGNMENT, ORIGINAL_EMPLOYEE_ID)

---

### ABSENCE_RECORDS (Abwesenheiten)

**Warum:** Trigger fuer Umplanung. Wenn eine Abwesenheit erfasst wird, markiert das System automatisch alle betroffenen SCHEDULE_ENTRIES.

| Feld | KI-Relevanz |
|------|-------------|
| IS_HANDLED | False = Umplanung steht noch aus → KI zeigt Warnung |
| ABSENCE_TYPE | SICK vs. VACATION: Urlaub ist vorhersehbar (Template-Generierung beruecksichtigt), Krankheit nicht |

---

### CONTINGENCY_RULES (Vertretungsregeln)

**Warum:** "In der Logistik gab es klare Contingency-Plaene. Haben wir nicht." (Transkript)
Vordefinierte Vertretungsketten: "Wenn Daniel ausfaellt → Anna fuer Treppenhaeuser, Juergen fuer Winterdienst."

**Fuer die KI:** CONTINGENCY_RULES werden VOR dem Scoring-Algorithmus geprueft. Wenn eine Regel greift, schlaegt die KI den vordefinierten Backup vor. Nur wenn kein Backup verfuegbar ist, springt der Algorithmus ein.

---

## SCHICHT 5: Ausfuehrung & Auswertung

### TIME_LOGS (Ist-Zeiterfassung)

**Warum:** "Ich habe keinerlei statistische Werte. Einfach nichts." (Transkript)
TIME_LOGS liefern erstmals echte Daten: Wie lange dauert eine Taetigkeit WIRKLICH?

**Fuer die KI (langfristig):**
- Soll-Ist-Vergleich: "Treppenhaus Porzer Str. braucht immer 25min statt geplante 20min" → KI passt ESTIMATED_DURATION_MIN automatisch an
- Auslastungsanalyse: "Daniel ist im Schnitt 110% ausgelastet" → KI warnt vor Ueberlastung
- Kalkulationsbasis: "Fuer ein Hochhaus mit 12 Etagen brauchen wir durchschnittlich 55 Minuten Treppenhaus"

---

### REASSIGNMENT_LOG (Umplanungs-Protokoll)

**Warum:** Lerneffekt. Die KI lernt aus vergangenen Umplanungen:
- Welche Vorschlaege wurden akzeptiert? (WAS_ACCEPTED)
- Welche abgelehnt? → Warum? → Scoring-Gewichte anpassen

| Feld | Zweck |
|------|-------|
| METHOD | "MANUAL", "AI_SUGGESTED", "AI_AUTO" — War es ein KI-Vorschlag? |
| AI_CONFIDENCE | 0.00–1.00 — Wie sicher war die KI? |
| AI_REASONING | Freitext-Begruendung: "Daniel hat 4h frei, ist 2km entfernt, kennt das Objekt" |
| WAS_ACCEPTED | Boolean — Wurde der Vorschlag umgesetzt? |

---

## Wie die KI das alles zusammenfuehrt

### Szenario 1: Wochenplan generieren (Freitag fuer naechste Woche)

```
1. Lade SCHEDULE_TEMPLATE (aktives Template fuer aktuelle Saison)
2. Lade TEMPLATE_ENTRIES → Basis-Aufgaben
3. Fuer jede TEMPLATE_ENTRY:
   a. Pruefe PROPERTY_SERVICES: Ist die Frequenz in dieser KW faellig?
   b. Pruefe WASTE_SCHEDULES: Gibt es Muellabfuhr-Aufgaben in dieser KW?
   c. Pruefe ABSENCE_RECORDS: Hat der zugewiesene MA Urlaub?
   d. Pruefe EMPLOYEE_AVAILABILITY: Ist der MA an dem Tag ueberhaupt verfuegbar?
4. Erzeuge SCHEDULE_ENTRIES:
   - Faellige Aufgaben → PLANNED
   - MA im Urlaub → REASSIGNMENT_NEEDED
   - Muellabfuhr-Aufgaben mit korrekten Zeitfenstern einfuegen
5. Berechne Auslastung pro MA (Summe DURATION_MIN vs. WEEKLY_HOURS)
6. Generiere Warnings:
   - "Anna hat 24h eingeplant bei 20h Vertrag"
   - "Winterdienst-Schulung von Juergen laeuft am 30.11. ab"
   - "Keine Vertretung fuer Daniels Dienstag definiert"
```

### Szenario 2: Krankmeldung am Montag Morgen

```
1. ABSENCE_RECORD wird angelegt (SICK, heute)
2. System findet alle SCHEDULE_ENTRIES fuer Daniel diese Woche → 12 Aufgaben
3. Fuer jede Aufgabe:
   a. Pruefe CONTINGENCY_RULES: Gibt es eine vordefinierte Vertretung?
      → Ja: Schlage den Backup vor (Score = 100)
      → Nein: Weiter zu Scoring
   b. Scoring-Algorithmus:
      - Lade alle EMPLOYEES mit IS_ACTIVE = true
      - Filtere: EMPLOYEE_AVAILABILITY am betroffenen Tag?
      - Filtere: EMPLOYEE_QUALIFICATIONS fuer die Taetigkeit?
      - Filtere: EMPLOYEE_EQUIPMENT fuer die Taetigkeit? (z.B. Fahrrasenmaeher fuer 800qm)
      - Score: Kapazitaet × Naehe × Qualifikation × Equipment × Objekt-Erfahrung × Fairness
   c. Ergebnis: Top-3 Kandidaten mit Score und Begruendung
4. Sonder-Logik fuer Muelltonnen:
   - Muelltonnen-Rausstellen hat HARTE Deadline (LATEST_PUT_OUT)
   - Wenn kein MA verfuegbar → Aufgabe NICHT verschiebbar → WARNUNG an Planer
5. Sonder-Logik fuer verschiebbare Aufgaben:
   - Fensterreinigung (monatlich, Prio 4) → Kann auf naechste Woche verschoben werden
   - System schlaegt vor: "Fensterreinigung Deutschlandstr. auf KW 21 verschieben?"
```

### Szenario 3: KI-Lerneffekt (nach 3 Monaten Betrieb)

```
1. Analysiere TIME_LOGS:
   - Durchschnittliche Ist-Dauer pro SERVICE_TYPE pro PROPERTY
   - Vergleiche mit ESTIMATED_DURATION_MIN in PROPERTY_SERVICES
2. Vorschlaege:
   - "Treppenhaus Porzer Str.: Durchschnitt 25min statt geplante 20min → Anpassen?"
   - "Gartenpflege Hochhaus Am Park: Durchschnitt 35min statt geplante 60min → Effizienter als gedacht"
3. Analysiere REASSIGNMENT_LOG:
   - Welche KI-Vorschlaege wurden abgelehnt?
   - Muster: "Juergen wird nie fuer Immobilienbutler-Objekte akzeptiert"
   - → KI lernt: Juergen-Score fuer BRAND=IMMOBILIENBUTLER reduzieren
4. Analysiere Touren:
   - CHECK_IN-Zeiten vs. geplante Reihenfolge
   - "Daniel faehrt immer zuerst zum Lorweg, obwohl Porzer Str. naeher liegt"
   - → Moeglicherweise gibt es einen praktischen Grund (Parkplatz, Stau)
   - → KI fragt: "Soll die Route angepasst werden?"
```

---

## Zusammenfassung: Was braucht die KI an Daten?

| KI-Funktion | Braucht Daten aus |
|-------------|------------------|
| Wochenplan generieren | SCHEDULE_TEMPLATES, TEMPLATE_ENTRIES, PROPERTY_SERVICES, WASTE_SCHEDULES, ABSENCE_RECORDS, EMPLOYEE_AVAILABILITY |
| Faelligkeits-Pruefung | PROPERTY_SERVICES (FREQUENCY, FREQUENCY_DETAIL, SEASONAL_*), WASTE_SCHEDULES (COLLECTION_DAYS) |
| Vertretungs-Vorschlag | EMPLOYEES, EMPLOYEE_QUALIFICATIONS, EMPLOYEE_EQUIPMENT, EMPLOYEE_AVAILABILITY, CONTINGENCY_RULES, SCHEDULE_ENTRIES (aktuelle Auslastung), PROPERTIES (LAT/LNG) |
| Zeitkalkulation | SERVICE_TYPES (DEFAULT_DURATION), PROPERTY_SERVICES (ESTIMATED_DURATION), EQUIPMENT_TYPES (HOURLY_RATE_FACTOR), EMPLOYEE_EQUIPMENT, PROPERTIES (FLOOR_COUNT, GREEN_AREA_SQM) |
| Tourenoptimierung | PROPERTIES (LAT/LNG), EMPLOYEES (HOME_LAT/LNG), SCHEDULE_ENTRIES (Tagesplan), WASTE_SCHEDULES (Zeitfenster) |
| Soll-Ist-Anpassung | TIME_LOGS, PROPERTY_SERVICES, SCHEDULE_ENTRIES |
| Lern-Feedback | REASSIGNMENT_LOG (WAS_ACCEPTED, AI_CONFIDENCE) |
