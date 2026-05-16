# Governance Blueprint — AI-Driven Development Lifecycle

**Version:** {{VERSION_START}} | **Updated:** {{TODAY}}
**Project:** {{PROJECT_NAME}}
**Purpose:** complete description of the governance setup so this framework can be transferred to any new project.

> **Instruction to Claude:** this document describes exactly how an AI-driven development lifecycle is built. When you get the request "set up this governance", read this document fully and implement it step by step. The operator will supply project-specific information (repository URL, Linear workspace, Obsidian vault path, etc.).

---

## Table of contents

1. [Overview: what the framework delivers](#1-overview)
2. [Documentation architecture](#2-documentation-architecture)
3. [Story governance](#3-story-governance)
4. [Development lifecycle](#4-development-lifecycle)
5. [Auto-healing & documentation sync](#5-auto-healing--documentation-sync)
6. [Inviolable rules](#6-inviolable-rules)
7. [Skills overview](#7-skills-overview)
8. [Setup guide for new projects](#8-setup-guide-for-new-projects)

---

## 1. Overview

This framework links four platforms into one end-to-end development lifecycle:

| Platform | Role |
|----------|------|
| **Linear** | Backlog, sprint planning, issue tracking — every work starts with an issue |
| **GitHub** | Code repository, versioning — no code without commit + push |
| **Obsidian** | Documentation, change log, knowledge management — external knowledge base |
| **Telegram** (optional) | Operator communication, alerts, system notifications |

### Core principles

1. **No code without an issue.** Every change is authorized by a Linear issue.
2. **No issue without structure.** Every story follows a defined template with mandatory sections.
3. **No issue without a spec file.** Before every implementation: create `specs/{{ISSUE_PREFIX}}XXX.md` from `specs/TEMPLATE.md` + operator OK. ⛔ Git hook `spec-gate.sh` blocks commit without spec.
4. **No change without documentation.** Every code change triggers doc updates.
5. **Single source of truth.** `config.js → VERSION` drives every version number centrally. ⛔ Git hook `doc-version-sync.sh` blocks VERSION bump without doc sync.
6. **Automatic monitoring.** Self-healing agent checks every 15 min whether docs and code are in sync.
7. **Reproducibility.** Every process is encoded as a skill and repeatable — manually or automatically.
8. **API documentation obligation.** Every new external API integration requires an entry in `API_INVENTORY.md`.

---

## 2. Documentation architecture

### 2.1 Registered documentation files

All documentation files are registered centrally in `config.js` in the `DOC_FILES` object. Every file has a `versionPattern` (regex) that the self-healing agent uses to extract the current version and compare it to `config.js VERSION`.

```javascript
// lib/config.js — SSoT for versioning
const VERSION = 'X.Y.Z';

const DOC_FILES = {
  'FILENAME.md': {
    path: 'FILENAME.md',
    versionPattern: /\*\*Version:\*\*\s*([\d.]+)/
  }
};
```

### 2.2 Required documentation files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Claude's identity + project rules (read at every session start) |
| `SYSTEM_ARCHITECTURE.md` | Components, data flow, external dependencies |
| `ARCHITECTURE_DESIGN.md` | Lead document — all ADRs, 8 sections |
| `COMPONENT_INVENTORY.md` | Complete file inventory (self-healing checks this) |
| `DEVELOPMENT_PROCESS.md` | Process reference |
| `GOVERNANCE.md` | This document — framework rules |
| `SECURITY.md` | Security policy, threat model |
| `CHANGELOG.md` | Version history (auto-maintained) |
| `API_INVENTORY.md` | All external APIs (mandatory update on new integrations) |
| `INDEX.md` | File index (Claude navigates using this) |

---

## 3. Story governance

Every story follows this path:

```
Idea → /ideation → Linear issue (with ACs + dependencies)
      → /backlog → prioritization
      → /implement → Spec file → code → commit → push
      → Linear issue closed → changelog entry
```

### Mandatory sections in every Linear issue

- **Was / What:** technical description of what will be built
- **Warum / Why:** business value or technical reason
- **Kontext / Context:** related issues, dependencies, background
- **Workflow-Type:** `direct` or `epic`
- **Komplexität / Complexity:** `low`, `medium`, `high`
- **Abhängigkeiten / Dependencies:** needs + affects (bidirectional)
- **Akzeptanzkriterien / Acceptance criteria:** testable checkbox list

See `references/issue-writing-guidelines-template.md` (English) or `.de.md` (German) for the full format.

---

## 4. Development lifecycle

The 7-stage SDLC (Google/Amazon/Meta standard) mapped to skills:

| # | Phase | Skill |
|---|-------|-------|
| 1 | Requirements | `/ideation` |
| 2 | Design | `/ideation` + `/architecture-review` |
| 3 | Planning | `/implement` + `/backlog` |
| 4 | Build | `/implement` |
| 5 | Review | `/implement` post-validation |
| 6 | Deploy | Git push + handoff |
| 7 | Monitor | Self-healing + `/status` + `/breakfix` |

Details: see bootstrap README.

---

## 5. Auto-healing & documentation sync

A cron agent (`agents/self-healing.js`) runs every 15 minutes and checks:

| Check | What it verifies | On failure |
|-------|-------------------|-----------|
| **M — Version match** | all DOC_FILES on same VERSION as config.js | auto-sync via doc-sync.js + alert |
| **U — Files present** | all components in COMPONENT_INVENTORY.md exist on disk | warning |
| **P — Processes alive** | all daemons running (lock files) | auto-restart with backoff |

Failures → Telegram alert (if configured) + log entry in `journal/self-healing.log`.

See `references/self-healing-template.js` for the full implementation skeleton.

---

## 6. Inviolable rules

Claude follows these rules across the entire framework — they are enforced by hooks where possible:

1. **Never implement without a Linear issue** — every change must be traceable
2. **Never close an issue without a changelog** — history must be complete
3. **Never change code without asking first** — human-in-the-loop for risk control
4. **Never claim "done" without git push** — code must always be on remote
5. **Never shorten an operator briefing in Linear** — original text is truth
6. **Never create an issue without labels** — labels are essential for filtering
7. **Never move sub-tasks directly to Done** — always through "In Progress" first
8. **Never add an API integration without updating the API inventory**

---

## 7. Skills overview

Installed via `/bootstrap` phase 2:

| Tier | Skills |
|------|--------|
| **Minimum** | `/ideation`, `/implement`, `/backlog` |
| **Standard** | + `/architecture-review`, `/sprint-review`, `/research`, `/breakfix`, `/wrap-up` |
| **Full** | + `/integration-test`, `/status`, `/grafana`, `/cloud-system-engineer`, `/visualize`, `/skill-creator` |

Each skill has its own README (EN + DE) and `overview.en.png` / `overview.png` sketches.

---

## 8. Setup guide for new projects

1. Run `/bootstrap` in a new Claude Code session (in an empty directory)
2. Answer 14 questions (project name, path, GitHub repo, Linear team, issue prefix, etc.)
3. Bootstrap creates all governance files, hooks, skills, self-healing agent
4. Connect Linear, GitHub, Obsidian, Telegram (optional)
5. Verify with `/status` — all green?
6. Start with `/ideation` — first story

**Full phase-by-phase guide:** see `bootstrap/README.md` (English section).

---

## Appendix: where to find everything

- **German original of this document:** `governance-template.md` (same folder)
- **Full setup walkthrough:** `bootstrap/README.md` (bilingual)
- **User handbook:** `HANDBUCH.md` at repo root (bilingual)
- **Artifact overview:** `bootstrap/docs/artifact-map.en.png` (visual map)
