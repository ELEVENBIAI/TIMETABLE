# MCP-Server setup — Claude Code integration

> **Purpose:** MCP (Model Context Protocol) servers connect Claude Code to external services.
> Skills like `/ideation`, `/implement`, `/backlog` call MCP tools directly (e.g. create Linear
> issues, fetch Nansen data). Without correct registration, every MCP tool call silently fails.

---

## What is MCP?

MCP servers are local or remote processes that provide Claude Code with extra tools.
For example, Claude Code calls `mcp__claude_ai_Linear__save_issue` — it reaches the Linear
MCP server, which makes the actual API call.

**Registration:** in `.claude/settings.json` or globally in `~/.claude/settings.json`.

---

## Step 1 — which MCP servers do you need?

Ask the operator:

```
Which external services should Claude Code talk to directly?

GOVERNANCE (almost always needed):
  a) Linear — issue tracking, stories, comments
  b) GitHub — PRs, issues, actions (alternative: only via git CLI)

ALERTS & MONITORING:
  c) Telegram — bot alerts on incidents, self-healing messages
  d) Grafana — dashboard queries, metric checks

RESEARCH & DATA:
  e) Perplexity / OpenRouter — deep research in /research skill
  f) Nansen — on-chain analytics (only for trading/DeFi projects)
  g) Dune Analytics — SQL queries on blockchain data

INFRASTRUCTURE:
  h) Hostinger — VPS management, firewall, domains

DESIGN / FRONTEND:
  i) Webflow — visual frontend via MCP
  j) Miro — architecture diagrams via /visualize

DATABASE:
  k) Supabase — DB operations, auth, storage directly from Claude Code

Which ones do you need? (Multiple possible)
```

Store selection as `{{MCP_SERVERS}}`.

---

## Step 2 — settings.json structure

MCP servers go into `.claude/settings.json` (project-local).
Alternatively globally in `~/.claude/settings.json` (for every project on the machine).

**Recommendation:** project-local (`.claude/settings.json`) — then the setup is versioned.

Basic structure:

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

## Step 3 — set up each MCP server per service

### a) Linear (mandatory for governance)

Linear MCP runs via the Claude.ai integration — no separate npm package needed.
It is activated via the Claude Code desktop app or the Claude.ai account.

**Prerequisite:** Claude.ai Pro or Team plan with Linear integration.

**Activation:**
1. claude.ai → Settings → Integrations → Linear → Connect
2. Authorize the Linear account
3. In Claude Code: `mcp__claude_ai_Linear__*` tools are then available

**Add to settings.json — permissions:**
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
In Claude Code: "List the open issues in Linear"
Expected: list of issues from your Linear workspace
```

---

### b) GitHub (optional — usually git CLI is enough)

For direct PR/issue access via MCP:

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

**Create token:** GitHub → Settings → Developer Settings → Personal Access Tokens → Fine-grained
Permissions: `repo`, `pull_requests`, `issues`

Store token in `.env` as `GITHUB_PAT=ghp_xxxxx`.

---

### c) Telegram (alerts)

Telegram has no MCP server — alerts run directly via the Telegram Bot API from `agents/self-healing.js`.
Setup: see `references/telegram-setup.md`.

---

### d) Grafana (monitoring)

Grafana MCP connects Claude Code to Grafana Cloud for dashboard queries.

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

**Create API key:** Grafana → Administration → Service Accounts → Add Service Account Token
Role: `Editor` (for dashboard creation) or `Viewer` (read-only)

Keys in `.env`:
```
GRAFANA_URL=https://yourorg.grafana.net
GRAFANA_API_KEY=glsa_xxxxxxxxxxxx
```

Usage: see `references/grafana-monitoring.md`.

---

### e) OpenRouter / Perplexity (research)

For the `/research` skill with deep-research tier:

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

Alternatively just as ENV variable in `.env` — the `/research` skill uses it directly via API call without MCP.

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

API key: Hostinger panel → Profile → API tokens → create token.
Permissions: VPS read+write, DNS read+write.

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

Access token: supabase.com → Account → Access Tokens → Generate new token.

---

## Step 4 — verify API keys

After entering each key, test it individually — don't wait for the first `/implement` call:

### Linear API key test:
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $(grep LINEAR_API_KEY .env | cut -d= -f2)" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ viewer { name email } }"}' \
  | jq '.data.viewer'
```
Expected: `{ "name": "Your name", "email": "your@email.com" }`

### Grafana API key test:
```bash
curl -s -H "Authorization: Bearer $(grep GRAFANA_API_KEY .env | cut -d= -f2)" \
  "$(grep GRAFANA_URL .env | cut -d= -f2)/api/org" | jq '.name'
```
Expected: your Grafana org name as a string.

### OpenRouter key test:
```bash
curl -s https://openrouter.ai/api/v1/auth/key \
  -H "Authorization: Bearer $(grep OPENROUTER_API_KEY .env | cut -d= -f2)" \
  | jq '.data.label'
```
Expected: label of your API key (no error).

---

## Step 5 — check MCP server start

After configuration, restart Claude Code and test:

```bash
# In Claude Code terminal:
claude
```

Then in the chat:
```
List the open Linear issues
```

If Linear MCP is active: issues appear.
If not: "Tool not available" → check settings.json.

---

## Common errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Tool not available` | MCP server not in settings.json | Add entry + restart Claude Code |
| `Authentication failed` | Wrong/expired API key | Check key in .env + run verify call |
| `ENOENT npx` | Node.js not installed | Check `node --version` |
| `Permission denied` | Tool not in `allow` list | Extend permissions.allow |
| MCP server doesn't start | Port in use or ENV missing | Check `.env`, `lsof -i :PORT` |

---

## Minimal settings.json for a new project

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

Add more `allow` entries based on the MCP servers selected.
