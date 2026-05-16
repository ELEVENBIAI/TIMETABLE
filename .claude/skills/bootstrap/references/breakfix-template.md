# Breakfix Skill — Bootstrap Template

## Bootstrap: Fragen an den Operator

Wenn der Operator `/breakfix` installieren möchte, stelle folgende Fragen
**bevor** das SKILL.md generiert wird:

```
Für den /breakfix Skill brauche ich kurze Infos:

1. Issue-Prefix für Incidents? (z.B. INC-, BUG- — Default: INC-)
2. Verzeichnis für Incident-Files? (Default: journal/incidents/)
3. Laufen Daemons/Hintergrundprozesse die gemonitort werden sollen?
   (Ja → welche? / Nein → Diagnose-Schritt bleibt generisch)
4. Welche Log-Files sind für die Diagnose relevant?
   (z.B. trading.log, app.log, oder: "noch unklar")
```

Warte auf Antworten. Dann SKILL.md aus dem Skeleton unten generieren
und nach `{PROJECT_PATH}/.claude/skills/breakfix/SKILL.md` schreiben.
Platzhalter ersetzen:
- `{{ISSUE_PREFIX}}` → Antwort 1 (Default: INC-)
- `{{INCIDENT_DIR}}` → Antwort 2 (Default: journal/incidents/)
- `{{DAEMON_LIST}}` → Antwort 3 (kommagetrennt, oder "noch definieren")
- `{{LOG_FILES}}` → Antwort 4 (oder "noch definieren")
- `{{LINEAR_TEAM}}` → aus Phase 0 Info-Gathering
- `{{PROJECT_NAME}}` → aus Phase 0 Info-Gathering

---

## Skeleton SKILL.md (wird generiert)

```markdown
---
name: breakfix
version: 1.0.0
description: Incident Response Workflow für {{PROJECT_NAME}}. 7-Schritte-Prozess: Detect, Diagnose, Fix, Verify, Document, Prevent, CLAUDE.md-Regel. Liest vorherige Incidents bevor neue Diagnose gestartet wird.
---

# /breakfix — Incident Response

**Auslöser:** Wenn etwas kaputt ist, das System sich falsch verhält, oder Tobi "/breakfix" sagt.

---

## Vor dem Start: Vorherige Incidents lesen

```bash
ls {{INCIDENT_DIR}} 2>/dev/null | tail -5
```

Lese die letzten 2-3 Incident-Files. Prüfe ob bekannte Muster vorhanden sind.
Bekannte Incidents helfen bei der Diagnose.

---

## 7-Schritte-Prozess

### Schritt 1: DETECT — Was ist das Problem?

- Fehlermeldung / Symptom vom Operator aufnehmen
- System-Status prüfen:
```bash
# Laufende Prozesse prüfen
ps aux | grep -E "{{DAEMON_LIST}}" | grep -v grep
# Letzte Log-Einträge
tail -50 {{LOG_FILES}}
```
- Telegram-Alerts der letzten Stunde prüfen (falls aktiv)
- Zeitpunkt des ersten Auftretens eingrenzen

**Ergebnis:** Klare Fehlerbeschreibung in einem Satz.

---

### Schritt 2: DIAGNOSE — Was ist die Ursache?

Systematische Ursachensuche (Root Cause Analysis):

1. **Prozesse alive?**
```bash
# Für jeden relevanten Daemon prüfen:
# {{DAEMON_LIST}}
```

2. **Letzte Änderungen?**
```bash
git log --oneline -10
git diff HEAD~1
```

3. **Fehler im Log?**
```bash
grep -i "error\|fatal\|crash" {{LOG_FILES}} | tail -20
```

4. **Ressourcen ok?**
```bash
df -h && free -m
```

**Ergebnis:** Root Cause identifiziert. Hypothese formulieren.

---

### Schritt 3: FIX — Problem beheben

- Fix implementieren (kleinst mögliche Änderung)
- Nur das Problem lösen — kein Refactoring nebenbei
- Bei Unsicherheit: erst Backup/Snapshot

```bash
# Nach dem Fix: Syntax-Check falls Code geändert
# node -c {file} (Node.js) / python -m py_compile {file} (Python)
```

---

### Schritt 4: VERIFY — Fix funktioniert?

- System neu starten (falls nötig)
- Ursprüngliches Symptom prüfen: ist es weg?
- Keine neuen Fehler im Log?
- 5 Minuten beobachten

```bash
tail -f {{LOG_FILES}}
```

**Ergebnis:** Fix verifiziert (Ja/Nein). Bei Nein → zurück zu Schritt 2.

---

### Schritt 5: DOCUMENT — Incident dokumentieren

Incident-File erstellen:

```bash
mkdir -p {{INCIDENT_DIR}}
# Nächste INC-Nummer ermitteln:
ls {{INCIDENT_DIR}} | grep -oE '[0-9]+' | sort -n | tail -1
```

Erstelle `{{INCIDENT_DIR}}/{{ISSUE_PREFIX}}XXX.md`:

```markdown
# {{ISSUE_PREFIX}}XXX — [Titel des Incidents]

