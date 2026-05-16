# Agent-Patterns — Vorlage fuer .claude/rules/agent-patterns.md

> **Zweck:** Diese Datei definiert wann und wie Claude Code in Agent-Teams oder mit
> Sub-Agents arbeiten soll. Sie wird als `.claude/rules/agent-patterns.md` ins Projekt
> kopiert — Claude laedt sie nur bei Bedarf (Lazy Loading = null Token-Overhead im Normalfall).
>
> **Aktivierung:** Setzt `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1"` in `~/.claude/settings.json`
> voraus (wird im Bootstrap Pre-Flight geprueft und gesetzt).

---

## Entscheidungsbaum: Solo vs. Sub-Agent vs. Agent-Team

```
Aufgabe eingetroffen
        │
        ▼
Ist es eine einzelne, klar abgegrenzte Aufgabe mit <5 Dateien?
        │
       JA → Solo (kein Sub-Agent, kein Team)
        │
       NEIN
        │
        ▼
Gibt es >3 unabhaengige Teilaufgaben die GLEICHZEITIG bearbeitet werden koennen?
        │
       NEIN → Sub-Agent(s) — sequenziell oder wenige parallel
        │
       JA
        │
        ▼
Muessen Agents auf Zwischenergebnisse der anderen WARTEN?
        │
       NEIN → Parallel-Sub-Agents (mehrere Agent-Calls in einer Message)
        │
       JA → Agent-Team (TeamCreate — 3-5x teurer, nur wenn noetig)
```

---

## Die 4 Standard-Patterns

### Pattern 1: Neue Feature-Story

**Wann:** Neue Funktionalitaet mit unbekanntem Scope, mehrere Layer betroffen.

```
Team:
  Lead (Sonnet)     → Orchestration, finale Entscheidungen, Implementierung
  Explore (Haiku)   → Codebase-Erkundung: welche Dateien sind betroffen?
  Plan (Sonnet)     → Architektur-Entwurf und Task-Breakdown

Ablauf:
  1. Lead startet Explore-Agent: "Finde alle Dateien die {Feature} beinflussen"
  2. Lead startet Plan-Agent parallel: "Entwirf Architektur fuer {Feature}"
  3. Lead wartet auf beide → synthetisiert → implementiert
```

**Trigger in Spec:** `🤖 Agent-Team: Feature`

---

### Pattern 2: Architektur-Review / Competing Hypotheses

**Wann:** Entscheidung zwischen 2+ Ansaetzen, hohe Tragweite, unklare Praeferenz.

```
Team:
  Lead (Opus)       → Moderiert, stellt Entscheidung
  Debatter A (Sonnet) → Verteidigt Ansatz A (explizit einseitig!)
  Debatter B (Sonnet) → Verteidigt Ansatz B (explizit einseitig!)

Ablauf:
  1. Lead briefed beide Debatter mit ihrem jeweiligen Ansatz
  2. Beide arbeiten parallel — kein Kontakt zueinander
  3. Lead liest beide Gutachten → faellt Entscheidung mit Begruendung
```

**Trigger in Spec:** `🤖 Agent-Team: Architektur-Review`

---

### Pattern 3: Bugfix mit unklarer Ursache (Racing Hypotheses)

**Wann:** Incident oder Bug mit 2+ plausiblen Ursachen, Zeit ist kritisch.

```
Team:
  Lead (Sonnet)       → Koordiniert, merged Ergebnis, implementiert Fix
  Hypothese A (Sonnet) → Untersucht Ursache A (z.B. Race Condition)
  Hypothese B (Sonnet) → Untersucht Ursache B (z.B. Daten-Korruption)

Ablauf:
  1. Lead formuliert 2 konkurrierende Hypothesen
  2. Beide Hypothesen-Agents laufen GLEICHZEITIG (racing)
  3. Wer zuerst Beweise findet — gewinnt
  4. Lead implementiert Fix basierend auf Gewinner-Hypothese
```

**Trigger:** Bug mit >1 plausiblen Ursachen + unklarer Root Cause

---

### Pattern 4: Grosse Refactoring-Story

**Wann:** Refactoring ueber mehrere Komponenten, Tests muessen parallel laufen.

```
Team:
  Lead (Sonnet)    → Plant + koordiniert
  Builder (Sonnet) → Implementiert die Aenderungen
  Tester (Haiku)   → Prueft ob bestehende Tests noch gruenen

Ablauf:
  1. Lead erstellt Task-Liste fuer Builder
  2. Builder + Tester laufen parallel:
     Builder: implementiert Task 1
     Tester: validiert Task 0 (vorheriger)
  3. Bei Tester-Fehler: Builder wird unterbrochen, Fix zuerst
```

**Trigger in Spec:** `🤖 Agent-Team: Refactoring`

---

## Sub-Agent Regel (90% der Faelle)

Sub-Agents sind kein Agent-Team — sie sind einfache Helfer ohne Koordinations-Overhead.

```
// Sub-Agent IMMER bei:
// - Dateisuche und Codebase-Exploration (Explore-Subagent)
// - Grosse Text-Mengen analysieren (Logs, Diffs, Docs)
// - Einzelne, klar abgegrenzte Recherche-Aufgabe
// - Parallele unabhaengige Recherchen (mehrere Agent-Calls gleichzeitig)

// Sub-Agent NIE bei:
// - Aufgaben die <5 Minuten dauern → Solo ist schneller
// - Wenn Kontext aus Haupt-Session benoetigt wird → Pass Context explizit
```

---

## Kosten-Reminder

| Pattern | Relative Kosten | Wann nutzen |
|---------|----------------|-------------|
| Solo | 1x | Klare, kleine Aufgaben |
| Sub-Agent (einzeln) | ~1.2x | Exploration, Recherche |
| Parallel-Sub-Agents | ~1.5x | Unabhaengige parallele Aufgaben |
| Agent-Team | 3-5x | Nur bei echten Abhaengigkeiten zwischen Agents |

**Faustregel:** Im Zweifel Sub-Agent statt Team.
Agent-Team nur wenn Agents wirklich auf gegenseitige Ergebnisse warten muessen.
