# {Feature Name}

> **Issue:** ELE-XXX | **Erstellt:** {Datum} | **Status:** Draft / Approved / Done

## Agent-Pattern

> **PFLICHT — vor dem Start ausfüllen. Wird von spec-gate.sh erzwungen.**

- [ ] **Solo** — 1 klar abgegrenzte Story, <5 Dateien, keine parallelen Komponenten
- [ ] **Subagent** — isolierter Task / Einzelrecherche / Explore-Auftrag
- [ ] **Agent-Team** — >3 unabhängige Tasks ODER Debugging mit unklarer Ursache ODER Cross-Layer
- [ ] **Parallel-Subagents** — mehrere unabhängige Recherchen gleichzeitig

**Gewähltes Pattern:** [Solo / Subagent / Agent-Team / Parallel-Subagents]
**Begründung:** [Warum dieses Pattern? Tasks zählen, Trigger-Bedingung benennen]
**Team-Komposition:** [Nur bei Agent-Team: z.B. "Lead (Sonnet) + Explore (Haiku) + Plan (Sonnet)" — sonst "n/a"]

---

## Why

[1-2 Sätze: Welches Problem wird gelöst? Warum jetzt?]

## What

[Konkretes Deliverable. Woran erkennt man, dass es fertig ist?]

## Constraints

### Must

- Bestehende Patterns/Conventions einhalten
- Config SSoT in lib/config.js
- TypeScript — keine `any`-Types ohne Begründung

### Must Not

- Keine neuen Dependencies ohne Begründung
- Kein Code außerhalb des Scopes ändern
- Keine Hardcoded Values — alles über config.js
- Keine Secrets in Code/Logs

### Out of Scope

- [Explizit ausgeschlossene Features/Änderungen]

## Current State

**Relevante Dateien:**

- `path/to/file.ts` — [was die Datei tut, warum relevant]

**Bestehende Patterns:**

- [Konvention die eingehalten werden muss, mit Beispiel-Datei]

**Architektur-Dimensionen (betroffen):**

- [Welche Dimensionen sind relevant? Kurze Einschätzung]

## Tasks

> Jeder Task: max 3 Dateien, unter 30min, unabhängig committbar.
> Tasks die zusammen ausgeliefert werden müssen → gruppieren.
> Letzter Task = IMMER Dokumentation + Config.

### T0: Prozesskatalog-Check

- [ ] Gibt es einen ähnlichen Prozess der erweitert werden kann? (Referenz)
- [ ] Welche bestehenden Dateien werden berührt?

### T1: [Erster Task]

- [ ] [Konkrete Aufgabe]
- [ ] Verify: [Wie prüfen wir dass T1 korrekt ist?]

### T2: [Zweiter Task]

- [ ] [Konkrete Aufgabe]
- [ ] Verify: [Wie prüfen wir dass T2 korrekt ist?]

### T_last: Dokumentation + Config

- [ ] ARCHITECTURE_DESIGN.md §9 Referenzen um neue Dateien ergänzen
- [ ] INDEX.md um neue Dateien ergänzen
- [ ] COMPONENT_INVENTORY.md aktualisieren
- [ ] CHANGELOG.md Eintrag
- [ ] config.js VERSION bumpen
- [ ] Alle DOC_FILES auf neue VERSION setzen
- [ ] Obsidian Component-Doc updaten (node lib/doc-sync.js falls aktiv)

## Dokumentations-Impact

| Datei                    | Was ändern                          |
| ------------------------ | ----------------------------------- |
| `ARCHITECTURE_DESIGN.md` | §9 Referenzen: neue Datei eintragen |
| `INDEX.md`               | Neue Datei eintragen                |
| `CHANGELOG.md`           | Version-Eintrag                     |

## Abhängigkeiten

- **Blockiert durch:** —
- **Blockiert:** —

## Acceptance Criteria

- [ ] [Messbares Kriterium 1]
- [ ] [Messbares Kriterium 2]
- [ ] spec-gate.sh + doc-version-sync.sh grün (kein blockierter Commit)
- [ ] Integration-Test: Neue Komponente abgedeckt oder Test erweitert
- [ ] ESLint + TypeScript: 0 Errors
- [ ] Obsidian Component-Doc aktuell (T_last)
