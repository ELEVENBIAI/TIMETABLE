---
name: Timetable
description: Wochenplan-Plattform für Hausmeisterservice, Multi-Tenant mit Marken-Theming (Gepard, Immobilienbutler, Paul).
colors:
  # Tenant-agnostische Neutrale (Produkt-Chrome)
  ink: '#0f1419'
  surface: '#ffffff'
  surface-raised: '#fafaf8'
  surface-sunken: '#f4f3f0'
  border: '#e6e3dc'
  text-primary: '#0f1419'
  text-secondary: '#5b5d61'
  text-muted: '#8d8f93'
  # Tenant-Akzent — wird pro Marke via CSS-Variable überschrieben
  brand-primary: '#1f2937' # Placeholder: Gepard-Hypothese (Ocker → muss vom Kunden bestätigt werden)
  brand-primary-hover: '#111827'
  brand-on-primary: '#ffffff'
  # Semantik (zustands- und statusbezogen, tenant-unabhängig)
  status-planned: '#5b5d61'
  status-progress: '#0369a1'
  status-completed: '#15803d'
  status-needs-reassign: '#b45309'
  status-conflict: '#b91c1c'
typography:
  display:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 'clamp(1.75rem, 3vw, 2.25rem)'
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: '-0.01em'
  headline:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: '1.25rem'
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: '-0.005em'
  title:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: '0'
  body:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: '0.9375rem'
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: '0'
  body-mobile:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: '0'
  label:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: '0.8125rem'
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: '0.01em'
  numeric:
    fontFamily: 'JetBrains Mono, ui-monospace, monospace'
    fontSize: '0.875rem'
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: '0'
rounded:
  none: '0px'
  sm: '4px'
  md: '8px'
  lg: '12px'
  full: '9999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '24px'
  2xl: '32px'
  3xl: '48px'
components:
  button-primary:
    backgroundColor: '{colors.brand-primary}'
    textColor: '{colors.brand-on-primary}'
    rounded: '{rounded.md}'
    padding: '8px 16px'
    typography: '{typography.label}'
  button-primary-hover:
    backgroundColor: '{colors.brand-primary-hover}'
    textColor: '{colors.brand-on-primary}'
    rounded: '{rounded.md}'
    padding: '8px 16px'
  button-secondary:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text-primary}'
    rounded: '{rounded.md}'
    padding: '8px 16px'
  card-default:
    backgroundColor: '{colors.surface-raised}'
    textColor: '{colors.text-primary}'
    rounded: '{rounded.md}'
    padding: '16px'
  input-default:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text-primary}'
    rounded: '{rounded.sm}'
    padding: '8px 12px'
    typography: '{typography.body}'
  badge-status:
    rounded: '{rounded.full}'
    padding: '2px 8px'
    typography: '{typography.label}'
  entry-card-mobile:
    backgroundColor: '{colors.surface-raised}'
    textColor: '{colors.text-primary}'
    rounded: '{rounded.md}'
    padding: '12px'
    typography: '{typography.body-mobile}'
---

<!-- SEED — pre-implementation. Re-run /impeccable document in scan mode once Tailwind config + components exist (nach ELE-199). -->

## Overview

Timetable hat zwei Render-Modi für **denselben** Code: **Desktop (Robert, Planner)** und **Mobile (Daniel, Feld)**. Beide sind eigenständig gestaltet — kein Responsive-Trick, kein Hamburger-Workaround. Das Design-System trägt diesen Dualismus durch konsequente Token-Trennung (`body` vs. `body-mobile`, Padding-Skala, Touch-Target ≥ 44px).

**Multi-Tenant-Theming** ist Architektur, nicht Skin: `--color-brand-primary` und `--color-brand-on-primary` sind CSS-Variablen, die per Tenant via Root-Selector überschrieben werden. Die Marken **Gepard**, **Immobilienbutler** und **Objektservice Paul** stellen unterschiedliche Werte für genau diese Slots; das Layout und die Komponenten-Struktur bleiben identisch.

