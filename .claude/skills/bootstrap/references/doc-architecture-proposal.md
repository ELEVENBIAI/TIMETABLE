# Doku-Architektur-Vorschlag — Block C

Der Bootstrap-Skill praesentiert in Block C einen konkreten Doku-Architektur-Vorschlag, der im Interview bestaetigt oder angepasst wird. Ziel: **keine Waisen-Dokumente, zentraler Einstiegspunkt, lebende Komponenten-Doku**.

## Die 3 Schichten + Hub

### Schicht 1 — Story-Specs (Repo)

- **Pfad:** `{PROJECT_PATH}/specs/<PREFIX>XXX.md`
- **Zweck:** Pro Story ein Spec-File, git-versioniert. Pflicht vor jeder Code-Aenderung.
- **Trigger:** `spec-gate.sh` Hook erzwingt es maschinell.
- **Template:** `references/file-templates.md` — `specs/TEMPLATE.md` Sektion.

### Schicht 2 — Component-Docs

- **Wenn Obsidian aktiv:** `{OBSIDIAN_VAULT}/02 Projekte/{PROJECT_NAME}/Components/*.md`
- **Wenn Obsidian geskipped:** `{PROJECT_PATH}/docs/components/*.md`
- **Zweck:** Lebende Doku pro Komponente — Stack, Phase-Status, Verbundene Stories, offene Fragen. Wird bei jedem `/implement` aktualisiert (T_last-Pflicht).

### Schicht 3 — Architektur-Vorgaben

- **Wenn Obsidian aktiv:** `{OBSIDIAN_VAULT}/02 Projekte/{PROJECT_NAME}/Architektur-Vorgaben.md`
- **Wenn Obsidian geskipped:** `{PROJECT_PATH}/docs/architecture-guidelines.md`
- **Zweck:** Konsolidierte Leitprinzipien, Stack-Entscheidungen, verworfene Alternativen. Wird bei `/ideation` mit Research-Konsolidierung gefuellt. ADR-Aenderungen werden hier nachgezogen.

### Hub — `ARCHITECTURE_DESIGN.md` (Repo)

- **Pfad:** `{PROJECT_PATH}/ARCHITECTURE_DESIGN.md`
- **Zweck:** Zentraler Einstiegspunkt fuer `/ideation`, `/architecture-review`, `/implement`. Verlinkt automatisch auf alle anderen Docs.
- **§9 Referenzen** ist die Pflicht-Sektion, in der jede neue `*.md` eingetragen werden muss — erzwungen durch optionalen `orphan-check.sh` Hook.

## Component-Skelett-Vorschlag (je nach Stack)

Der Skill schlaegt in Block C Component-Namen vor, basierend auf Block A Stack-Wahl:

| Stack | Vorgeschlagene Components |
|-------|--------------------------|
| Node.js Backend | `api.md`, `db.md`, `background-jobs.md`, `auth.md` |
| Frontend | `ui.md`, `state.md`, `routing.md`, `api-client.md` |
| Full-Stack | `frontend.md`, `backend.md`, `api.md`, `db.md` |
| Python | `cli.md`, `core.md`, `integrations.md`, `data.md` |
| Anderes | Operator gibt Komponenten-Namen selbst ein |

Operator kann:
- Vorschlag akzeptieren → Skelette werden angelegt
- Namen aendern
- Eigene Komponenten-Liste angeben
- Komponenten spaeter hinzufuegen

## Component-Skelett-Struktur (Frontmatter + Sektionen)

Jedes Component-Skelett hat diese Struktur:

