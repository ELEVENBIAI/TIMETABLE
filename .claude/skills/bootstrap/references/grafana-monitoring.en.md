# Grafana monitoring — note and usage pattern

> **Scope:** this document does NOT describe how to install Grafana from scratch.
> It describes how we use Grafana as a monitoring layer in Claude Code projects and
> how the `/grafana` skill helps with it.
>
> **Prerequisite:** Grafana Cloud account (free tier is enough to start —
> grafana.com/auth/sign-up). Self-hosted Grafana is supported too.

---

## Why Grafana in AI-driven projects?

Self-healing (`agents/self-healing.js`) writes logs and sends Telegram alerts.
That's enough for reactive diagnosis — but not for proactive monitoring.

**Grafana complements:**
- Time series of system metrics (CPU, memory, API latency)
- Custom metrics from the project (e.g. win rate, error rate, job duration)
- Dashboards for the operator — one glance, full overview
- Alerting rules that run independently of Claude Code

---

## Our usage pattern

```
Self-healing / daemons
  └─→ write metrics (logs or Prometheus format)
       └─→ Grafana Agent / Alloy reads metrics
            └─→ Grafana Cloud stores time series
                 └─→ /grafana skill creates/updates dashboards via MCP
                      └─→ operator sees dashboard in browser
```

**Important:** Grafana reads — Claude Code does not write directly into Grafana.
The `/grafana` skill only sends dashboard definitions (JSON) via Grafana MCP.

---

## Step 1 — set up Grafana Cloud

1. grafana.com → "Start for free" → create account
2. Create a stack (choose region — EU recommended for GDPR)
3. Note the Grafana URL: `https://yourorg.grafana.net`

---

## Step 2 — create an API key

In Grafana: Administration → Service Accounts → "Add service account"
- Name: `claude-code-mcp`
- Role: `Editor` (for dashboard creation via the /grafana skill)

Then: Service Account → "Add service account token"
The token begins with `glsa_`.

Add to `.env`:
```
GRAFANA_URL=https://yourorg.grafana.net
GRAFANA_API_KEY=glsa_xxxxxxxxxxxxxxxxxxxx
```

---

## Step 3 — export metrics from self-healing

Self-healing can emit metrics in Prometheus format so Grafana can read them.

Minimal example in `agents/self-healing.js`:

```javascript
const http = require('http');

// Metrics store
let metrics = {
  selfHealing_checks_total: 0,
  selfHealing_checks_failed: 0,
  selfHealing_last_run_timestamp: 0,
};

// Prometheus endpoint on port 9100
http.createServer((req, res) => {
  if (req.url !== '/metrics') { res.writeHead(404); res.end(); return; }
  const output = Object.entries(metrics)
    .map(([k, v]) => `# TYPE ${k} gauge\n${k} ${v}`)
    .join('\n');
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(output);
}).listen(9100);

// After every check run:
metrics.selfHealing_checks_total++;
metrics.selfHealing_last_run_timestamp = Date.now() / 1000;
if (checkFailed) metrics.selfHealing_checks_failed++;
```

Grafana Agent / Alloy then scrapes `http://localhost:9100/metrics` every 15 seconds.

---

## Step 4 — install Grafana Agent on the VPS

**Grafana Alloy (recommended, successor to Grafana Agent):**

```bash
# Install (Debian/Ubuntu)
sudo apt-get install -y gpg
wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor | \
  sudo tee /etc/apt/keyrings/grafana.gpg > /dev/null
echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" | \
  sudo tee /etc/apt/sources.list.d/grafana.list
sudo apt-get update && sudo apt-get install -y alloy
```

**Minimal Alloy config** (`/etc/alloy/config.alloy`):

```hcl
prometheus.scrape "self_healing" {
  targets = [{"__address__" = "localhost:9100"}]
  forward_to = [prometheus.remote_write.grafana_cloud.receiver]
}

prometheus.remote_write "grafana_cloud" {
  endpoint {
    url = "https://prometheus-prod-XX-prod-XX-XXX.grafana.net/api/prom/push"
    basic_auth {
      username = "YOUR_METRICS_USER_ID"
      password = "YOUR_GRAFANA_API_KEY"
    }
  }
}
```

Remote-write URL + user ID: Grafana Cloud → Home → "Send Metrics" → Prometheus guide.

```bash
sudo systemctl enable alloy && sudo systemctl start alloy
```

---

## Step 5 — use the /grafana skill

With the `/grafana` skill Claude Code can create and update dashboards directly.

**Prerequisite:** Grafana MCP registered in `settings.json` (see `references/mcp-setup.md §d`).

**Typical usage:**

```
/grafana
→ Create a self-healing dashboard with:
  - Panel: total checks (selfHealing_checks_total)
  - Panel: failure rate (selfHealing_checks_failed / selfHealing_checks_total)
  - Panel: last run (selfHealing_last_run_timestamp)
```

The skill creates the dashboard via Grafana MCP directly in the Grafana instance.

---

## What Grafana does NOT replace

| What | Better via |
|------|-----------|
| Real-time incidents | Telegram alerts (instant, less overhead) |
| Code debugging | Claude Code directly (read logs, self-healing) |
| Issue tracking | Linear |
| Governance enforcement | spec-gate.sh, doc-version-sync.sh |

Grafana complements — it doesn't replace any of the other channels.

---

## Checklist: Grafana integration

```
[ ] Grafana Cloud account + stack created
[ ] GRAFANA_URL + GRAFANA_API_KEY entered in .env
[ ] API key test successful (curl /api/org returns org name)
[ ] Grafana MCP registered in .claude/settings.json
[ ] Grafana Agent / Alloy installed on VPS + running
[ ] Self-healing exports metrics on :9100/metrics
[ ] Alloy scrapes :9100 and writes to Grafana Cloud
[ ] First dashboard created via /grafana skill
```
