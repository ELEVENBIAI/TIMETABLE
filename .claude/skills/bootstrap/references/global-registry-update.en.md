# Global Registry Update — Register a new project

After setting up a new project, these registry points are updated:

## 1. SecondBrain (Obsidian) — Project hub

**Only if `OBSIDIAN_VAULT` was set in Block B.**

Path: `{OBSIDIAN_VAULT}/02 Projekte/{PROJECT_NAME}/`

Folder structure:
```
{OBSIDIAN_VAULT}/02 Projekte/{PROJECT_NAME}/
├── {PROJECT_NAME} - PMO HUB.md        ← Project hub with phase table, status, references
├── Architektur-Vorgaben.md            ← Skeleton (filled via /ideation)
├── Components/                        ← Living per-component docs (if Block C = yes)
├── Decisions/                         ← ADRs (filled on first ADR)
├── Meetings/                          ← Meeting notes
└── Research/                          ← Deep research outputs (/research)
```

**PMO HUB template:**

```markdown
---
tags: [project, {{PROJECT_NAME_LOWER}}]
status: active
phase: conception
created: {{TODAY}}
updated: {{TODAY}}
language: {{PRIMARY_LANG}}
source: bootstrap
---

# {{PROJECT_NAME}} — PMO Hub

> {{PROJECT_DESC}}

## Project goal

[One-sentence goal — operator to refine]

## Status

**Phase:** Conception → Phase 0

## Stack

See `ARCHITECTURE_DESIGN.md` in the repo ({{GITHUB_REPO}}).

## Repositories & code

| What | Path / URL |
|------|------------|
| GitHub repo | {{GITHUB_REPO}} |
| Local path | `{{PROJECT_PATH}}` |
| Backlog | {{BACKLOG_URL}} |
| Issue prefix | `{{ISSUE_PREFIX}}` |

## Active add-ons

{{ADDONS_LIST}}

## Installed skills

{{SKILLS_LIST}}

## Doc architecture (3 layers + hub)

- **Hub (repo):** `ARCHITECTURE_DESIGN.md` — central entry, §9 references
- **Story specs (repo):** `specs/{{ISSUE_PREFIX}}XXX.md`
- **Component docs (Obsidian):** `Components/*.md`
- **Architecture guidelines (Obsidian):** this page → `Architektur-Vorgaben.md`

## Learning loop

Level: {{LEARNING_LOOP_LEVEL}}
Path: `{{PROJECT_PATH}}/journal/` + `04 Ressourcen/{{PROJECT_NAME}}/learnings.md` (cross-link)

## Open items

- [ ] First story via /ideation
- [ ] Adjust backlog labels as needed
- [ ] Fill Obsidian project folder with research as needed

## Links

- [[Architektur-Vorgaben]]
- [[../../../../../04 Ressourcen/{{PROJECT_NAME}}/learnings]]
```

## 2. Project index (Obsidian)

**Only if `OBSIDIAN_VAULT` is set.**

File: `{OBSIDIAN_VAULT}/00 Kontext/Projekte.md`

If exists: add row in project table. If not: create file with base structure.

```markdown
| {{PROJECT_NAME}} | [[02 Projekte/{{PROJECT_NAME}}/{{PROJECT_NAME}} - PMO HUB\|Hub]] | {{PROJECT_PATH}} | {{VERSION_START}} | active |
```

## 3. Global CLAUDE.md (optional)

**Only if the operator has a global `~/.claude/CLAUDE.md` with a project table.**

The skill presents the new entry:

```markdown
| **{{PROJECT_NAME}}** | `{{PROJECT_PATH}}` | {{GITHUB_REPO}} | {{OBSIDIAN_PROJECT_PATH}} |
```

Operator confirms insertion point. Skill writes the line — or presents it for manual insertion.

## 4. Local project memory (optional)

**Only if the operator uses `~/.claude/projects/` for memory.**

Memory strategy depends on setup. Skill optionally creates:

Path: `~/.claude/projects/<sanitized-project-path>/memory/project_init.md`

```markdown
---
name: {{PROJECT_NAME}} — Initial Setup
description: Setup status and quick reference
type: project
---

**Project:** {{PROJECT_NAME}}
**Path:** {{PROJECT_PATH}}
**GitHub:** {{GITHUB_REPO}}
**Obsidian:** {{OBSIDIAN_PROJECT_PATH}}
**Backlog:** {{BACKLOG_TOOL}} ({{BACKLOG_URL}})
**Version:** {{VERSION_START}}
**Setup date:** {{TODAY}}

## Installed skills
{{SKILLS_LIST}}

## Active add-ons
{{ADDONS_LIST}}

## Governance hooks
- spec-gate.sh: active
- doc-version-sync.sh: active
{{ORPHAN_CHECK_NOTE}}

## Learning loop
Level: {{LEARNING_LOOP_LEVEL}}

## Outstanding
- [ ] First story via /ideation
{{OUTSTANDING_ITEMS}}
```

## 5. Final check

After registry update, the skill shows a summary:

```
Registry update complete:
  ✅ Obsidian project hub: {{OBSIDIAN_PROJECT_PATH}}
  ✅ Obsidian project index: 00 Kontext/Projekte.md
  [✅ / ⏭]  Global CLAUDE.md line added
  [✅ / ⏭]  Project memory created: ~/.claude/projects/.../project_init.md
```

If the Obsidian vault is not set, the Obsidian parts are skipped — the PMO HUB function is then partially covered in the repo itself (via `ARCHITECTURE_DESIGN.md` hub).