**MVP-Pilot-Scope: nur Gepard.** Der Theme-Override-Mechanismus wird im Bootstrap (ELE-199) angelegt, alle drei Marken-Theme-Files (`themes/gepard.css`, `themes/immobilienbutler.css`, `themes/paul.css`) werden gescaffolded — aber nur Gepard wird im Pilot ausgeliefert und getestet. Immobilienbutler + Paul bleiben Hypothesen-Werte und werden erst aktiviert, wenn echte Brand-Guidelines vom Kunden vorliegen. Tech-Setup ist identisch für alle drei.

**Spacing-Rhythmus statt Material-Card-Grid.** Wir variieren bewusst zwischen 8/12/16/24-Schritten und vermeiden den Reflex, alles in gleich-padded Cards zu wickeln. Wochenplan-Grid hat eigene Rhythmus-Regeln (Stunden-Spalten, Zeilen-Höhen), die in `reference/layout.md` per impeccable nachgeschärft werden.

**Theme: hell.** Begründung als Scene-Sentence: _"Robert sitzt um 7:00 Uhr morgens am 27-Zoll-Monitor in einem hellen Büro, draußen graut der Tag, Kaffee steht daneben. Daniel hält das Handy in der Sonne und kann den Bildschirm gerade noch lesen."_ Beide Szenen verlangen helle Themes mit hohem Kontrast — dunkles Theme wäre eine Pose. Dark-Mode-Switch ist explizit out-of-scope für MVP.

## Colors

### Strategie: **Restrained**

Neutrale tragen 90% der Oberfläche. Genau ein Akzent (`brand-primary`) trägt die Marken-Identität auf 5–10% der Oberfläche (CTAs, aktive Zustände, Marken-Header). Status-Farben (Plan-Status) sind funktional, nicht dekorativ — sie dürfen nicht mit dem Brand-Akzent kollidieren.

### Token-Hierarchie

```
Primitives          →  Semantische Tokens    →  Component-Tokens
(direkte Hex-Werte)    (--color-text-primary)    (button-primary.backgroundColor)
```

Tenant-Themes überschreiben **nur** den Semantic-Layer, nie Primitives.

### Neutrale (tenant-agnostisch)

| Token                    | Hex       | Verwendung                                                 |
| ------------------------ | --------- | ---------------------------------------------------------- |
| `--color-ink`            | `#0f1419` | Reiner Text (selten — meist `text-primary` nutzen)         |
| `--color-surface`        | `#ffffff` | Primäre Hintergrundfläche (Cards, Inputs)                  |
| `--color-surface-raised` | `#fafaf8` | Leicht angehoben (Wochenplan-Zelle, Entry-Card)            |
| `--color-surface-sunken` | `#f4f3f0` | Eingelassene Bereiche (Side-Panel)                         |
| `--color-border`         | `#e6e3dc` | 1px Trennlinien, niemals als dekorativer Border-Left/Right |
| `--color-text-primary`   | `#0f1419` | Standardtext                                               |
| `--color-text-secondary` | `#5b5d61` | Beschriftungen, Captions, Meta-Infos                       |
| `--color-text-muted`     | `#8d8f93` | Placeholder, deaktivierte Zustände                         |

Alle Neutralen sind warm getönt (chroma 0.005–0.01 Richtung Sand/Stein), niemals reines `#000` oder `#fff`. Format: hex sRGB für Stitch-Kompatibilität. OKLCH-Werte stehen als Kommentar im Tailwind-Config (folgt mit ELE-199).

### Brand-Akzent (per Tenant überschrieben)

| Token                         | Gepard (Pilot, aktiv)            | Immobilienbutler (scaffold)               | Paul (scaffold)                        |
| ----------------------------- | -------------------------------- | ----------------------------------------- | -------------------------------------- |
| `--color-brand-primary`       | `#7c5e3b` (Ocker, **Hypothese**) | `#1e293b` (Anthrazit-Blau, **Hypothese**) | `#5e8d6e` (Salbei-Grün, **Hypothese**) |
| `--color-brand-primary-hover` | `#5d4528`                        | `#0f172a`                                 | `#476f55`                              |
| `--color-brand-on-primary`    | `#ffffff`                        | `#ffffff`                                 | `#ffffff`                              |

