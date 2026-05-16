# File templates for a new project

All templates use `{{PLACEHOLDERS}}` that must be filled with the project info collected in phase 0.

> **Note:** this file contains the English version of every template. The German original
> (`file-templates.md` in the same folder) has the complete content with German prose. When
> bootstrap generates project files, use whichever language matches the project's docs language.

---

## config.js

```javascript
// lib/config.js — Single Source of Truth
'use strict';

const VERSION = '{{VERSION_START}}';

// Documentation files — self-healing watches the version sync
const DOC_FILES = {
  'CLAUDE.md': {
    path: 'CLAUDE.md',
    versionPattern: /\*\*Version:\*\*\s*([\d.]+)/
  },
  'SYSTEM_ARCHITECTURE.md': {
    path: 'SYSTEM_ARCHITECTURE.md',
    versionPattern: /\*\*Version:\*\*\s*([\d.]+)/
  },
  'ARCHITECTURE_DESIGN.md': {
    path: 'ARCHITECTURE_DESIGN.md',
    versionPattern: /\*\*Version:\*\*\s*([\d.]+)/
  },
  'COMPONENT_INVENTORY.md': {
    path: 'COMPONENT_INVENTORY.md',
    versionPattern: /\*\*Version:\*\*\s*([\d.]+)/
  },
  'DEVELOPMENT_PROCESS.md': {
    path: 'DEVELOPMENT_PROCESS.md',
    versionPattern: /\*\*Version:\*\*\s*([\d.]+)/
  },
  'GOVERNANCE.md': {
    path: 'GOVERNANCE.md',
    versionPattern: /\*\*Version:\*\*\s*([\d.]+)/
  }
};

// Project-specific config (adapt)
const CONFIG = {
  PROJECT_NAME: '{{PROJECT_NAME}}',
  ISSUE_PREFIX: '{{ISSUE_PREFIX}}',
  GITHUB_REPO: '{{GITHUB_REPO}}',
};

module.exports = { VERSION, DOC_FILES, CONFIG };
```

---

## CLAUDE.md (minimum)

```markdown
# {{PROJECT_NAME}} — AI System Reference

**Version:** {{VERSION_START}} | **Updated:** {{TODAY}}
**Repository:** {{GITHUB_REPO}}

## Identity

{{PROJECT_DESC}}

## Rules (NEVER)

1. **NEVER** change code without a Linear issue
2. **NEVER** change code without a spec file (`specs/{{PREFIX}}XXX.md`)
3. **NEVER** close an issue without git push + changelog
4. **NEVER** put API keys in chat — user enters them directly into .env
5. **NEVER** create an issue without labels
6. **NEVER** bump `config.js` VERSION without updating all DOC_FILES
7. **NEVER** move a sub-task directly from Backlog → Done — always through "In Progress" first
8. **NEVER** create a new file without entering it in `ARCHITECTURE_DESIGN.md §References` + `INDEX.md`
9. **NEVER** close an issue without an integration-test check (new component covered?)
10. [add project-specific rules]

## Governance hooks

- `.claude/hooks/spec-gate.sh` — blocks commits without spec file
- `.claude/hooks/doc-version-sync.sh` — blocks pushes on version drift
- `.claude/hooks/guard.sh` — blocks access to .env and key files
- `.claude/hooks/format.sh` — auto-formats on edit/write

## Skills available

[List of installed skills from bootstrap phase 2]

## System architecture

See `SYSTEM_ARCHITECTURE.md` and `ARCHITECTURE_DESIGN.md`.
```

---

## SYSTEM_ARCHITECTURE.md (skeleton)

```markdown
# {{PROJECT_NAME}} — System Architecture

**Version:** {{VERSION_START}}

## Components

| Component | File/Path | Purpose |
|-----------|-----------|---------|
| Config (SSoT) | `lib/config.js` | Central config, version, DOC_FILES |

## Data flow

[ASCII diagram or Mermaid showing data flow between components]

## External dependencies

| Service | Purpose | Key needed |
|---------|---------|------------|
| [name] | [purpose] | [key name] |

## Self-healing checks

| Check | What it verifies | On failure |
|-------|-------------------|-----------|
| M | Doc versions match config.js | Auto-sync via doc-sync.js |
| U | All documented files exist | Warning |
| P | All daemons running | Auto-restart with backoff |
```

---

## .env.example

