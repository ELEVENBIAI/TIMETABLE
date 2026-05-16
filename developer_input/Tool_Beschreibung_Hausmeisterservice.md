# Tool-Beschreibung: Digitale Plattform Hausmeisterservice

**Kunde:** Hausmeisterservice Gepard / Immobilienbutler (Franchise-Aufbau)
**Quelle:** Erstgespräch 19.01.2026
**Erstellt:** 06.05.2026
**Status:** Anforderungsanalyse — Basis für Entwicklungsplan

---

## 1. Unternehmenskontext (aus Transkript)

**Struktur:**
- ~55 Hausverwaltungen als Kernkunden, dazu Einzeleigentümer und Wohngemeinschaften
- ~20 Personen (4 Büro, Rest Fläche/Subunternehmer)
- 3 Marken: Immobilienbutler (Premium), Hausmeisterservice Gepard (Standard), Objektservice Paul
- Wachstum: 5–10 neue Objekte/Jahr, 1–3 Verluste
- Vertragslaufzeiten: Minimum 2 Jahre, Ziel 5 Jahre

**Strategische Richtung:**
- Transformation zum Franchise-Modell ("McDonald's des Hausmeisterservice")
- Franchise-Lizenzierung bereits angemeldet, Verträge stehen
- Subunternehmer sollen zu Lizenznehmern werden
- Zentralisierung: Verträge, Akquise, Qualitätsprüfung, Audits, Equipment → Zentrale
- Lizenznehmer: Putzen, Kunde glücklich machen, Steuerberater, Geld zusammenhalten

**Zeithorizont (aus Transkript):**
- Q1/2026: Konzept fertig, Pilotstart mit 1–2 neuen Lizenznehmern
- Q2/2026: Pilot abschliessen, erste Erkenntnisse
- Q3/2026: Transfer Subunternehmer → Lizenznehmer
- Q4/2026: Konsolidierung (Winterdienst-Phase)
- 2027: Skalierung

---

## 2. Ist-Zustand — Pain Points (aus Transkript)

| # | Problem | Zitat/Kontext | Schwere |
|---|---------|--------------|---------|
| P1 | **Keine Stammdatenbank** — alles in Excel/Docs, jeder legt anders ab | "Sonntagmorgen mit M gross, der andere getrennt, der andere sagt Wochenende — und schon bist du tot" | KRITISCH |
| P2 | **Stundenpläne manuell** — Robert macht jeden Freitag Excel, druckt aus, handschriftliche Änderungen bei Krankheit | "Excel-Datei, die nur er macht... ausgedruckt und dann handschriftlich hingeschrieben und verschoben" | KRITISCH |
| P3 | **Keine Tourenoptimierung** — Routen nicht optimiert, hohe Spritkosten | "Wir müssen immer zu schnippeln... jedes Mal wieder auf Neue basteln" | HOCH |
| P4 | **Keine Contingency-Pläne** — kein Plan B bei Ausfällen | "In der Logistik gab es klare Contingency-Pläne... Haben wir nicht." | HOCH |
| P5 | **Keine statistischen Werte** — keine Auslastungsdaten, keine Kapazitätsübersicht | "Ich habe keinerlei statistische Werte. Einfach nichts." | HOCH |
| P6 | **Objekttagebücher auf Papier** — doppelt ausgedruckt, im Objekt aufgehängt | "Wird immer zweimal ausgedruckt, einmal die Mitarbeiter, dann Objektmappe" | MITTEL |
| P7 | **Notdienst-Telefon belastet Geschäftsführung** — mitten in der Nacht Anrufe für Nichtigkeiten | "Wie können wir den Notdienst loswerden" | MITTEL |
| P8 | **Kein Finanzreporting** — "seit Wochen versuchen wir einen regelmäßigen Finanzbericht zu kriegen" | Geschäftsführer macht Buchführung, Pläne, alles selbst | MITTEL |
| P9 | **Verschiedene Service-Levels nicht systematisiert** — Immobilienbutler vs. Gepard haben unterschiedliche Leistungsumfänge, aber kein System dafür | "Jeder Prozess wird drei verschiedene Variationen haben" | MITTEL |
| P10 | **Wissensverlust** — Franchise-Onboarding nicht skalierbar ohne digitale Wissensbasis | "Wenn der uns ausfällt, kannst du eigentlich abschliessen" | HOCH |

