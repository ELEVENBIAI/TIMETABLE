# Grafana Monitoring — Hinweis und Nutzungsmuster

> **Scope:** Dieses Dokument beschreibt NICHT wie man Grafana von Grund auf installiert.
> Es beschreibt, wie wir Grafana als Monitoring-Layer in Claude Code-Projekten nutzen
> und wie der `/grafana` Skill dabei hilft.
>
> **Voraussetzung:** Grafana Cloud Account (kostenloser Tier genuegt fuer den Start —
> grafana.com/auth/sign-up). Self-hosted Grafana ist ebenfalls unterstuetzt.

---

## Wozu Grafana in AI-gesteuerten Projekten?

Self-Healing (`agents/self-healing.js`) schreibt Logs und sendet Telegram-Alerts.
Das reicht fuer reaktive Diagnose — aber nicht fuer proaktives Monitoring.

**Grafana ergaenzt:**
- Zeitreihen von System-Metriken (CPU, Memory, API-Latenz)
- Custom Metriken aus dem Projekt (z.B. WinRate, Fehlerrate, Job-Dauer)
- Dashboards fuer den Operator — ein Blick, voller Ueberblick
- Alerting-Regeln die unabhaengig von Claude Code laufen

---

## Unser Nutzungsmuster

```
Self-Healing / Daemons
  └─→ schreiben Metriken (Logs oder Prometheus-Format)
       └─→ Grafana Agent / Alloy liest Metriken
            └─→ Grafana Cloud speichert Zeitreihen
                 └─→ /grafana Skill erstellt/aktualisiert Dashboards via MCP
                      └─→ Operator sieht Dashboard im Browser
```

**Wichtig:** Grafana liest — Claude Code schreibt nicht direkt in Grafana.
Der `/grafana` Skill sendet nur Dashboard-Definitionen (JSON) via Grafana MCP.

---

## Schritt 1 — Grafana Cloud einrichten

1. grafana.com → "Start for free" → Account anlegen
2. Stack erstellen (Region waehlen — EU empfohlen fuer DSGVO)
3. Grafana URL notieren: `https://yourorg.grafana.net`

---

## Schritt 2 — API Key erstellen

In Grafana: Administration → Service Accounts → "Add service account"
- Name: `claude-code-mcp`
- Role: `Editor` (fuer Dashboard-Erstellung via /grafana Skill)

Dann: Service Account → "Add service account token"
Token beginnt mit `glsa_`.

In `.env` eintragen:
```
GRAFANA_URL=https://yourorg.grafana.net
GRAFANA_API_KEY=glsa_xxxxxxxxxxxxxxxxxxxx
```

---

## Schritt 3 — Metriken aus Self-Healing exportieren

Self-Healing kann Metriken im Prometheus-Format ausgeben damit Grafana sie lesen kann.

Minimales Beispiel in `agents/self-healing.js`:

```javascript
const http = require('http');

// Metriken-Store
let metrics = {
  selfHealing_checks_total: 0,
  selfHealing_checks_failed: 0,
  selfHealing_last_run_timestamp: 0,
};

// Prometheus-Endpoint auf Port 9100
http.createServer((req, res) => {
  if (req.url !== '/metrics') { res.writeHead(404); res.end(); return; }
  const output = Object.entries(metrics)
    .map(([k, v]) => `# TYPE ${k} gauge\n${k} ${v}`)
    .join('\n');
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(output);
}).listen(9100);

// Nach jedem Check-Lauf:
metrics.selfHealing_checks_total++;
metrics.selfHealing_last_run_timestamp = Date.now() / 1000;
if (checkFailed) metrics.selfHealing_checks_failed++;
```

Grafana Agent / Alloy scraped dann `http://localhost:9100/metrics` alle 15 Sekunden.

---

## Schritt 4 — Grafana Agent auf VPS installieren

**Grafana Alloy (empfohlen, Nachfolger von Grafana Agent):**

```bash
# Installation (Debian/Ubuntu)
sudo apt-get install -y gpg
wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor | \
  sudo tee /etc/apt/keyrings/grafana.gpg > /dev/null
echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" | \
  sudo tee /etc/apt/sources.list.d/grafana.list
sudo apt-get update && sudo apt-get install -y alloy
```

**Minimale Alloy-Config** (`/etc/alloy/config.alloy`):

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

Remote-Write URL + User ID: Grafana Cloud → Home → "Send Metrics" → Prometheus-Anleitung.

```bash
sudo systemctl enable alloy && sudo systemctl start alloy
```

---

## Schritt 5 — /grafana Skill nutzen

Mit dem `/grafana` Skill kann Claude Code Dashboards direkt erstellen und aktualisieren.

**Voraussetzung:** Grafana MCP in `settings.json` registriert (siehe `references/mcp-setup.md §d`).

**Typische Nutzung:**

```
/grafana
→ Erstelle ein Self-Healing Dashboard mit:
  - Panel: Checks gesamt (selfHealing_checks_total)
  - Panel: Fehler-Rate (selfHealing_checks_failed / selfHealing_checks_total)
  - Panel: Letzter Lauf (selfHealing_last_run_timestamp)
```

Der Skill erstellt das Dashboard via Grafana MCP direkt in der Grafana-Instanz.

---

## Was Grafana NICHT ersetzt

| Was | Besser via |
|-----|-----------|
| Echtzeit-Incidents | Telegram-Alerts (sofort, weniger Overhead) |
| Code-Debugging | Claude Code direkt (Logs lesen, Self-Healing) |
| Issue-Tracking | Linear |
| Governance-Enforcement | spec-gate.sh, doc-version-sync.sh |

Grafana ergaenzt — es ersetzt keinen der anderen Kanaele.

---

## Checkliste: Grafana Integration

```
[ ] Grafana Cloud Account + Stack erstellt
[ ] GRAFANA_URL + GRAFANA_API_KEY in .env eingetragen
[ ] API Key Test erfolgreich (curl /api/org gibt Org-Name zurueck)
[ ] Grafana MCP in .claude/settings.json registriert
[ ] Grafana Agent / Alloy auf VPS installiert + laeuft
[ ] Self-Healing exportiert Metriken auf :9100/metrics
[ ] Alloy scraped :9100 und schreibt in Grafana Cloud
[ ] Erstes Dashboard via /grafana Skill erstellt
```
