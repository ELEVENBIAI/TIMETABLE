# Integration Test Skill — Bootstrap Template

## Bootstrap: Fragen an den Operator

Wenn der Operator `/integration-test` installieren möchte, stelle folgende Fragen
**bevor** das SKILL.md generiert wird:

```
Für den /integration-test Skill brauche ich kurze Infos:

1. Was sind deine 3-5 kritischen Tier-1 Checks?
   (Tier-1 = blockiert Issue-Close wenn rot)
   Beispiele: "API erreichbar", "Datenbank schreibt", "Hauptdaemon läuft",
              "Letztes Signal < 10min alt", "Kein offener Fehler im Log"

2. Was sind optionale Tier-2 Checks?
   (Tier-2 = Warnung, kein Blocker)
   Beispiele: "Log-Größe < 100MB", "Config-Version synchron", "Backup aktuell"

3. Soll /integration-test nach jedem /implement automatisch aufgerufen werden?
   (Ja → Hinweis in implement/SKILL.md ergänzen / Nein → manueller Aufruf)
```

Warte auf Antworten. Dann SKILL.md aus dem Skeleton unten generieren
und nach `{PROJECT_PATH}/.claude/skills/integration-test/SKILL.md` schreiben.
Platzhalter ersetzen:
- `{{PROJECT_NAME}}` → aus Phase 0 Info-Gathering
- `{{TIER1_CHECKS}}` → Antwort 1 als Bullet-Liste
- `{{TIER2_CHECKS}}` → Antwort 2 als Bullet-Liste
- `{{POST_IMPLEMENT}}` → "Ja" oder "Nein"

**Wenn Post-Implement = Ja:** In `.claude/skills/implement/SKILL.md` am Ende einen
Hinweis ergänzen: "Nach Abschluss: /integration-test ausführen und Ergebnis prüfen."

---

## Skeleton SKILL.md (wird generiert)

```markdown
---
name: integration-test
version: 1.0.0
description: Führt Integrationstests für {{PROJECT_NAME}} aus. Tier-1-Fehler blockieren Issue-Close, Tier-2-Warnungen müssen geprüft werden. Verwenden nach /implement oder bei Systemzweifel.
---

# /integration-test — System-Integrationstests

**Auslöser:** Nach jeder /implement-Umsetzung, nach Breakfix-Fixes, oder wenn das
System sich komisch verhält.

**Ziel:** Schnell prüfen ob das System als Ganzes korrekt funktioniert — nicht ob
einzelne Code-Units stimmen (das ist Unit Testing).

---

## Tier-Konzept

| Tier | Bedeutung | Bei Fehler |
|------|-----------|-----------|
| **Tier-1** | Kritisch — Kernfunktion defekt | Issue NICHT schließen, sofort /breakfix |
| **Tier-2** | Warnung — Nebenfunktion betroffen | Prüfen + dokumentieren, kein harter Stopper |

---

## Tier-1 Checks — KRITISCH (müssen alle grün sein)

{{TIER1_CHECKS}}

Für jeden Check: ✅ OK | ❌ FAIL

```bash
# TODO: Konkrete Check-Commands ergänzen
# Beispiel-Struktur:
#
# Check: "API erreichbar"
# Command: curl -s -o /dev/null -w "%{http_code}" https://api.example.com/health
# Erwartung: 200
#
# Check: "Datenbank schreibbar"
# Command: node -e "const db=require('./lib/db'); db.insert({test:1}); console.log('OK')"
# Erwartung: OK
```

**Wenn ein Tier-1 Check rot:** STOP. Issue nicht schließen. /breakfix starten.

---

## Tier-2 Checks — WARNUNG (dokumentieren wenn rot)

{{TIER2_CHECKS}}

```bash
# TODO: Konkrete Check-Commands ergänzen
```

**Wenn ein Tier-2 Check rot:** Notieren, als Issue anlegen (P3), dann weitermachen.

---

## Ergebnis-Tabelle (Ausgabe am Ende)

Nach allen Checks diese Tabelle ausgeben:

```
## Integration Test Ergebnis — {{PROJECT_NAME}}

| Check | Tier | Status | Details |
|-------|------|--------|---------|
| [Check 1] | T1 | ✅ | — |
| [Check 2] | T1 | ❌ | Fehler-Details |
| [Check 3] | T2 | ⚠️  | Warnung-Details |

Tier-1: X/Y grün
Tier-2: X/Y grün

Empfehlung: [ISSUE SCHLIESSBAR / BREAKFIX NÖTIG / WARNUNGEN PRÜFEN]
```

---

## TODO: Checks konkretisieren

Diese Datei wurde vom Bootstrap-Skill generiert. Konkrete Check-Commands
müssen noch eingefügt werden sobald das System entwickelt ist.

Vorgehen:
1. Für jeden Tier-1 Check: bash-Command schreiben der OK/FAIL zurückgibt
2. Für jeden Tier-2 Check: bash-Command schreiben der OK/WARN zurückgibt
3. Optional: `scripts/integration-test.js` als automatisierter Runner

Post-Implement Integration Test: {{POST_IMPLEMENT}}
```