---

## 3. Funktionsbeschreibung — Priorisiert

### Legende Herkunft:
- 🎙️ = **Aus Transkript** (explizit vom Kunden gefordert/beschrieben)
- 🧠 = **Von Berater ergänzt** (logisch notwendig oder Best Practice)

### Legende Priorität:
- 🔴 MUST HAVE — Ohne das funktioniert das Franchise nicht
- 🟡 SHOULD HAVE — Deutlicher Mehrwert, aber nicht Tag-1-kritisch
- 🟢 NICE TO HAVE — Ausbaustufe, wenn Basis steht
- ⚪ SPIELEREI / LATER — Bewusst zurückstellen

---

### 3.1 Stammdaten & Objektverwaltung 🔴

| Feature | Prio | Quelle | Beschreibung |
|---------|------|--------|-------------|
| Objektdatenbank | 🔴 | 🎙️ | Zentrale DB aller Objekte mit: Adresse, Hausverwaltung, Wohneinheiten, Vertragsdetails, Ansprechpartner, Zugangsinformationen |
| Kundenhierarchie | 🔴 | 🎙️ | Hausverwaltung → Objekte → Wohneinheiten. Ein Verwalter hat viele Objekte, ein Objekt hat 1–80+ Einheiten |
| Vertragsverwaltung | 🔴 | 🎙️ | Leistungsverzeichnis pro Objekt, Vertragslaufzeit, Kündigungsfristen, Preise |
| Service-Level-Zuordnung | 🔴 | 🎙️ | Immobilienbutler vs. Gepard vs. Paul — unterschiedliche Leistungsumfänge pro Objekt |
| Leistungsverzeichnis digital | 🔴 | 🎙️ | Was wird gemacht? Frequenzen: wöchentlich, monatlich, quartalsweise, halbjährlich |
| Notfallfirmen-Datenbank | 🟡 | 🎙️ | Pro Objekt: Heizungsfirma, Sanitär, Elektriker etc. — "Nicht jedes Objekt hat die gleiche Heizungsfirma" |
| Schnellsuche | 🔴 | 🎙️ | "Wenn ich ans Telefon gehe und will schnell bei dem Kunden rein — Vertragssituation, was hat der beauftragt?" |
| Kapazitäts-Dashboard | 🟡 | 🎙️ | Auslastung pro Mitarbeiter/Lizenznehmer — "Habe ich überhaupt jemanden, der das machen kann?" |
| Mandantenfähigkeit | 🔴 | 🧠 | Multi-Tenant-Architektur von Anfang an — Zentrale sieht alles, Lizenznehmer nur eigene Daten |
| Equipment-Zuordnung pro Objekt | 🟡 | 🧠 | Welches Gerät wird wo gebraucht (Handrasenmäher vs. Fahrrasenmäher vs. Elektro) — relevant für Kalkulation |

---

### 3.2 Stundenplan & Einsatzplanung 🔴

