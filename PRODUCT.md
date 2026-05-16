# Timetable — Product Context

**Register:** product
**Status:** Entwurf (zur Verfeinerung via `/impeccable teach`)

> Diese Datei wird vom `impeccable`-Skill als Pflicht-Kontext gelesen. Wenn sie fehlt oder zu generisch ist, bleibt Design-Output beliebig. Jede Aussage hier soll konkret sein, nicht nett.

## Was das Produkt ist

**Timetable** ist die digitale Wochenplan-Plattform für Hausmeisterservices der Marken **Gepard**, **Immobilienbutler** und **Objektservice Paul** — drei Franchise-Marken eines Unternehmens, das gerade vom Inhaber-Betrieb zur Franchise-Lizenz transformiert. Die App ersetzt eine wöchentliche Excel-Tabelle, die der Geschäftsführer Robert jeden Freitag manuell pflegt und ausdruckt. Sie zeigt Mitarbeitern am Mobilgerät, was sie heute wo zu tun haben. Sie macht Vertretungen bei Krankheit zu einem 5-Minuten-Vorgang statt 3 Stunden Excel-Suchspiel.

## Users (zwei gleichwertige Primär-Personas)

### Robert — Planner (Desktop)

**Wer:** Geschäftsführer / Operativer Planer. Mitte 50, Branchenkenner, hat das Geschäft aufgebaut, kennt jedes Objekt und jeden Mitarbeiter persönlich. Lebt seit 15 Jahren in Excel. Misstrauisch gegenüber Software, die seine Erfahrung "wegoptimieren" will.

**Was er hier macht:**

- Freitags die kommende Woche planen (war: 3h Excel, wird: 30 min Review eines Vorschlags)
- Montagmorgen 6:30 Uhr Anrufe entgegennehmen: "Bin krank" → in unter 5 Minuten Vertretung organisieren
- Wochenplanung als Stammdaten-Master pflegen (neue Objekte, neue Mitarbeiter, Vertragsänderungen)
- Auslastung pro Mitarbeiter und Objekt im Blick behalten

**Wo / wann:** Büro-Desktop, 27"-Monitor, oft mit Telefon im Hintergrund, frühmorgens, Kaffee. Gelegentlich nachmittags mobil im Auto auf dem Tablet.

**Was er NICHT will:** Wizards, KI-Magic-Buttons, "Schau mal, was wir alles können"-Dashboards, Onboarding-Touren, animierte Pop-Ups, Material-Design-Cards mit großen Icons.

### Daniel — Mitarbeiter im Feld (Mobile)

**Wer:** Hausmeister/Reinigungskraft. Mittlere 30, technisch routiniert mit dem Smartphone (WhatsApp, Maps), aber kein App-Power-User. Spricht Deutsch nicht als Erstsprache (~30% des Teams). Arbeitet zwischen 4 und 8 Objekten pro Tag, oft draußen, oft schmutzige Hände, oft Sonne aufs Display.

**Was er hier macht:**

- Morgens Tagesplan checken: Welche Objekte, in welcher Reihenfolge, was genau ist dort zu tun?
- An der Adresse Check-in machen (später mit GPS / QR-Code)
- Aufgaben abhaken — Treppenhaus geputzt, Mülltonne raus
- Sich krankmelden, ohne durch Excel-Telefonate zu müssen
- Sondersituationen melden (Müllraum zu, Glasbruch entdeckt, kein Zugang)

**Wo / wann:** Smartphone in der Hand, oft im Stehen, oft mit Handschuhen, oft in der Sonne, oft schlechtes Netz. Manchmal Tablet im Auto. Nie Desktop.

**Was er NICHT will:** Lesetexte, mehrstufige Wizards, Pflicht-Pop-Ups, Modal-Bestätigungen "Wirklich abhaken?", Kleinschrift, dunkle Themes draußen.

## Tertiäre Personas (Wave 2+, hier nur als Constraint)

- **Property Manager (Hausverwaltung)**: bekommt einen Read-Only-Login zu "ihren" Objekten. Will sehen, was wann gemacht wurde. Reduziert "Ihr wart gar nicht da"-Streit.
- **Lizenznehmer (Franchise-Partner, Wave 4+)**: eigene Tenant-Sicht. Hauptsächlich Robert-Persona für die eigene Region.
- **Voicebot (Wave 3)**: kein User, aber ein API-Konsument der Notdienst-Logik.

## Produkt-Zweck (eine Sätze pro Welle)

| Welle   | Zweck                                                                         |
| ------- | ----------------------------------------------------------------------------- |
| 1 (MVP) | Robert's Freitag-Excel ersetzen. Daniel sieht seinen Tagesplan auf dem Handy. |
| 2       | Vertretungen automatisch vorschlagen. Routen sichtbar machen.                 |
| 3       | Telefon-Entlastung durch Voicebot, Wissensbasis im Self-Service.              |
| 4       | Franchise-Skalierung: Lizenznehmer-Portal, Onboarding-Workflows.              |
| 5       | KI-gestützte Kapazitätsplanung, Tourenoptimierung.                            |