```
# Project: {{PROJECT_NAME}}
# Fill these values and save as .env (.env is gitignored)

# Mandatory
LINEAR_API_KEY=lin_api_xxxxx

# Optional — alerts
TELEGRAM_BOT_TOKEN=7123456789:AAH...
TELEGRAM_CHAT_ID=123456789

# Optional — research
OPENROUTER_API_KEY=sk-or-xxx

# Optional — monitoring
GRAFANA_URL=https://yourorg.grafana.net
GRAFANA_API_KEY=glsa_xxx

# Optional — infrastructure
HOSTINGER_API_KEY=xxxxxxxxx
```

---

## .gitignore

```
# Secrets
.env
.env.local

# Node modules
node_modules/

# Logs
*.log
logs/
journal/self-healing.log

# IDE
.vscode/settings.local.json
.idea/

# OS
.DS_Store
Thumbs.db

# Claude Code local overrides
CLAUDE.local.md

# Lock files (uncomment if multiple people work on the project)
# .*.pid
# *.lock
```

---

## .claudeignore (context protection)

```
# Heavy directories Claude should not load into context
node_modules/
.git/
logs/
*.log
dist/
build/

# Secrets
.env
.env.*
secrets/
*.key
*.pem

# Large data
data/raw/
journal/*.jsonl
```

---

## CHANGELOG.md (initial)

```markdown
# Changelog

All notable changes to this project are documented here.

## [{{VERSION_START}}] — {{TODAY}}

### Added
- Initial bootstrap — OpenCLAW governance framework
- Documentation: CLAUDE.md, SYSTEM_ARCHITECTURE.md, ARCHITECTURE_DESIGN.md
- Governance hooks: spec-gate.sh, doc-version-sync.sh
- Skills installed: [list]
```

---

## specs/TEMPLATE.md

```markdown
# [STORY-XX] — [Title]

## Why
[Why is this being built? Business reason or technical necessity]

## What
- Deliverable: [what gets shipped]
- Done when: [verifiable criterion]

## Constraints
- MUST: [hard requirement]
- MUST NOT: [hard prohibition]
- Out of scope: [explicitly excluded]

## Current State
- `[file]` — [what it currently does]
- `[file]` — [what it currently does]

## Tasks
- T1: [task] (files: [...]) — verify by [concrete check]
- T2: [task] (files: [...]) — verify by [concrete check]
- T3: [task] (files: [...]) — verify by [concrete check]

## Agent-Pattern
**Chosen pattern:** [Solo | Subagent | Parallel-Subagents | Agent-Team]
**Rationale:** [why this pattern]
**Team composition:** (only if Agent-Team) [Lead (Sonnet) + Explore (Haiku) + ...]

## Summary
(filled after implementation by /implement step 8 — 3 paragraphs, plain language)
```

---

## eslint.config.mjs (Node.js / Frontend / Full-stack)

```javascript
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { console: 'readonly', process: 'readonly' }
    },
    rules: {
      // Error prevention
      'no-undef': 'error',
      'no-unreachable': 'error',
      'use-isnan': 'error',

      // Security
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',

      // Quality
      'eqeqeq': ['error', 'always'],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'prefer-const': 'error',

      // Async
      'no-async-promise-executor': 'error',
      'no-await-in-loop': 'warn',

      // Readability
      'max-len': ['warn', { code: 120 }],
      'max-depth': ['warn', 5]
    }
  }
];
```

---

## .prettierrc (Frontend / Full-stack)

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 120,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

---

## pyproject.toml (Python)

```toml
[tool.black]
line-length = 100
target-version = ['py311']

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = [
  "E",  # pycodestyle errors
  "W",  # pycodestyle warnings
  "F",  # pyflakes
  "I",  # isort
  "B",  # flake8-bugbear
  "C4", # flake8-comprehensions
  "S",  # flake8-bandit (security)
]
ignore = []

[tool.ruff.lint.per-file-ignores]
"tests/*" = ["S101"]  # allow `assert` in tests
```

---

## Self-healing & doc-sync templates

See `self-healing-template.js` and `doc-sync-template.js` in the same folder for the
JavaScript implementation templates. Those files contain executable code; language-neutral
content (mostly English code + comments).

---

## For full German prose

The German original (`file-templates.md`) contains all templates with German-language
prose and comments for users who prefer to generate project files in German. Both versions
produce functionally equivalent project scaffolding.