| Feature | Prio | Quelle | Beschreibung |
|---------|------|--------|-------------|
| Digitaler Wochenplan | 🔴 | 🎙️ | Ersetzt Excel + Ausdruck. Pro Mitarbeiter: Tage → Objekte → Tätigkeiten. Farbkodierung (Orange=Treppenhaus, Grün=Garten, Weiss=Hof, etc.) |
| Wiederkehrende Pläne | 🔴 | 🎙️ | "Von der Idealwelt aus... ist es eigentlich immer der gleiche Plan" — Basis-Templates pro Woche |
| Drag & Drop Umplanung | 🔴 | 🎙️ | Bei Krankheit: Aufgaben visuell zwischen Mitarbeitern verschieben |
| Krankmeldung → Auto-Vorschlag | 🟡 | 🎙️🧠 | System erkennt: Mitarbeiter X fällt aus → schlägt Vertretung vor basierend auf Nähe, Kapazität, Qualifikation |
| Verschiedene Tätigkeitstypen | 🔴 | 🎙️ | Treppenhaus, Gartenpflege, Mülltonnen (raus/rein), Hoffläche, Winterdienst — mit unterschiedlichen Zeitansätzen |
| Frequenz-Management | 🔴 | 🎙️ | Objekt X: Treppenhaus wöchentlich, Fenster monatlich, Dachrinne halbjährlich — automatische Einplanung |
| Mehrfachbesuche pro Objekt | 🔴 | 🎙️ | "Ich bin dreimal in dem Objekt" — Montags Reinigung, Dienstags Mülltonne raus, Donnerstags Mülltonne rein |
| Kontingenz-/Vertretungsplan | 🟡 | 🎙️ | "Bei uns hiess das Contingency" — vordefinierte Plan-B-Szenarien. Mittelfristig: KI-gestützte Umplanung |
| Zeiterfassung (Soll vs. Ist) | 🟡 | 🧠 | Geplante vs. tatsächliche Zeit pro Tätigkeit — Basis für statistische Werte |
| Mobile Ansicht für Mitarbeiter | 🔴 | 🎙️ | Mitarbeiter sieht seinen Tagesplan auf dem Handy statt auf Papier |
| Stundenplan-Export/Druck | 🟡 | 🧠 | Übergangsphase: PDF-Export für Mitarbeiter ohne Smartphone-Affinität |

---

### 3.3 Tourenplanung & Routenoptimierung 🟡→🔴

| Feature | Prio | Quelle | Beschreibung |
|---------|------|--------|-------------|
| Routen-Visualisierung | 🟡 | 🎙️ | Tagesroute auf Karte darstellen — "Wir fahren hier an, haben einen Bogen und dann zurück" |
| Routenoptimierung | 🟡 | 🎙️ | Algorithmus schlägt effizienteste Reihenfolge vor — "KI sagt: eigentlich musst du so rumfahren" |
| Constraint-basierte Planung | 🟡 | 🎙️🧠 | Berücksichtigt: Müllabfuhr-Zeiten ("um 6 Uhr geleert" vs. "erst um 18 Uhr"), feste Termine, Zeitfenster |
| Umplanungs-Optimierung | 🟡 | 🎙️ | Bei Krankheit: Nicht nur WER übernimmt, sondern auch optimale Route für Vertretung |
| Fahrzeit/Spritkosten-Tracking | 🟢 | 🎙️ | "Wir haben Spritkosten, kannst du Flughafen mit betreiben" — Transparenz über Fahrkosten |
| Multi-Tag-Optimierung | 🟢 | 🧠 | Nicht nur Tagesroute, sondern Wochenplanung: Welche Objekte lassen sich an welchem Tag bündeln |

---

### 3.4 Digitales Objekttagebuch & Leistungsnachweis 🟡

| Feature | Prio | Quelle | Beschreibung |
|---------|------|--------|-------------|
| Digitale Leistungserfassung | 🟡 | 🎙️ | Mitarbeiter bestätigt: "Treppenhaus geputzt, Hof gefegt" — mit Zeitstempel und GPS |
| QR-Code am Objekt | 🟡 | 🎙️ | Mieter/Eigentümer scannen → sehen Leistungshistorie. "Haben wir schon überlegt" |
| Foto-Dokumentation | 🟡 | 🧠 | Vorher/Nachher-Fotos, Mangeldokumentation — Beweissicherung |
| Transparenz für Hausverwaltung | 🟡 | 🎙️ | Verwalter sehen: Was wurde wann erledigt — reduziert "Ihr wart gar nicht da"-Beschwerden |
| Bewohner-Meldungen | 🟢 | 🧠 | Mieter können über QR-Code/App Mängel melden — "Birne kaputt", "Heizung geht nicht" |
| Sondereigentum-Filter | 🟢 | 🎙️ | System erkennt: "Das ist Sondereigentum, bitte wenden Sie sich an die Hausverwaltung" |