## Brand

Drei Franchise-Marken eines Unternehmens, die nebeneinander stehen — der **gleiche Backend-Code** rendert für jeden Tenant in seiner Marken-Identität. Marken-Identität bedeutet hier: Logo, Primärfarbe, Schrift-Akzent, Tonalität in UI-Strings. NICHT: ein komplett anderes Layout pro Marke.

| Marke                         | Positionierung                                                               | Visueller Anker (Arbeitshypothese, zu verifizieren)                                                          |
| ----------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Hausmeisterservice Gepard** | Standard. Solide, schnell, zuverlässig. Wie ein Werkzeugkasten.              | Warm-Grau + ein erdiges Akzent (Ocker / Rost / sattes Grün). Sans-Serif, kompakt.                            |
| **Immobilienbutler**          | Premium. Diskret, ruhig, sorgfältig. Wie ein gut sitzendes Hemd.             | Tiefes Blau-Anthrazit + Champagner-Akzent. Mehr Whitespace, etwas größere Typografie. Hochwertiger Anstrich. |
| **Objektservice Paul**        | Pragmatisch. Niedrigschwellig, freundlich. Wie der Nachbar, der mit anpackt. | Hellere Palette, vielleicht Hand-Lettering im Logo. Etwas runder, etwas weicher.                             |

**Wichtig:** Die Marken-Theming-Slots sind im Design-System definiert (siehe `DESIGN.md`), die konkreten Werte sind je nach Marke nochmal zu schärfen — ggf. mit echten Brand Guidelines vom Kunden.

## Tone (für UI-Strings)

- **Direkt, nicht servil.** "Krankmelden" statt "Ich möchte mich gerne krankmelden". "Plan freigeben" statt "Möchten Sie den Plan freigeben?"
- **Du-Form** im Feld-Kontext (Daniel), **Sie-Form** im Verwaltungs-Kontext (Property Manager). Im Robert-Kontext darf das Tenant entscheiden — Default: Du. **Pro Tenant konfigurierbar** als Tenant-Setting (`locale.formality: 'du' | 'sie'`), nicht globalkonstant. Property-Manager-View bleibt immer Sie, unabhängig vom Tenant-Setting (Hausverwaltungen sind professioneller Kontext).
- **Konkret statt abstrakt.** "Treppenhaus, Hauptstr. 12" statt "Aufgabe in Objekt 1284". Real-world-Namen sind die User-Sprache.
- **Fehler menschlich, nicht juristisch.** "Diese Woche hat schon einen Plan — willst du den öffnen?" statt "409 DUPLICATE_WEEK: ein Plan für diese Kalenderwoche existiert bereits."
- **Mehrsprachig vom Tag 1.** i18n via i18next ist Pflicht (ADR-16). Default `en`, primäre Sprache `de`, weitere Sprachen für Mitarbeiter aus DE+ kommen später.

## Strategische Prinzipien

1. **"Erstmal standardisieren, dann skalieren"** — Aus dem Erstgespräch. Keine bunten Features bauen, solange das Stammdaten-Fundament dürftig ist. UI muss das Standard-Wochenrad erst exzellent können, dann erst Sonderfälle.
2. **80/20 Pareto** — Der Standardfall (eine fertige Wochenvorlage, kleine Anpassungen) soll in 3 Klicks gehen. Sonderfälle dürfen mehr Klicks brauchen.
3. **Fail fast** — Drag&Drop-Fehler sind sofort sichtbar (Status-Badge "Vertretung gebraucht") statt versteckt im Backend.
4. **Kein Overengineering** — "Wenn Excel reicht, dann Excel" (aus Erstgespräch). Wir bauen NICHT, was Robert nicht braucht.
5. **Mobile-First für Daniel, Desktop-First für Robert** — keine Kompromisse durch responsive Tricks. Beide Views sind eigenständig durchgestaltet, nicht "ein Layout, das sich beugt".
6. **DSGVO als Architektur, nicht als Banner.** Mitarbeiterdaten, GPS, Zeitmessung. Audit-Log ist Pflicht. Soft-Delete ist Pflicht. Lösch-Workflow ist Pflicht (ELE-187).

## Anti-References (so soll es NICHT aussehen)

> Eine konkrete Liste, was wir bewusst NICHT machen. Hilft dem Designer mehr als zehn positive Adjektive.

### Anti: SaaS-Hellblau-Bootstrap-Cliché

- Hellblauer Header, weiße Sidebar, blaue Buttons mit border-radius-8.
- "Welcome back, Robert!" + Smiley-Icon.
- 4-Spalten-Card-Grid mit Icon-oben + Heading + Untertext.
- Tooltips, die alles erklären.

### Anti: "Modern Dashboard"-Reflex

