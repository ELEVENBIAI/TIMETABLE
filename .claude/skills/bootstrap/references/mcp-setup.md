# MCP-Server Setup — Claude Code Integration

> **Zweck:** MCP (Model Context Protocol) Server verbinden Claude Code mit externen Diensten.
> Skills wie `/ideation`, `/implement`, `/backlog` rufen MCP-Tools direkt auf (z.B. Linear-Issues
> anlegen, Nansen-Daten abrufen). Ohne korrekte Registrierung schlagen alle MCP-Tool-Calls still fehl.

---

## Was ist MCP?

MCP-Server sind lokale oder remote Prozesse die Claude Code zusaetzliche Tools bereitstellen.
Claude Code ruft z.B. `mcp__claude_ai_Linear__save_issue` auf — das landet im Linear-MCP-Server
der den eigentlichen API-Call macht.

**Registrierung:** In `.claude/settings.json` oder global in `~/.claude/settings.json`.

---

## Schritt 1 — Welche MCP-Server brauchst du?

Stelle dem Operator diese Frage:

```
Welche externen Dienste soll Claude Code direkt ansprechen koennen?

GOVERNANCE (fast immer noetig):
  a) Linear — Issue Tracking, Stories, Kommentare
  b) GitHub — PRs, Issues, Actions (alternativ: nur via git CLI)

ALERTS & MONITORING:
  c) Telegram — Bot-Alerts bei Incidents, Self-Healing-Meldungen
  d) Grafana — Dashboard-Queries, Metric-Checks

RESEARCH & DATA:
  e) Perplexity / OpenRouter — Deep Research in /research Skill
  f) Nansen — On-Chain Analytics (nur fuer Trading/DeFi-Projekte)
  g) Dune Analytics — SQL-Queries auf Blockchain-Daten

INFRASTRUKTUR:
  h) Hostinger — VPS-Management, Firewall, Domains

DESIGN / FRONTEND:
  i) Webflow — Visual Frontend via MCP
  j) Miro — Architektur-Diagramme via /visualize

DATENBANK:
  k) Supabase — DB-Operationen, Auth, Storage direkt aus Claude Code

Welche davon brauchst du? (Mehrfachauswahl moeglich)
```

Speichere Auswahl als `{{MCP_SERVERS}}`.

---

## Schritt 2 — settings.json Struktur

MCP-Server werden in `.claude/settings.json` (projekt-lokal) eingetragen.
Alternativ global in `~/.claude/settings.json` (gilt fuer alle Projekte auf der Maschine).

**Empfehlung:** Projekt-lokal (`.claude/settings.json`) — dann ist der Setup versionierbar.

Grundstruktur:

```json
{
  "permissions": {
    "allow": [
      "Bash(git:*)",
      "Bash(node:*)",
      "Bash(npm:*)"
    ]
  },
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@package/mcp-server"],
      "env": {
        "API_KEY": "${ENV_VAR_NAME}"
      }
    }
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/spec-gate.sh" },
          { "type": "command", "command": "bash .claude/hooks/doc-version-sync.sh" }
        ]
      }
    ]
  }
}
```

---

## Schritt 3 — MCP-Server je Dienst einrichten

### a) Linear (Pflicht fuer Governance)

Linear MCP laeuft via Claude.ai Integration — kein separater npm-Paket noetig.
Er wird ueber die Claude Code Desktop App oder den Claude.ai Account aktiviert.

**Voraussetzung:** Claude.ai Pro oder Team Plan mit Linear-Integration.

**Aktivierung:**
1. claude.ai → Einstellungen → Integrations → Linear → Verbinden
2. Linear-Account autorisieren
3. In Claude Code: `mcp__claude_ai_Linear__*` Tools sind danach verfuegbar

**In settings.json — Permissions hinzufuegen:**
```json
{
  "permissions": {
    "allow": [
      "mcp__claude_ai_Linear__save_issue",
      "mcp__claude_ai_Linear__list_issues",
      "mcp__claude_ai_Linear__save_comment",
      "mcp__claude_ai_Linear__get_issue",
      "mcp__claude_ai_Linear__list_projects",
      "mcp__claude_ai_Linear__get_team"
    ]
  }
}
```

**Test:**
```
In Claude Code: "Liste die offenen Issues in Linear"
Erwartet: Liste der Issues aus deinem Linear-Workspace
```

---

### b) GitHub (optional — meist nur git CLI noetig)

Fuer direkten PR/Issue-Zugriff via MCP:

```json
"mcpServers": {
  "github": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PAT}"
    }
  }
}
```

**Token erstellen:** GitHub → Settings → Developer Settings → Personal Access Tokens → Fine-grained
Berechtigungen: `repo`, `pull_requests`, `issues`

Token in `.env` als `GITHUB_PAT=ghp_xxxxx`.

---

### c) Telegram (Alerts)

Telegram hat keinen MCP-Server — Alerts laufen direkt via Telegram Bot API aus `agents/self-healing.js`.
Setup: siehe `references/telegram-setup.md`.

---

### d) Grafana (Monitoring)