---

### 3.5 Wissensdatenbank & FAQ 🟡

| Feature | Prio | Quelle | Beschreibung |
|---------|------|--------|-------------|
| Problem-Lösungs-Katalog | 🟡 | 🎙️ | "Heizung wird nicht warm" → Standardlösung. "Fassen Sie die Rohre an, nicht den Heizkörper" |
| Kategorie: Sondereigentum | 🟡 | 🎙️ | Klare Abgrenzung: Was macht der Hausmeister, was ist Sache des Eigentümers |
| Prozessbeschreibungen | 🟡 | 🎙️ | "Diese ganzen Prozesse erstmal beschreiben" — als Basis für Franchise-Handbuch |
| Service-Level-Definitionen | 🟡 | 🎙️ | Immobilienbutler: "geht mit dem Lappen über die Leisten" vs. Gepard: "putzt den Boden" |
| Erweiterbar durch Transkripte | 🟡 | 🎙️ | Mitarbeiter sprechen Wissen ein → KI extrahiert → Wissensbasis wächst |
| Video-Verlinkung | 🟢 | 🎙️ | Mentor Tools Integration / Video-Tutorials für häufige Probleme |

---

### 3.6 Voicebot / Telefonbot 🟡

| Feature | Prio | Quelle | Beschreibung |
|---------|------|--------|-------------|
| Marken-Erkennung | 🟡 | 🎙️ | Bot erkennt: Immobilienbutler oder Gepard — "Es klingelt anders, im Display angezeigt" |
| Notdienst-Triage | 🟡 | 🎙️ | Echte Notfälle (Wasserrohrbruch) → Notdienst-Firma. Nicht-Notfälle → FAQ/Rückruf |
| Erste-Hilfe-Anleitungen | 🟢 | 🎙️ | "Heizung kalt? Fassen Sie die Rohre an..." — Bot gibt Anleitung, bevor er weiterleitet |
| Objekt-Erkennung | 🟢 | 🎙️ | "In welchem Objekt sind Sie?" → Lookup Notfallfirmen, zuständiger Mitarbeiter |
| Generationen-Sensibilität | 🟡 | 🎙️ | "Wie alt sind Sie?" → Bei älteren Anrufern: Weiterleitung an Mensch statt Self-Service |
| Termin-Koordination | 🟢 | 🎙️ | "Heizungsfirma muss rein" → Bot prüft: Wann ist Mitarbeiter im Objekt? → schlägt Termin vor |
| Anruf-Protokollierung | 🟡 | 🧠 | Jeder Anruf wird erfasst — Thema, Lösung, Follow-up — Basis für Statistik |

---

### 3.7 Franchise-Management 🟡→🔴 (ab Q3/2026)

| Feature | Prio | Quelle | Beschreibung |
|---------|------|--------|-------------|
| Lizenznehmer-Portal | 🟡 | 🎙️ | Eigener Zugang: Meine Objekte, mein Stundenplan, meine Umsätze |
| Onboarding-Workflow | 🟡 | 🎙️ | Schritt-für-Schritt Einarbeitung neuer Lizenznehmer — "McDonald's: Du musst das Patty so machen" |
| Schulungsplattform | 🟢 | 🎙️ | Mentor Tools / Video-Kurse / QR-Codes im Buch |
| Audit-System | 🟡 | 🎙️ | Qualitätsprüfung durch Zentrale — Checklisten, Foto-Nachweis |
| Equipment-Leasing-Verwaltung | 🟢 | 🎙️ | Geräte, Putzmittel, Kleidung — "Bei uns leasen, auf dem Mob ist das Logo eingestickt" |
| Regionsschutz-Karte | 🟢 | 🎙️ | Visualisierung: Welcher Lizenznehmer hat welches Gebiet |
| Provisionsmodell | 🟢 | 🎙️ | Lizenznehmer tritt Objekte an Nachbar ab → passive Provision |
| Finanztransparenz | 🟡 | 🎙️ | Lizenznehmer sieht: Einnahmen, Gebühren, Leasingkosten — "Transparenz in der Kommunikation" |
| Mehrsprachigkeit | 🟢 | 🎙️ | "KI übersetzt in jede beliebige Sprache" — für internationale Mitarbeiter/Lizenznehmer |

