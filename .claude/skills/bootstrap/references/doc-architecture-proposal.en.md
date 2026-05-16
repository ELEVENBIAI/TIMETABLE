# Doc-Architecture Proposal — Block C

In Block C the bootstrap skill presents a concrete doc-architecture proposal that is confirmed or customized in the interview. Goal: **no orphan docs, central entry point, living component docs**.

## The 3 layers + hub

### Layer 1 — Story specs (repo)

- **Path:** `{PROJECT_PATH}/specs/<PREFIX>XXX.md`
- **Purpose:** One spec file per story, git-versioned. Required before every code change.
- **Trigger:** `spec-gate.sh` hook enforces it at machine level.
- **Template:** `references/file-templates.md` — `specs/TEMPLATE.md` section.

### Layer 2 — Component docs

- **If Obsidian active:** `{OBSIDIAN_VAULT}/02 Projekte/{PROJECT_NAME}/Components/*.md`
- **If Obsidian skipped:** `{PROJECT_PATH}/docs/components/*.md`
- **Purpose:** Living docs per component — stack, phase status, linked stories, open questions. Updated on every `/implement` (T_last requirement).

### Layer 3 — Architecture guidelines

- **If Obsidian active:** `{OBSIDIAN_VAULT}/02 Projekte/{PROJECT_NAME}/Architektur-Vorgaben.md`
- **If Obsidian skipped:** `{PROJECT_PATH}/docs/architecture-guidelines.md`
- **Purpose:** Consolidated leading principles, stack decisions, rejected alternatives. Filled via `/ideation` with research consolidation. ADR changes are propagated here.

### Hub — `ARCHITECTURE_DESIGN.md` (repo)

- **Path:** `{PROJECT_PATH}/ARCHITECTURE_DESIGN.md`
- **Purpose:** Central entry point for `/ideation`, `/architecture-review`, `/implement`. Links automatically to all other docs.
- **§9 References** is the mandatory section where every new `*.md` must be registered — enforced by the optional `orphan-check.sh` hook.

## Component skeleton proposal (per stack)

The skill proposes component names in Block C based on Block A stack choice:

| Stack | Proposed components |
|-------|---------------------|
| Node.js backend | `api.md`, `db.md`, `background-jobs.md`, `auth.md` |
| Frontend | `ui.md`, `state.md`, `routing.md`, `api-client.md` |
| Full-stack | `frontend.md`, `backend.md`, `api.md`, `db.md` |
| Python | `cli.md`, `core.md`, `integrations.md`, `data.md` |
| Other | Operator enters component names themselves |

Operator can:
- Accept proposal → skeletons are created
- Change names
- Enter own component list
- Add components later

## Component skeleton structure (frontmatter + sections)

Each component skeleton has this structure:

```markdown
---
tags: [project, {{PROJECT_NAME_LOWER}}, component, {{COMPONENT_NAME}}]
component: {{COMPONENT_NAME}}
phase-status: planned
created: {{TODAY}}
updated: {{TODAY}}
language: {{PRIMARY_LANG}}
related: "[[{{PROJECT_NAME}} - PMO HUB]]"
---

# {{COMPONENT_NAME}}

> [One-sentence purpose]

## Purpose

[What does the component do, what is its responsibility]

## Stack

| Function | Tool | Path |
|----------|------|------|
| [...]    | [...] | `backend/{{COMPONENT_NAME}}/` |

## Architecture

[ASCII flow diagram or description]

## Configuration

```bash
# .env variables
```

## Phase status

| Phase | Scope | Status |
|-------|-------|--------|
| 0 | ... | planned |

## Linked stories

_None yet. Added here during /implement for issues with label `{{COMPONENT_NAME}}`._

## Open questions / limitations

- [none yet]

## References

- [[Architektur-Vorgaben#{{COMPONENT_NAME}}]]
- ADRs: _(none component-specific yet)_
```

## Hub auto-linking

The skill writes initially in `ARCHITECTURE_DESIGN.md §9 References`:

```markdown
## 9. References (all files)

> **Mandatory:** every new file registered here — before git commit.
> (Enforced by `orphan-check.sh` if installed.)

### Docs (repo)
| File | Purpose |
|------|---------|
| `CLAUDE.md` | AI context, rules, governance |
| `SYSTEM_ARCHITECTURE.md` | Components table, flows, config |
| `ARCHITECTURE_DESIGN.md` | This file (hub) |
| `INDEX.md` | All docs categorized |
| `COMPONENT_INVENTORY.md` | Components with status |
| `GOVERNANCE.md` | Development process |
| `SECURITY.md` | Threat model + policy |
| `CHANGELOG.md` | Version history |
| `specs/TEMPLATE.md` | Story template |

### Docs (Obsidian SecondBrain) — if active
| Path | Purpose |
|------|---------|
| `02 Projekte/{{PROJECT_NAME}}/{{PROJECT_NAME}} - PMO HUB.md` | Project hub |
| `02 Projekte/{{PROJECT_NAME}}/Architektur-Vorgaben.md` | Consolidated stack decisions |
| `02 Projekte/{{PROJECT_NAME}}/Components/*.md` | Living component docs |
| `02 Projekte/{{PROJECT_NAME}}/Decisions/` | ADRs |
```

## Hub auto-linking during the project

On every `/implement`:
- New component → add line in `ARCHITECTURE_DESIGN.md §9`
- `COMPONENT_INVENTORY.md` status update
- Update corresponding component doc in Obsidian (or `docs/components/`)

The `orphan-check.sh` hook (optional from Phase 4.6) enforces this — blocks commit if new `*.md` not in hub.

## Customization in interview

```
Does the 3-layer proposal fit?
  [yes] Skeletons are created, hub initially filled, orphan-check? yes/no
  [customize] Dialog about layers + paths
  [skip Obsidian] All docs only in repo, no SecondBrain layer
```

On `customize`:
- Which layers to omit? (e.g. "only story specs + hub")
- Alternative path for component docs? (e.g. `docs/` instead of Obsidian)
- Alternative component names?
- No hub auto-linking? (skip orphan-check)

On `skip Obsidian`: Block C becomes "Layer 1 + hub only in repo". Layer 2 + 3 move into `{PROJECT_PATH}/docs/`. No SecondBrain hub, only repo docs.
