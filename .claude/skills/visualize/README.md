# Visualize Skill — Automatische Architektur-Diagramme in Miro

Ein Claude Code Skill der automatisch vollständige Architektur-Diagramme aus deiner Projektdokumentation generiert und direkt in Miro erstellt.

## Was macht dieser Skill?

Mit einem einzigen Befehl (`/visualize <miro-board-url>`) liest Claude alle deine Architekturdokumente und erstellt daraus **6 Diagramme** in Miro:

- **Übersichtsdiagramm:** Alle Architektur-Layer auf einen Blick
- **Datenfluss-Diagramm:** Wie Daten durch dein System fließen
- **Deployment-Diagramm:** Server, Prozesse, Daemons
- **3 Detaildiagramme:** Jede Layer-Gruppe im Detail (Eingang → Core → Operations)

Die Diagramme werden automatisch platziert, farbcodiert und mit Deep-Links versehen.

---

## Voraussetzungen

### 1. Claude Code installiert

```bash
npm install -g @anthropic-ai/claude-code
```

### 2. Miro MCP Server konfigurieren

Der Skill nutzt den **Miro MCP Connector** über Claude.ai. Du brauchst:

1. **Claude Pro oder Team Account** auf [claude.ai](https://claude.ai)
2. In Claude.ai → Settings → Integrations → **Miro verbinden**
3. Den Miro MCP Connector in deinem Claude Code Projekt aktivieren:

```bash
# In deinem Projektverzeichnis:
claude mcp add --scope user claude_ai_Miro <connection-details>
```

> **Hinweis:** Der Miro MCP Connector ist über Claude.ai OAuth verfügbar. Weitere Infos: [docs.anthropic.com/mcp](https://docs.anthropic.com/mcp)

### 3. Miro Board erstellen

1. Auf [miro.com](https://miro.com) ein neues leeres Board erstellen
2. Board-URL notieren (Format: `https://miro.com/app/board/uXXXXXXX=`)

### 4. Architekturdokumentation erstellen

Der Skill liest Markdown-Dateien in deinem Projekt. **Mindestanforderung:** Eine Datei die deine Architektur-Schichten beschreibt.

**Empfohlene Struktur** (Dateinamen sind anpassbar):

```
dein-projekt/
├── LAYER_ARCHITECTURE.md      # Pflicht: Layer-Struktur
├── COMPONENT_INVENTORY.md     # Empfohlen: alle Komponenten
├── API_INVENTORY.md           # Empfohlen: externe Verbindungen
├── DATA_FLOW.md               # Empfohlen: Datenpipelines
├── DEPLOYMENT_ARCHITECTURE.md # Empfohlen: Server/Prozesse
└── CROSS_CUTTING.md           # Optional: Logging, Monitoring
```

**Minimalbeispiel `LAYER_ARCHITECTURE.md`:**

```markdown
# Layer Architecture

## L1: Data Ingestion
- Dateien: src/collectors/*, src/scrapers/*
- Input: externe APIs, Webhooks
- Output: data/raw/*.json

## L2: Processing
- Dateien: src/processors/*
- Input: data/raw/*.json
- Output: data/processed/*.json

## L3: Output
- Dateien: src/api/*, dashboard/*
- Input: data/processed/*.json
- Output: HTTP API, Dashboard
```

---

## Installation

### Skill installieren

```bash
# Skills-Verzeichnis erstellen (falls nicht vorhanden)
mkdir -p ~/.claude/skills/visualize

# SKILL.md kopieren
cp SKILL.md ~/.claude/skills/visualize/SKILL.md
```

### Skill in Claude Code registrieren

Füge in deiner `CLAUDE.md` oder `~/.claude/CLAUDE.md` hinzu:

```markdown
## Skills

- `/visualize` — Architektur-Diagramme in Miro generieren
```

Oder nutze die Claude Code Settings:

```bash
claude config set skills.visualize.path ~/.claude/skills/visualize
```

---

## Verwendung

### Grundaufruf

```
/visualize https://miro.com/app/board/uXXXXXXX=
```

### Mit Diagramm-Typ

```
# Nur Übersichtsdiagramme (schneller)
/visualize https://miro.com/app/board/uXXXXXXX= overview

# Nur Detaildiagramme
/visualize https://miro.com/app/board/uXXXXXXX= detail

# Alle 6 Diagramme (default)
/visualize https://miro.com/app/board/uXXXXXXX= all
```

---

## Anpassungen

### Eigene Dokumentationspfade

Der Skill sucht standardmäßig nach Dateien im Projektroot. Falls deine Docs woanders liegen, passe `SKILL.md` an:

```markdown
### Schritt 2: Architekturdokumentation lesen

Dateien lesen aus `docs/architecture/`:
- `docs/architecture/layers.md`
- `docs/architecture/components.md`
- etc.
```

### Eigene Farben

Im `SKILL.md` unter `## Farb-Kodierung` die Hex-Werte anpassen:

```markdown
| Mein Layer | Farbe | Hex |
|------------|-------|-----|
| Frontend   | Hellblau | #ccf4ff |
| Backend    | Hellgrün | #adf0c7 |
| Datenbank  | Gelb     | #fff6b6 |
```

### Andere Layer-Anzahl

Das Skill funktioniert auch mit mehr oder weniger als 7 Layern. Beschreibe deine Layer in `LAYER_ARCHITECTURE.md` — Claude passt die Diagramme automatisch an.

---

## Ergebnis-Beispiel

Nach `/visualize` erhältst du eine Tabelle wie:

| Diagramm | Miro Deep-Link |
|----------|----------------|
| Layer Architecture Übersicht | [Öffnen in Miro](https://miro.com/...) |
| Data Flow | [Öffnen in Miro](https://miro.com/...) |
| Deployment | [Öffnen in Miro](https://miro.com/...) |
| L1 Detail: Data Ingestion | [Öffnen in Miro](https://miro.com/...) |
| L2-L4 Detail: Core Processing | [Öffnen in Miro](https://miro.com/...) |
| L5-L7 Detail: Operations | [Öffnen in Miro](https://miro.com/...) |

---

## Troubleshooting

**"Miro MCP not available"**
→ Miro MCP Connector in Claude.ai Settings prüfen und neu verbinden.

**"Board not found"**
→ Board-URL nochmals prüfen. Format: `https://miro.com/app/board/uXXXXXXX=`

**"No architecture docs found"**
→ Mindestens eine `LAYER_ARCHITECTURE.md` im Projektroot erstellen.

**Diagramme überlappen sich**
→ Board leeren und `/visualize` erneut aufrufen.

---

## Ursprung

Entwickelt im Rahmen des **OpenCLAW Trading System** Projekts (KI-Masterclass, Tobi Schmidt).  
Generiert automatisch Architektur-Diagramme für ein 37-Agent Krypto-Trading-System mit 44 externen API-Verbindungen.

---

*Skill Version 2.1.0 | Claude Code Skills*
