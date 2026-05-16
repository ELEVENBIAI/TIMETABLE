# Status Skill — Bootstrap Template

## Bootstrap: Fragen an den Operator

Wenn der Operator `/status` installieren möchte, stelle folgende Fragen
**bevor** das SKILL.md generiert wird:

```
Für den /status Skill brauche ich kurze Infos:

1. Welche Hintergrundprozesse/Daemons laufen in deinem System?
   (Kommagetrennt, z.B. "run-loop.sh, api-server.js, worker.py")

2. Gibt es Daten-Files oder Signal-Files deren Aktualität relevant ist?
   (z.B. "signals/*.json zeigen ob Agents Daten liefern")
   Wenn nein: einfach "Nein" sagen

3. Hat das System ein Dashboard oder einen Health-Endpoint?
   (z.B. "Port 3000", "http://localhost:8080/health", oder "Nein")

4. Welche Log-Files sind am relevantesten für den Überblick?
   (z.B. "app.log", oder "Nein / noch unklar")
```

Warte auf Antworten. Dann SKILL.md aus dem Skeleton unten generieren
und nach `{PROJECT_PATH}/.claude/skills/status/SKILL.md` schreiben.
Platzhalter ersetzen:
- `{{PROJECT_NAME}}` → aus Phase 0 Info-Gathering
- `{{DAEMON_LIST}}` → Antwort 1 als Bullet-Liste
- `{{SIGNAL_FILES}}` → Antwort 2 (oder "— (nicht konfiguriert)")
- `{{DASHBOARD_URL}}` → Antwort 3 (oder "— (kein Dashboard)")
- `{{LOG_FILES}}` → Antwort 4 (oder "— (noch nicht konfiguriert)")

---

## Skeleton SKILL.md (wird generiert)

```markdown
---
name: status
version: 1.0.0
description: On-Demand System Status Dashboard für {{PROJECT_NAME}}. Zeigt Daemon-Status, Daten-Freshness, offene Issues und System-Health in einer kompakten Übersicht.
---

# /status — System Status Dashboard

**Auslöser:** Wenn Operator "status", "/status" oder "wie läuft's?" sagt.

Führe alle Checks durch, dann kompakte Tabelle ausgeben.

---

## Check 1: Daemons / Hintergrundprozesse

{{DAEMON_LIST}}

```bash
# Für jeden Daemon prüfen ob Prozess läuft:
# ps aux | grep "{daemon-name}" | grep -v grep | head -1

# Wenn Lock-Files existieren:
# ls -la ./*.lock 2>/dev/null
```

Status-Spalten: ✅ Läuft | ❌ Down | ⚠️  Unbekannt

---

## Check 2: Daten-Freshness

Signal-/Daten-Files: {{SIGNAL_FILES}}

```bash
# Für jeden relevanten File: Alter in Minuten berechnen
# find signals/ -name "*.json" -newer /tmp/ref_5min 2>/dev/null
# (ref_5min = touch -t $(date -d '5 minutes ago' +%Y%m%d%H%M) /tmp/ref_5min)
```

Status-Spalten: ✅ Frisch (<5min) | ⚠️  Veraltet (5-30min) | ❌ Alt (>30min)

---

## Check 3: Dashboard / Health-Endpoint

Dashboard: {{DASHBOARD_URL}}

```bash
# Health-Check:
# curl -s -o /dev/null -w "%{http_code}" {{DASHBOARD_URL}}/health 2>/dev/null
```

---

## Check 4: Letzte Fehler im Log

Log-Files: {{LOG_FILES}}

```bash
# Fehler der letzten Stunde:
# grep -i "error\|fatal\|crash" {{LOG_FILES}} | tail -5
```

---

## Check 5: Git-Status

```bash
cd {PROJECT_PATH}
git status --short
git log --oneline -3
```

---

## Ausgabe-Format

Am Ende kompakte Tabelle ausgeben:

```
## {{PROJECT_NAME}} — System Status [ZEITSTEMPEL]

### Daemons
| Prozess | Status | Details |
|---------|--------|---------|
| [daemon1] | ✅ | PID 1234 |
| [daemon2] | ❌ | Prozess nicht gefunden |

### Daten-Freshness
| File / Quelle | Alter | Status |
|---------------|-------|--------|
| [file1] | 2min | ✅ |
| [file2] | 45min | ❌ |

### System
| Check | Status |
|-------|--------|
| Dashboard | ✅ Port 3000 erreichbar |
| Letzte Fehler | ⚠️  3 Errors in app.log |
| Git | Clean (3 uncommitted) |

### Zusammenfassung
[HEALTHY / DEGRADED / CRITICAL] — [1-Satz Zusammenfassung]
```

---

## TODO: Checks konkretisieren

Diese Datei wurde vom Bootstrap-Skill generiert. Konkrete Check-Commands
müssen noch eingefügt werden sobald das System entwickelt ist:

1. Check 1: Daemon-Commands mit echten Prozessnamen befüllen
2. Check 2: Signal-File-Pfade und Freshness-Schwellwerte anpassen
3. Check 3: Health-Endpoint URL eintragen wenn vorhanden
4. Check 4: Richtige Log-File-Pfade eintragen
5. Optional: `scripts/system-status.js` als automatisierter Runner
```