**Datum:** YYYY-MM-DD HH:MM UTC
**Schwere:** [P1-kritisch / P2-hoch / P3-mittel]
**Dauer:** [Minuten]

## Symptom
[Was war kaputt?]

## Root Cause
[Warum ist es kaputt gegangen?]

## Fix
[Was wurde geändert? Commit-Hash?]

## Zeitlinie
- HH:MM — Incident bemerkt
- HH:MM — Root Cause identifiziert
- HH:MM — Fix deployed
- HH:MM — Verifiziert

## Lessons Learned
[Was kann man daraus lernen?]
```

Linear-Issue anlegen: `{{LINEAR_TEAM}}/{{ISSUE_PREFIX}}XXX` mit Label `bug`.

---

### Schritt 6: PREVENT — Wiederholung verhindern

Frage: "Was hätte diesen Incident verhindert?"

- [ ] Monitoring-Check fehlt? → `agents/self-healing.js` erweitern
- [ ] Config-Validierung fehlt? → Startup-Check ergänzen
- [ ] Automatischer Restart? → Cron/Daemon-Starter einrichten
- [ ] Besseres Error-Handling im Code?

Konkrete Maßnahme als Linear-Issue anlegen wenn Aufwand > 30 Minuten.

---

### Schritt 7: CLAUDE.md REGEL — Lesson learned festhalten (PFLICHT)

**Letzter Schritt immer — ohne Ausnahme:**

1. Frage: "Welche CLAUDE.md-Regel hätte diesen Incident verhindert?"
2. Regel formulieren: `**NIEMALS [X] ohne [Y]** — [Kurzbegründung]`
3. Regel in CLAUDE.md §4 "Kern-Regeln" eintragen
4. Regel im Incident-File dokumentieren:
   ```
   ## CLAUDE.md-Regel
   **NIEMALS [X] ohne [Y]** — [Kurzbegründung]
   (ergänzt nach {{ISSUE_PREFIX}}XXX, {{TODAY}})
   ```

Operator informieren: "Schritt 7 abgeschlossen. Neue Regel: [Regel-Text]"

> **Ziel:** Jeder Incident macht das System dauerhaft resilienter.
> Ohne diesen Schritt wiederholt sich der Incident — der Root Cause bleibt in der
> Governance unverankert und kann erneut auftreten.
> Nach 10 Incidents: 10 neue CLAUDE.md-Regeln = das System hat aus 10 Fehlern gelernt.

---

## Incident-Schwere-Definitionen

| Level | Kriterium | Reaktionszeit |
|-------|-----------|---------------|
| P1 — Kritisch | System komplett down, Datenverlust droht | Sofort |
| P2 — Hoch | Kernfunktion defekt, Workaround existiert | < 1 Stunde |
| P3 — Mittel | Nebenfunktion defekt, System läuft weiter | < 1 Tag |

---

## TODO: Projekt-spezifisch anpassen

Diese Abschnitte müssen für {{PROJECT_NAME}} konkretisiert werden:

- `{{DAEMON_LIST}}` → Welche Prozesse laufen? (aktuell: Placeholder)
- `{{LOG_FILES}}` → Welche Logs sind relevant?
- Schritt 2: Weitere projekt-spezifische Diagnose-Checks ergänzen
- Schritt 4: Konkrete Verify-Commands für dein System
- Schwere-Definitionen: An domain-spezifische Kritikalität anpassen
```