---

### 3.8 Reporting & BI 🟡

| Feature | Prio | Quelle | Beschreibung |
|---------|------|--------|-------------|
| Auslastungsreport | 🟡 | 🎙️ | Wer ist wie ausgelastet? Wo sind Kapazitäten? |
| Lost-Sales-Tracking | 🟡 | 🎙️ | "Wie viele Objekte wir nicht nehmen konnten letztes Jahr" |
| Zeitverbrauch pro Tätigkeit | 🟡 | 🎙️ | Durchschnittswerte aufbauen: "Eine Etage = 5 Minuten" |
| Finanzübersicht | 🟡 | 🎙️ | Umsatz, Kosten, Marge pro Objekt/Lizenznehmer |
| Kalkulations-Grundlage | 🟡 | 🎙️ | "Welches Detail... individuelle Angebote schreiben" — datenbasierte Angebotskalkulation |
| Power BI Integration | 🟢 | 🎙️ | Microsoft-Welt bereits vorhanden (Office 365) |

---

### 3.9 EXPLIZIT RAUSLASSEN (aus Transkript + Berater-Einschätzung)

| Was | Warum | Quelle |
|-----|-------|--------|
| Gamification/Bonus-App | Interessante Idee, aber eigenes Produkt, nicht Teil der Kern-Plattform. "Nicht das, womit wir anfangen sollten" — wurde im Gespräch selbst relativiert | 🎙️ |
| Allgemeines CRM/Vertriebstool | Fokus auf Bestandsverwaltung, nicht auf Neuakquise-Prozess. Akquise läuft über persönliche Netzwerke | 🧠 |
| Content-Marketing-Automation | Social Media, Blog etc. — wichtig, aber anderes Tool, andere Baustelle | 🎙️🧠 |
| Rechnungsstellung | Lexware/DATEV existiert. Keine Eigenentwicklung. Schnittstelle reicht | 🧠 |
| Immobilienverkauf/-makler-Modul | "Sonderaufträge" — bleibt bewusst im Gepard, nicht im Franchise-System | 🎙️ |
| Bewohner-App (vollständig) | QR-Code-Ansicht reicht. Eigene Bewohner-App wäre Overengineering | 🧠 |
| HR/Lohnabrechnung | Wird extern gemacht (Steuerberater). Kein eigenes Modul nötig | 🧠 |
| Datenschutz-Vollausbau in Welle 1 | "Nachläufig betrachten, aber Grundstein legen" — korrekt im Gespräch erkannt | 🎙️ |

---

## 4. Marktvergleich: Hausmeisterapp.com & Alternativen

| Kriterium | Hausmeisterapp.com | HERO Software | Eigentwicklung (Ziel) |
|-----------|--------------------|---------------|----------------------|
| Objektverwaltung | ✅ Gut | ✅ Gut | ✅ Spezifisch für Franchise |
| Aufgabenplanung | ✅ Basis | ✅ Vorhanden | ✅ Mit Frequenz-Management |
| Stundenplan wie Schule | ❌ Nicht vorhanden | ❌ Nicht vorhanden | ✅ KERN-FEATURE |
| Tourenoptimierung | ❌ | ❌ | ✅ KERN-FEATURE |
| Contingency-Pläne | ❌ | ❌ | ✅ KERN-FEATURE |
| Multi-Brand (Immobilienbutler/Gepard) | ❌ | ❌ | ✅ Von Anfang an |
| Franchise-Management | ❌ | ❌ | ✅ KERN-FEATURE |
| Voicebot/Telefonbot | ❌ | ❌ | ✅ Geplant |
| Wissensdatenbank | ❌ | ❌ | ✅ Aufbau |
| Rechnungsstellung | ❌ (via Lexware) | ✅ Integriert | ❌ Bewusst raus |
| Mülltonnen-Kalender | ✅ ICS-Import | ❌ | ✅ Integriert in Planung |
| Schlüsselverwaltung (NFC) | ✅ | ❌ | 🟢 Später |
| Zeiterfassung mobil | ✅ | ✅ | ✅ |
| Preis | All-inclusive-Modell | Abo | Entwicklungskosten |