**Pilot-Scope:** Im MVP-Pilot läuft nur Gepard. Immobilienbutler + Paul sind als Theme-Files scaffolded, aber nicht ausgerollt — bleiben Hypothesen bis echte Brand-Guidelines vorliegen. Implementation: `frontend/src/styles/themes/{gepard,immobilienbutler,paul}.css` (mit ELE-199).

### Status-Farben (funktional)

| Token                           | Hex       | Bedeutung                                          |
| ------------------------------- | --------- | -------------------------------------------------- |
| `--color-status-planned`        | `#5b5d61` | Plan-Eintrag PLANNED                               |
| `--color-status-progress`       | `#0369a1` | IN_PROGRESS (Mitarbeiter eingecheckt)              |
| `--color-status-completed`      | `#15803d` | COMPLETED                                          |
| `--color-status-needs-reassign` | `#b45309` | REASSIGNMENT_NEEDED — fällt auf, nicht alarmierend |
| `--color-status-conflict`       | `#b91c1c` | Time-Conflict, Validation-Fehler                   |

Status-Farben werden als **Text + Badge** angezeigt, nie als allein-Indikator (Accessibility: Farbenblinde sehen sonst nichts).

### Kontrast-Floor

Body-Text auf Surface ≥ 7:1 (WCAG AAA). Buttons ≥ 4.5:1 (AA). Status-Farben auf Surface ≥ 4.5:1.

## Typography

**Eine Familie für alles: Inter** (variable font). Begründung: ausgezeichnete Mehrsprachen-Abdeckung (Deutsch, Türkisch, Polnisch, Russisch — typische Mitarbeiter-Sprachen), exzellent lesbar in kleinen Größen, neutral genug für Multi-Brand. Monospace nur für numerische Werte (Stunden-Tabellen, Zeiten) als **JetBrains Mono**.

### Skala

| Token         | Größe                          | Gewicht | Verwendung                                                |
| ------------- | ------------------------------ | ------- | --------------------------------------------------------- |
| `display`     | `clamp(1.75rem, 3vw, 2.25rem)` | 600     | Seitentitel (selten)                                      |
| `headline`    | 1.25rem                        | 600     | Sektions-Headlines, Modal-Titel                           |
| `title`       | 1rem                           | 600     | Card-Titel, Mitarbeiter-Name in Plan-Zeile                |
| `body`        | 0.9375rem (15px)               | 400     | Desktop Body                                              |
| `body-mobile` | 1rem (16px)                    | 400     | Mobile Body — etwas größer für Daniels Sonnen-Bedingungen |
| `label`       | 0.8125rem                      | 500     | Buttons, Tabs, kleinere Beschriftungen                    |
| `numeric`     | 0.875rem (JetBrains Mono)      | 500     | Stunden-Zahlen, Zeit-Anzeigen                             |

**Skalierung:** Schritt-Ratio ≥ 1.25 zwischen aufeinanderfolgenden Hierarchie-Stufen. Body → Title (1.07) ist dezent, weil beide oft nebeneinander stehen.

**Zeilenlänge:** Body cap ≥ 65–75ch. Für tabellarische Plan-Listen irrelevant (eigene Constraints), für Erklärungstexte und Onboarding-Strings strikt.

**Numerische Tabellen:** ausschließlich `numeric` token (mono). Wochenstunden-Spalten richten sich an der Dezimal-Stelle aus — JetBrains Mono macht das automatisch.

## Elevation

**Wir nutzen tonale Schichten, keine Schatten.** Material-style Drop-Shadows fühlen sich für eine Werkzeug-App falsch an. Stattdessen:

| Schicht | Surface-Token            | Bedeutung                            |
| ------- | ------------------------ | ------------------------------------ |
| Sunken  | `--color-surface-sunken` | Side-Panel, Eingebettetes            |
| Default | `--color-surface`        | Standard-Hintergrund                 |
| Raised  | `--color-surface-raised` | Cards, Plan-Einträge, Modal-Backdrop |

**Ausnahmen (dezent erlaubt):**

- Floating Toolbar während Drag&Drop: weicher Schatten `0 4px 12px -4px rgba(15,20,25,0.10)`, nur in dieser einen Interaktion
- Dropdown-Menüs: 1px Border + leichter Schatten `0 2px 8px -4px rgba(15,20,25,0.08)`
- Sonst: nichts schwebt.

**Glassmorphism, Blur, Glanz-Effekte: verboten.** Cliché und unter Sonnenlicht (Daniel) unlesbar.

## Components

> Vor-Implementation. Konkrete React-Komponenten kommen mit ELE-180/181/182. Hier nur das Inventar mit Token-Bindings.

### Buttons

| Variant              | Use                                                  | Tokens                                                    |
| -------------------- | ---------------------------------------------------- | --------------------------------------------------------- |
| `button-primary`     | Marken-CTA (Plan freigeben, Speichern)               | `brand-primary` bg, `brand-on-primary` text, `rounded.md` |
| `button-secondary`   | Sekundär-Aktion (Abbrechen, Filtern)                 | `surface` bg, `border` 1px, `text-primary`                |
| `button-ghost`       | Tertiäre, oft im Toolbar (Drag-Handle, Icon-Buttons) | transparent bg, `text-secondary`, hover: `surface-sunken` |
| `button-destructive` | Lösch-Bestätigung                                    | `status-conflict` text, transparent bg, hover: tint       |

**Touch-Targets mobil:** min. 44×44px (Apple HIG). Padding 12×16, nicht 8×16 auf Mobile.

### Cards

`card-default`: `surface-raised` bg, `border` 1px, `rounded.md`, padding `lg` (16px). **Niemals geschachtelt.** Wenn ein Card-in-Card-Bedürfnis aufkommt, ist es ein Layout-Problem, kein Komponenten-Problem.

### Inputs

`input-default`: `surface` bg, `border` 1px, `rounded.sm`. Focus: `brand-primary` 2px outline (kein Glow). Validation-Fehler: `status-conflict` border + Hilfetext darunter.

### Badges (Status)

`badge-status`: `rounded.full`, padding 2×8, `label` typography. Hintergrund: 10% Opacity der Status-Farbe, Text: Status-Farbe full. Beispiel: REASSIGNMENT_NEEDED → bg `#b4530919`, text `#b45309`.

### Plan-Entry (Kern-Komponente, Wochenplan)

Ein einzelner Eintrag im Wochenplan-Grid. Desktop: kompakte Block-Darstellung mit Service-Type-Color-Strip am linken Rand. Mobile: Vollbreiten-Card mit Property-Name + Service-Type + Uhrzeit + Status-Badge.

**Service-Type-Color-Coding** (aus dem Erstgespräch übernommen):

- Treppenhaus: warmes Orange-Braun
- Garten: gedämpftes Grün
- Hof: tonal-neutral
- Mülltonnen: kühles Grau-Blau
- Winterdienst: kühles Blau-Grau

Diese Farben werden NICHT als Background-Fill genutzt (zu laut), sondern als 3px-Stripe an einer Kante.

### Navigation

- **Desktop**: Linke Sidebar 240px breit. Sektionen: Wochenplan / Templates / Stammdaten / Reports. Sparsame Icons (16px), Text-Primär.
- **Mobile**: Bottom Tab-Bar mit 3 Tabs: Heute / Diese Woche / Profil. Kein Hamburger.

## Do's and Don'ts

### ✅ Do

