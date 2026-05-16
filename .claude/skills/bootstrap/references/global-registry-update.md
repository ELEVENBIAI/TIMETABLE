# Global Registry Update — Neues Projekt registrieren

Nach dem Setup eines neuen Projekts werden diese Register-Stellen aktualisiert:

## 1. SecondBrain (Obsidian) — Projekt-Hub anlegen

**Nur wenn `OBSIDIAN_VAULT` in Block B gesetzt wurde.**

Pfad: `{OBSIDIAN_VAULT}/02 Projekte/{PROJECT_NAME}/`

Ordner-Struktur:
```
{OBSIDIAN_VAULT}/02 Projekte/{PROJECT_NAME}/
├── {PROJECT_NAME} - PMO HUB.md        ← Projekt-Hub mit Phase-Tabelle, Status, Referenzen
├── Architektur-Vorgaben.md            ← Skelett (wird bei /ideation gefuellt)
├── Components/                        ← lebende Doku pro Komponente (wenn Block C = ja)
├── Decisions/                         ← ADRs (wird beim ersten ADR gefuellt)
├── Meetings/                          ← Meeting-Protokolle
└── Research/                          ← Deep-Research-Outputs (/research)
```

**PMO HUB Template:**

```markdown
---
tags: [projekt, {{PROJECT_NAME_LOWER}}]
status: aktiv
phase: konzeption
erstellt: {{TODAY}}
aktualisiert: {{TODAY}}
language: {{PRIMARY_LANG}}
source: bootstrap
---

# {{PROJECT_NAME}} — PMO Hub

> {{PROJECT_DESC}}

## Projektziel

[Ein-Satz-Ziel — vom Operator zu verfeinern]

## Status

**Phase:** Konzeption → Phase 0

## Stack

Siehe `ARCHITECTURE_DESIGN.md` im Repo ({{GITHUB_REPO}}).

## Repositories & Code

| Was | Pfad / URL |
|-----|------------|
| GitHub Repo | {{GITHUB_REPO}} |
| Lokaler Pfad | `{{PROJECT_PATH}}` |
| Backlog | {{BACKLOG_URL}} |
| Issue-Prefix | `{{ISSUE_PREFIX}}` |

## Aktivierte Add-ons

{{ADDONS_LIST}}

## Installierte Skills

{{SKILLS_LIST}}

## Doku-Architektur (3 Schichten + Hub)

- **Hub (Repo):** `ARCHITECTURE_DESIGN.md` — zentraler Einstieg, §9 Referenzen
- **Story-Specs (Repo):** `specs/{{ISSUE_PREFIX}}XXX.md`
- **Component-Docs (Obsidian):** `Components/*.md`
- **Architektur-Vorgaben (Obsidian):** diese Seite → `Architektur-Vorgaben.md`

## Learning-Loop

Level: {{LEARNING_LOOP_LEVEL}}
Pfad: `{{PROJECT_PATH}}/journal/` + `04 Ressourcen/{{PROJECT_NAME}}/learnings.md` (Cross-Link)

## Offene Punkte

- [ ] Erste Story via /ideation
- [ ] ggf. Linear-Labels anpassen
- [ ] ggf. Obsidian-Projekt-Ordner mit Research fuellen

## Verknuepfungen

- [[Architektur-Vorgaben]]
- [[../../../../../04 Ressourcen/{{PROJECT_NAME}}/learnings]]
```

## 2. Projekt-Index (Obsidian)

**Nur wenn `OBSIDIAN_VAULT` gesetzt.**

Datei: `{OBSIDIAN_VAULT}/00 Kontext/Projekte.md`

Falls existiert: Zeile ergaenzen in der Projekt-Tabelle. Falls nicht: Datei anlegen mit Basis-Struktur.

```markdown
| {{PROJECT_NAME}} | [[02 Projekte/{{PROJECT_NAME}}/{{PROJECT_NAME}} - PMO HUB\|Hub]] | {{PROJECT_PATH}} | {{VERSION_START}} | aktiv |
```

## 3. Globale CLAUDE.md (optional)

**Nur wenn der Operator eine globale `~/.claude/CLAUDE.md` mit Projekt-Tabelle hat.**

Der Skill zeigt den neuen Eintrag vor:

```markdown
| **{{PROJECT_NAME}}** | `{{PROJECT_PATH}}` | {{GITHUB_REPO}} | {{OBSIDIAN_PROJECT_PATH}} |
```

Operator bestaetigt Einfuegepunkt. Skill schreibt dann die Zeile — oder zeigt sie zum manuellen Einfuegen.

## 4. Lokales Projekt-Memory (optional)

**Nur wenn der Operator `~/.claude/projects/` als Memory nutzt.**

Die Memory-Strategie ist je nach Setup unterschiedlich. Der Skill legt optional eine Memory-Datei an:

Pfad: `~/.claude/projects/<sanitized-project-path>/memory/project_init.md`

```markdown
---
name: {{PROJECT_NAME}} — Initial Setup
description: Setup-Status und Quick Reference
type: project
---

**Projekt:** {{PROJECT_NAME}}
**Pfad:** {{PROJECT_PATH}}
**GitHub:** {{GITHUB_REPO}}
**Obsidian:** {{OBSIDIAN_PROJECT_PATH}}
**Backlog:** {{BACKLOG_TOOL}} ({{BACKLOG_URL}})
**Version:** {{VERSION_START}}
**Setup-Datum:** {{TODAY}}

## Installierte Skills
{{SKILLS_LIST}}

## Aktivierte Add-ons
{{ADDONS_LIST}}

## Governance-Hooks
- spec-gate.sh: aktiv
- doc-version-sync.sh: aktiv
{{ORPHAN_CHECK_NOTE}}

## Learning-Loop
Level: {{LEARNING_LOOP_LEVEL}}

## Ausstehend
- [ ] Erste Story via /ideation
{{OUTSTANDING_ITEMS}}
```

## 5. Abschluss-Check

Nach der Registry-Aktualisierung zeigt der Skill eine Zusammenfassung:

```
Registry-Update abgeschlossen:
  ✅ Obsidian Projekt-Hub: {{OBSIDIAN_PROJECT_PATH}}
  ✅ Obsidian Projekt-Index: 00 Kontext/Projekte.md
  [✅ / ⏭]  Globale CLAUDE.md-Zeile hinzugefuegt
  [✅ / ⏭]  Projekt-Memory angelegt: ~/.claude/projects/.../project_init.md
```

Wenn Obsidian-Vault nicht gesetzt wurde, werden die Obsidian-Teile uebersprungen — dann ist die `PMO HUB`-Funktion teilweise im Repo selbst abgedeckt (via `ARCHITECTURE_DESIGN.md` Hub).