```markdown
---
tags: [projekt, {{PROJECT_NAME_LOWER}}, komponente, {{COMPONENT_NAME}}]
komponente: {{COMPONENT_NAME}}
phase-status: planned
erstellt: {{TODAY}}
aktualisiert: {{TODAY}}
language: {{PRIMARY_LANG}}
related: "[[{{PROJECT_NAME}} - PMO HUB]]"
---

# {{COMPONENT_NAME}}

> [Ein-Satz-Zweck]

## Zweck

[Was macht die Komponente, welche Verantwortung hat sie]

## Stack

| Funktion | Tool | Pfad |
|----------|------|------|
| [...]    | [...] | `backend/{{COMPONENT_NAME}}/` |

## Architektur

[Flow-Diagramm als ASCII oder Beschreibung]

## Konfiguration

```bash
# .env-Variablen
```

## Phase-Status

| Phase | Scope | Status |
|-------|-------|--------|
| 0 | ... | planned |

## Verbundene Stories

_Noch keine. Wird bei /implement von Issues mit Label `{{COMPONENT_NAME}}` hier eingetragen._

## Offene Fragen / Limitierungen

- [noch keine]

## Referenzen

- [[Architektur-Vorgaben#{{COMPONENT_NAME}}]]
- ADRs: _(noch keine komponenten-spezifisch)_
```

## Hub-Auto-Verlinkung

Der Skill schreibt initial in `ARCHITECTURE_DESIGN.md §9 Referenzen`:

```markdown
## 9. Referenzen (alle Dateien)

> **Pflicht:** Jede neue Datei sofort hier eintragen — vor dem git commit.
> (Erzwungen durch `orphan-check.sh` falls installiert.)

### Docs (Repo)
| Datei | Zweck |
|-------|-------|
| `CLAUDE.md` | AI-Kontext, Regeln, Governance |
| `SYSTEM_ARCHITECTURE.md` | Komponenten-Tabelle, Flows, Config |
| `ARCHITECTURE_DESIGN.md` | Dieses File (Hub) |
| `INDEX.md` | Alle Docs kategorisiert |
| `COMPONENT_INVENTORY.md` | Komponenten mit Status |
| `GOVERNANCE.md` | Entwicklungs-Prozess |
| `SECURITY.md` | Threat Model + Policy |
| `CHANGELOG.md` | Version-History |
| `specs/TEMPLATE.md` | Story-Template |

### Docs (Obsidian SecondBrain) — wenn aktiv
| Pfad | Zweck |
|------|-------|
| `02 Projekte/{{PROJECT_NAME}}/{{PROJECT_NAME}} - PMO HUB.md` | Projekt-Hub |
| `02 Projekte/{{PROJECT_NAME}}/Architektur-Vorgaben.md` | Konsolidierte Stack-Entscheidungen |
| `02 Projekte/{{PROJECT_NAME}}/Components/*.md` | Lebende Komponenten-Docs |
| `02 Projekte/{{PROJECT_NAME}}/Decisions/` | ADRs |
```

## Hub-Auto-Verlinkung im laufenden Projekt

Bei jedem `/implement`:
- Neue Component → `ARCHITECTURE_DESIGN.md §9` um Zeile ergaenzen
- `COMPONENT_INVENTORY.md` Status-Update
- Entsprechende Component-Doc in Obsidian (oder `docs/components/`) pflegen

Der `orphan-check.sh`-Hook (optional aus Phase 4.6) erzwingt das — blockiert Commit wenn neue `*.md` nicht im Hub.

## Anpassung im Interview

```
Passt der 3-Schichten-Vorschlag?
  [ja] Skelette werden angelegt, Hub initial befuellt, orphan-check? Ja/Nein
  [anpassen] Dialog zu Schichten + Pfaden
  [skip Obsidian] Alle Docs nur im Repo, keine SecondBrain-Schicht
```

Bei `anpassen`:
- Welche Schichten weglassen? (z.B. "nur Story-Specs + Hub")
- Alternativer Pfad fuer Component-Docs? (z.B. `docs/` statt Obsidian)
- Alternative Component-Namen?
- Keine Hub-Auto-Verlinkung? (orphan-check skip)

Bei `skip Obsidian`: Block C wird zu "Schicht 1 + Hub nur im Repo". Schicht 2 + 3 wandern in `{PROJECT_PATH}/docs/`. Kein SecondBrain-Hub, nur Repo-Doku.