- **Whitespace verschwenden** — wenn etwas wichtig ist, gib ihm Platz. Plan-Grid darf atmen.
- **Tabellarische Daten mit JetBrains Mono** für Zahlen ausrichten.
- **Status-Farben als Text + Icon + Form** (nicht nur Farbe — Accessibility).
- **Per-Tenant-Theme via CSS-Variablen-Override** an `<html data-tenant="gepard">`. Komponenten lesen `var(--color-brand-primary)`, nie hartcodieren.
- **44px Touch-Targets** auf Mobile, immer.
- **Service-Type-Farben dezent** als 3px-Stripe, nie als großflächige Fills.
- **Du-Form für Daniel-Kontext, Sie-Form für Property-Manager-Kontext.**
- **Keyboard-Shortcuts dokumentieren** (Robert ist Power-User). Cmd+K für Suche, Cmd+S für Speichern, etc.

### ❌ Don't

- **Keine Gradient-Backgrounds, keine Glassmorphism, keine animierten Hero-Stats.** Siehe PRODUCT.md Anti-References.
- **Kein `border-left: 4px solid {color}` als Akzent.** Vollborder + leichter Fill, oder gar nichts.
- **Keine Modals als erste Reaktion.** Zuerst Inline-Edit oder Progressive-Disclosure prüfen.
- **Keine "Welcome back!"-Begrüßungen oder Emoji-Reactions** auf User-Aktionen.
- **Keine Skeleton-Loader für trivial schnelle Operationen** (<200ms). Direkt das Ergebnis zeigen.
- **Keine dunklen Themes für MVP.** Beide User-Szenen sind hell.
- **Kein Material-Floating-Action-Button.** Wir sind kein Android-Settings.
- **Keine Card-in-Card-Verschachtelung.** Niemals.
- **Keine Em-Dashes (`—`) oder Double-Hyphens (`--`) in UI-Strings.** Kommata, Doppelpunkte, Punkte.
- **Keine Reset-/Default-Buttons mit Trash-Icon** (verwirrt — Trash heißt Löschen, nicht Zurücksetzen).
- **Kein Hard-Coded `#000` oder `#fff`.** Auch nicht für "nur einen Pixel".

### Anti-Patterns aus dem Hausmeister-Reflex

| First-Order-Cliché                                    | Tu stattdessen                                                                         |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Hammer-/Schraubenschlüssel-Icons im Logo oder Sidebar | Sparsame, geometrische Icons (Calendar, User, Building). Funktional, nicht thematisch. |
| Warnweste-Orange + Bauarbeiter-Gelb                   | Tonale Neutrale + ein zurückhaltender Brand-Akzent.                                    |
| Big bold "WORKING HARD FOR YOU"-Hero                  | Stille, sachliche Header. "Diese Woche" reicht.                                        |
| Tabellen mit Excel-Gridlines auf jeder Zelle          | Nur Horizontale, dezent (border 1px in `border` token).                                |

---

## Entschieden (für MVP-Pilot)

- [x] **Pilot nur Gepard.** Andere Themes scaffolded, nicht ausgerollt.
- [x] **Brand-Hex-Werte bleiben Hypothesen** bis echte Marken-Guidelines vorliegen. Tech-Setup ist Theme-Override-fertig.

## Offen (für späteres Schärfen)

- [ ] **Echte Gepard-Brand-Guidelines** (Logo-SVG, exakte Hex-Werte, Schrift-Variante falls eigene Hausschrift). Vor Pilot-Launch nötig.
- [ ] **Inter-Hosting**: Self-Hosted (DSGVO-konform) vs. Google Fonts. Default-Empfehlung: Self-Hosted via `fontsource`.
- [ ] **Service-Type-Hex-Werte** final: Die Farben aus dem Erstgespräch (Treppenhaus-Orange-Braun, Garten-Grün, etc.) brauchen konkrete Hex-Werte mit AA-Kontrast.
- [ ] **Logo-Behandlung im Multi-Tenant-Header**: Position, Min-Size, mit/ohne Tagline.
- [ ] **Print-Stylesheet** für PDF-Export (Robert als Fallback für Mitarbeiter ohne Smartphone).

Wird mit Kunden-Feedback nach Pilot-Start geschärft.
