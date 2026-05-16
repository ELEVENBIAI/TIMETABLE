---
name: grafana
description: |
  Grafana Dashboard-Entwicklung und Metric-Queries.
  Nutzt den offiziellen Grafana MCP Server um Dashboards direkt in Grafana Cloud
  zu erstellen, zu lesen und zu aktualisieren sowie PromQL-Queries abzusetzen.
  Verwenden wenn der Operator "Grafana", "Dashboard", "Panel", "Metrik abfragen",
  "Alert Rule", "grafana bauen" oder "/grafana" sagt.
version: 1.0.0
requires_mcp:
  - name: grafana
    description: Grafana MCP Server (grafana/mcp-grafana Docker)
---

# Grafana Skill — Dashboard-Entwicklung

Direkter Zugriff auf Grafana Cloud via MCP. Dashboards bauen, Metriken abfragen, Panels erstellen — ohne manuellen JSON Export/Import.

## Workflow

### 1. Ziel klären
- Panel bauen → welche Metrik? Welcher Visualisierungs-Typ? (Timeseries, Gauge, Table, Stat)
- Query absetzen → welche Metrik? Welcher Zeitraum?
- Dashboard suchen → `search_dashboards` zuerst

### 2. Metrik verstehen
```
query_prometheus(expr="<metrik_name>", datasourceUid="<uid>")
```
Ergebnis prüfen — Werte plausibel? Labels vorhanden?

### 3. Dashboard/Panel erstellen oder updaten
```
get_dashboard(uid="<uid>")          # Bestehendes laden
patch_dashboard(...)                # Gezielt updaten
update_dashboard(...)               # Vollständig ersetzen
```

---

## Konventionen

| Konvention | Wert |
|------------|------|
| **Grafana Cloud Instanz** | Primär — hier werden alle Dashboards gebaut |
| **Folder** | Projektname (alle Dashboards in einem Folder) |
| **Panel-Naming** | `<Gruppe>: <Was>` z.B. `Agents: Signal Age`, `Trading: P&L Today` |
| **Refresh** | 30s für Live-Dashboards |
| **Time Range Default** | Last 1 hour |
| **Farben** | Grün = OK, Gelb = Warning, Rot = Critical (einheitlich) |

---

## Panel-Rezepte (Beispiele)

### Agent Health — Signal Age
```promql
signal_age_seconds{agent=~".+"}
```
- Typ: Table oder Gauge per Agent
- Schwellwerte: <600s=grün, <1800s=gelb, >1800s=rot

### P&L Today
```promql
pnl_today_usd
```
- Typ: Stat (grosse Zahl), Unit: USD

### Win Rate 7 Tage
```promql
win_rate_7d * 100
```
- Typ: Gauge (0–100%)
- Schwellwerte: >55=grün, >45=gelb, <45=rot

### Exchange / Service Status
```promql
exchange_up{exchange=~".+"}
```
- Typ: Stat pro Exchange/Service
- 1=UP (grün), 0=DOWN (rot)

---

## Häufige Aufgaben

### Neues Dashboard erstellen
1. `search_dashboards` → prüfen ob schon eins existiert
2. Dashboard-JSON aufbauen (Panels, Datasource, Folder)
3. `update_dashboard(dashboard=..., overwrite=false)`

### Panel zu bestehendem Dashboard hinzufügen
1. `get_dashboard(uid=...)` → JSON laden
2. Neues Panel-Objekt ans `panels[]` Array anhängen
3. `update_dashboard(dashboard=..., overwrite=true)`

### PromQL debuggen
1. `query_prometheus(expr="...", datasourceUid="...")` direkt aus Claude
2. Ergebnis analysieren → Panel-Konfiguration anpassen

### Datasource UID finden
Beim ersten Aufruf: `search_dashboards` → aus einem bestehenden Dashboard die `datasource.uid` auslesen.

### Metrik existiert noch nicht → was tun?

Wenn `query_prometheus(expr="my_metric")` keine Daten zurückgibt:

1. **Prüfen ob die Metrik im Metrics-Modul definiert ist**
2. **Falls nicht vorhanden:** Panel NICHT bauen. Stattdessen:
   - Operator informieren: "Metrik `my_metric` fehlt noch in `lib/metrics.js`"
   - Beschreiben was die Metrik messen soll
   - Vorschlag: `/ideation` für eine neue Story oder direkt implementieren
3. **Nach Metrik-Implementierung:** Prometheus scrapt sie automatisch → in Grafana Cloud verfügbar

---

## Vollständiger Datenfluss (Referenz)

```
App Agents → lib/metrics.js → GET /metrics Endpoint
    → Prometheus (scrape alle 15s, Docker-intern)
        ├── Grafana lokal — Dev/Debug
        └── remote_write → Grafana Cloud — PROD/MOBILE
                                ↑
                       /grafana Skill + MCP greift hier ein
```

**Konfiguration:**
- Prometheus Scrape + remote_write: `monitoring/prometheus/prometheus.yml`
- Metrik-Definitionen: `lib/metrics.js`
- Kill-Switch: `remote_write` Block auskommentieren → Cloud-Push stoppt sofort
