---
name: visualize
description: |
  Automatisierte Architektur-Diagramme in Miro generieren aus Dokumentationsdateien.
  Liest Architecture-Docs aus dem Projekt und erstellt vollstaendige Flowcharts/Diagramme
  in Miro — Uebersicht + Detail-Diagramme pro Layer.
  Verwenden wenn der Operator "visualize", "Diagramm erstellen", "Architektur visualisieren",
  "Miro Diagramm" oder "/visualize" sagt.
version: 2.1.0
author: Tobias Schmidt (OpenCLAW Project)
---

# Visualize — Architecture Diagrams in Miro

Erstellt aus Architekturdokumentation ein vollstaendiges Layer-Diagramm-Set in Miro.

## Voraussetzungen

1. **Miro MCP Server** muss in Claude Code konfiguriert sein (siehe README.md)
2. **Miro Board** muss existieren (Board-URL als Argument)
3. **Architekturdokumentation** muss im Projekt vorhanden sein (siehe Schritt 2)

## Aufruf

```
/visualize <board-url> [diagramm-typ]
```

**Argumente:**
- `board-url` (required): Miro Board URL
- `diagramm-typ` (optional): `overview`, `detail`, `all` (default)
  - `overview` = 3 Uebersichts-Diagramme (Layer, Dataflow, Deployment)
  - `detail` = 3 Detail-Diagramme (Layer 1, Layer 2-4, Layer 5-7)
  - `all` = Alle 6 Diagramme

## Workflow

### Schritt 1: Parameter parsen

- Board-URL aus den Argumenten extrahieren
- Diagramm-Typ bestimmen (default: `all`)

### Schritt 2: Architekturdokumentation lesen

> **ANPASSEN:** Ersetze die Pfade unten durch deine tatsaechlichen Dokumentationspfade.
> Mindestens `LAYER_ARCHITECTURE.md` ist erforderlich. Alle anderen sind optional aber empfohlen.

Folgende Dateien lesen (Pfade entsprechend dem Projekt anpassen):

| Dokument | Inhalt | Erforderlich |
|----------|--------|-------------|
| `LAYER_ARCHITECTURE.md` | Schichten-Architektur: Layer-Namen, Dateien pro Schicht, Input/Output | **Ja** |
| `COMPONENT_INVENTORY.md` | Alle Module/Klassen/Services mit Layer-Zuordnung | Empfohlen |
| `API_INVENTORY.md` | Externe API-Verbindungen mit Datenfluss-Richtung (IN/OUT/BI) | Empfohlen |
| `DATA_FLOW.md` | Pipelines, Datenformate, Error-Pfade | Empfohlen |
| `DEPLOYMENT_ARCHITECTURE.md` | Prozesse, Server, Daemons, Cron-Jobs | Empfohlen |
| `CROSS_CUTTING.md` | Logging, Error Handling, Monitoring | Optional |

Falls diese Dateien nicht exakt so heissen oder nicht existieren:
- Vorhandene Architektur-Doku mit aehnlichem Inhalt suchen und verwenden
- Fehlende Informationen aus CLAUDE.md oder anderen Projektdateien erganzen
- Dem Operator mitteilen welche Docs gefunden wurden und was fehlt

### Schritt 3: DSL-Format laden

`diagram_get_dsl` mit `diagram_type: "flowchart"` aufrufen — einmal pro Session reicht.

### Schritt 4: Diagramme generieren

#### Reihe 1: Uebersicht (y=0)

**Diagramm 1 (x=0): Layer Architecture Uebersicht**
- Alle Architektur-Schichten als Boxen (BT-Richtung) mit Farb-Kodierung
- Externe Systeme (APIs, Datenbanken, Operator) als externe Nodes
- Verbindungen zwischen den Schichten
- Cluster nach funktionalen Gruppen

**Diagramm 2 (x=2500): Data Flow**
- LR-Richtung
- Haupt-Datenpipelines als Cluster
- Decision-Nodes fuer Verzweigungen
- Alle wichtigen Datenformate und -speicher

**Diagramm 3 (x=5000): Deployment**
- TB-Richtung
- Server/Container-Struktur
- Alle laufenden Prozesse und Daemons
- Externe Services

#### Reihe 2: Detail pro Schicht (y=2500 bis y=7500)

**Diagramm 4 (x=0, y=2500): Eingangs-Layer Detail**
Aus API_INVENTORY.md + COMPONENT_INVENTORY.md:
- LR-Richtung
- Alle externen Datenquellen (APIs, Webhooks, etc.)
- Alle Ingestion-Komponenten mit Typ und Frequenz
- Output-Datenformate

**Diagramm 5 (x=0, y=5000): Core-Layer Detail**
Aus DATA_FLOW.md:
- LR-Richtung
- Aggregations- und Verarbeitungs-Logik
- Decision-Gates mit Bedingungen
- Ausfuehrungs-Layer mit Safety-Checks

**Diagramm 6 (x=0, y=7500): Operations-Layer Detail**
Aus CROSS_CUTTING.md + DEPLOYMENT_ARCHITECTURE.md:
- LR-Richtung
- Monitoring und Self-Healing
- Feedback-Loops und Lernmechanismen
- Presentation und Output-Kanaele

### Schritt 5: Ergebnis praesentieren

Dem Operator zeigen:
- Tabelle aller erstellten Diagramme mit Deep-Links zu Miro
- Board-URL fuer Gesamtuebersicht
- Hinweis: Diagramme in Miro frei verschieb- und bearbeitbar

## Farb-Kodierung (Empfehlung)

| Layer-Typ | Farbe | Hex |
|-----------|-------|-----|
| Eingangs-Layer (Data Ingestion) | Hellblau | #ccf4ff |
| Aggregations-Layer | Hellgruen | #adf0c7 |
| Entscheidungs-Layer (Decision) | Hellgelb | #fff6b6 |
| Ausfuehrungs-Layer (Execution) | Hellrot | #ffc6c6 |
| Monitoring-Layer | Helllila | #dedaff |
| Feedback-Layer | Hellorange | #f8d3af |
| Praesentations-Layer | Hellgrau | #e7e7e7 |
| Externe Systeme | Blau | #c6dcff |

## Board-Layout

```
y=0      [Uebersicht: Layer]    [Uebersicht: Dataflow]    [Uebersicht: Deployment]
          x=0                     x=2500                     x=5000

y=2500   [Eingangs-Layer Detail: alle Datenquellen + Komponenten]

y=5000   [Core-Layer Detail: Aggregation + Decision + Execution]

y=7500   [Operations-Layer Detail: Monitoring + Feedback + Presentation]
```