**Fazit Markt:** Die existierenden Tools decken die Standard-Objektverwaltung ab. Was NICHT existiert:
1. Stundenplan-Logik mit Drag&Drop-Umplanung und Contingency
2. Constraint-basierte Tourenoptimierung für Hausmeisterservice
3. Franchise-Management-Layer
4. Integration all dieser Teile in EIN System

Genau das hat der Kunde erkannt: *"Was wir hier entwickeln wollen, gibt es auf dem Markt auch noch nicht."*

---

## 5. Empfohlene Entwicklungswellen

### Welle 0: Fundament (SOFORT — parallel zu allem)
**Ziel:** Datengrundlage schaffen — "Gold in, Gold out"
- Stammdatenbank aufsetzen (Objekte, Kunden, Verträge, Mitarbeiter)
- Leistungsverzeichnisse digitalisieren (die Papier-Pläne abtippen/einsprechen)
- Problem-Lösungs-Katalog anfangen (Excel reicht erstmal)
- Prozesse dokumentieren (einsprechen → transkribieren → strukturieren)

**Warum zuerst:** Ohne saubere Daten kann kein weiteres Feature funktionieren. Das ist die absolute Grundlage, auf der alles aufbaut.

### Welle 1: Stundenplan Digital (KERN-MVP)
**Ziel:** Robert's Freitags-Excel ersetzen
- Digitaler Wochenplan mit Mitarbeiter-Zuordnung
- Wiederkehrende Templates (Basis-Woche)
- Farbkodierung nach Tätigkeitstyp
- Drag & Drop bei Krankheit/Umplanung
- Mobile Ansicht für Mitarbeiter
- PDF-Export als Fallback

**Warum:** Grösster unmittelbarer Schmerzpunkt. Robert verbringt unverhältnismässig viel Zeit damit. Befreit Geschäftsführung für strategische Arbeit.

### Welle 2: Tourenplanung & Leistungsnachweis
**Ziel:** Effizientere Routen, digitaler Tätigkeitsnachweis
- Routen auf Karte visualisieren
- Basis-Optimierung (Reihenfolge der Objekte)
- Digitale Leistungsbestätigung (Mitarbeiter checkt ab)
- QR-Code am Objekt für Mieter-Transparenz
- Zeiterfassung Soll vs. Ist

### Welle 3: Voicebot & Wissensdatenbank
**Ziel:** Telefon-Entlastung, Self-Service
- Voicebot für Notdienst-Triage
- Marken-Routing (Immobilienbutler vs. Gepard)
- FAQ-Anbindung (Wissensdatenbank)
- Anruf-Protokollierung

### Welle 4: Franchise-Plattform
**Ziel:** Skalierung des Geschäftsmodells
- Lizenznehmer-Portal mit eigener Sicht
- Onboarding-Workflow
- Audit-Checklisten
- Equipment-/Leasingverwaltung
- Finanztransparenz pro Lizenznehmer

### Welle 5: Intelligence & Optimierung
**Ziel:** KI-gestützte Entscheidungen
- Automatische Contingency-Vorschläge bei Ausfällen
- Predictive Kapazitätsplanung
- Kalkulationsassistent für Angebote
- Regionsoptimierung für Franchise-Gebiete

---

## 6. Technische Rahmenentscheidungen (Berater-Empfehlung 🧠)

