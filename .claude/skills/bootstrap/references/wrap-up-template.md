# Wrap-Up Skill — Bootstrap Template

## Bootstrap: Keine Fragen nötig

Der `/wrap-up` Skill ist vollständig generisch und braucht keine projektspezifischen
Fragen. Bootstrap verlinkt ihn direkt via Symlink oder kopiert ihn ins Projekt.

**Anpassen nach Installation (optional):**
- In `SKILL.md`: Memory-Pfad anpassen wenn nicht Standard
- In `SKILL.md`: Synthese-Hinweise um projektspezifische Schwerpunkte ergänzen

---

## Skeleton SKILL.md (wird per Symlink genutzt oder kopiert)

```markdown
---
name: wrap-up
version: 1.0.0
description: Session-Abschluss für {{PROJECT_NAME}}. Zusammenfassung was entschieden,
  gebaut und gelernt wurde — persistent in Auto-Memory gespeichert.
  Verwenden wenn der Operator "Exit", "Tschüss", "Ende", "fertig" oder "/wrap-up" sagt.
  Verhindert dass wichtige Session-Erkenntnisse verloren gehen.
tools: [Read, Write, Edit, Bash, Glob, Grep]
---

# /wrap-up — Session-Abschluss

**Auslöser:** "Exit", "Tschüss", "Ende", "Wrap up", "Session beenden", "/wrap-up"

**Zweck:** Jede Session endet mit einem strukturierten Memory-Update damit
die nächste Session sofort wieder im Kontext ist — ohne wiederholtes Briefing.

---

## Schritt 1: Session-Aktivität lesen

```bash
# Was wurde in dieser Session verändert?
cd {{PROJECT_PATH}} && git log --oneline -10
git diff HEAD~5 HEAD --stat 2>/dev/null || git diff --stat
```

Lies parallel:
- Memory-Index: `/root/.claude/projects/{{MEMORY_PATH}}/memory/MEMORY.md`
- Aktuelle offene Issues: Linear Backlog (wenn MCP verfügbar)

---

## Schritt 2: Synthese

Beantworte mental diese Fragen:

| Frage | Was speichern |
|-------|---------------|
| Was wurde **entschieden**? | Architektur-Entscheidungen, Weichenstellungen, ADRs |
| Was wurde **gebaut**? | Fertige Features, Stories, Fixes (nur wenn abgeschlossen) |
| Was ist **offen**? | Angefangenes, Blocker, nächste Schritte |
| Was wurde **gelernt**? | Überraschungen, Korrekturen, neue Patterns |
| Welches **Feedback** kam? | Korrekturen durch Operator, bestätigte Ansätze |

**Nicht speichern:**
- Was bereits in Git-History sichtbar ist
- Temporäre Debugging-Schritte
- Informationen die aus dem Code direkt lesbar sind

---

## Schritt 3: Memory schreiben

Memory-Verzeichnis: `/root/.claude/projects/{{MEMORY_PATH}}/memory/`

Für jede relevante Erkenntnis eine passende Memory-Datei schreiben:

**Typ `project`** — Projektentscheidungen, Meilensteine:
```yaml
---
name: [Kurztitel]
description: [Ein-Zeilen-Beschreibung — wird in MEMORY.md Index genutzt]
type: project
---
[Fakten/Entscheidung]

**Why:** [Motivation oder Constraint]
**How to apply:** [Wie das zukünftige Sessions beeinflusst]
```

**Typ `feedback`** — Korrekturen oder bestätigte Ansätze vom Operator:
```yaml
---
name: feedback_[thema]
description: [Regel in einem Satz]
type: feedback
---
[Die Regel selbst]

**Why:** [Warum die Regel gilt]
**How to apply:** [Wann/wo sie greift]
```

**Typ `user`** — Erkenntnisse über Tobi/Operator:
```yaml
---
name: user_[thema]
description: [Kurz was gelernt wurde]
type: user
---
[Was über den Operator gelernt wurde]
```

**Typ `reference`** — Externe Ressourcen, URLs, Tools:
```yaml
---
name: reference_[thema]
description: [Was sich hinter diesem Pointer verbirgt]
type: reference
---
[URL/Pfad + Kontext]
```

Nach jedem geschriebenen Memory: Eintrag in `MEMORY.md` hinzufügen oder aktualisieren.
Format: `- [Titel](dateiname.md) — Ein-Zeilen-Hook (max 150 Zeichen)`

---

## Schritt 4: Bestätigung

Ausgabe:

```
## Session Wrap-Up ✓

**Entschieden:** [1-3 Stichpunkte]
**Gebaut:** [1-3 Stichpunkte oder "nichts committed"]
**Offen für nächste Session:** [Top 1-2 Punkte]
**Memory-Updates:** [N Einträge aktualisiert/neu]
```

Dann: "Session beendet. Bis zum nächsten Mal!"
```

---

## Aktivierung in CLAUDE.md

Nach Installation diesen Satz in CLAUDE.md §3 eintragen:

```
> **PFLICHT bei Session-Ende:** Bei "Exit", "Tschüss", "Ende", "fertig" → `/wrap-up` IMMER zuerst.
```

(Bootstrap Phase 1 erledigt das automatisch wenn wrap-up gewählt wurde.)