- Großes Hero mit fetter Zahl (z.B. "47 Aufgaben heute"), darunter 3 kleine Stat-Cards.
- Gradient-Hintergründe, Glassmorphism-Cards.
- Riesige animierte Donut-Charts auf der Startseite, die niemand braucht.

### Anti: ERP-System-Ästhetik

- Tabelle mit 23 Spalten und 4px-Schriften.
- Vier Dropdown-Menüs in einer Reihe.
- "Aktion" als Spalte mit drei Button-Icons.
- Verschachtelte Modals.

### Anti: Material-Design-Gehorsam

- Floating Action Button, der überall klebt.
- Card-Stacks mit Schatten.
- Pillenförmige Tabs in jeder Farbe der Brand-Palette.
- "Snackbar"-Toasts unten links für jede triviale Aktion.

### Anti: Konsum-App-Spielereien

- Bunte Konfetti-Animation bei "Aufgabe abgehakt".
- Streak-Counter ("Du hast 12 Tage in Folge fertig gemacht!").
- Avatar mit Bunny-Ohren.
- "Onboarding-Tour" mit 7 Schritten, die niemand liest.

## Anchor-References (so darf es aussehen)

Drei laute Anker als Richtung — wir kopieren nicht, wir lernen den Geist:

- **Linear** — Tastatur-zentriert, dichte Information, ruhige Farben, klare Hierarchie, kein "Welcome"-Geblubber. Für Robert sehr nah dran.
- **Things 3 (iPad/iOS)** — Aufgaben-Listen, die nicht wie ToDo-Apps aussehen. Whitespace mit Bedacht. Typografie macht die Arbeit. Für Daniel mobil ein guter Maßstab.
- **Stripe Dashboard** — Werkzeug-Charakter, ruhige Akzentfarbe, gut lesbare Tabellen, sparsame Icons. Für die Property-Manager-Sicht passt das.

## Kategorie-Reflex-Check (was wäre der Default — und was vermeiden wir)

| First-Order-Reflex (Kategorie)                                             | Vermeiden wir                                                            |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| "Hausmeister-Software → Grün, Werkzeug-Icons, Hammer-Logo"                 | Kein generisches Handwerker-Grün, keine Werkzeug-Icons als Dekoration.   |
| "B2B-Multi-Tenant → Microsoft-Blau, ribbons, Excel-mimikry"                | Keine Office-Anmutung. Wir sind nicht Outlook.                           |
| "Field-Worker-App → Bauarbeiter-Orange, dicke Buttons, fett angeschrieben" | Keine fake-rugged Optik. Daniel ist ein Profi, kein Bauarbeiter-Cartoon. |

| Second-Order-Reflex (Anti-Kategorie)                              | Vermeiden wir                                                                                     |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| "Hausmeister-Software, aber editorial → wie Vercel-Docs in Beige" | Nicht jeden Twist machen. Editorial darf nicht zur Pose werden.                                   |
| "Multi-Tenant, aber jeder Tenant ist Linear-Dunkel"               | Nein. Marken-Identität pro Tenant heißt: jeder Tenant darf sein Gesicht haben, nicht alle gleich. |

## Entschieden (für MVP-Pilot)

- [x] **Brand-Werte sind Hypothesen** (Gepard Ocker, Immobilienbutler Anthrazit, Paul Salbei). Werden vor Pilot mit echten Marken-Guidelines vom Kunden ersetzt. Tech-Setup steht unabhängig davon — Theme-Slot ist nur ein CSS-Variable-Wert.
- [x] **Pilot-Tenant: nur Gepard.** Immobilienbutler + Paul werden technisch im Multi-Tenant-Schema vorbereitet (gleicher Backend-Code, Tenant-Variable im JWT), aber UI-mäßig nicht ausgerollt im MVP. Reduziert Test-Aufwand auf eine Marken-Identität.
- [x] **Sie/Du-Form pro Tenant wählbar** als `locale.formality`-Setting. Default Gepard: Du.

## Offen (für spätere Klärung)

- [ ] Property-Manager-View: in MVP-Pilot dabei oder Wave 2?
- [ ] Voicebot-Auswirkungen aufs UI (Status-Badge "vom Voicebot übernommen"?) — kommt mit Wave 3.
- [ ] Print-Stylesheet (PDF-Export) für Robert als Fallback — eigene Token-Schicht?

## Verwandte Dokumente

- `DESIGN.md` — Color-Tokens, Typography, Spacing, Component-Inventar. **Liegt neben dieser Datei.**
- `ARCHITECTURE_DESIGN.md` — Technische Architektur, ADRs (besonders ADR-06 PWA, ADR-16 i18n).
- `developer_input/Tool_Beschreibung_Hausmeisterservice.md` — Erstgespräch-Transkript-Auswertung.
- `developer_input/FEATURE_SPEC_Stundenplan_Einsatzplanung.md` — F01-F11 Feature-Specs mit Wireframe-Mockups.