Basierend auf den mitgelieferten Templates (Infrastructure Playbook, Coding Style Guide, Linear Template):

| Entscheidung | Empfehlung | Begründung |
|-------------|-----------|-----------|
| Architektur | Monolith mit klaren Layern | < 100k Nutzer, kein Microservice-Overhead |
| Multi-Tenancy | RLS von Tag 1 | Zentrale + Lizenznehmer = verschiedene Sichten auf gleiche Daten |
| Frontend | React + TypeScript + Tailwind (PWA) | Mobile Nutzung im Feld zwingend — PWA erlaubt Installation ohne App Store |
| Backend | Node.js + Fastify + TypeScript | Wie im Playbook vorgegeben |
| Datenbank | PostgreSQL 16+ | RLS, JSONB, UUID — Multi-Tenancy-ready |
| Auth | JWT mit Rollen | Admin (Zentrale), Lizenznehmer, Mitarbeiter, Hausverwaltung (readonly) |
| Hosting | Managed (Cloud) | "Nicht selbst betreiben" — klare Aussage im Gespräch |
| Voicebot | Externer Service (Retell.ai, Bland.ai o.ä.) | Eigenentwicklung unverhältnismässig — Integration über API |
| Routenoptimierung | Google Routes API oder OSRM | Bewährte Algorithmen, keine Eigenentwicklung |
| Microsoft-Integration | Office 365 / SharePoint vorhanden | Schnittstellen bedenken, kein Wechsel nötig |

---

## 7. Empfohlenes Vorgehen

### Phase 1: Spezifikation (2–3 Wochen)
- Welle 0 + Welle 1 im Detail ausarbeiten
- Datenmodell für Stammdaten entwerfen
- UI-Mockups für Stundenplan-View
- Entscheidung: Buy vs. Build für Teilkomponenten (z.B. Tourenplanung)
- Linear-Projekt aufsetzen mit Issues für Welle 1

### Phase 2: MVP Stundenplan (6–8 Wochen)
- Stammdaten-CRUD (Objekte, Mitarbeiter, Kunden)
- Stundenplan-Ansicht (Woche, pro Mitarbeiter)
- Templates für wiederkehrende Wochen
- Umplanung bei Krankheit
- Mobile View
- Pilotbetrieb mit 1–2 Mitarbeitern

### Phase 3: Iterate & Expand
- Feedback einarbeiten
- Welle 2 spezifizieren basierend auf realen Daten
- Tourenplanung nur starten, wenn Stundenplan-Daten > 4 Wochen vorhanden

### Prinzipien (aus Transkript bestätigt):
1. **"Erstmal standardisieren, dann skalieren"** — kein Chaos digitalisieren
2. **"80/20 Pareto"** — die 80% der Standardfälle zuerst
3. **"Fail fast"** — kleine Iterationen, schnelles Feedback
4. **"Grundstein richtig legen"** — Multi-Tenancy, sauberes Datenmodell von Anfang an
5. **"Kein Overengineering"** — "Wenn Excel reicht, dann Excel"

---

## 8. Offene Fragen für nächsten Schritt

1. **Datenerhebung Welle 0:** Wer digitalisiert die bestehenden Leistungsverzeichnisse? Kunde oder wir?
2. **Pilotgruppe:** Welche 2–3 Mitarbeiter testen das MVP zuerst?
3. **Hosting-Entscheidung:** Eigener Server beim IT-Dienstleister oder Cloud (Azure/Hetzner)?
4. **Voicebot-Timing:** Wirklich parallel zu Stundenplan oder erst nach MVP-Abschluss?
5. **Budget-Rahmen:** Grobe Einordnung für Welle 1 MVP — damit Erwartungen klar sind
6. **Bestehendes Material:** Gibt es Excel-Vorlagen der Stundenpläne als Datenbasis?
7. **Schnittstelle Hausverwaltungen:** Wollen/brauchen Verwalter einen eigenen Zugang von Anfang an?