Grafana MCP verbindet Claude Code mit Grafana Cloud fuer Dashboard-Queries.

```json
"mcpServers": {
  "grafana": {
    "command": "npx",
    "args": ["-y", "@grafana/mcp-grafana"],
    "env": {
      "GRAFANA_URL": "${GRAFANA_URL}",
      "GRAFANA_API_KEY": "${GRAFANA_API_KEY}"
    }
  }
}
```

**API Key erstellen:** Grafana → Administration → Service Accounts → Add Service Account Token
Rolle: `Editor` (fuer Dashboard-Erstellung) oder `Viewer` (nur Lesen)

Keys in `.env`:
```
GRAFANA_URL=https://yourorg.grafana.net
GRAFANA_API_KEY=glsa_xxxxxxxxxxxx
```

Nutzung: siehe `references/grafana-monitoring.md`.

---

### e) OpenRouter / Perplexity (Research)

Fuer den `/research` Skill mit Deep-Research-Tier:

```json
"mcpServers": {
  "openrouter": {
    "command": "npx",
    "args": ["-y", "@openrouter/mcp"],
    "env": {
      "OPENROUTER_API_KEY": "${OPENROUTER_API_KEY}"
    }
  }
}
```

Oder direkt als ENV-Variable in `.env` — `/research` Skill nutzt das direkt via API-Call ohne MCP.

---

### h) Hostinger VPS

```json
"mcpServers": {
  "hostinger": {
    "command": "npx",
    "args": ["-y", "@hostinger/mcp-server"],
    "env": {
      "HOSTINGER_API_KEY": "${HOSTINGER_API_KEY}"
    }
  }
}
```

API Key: Hostinger Panel → Profile → API-Tokens → Token erstellen.
Permissions: VPS Read+Write, DNS Read+Write.

---

### k) Supabase

```json
"mcpServers": {
  "supabase": {
    "command": "npx",
    "args": ["-y", "@supabase/mcp-server-supabase@latest",
             "--access-token", "${SUPABASE_ACCESS_TOKEN}"]
  }
}
```

Access Token: supabase.com → Account → Access Tokens → Generate new token.

---

## Schritt 4 — API-Keys verifizieren

Nach dem Eintragen jeden Key einzeln testen — nicht erst beim ersten `/implement`-Aufruf:

### Linear API Key Test:
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $(grep LINEAR_API_KEY .env | cut -d= -f2)" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ viewer { name email } }"}' \
  | jq '.data.viewer'
```
Erwartet: `{ "name": "Dein Name", "email": "deine@email.com" }`

### Grafana API Key Test:
```bash
curl -s -H "Authorization: Bearer $(grep GRAFANA_API_KEY .env | cut -d= -f2)" \
  "$(grep GRAFANA_URL .env | cut -d= -f2)/api/org" | jq '.name'
```
Erwartet: Dein Grafana Org-Name als String.

### OpenRouter Key Test:
```bash
curl -s https://openrouter.ai/api/v1/auth/key \
  -H "Authorization: Bearer $(grep OPENROUTER_API_KEY .env | cut -d= -f2)" \
  | jq '.data.label'
```
Erwartet: Label deines API-Keys (kein Fehler).

---

## Schritt 5 — MCP-Server-Start pruefen

Nach Konfiguration Claude Code neu starten und testen:

```bash
# In Claude Code Terminal:
claude
```

Dann im Chat:
```
Liste die offenen Linear Issues
```

Wenn Linear MCP aktiv ist: Issues erscheinen.
Wenn nicht: Fehlermeldung "Tool not available" → settings.json pruefen.

---

## Haeufige Fehler

| Fehler | Ursache | Loesung |
|--------|---------|---------|
| `Tool not available` | MCP-Server nicht in settings.json | Eintrag hinzufuegen + Claude Code neustarten |
| `Authentication failed` | Falscher/abgelaufener API Key | Key in .env pruefen + Verify-Call ausfuehren |
| `ENOENT npx` | Node.js nicht installiert | `node --version` pruefen |
| `Permission denied` | Tool nicht in `allow`-Liste | permissions.allow erweitern |
| MCP-Server startet nicht | Port belegt oder ENV fehlt | `.env` pruefen, `lsof -i :PORT` |

---

## Minimal-settings.json fuer neues Projekt

```json
{
  "permissions": {
    "allow": [
      "Bash(git:*)",
      "Bash(node:*)",
      "Bash(npm:*)",
      "mcp__claude_ai_Linear__save_issue",
      "mcp__claude_ai_Linear__list_issues",
      "mcp__claude_ai_Linear__save_comment",
      "mcp__claude_ai_Linear__get_issue",
      "mcp__claude_ai_Linear__list_issues",
      "mcp__claude_ai_Linear__get_team",
      "mcp__claude_ai_Linear__list_projects"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/spec-gate.sh" },
          { "type": "command", "command": "bash .claude/hooks/doc-version-sync.sh" }
        ]
      }
    ]
  }
}
```

Weitere `allow`-Eintraege je nach gewaehlten MCP-Servern ergaenzen.
