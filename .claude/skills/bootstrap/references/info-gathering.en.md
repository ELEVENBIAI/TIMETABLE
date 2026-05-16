# Info-Gathering — Block A (Project core)

The bootstrap skill collects **only project core information** in Block A. Existing infrastructure is explored in Block B, doc architecture in Block C, optional components in Block D.

**Important:** Ask questions **one at a time or in small groups** (max 3 per prompt), not as a batch.

## Required information

| Variable | Question to operator | Example |
|----------|---------------------|---------|
| `STACK_CHOICE` * | Stack question (a/b/c/d/e) — see SKILL.md Phase 1 A.1 | `d) Python` |
| `PROJECT_NAME` * | What is the project called? | `MyAnalytics` |
| `PROJECT_DESC` * | One sentence: what does the system do? | `Data analysis tool for marketing KPIs` |
| `VERSION_START` * | Start version | `0.1.0` |
| `ISSUE_PREFIX` * | Prefix for issues | default derived from project name (e.g. `MA-`) |
| `PRIMARY_LANG` * | Primary language for docs | `de` or `en` (default `de`) |
| `ADDONS` * | Add-ons (multi-select) | see below |

## Add-ons (architecture dimensions)

Standard dimensions (always active, not deselectable):
- Reliability
- Data Integrity
- Security
- Performance
- Observability
- Maintainability

Optional add-ons — operator selects based on project:

| Add-on | When useful | Adds |
|--------|-------------|------|
| **Privacy / GDPR** | Voice assistants, personal data, tier models | Dimension "Privacy" in `ARCHITECTURE_DESIGN.md`, Privacy section in `SECURITY.md`, tier-concept placeholder |
| **Cost Efficiency** | LLM-heavy projects, SaaS subscriptions, rate limits | Dimension "Cost Efficiency", budget rules in `GOVERNANCE.md` |
| **Signal Quality** | ML / analytics / signal systems | Dimension "Signal Quality", evaluation-metrics slot |
| **Compliance** | Regulated industries (health, finance, legal) | Compliance section in `GOVERNANCE.md` and `SECURITY.md`, audit-trail rules |

## Block B — Existing infrastructure

See separate doc: `existing-infra-check.en.md`. Short form:

| Variable | Question | Options |
|----------|----------|---------|
| `PROJECT_PATH` * | Project directory | exists + path / create new |
| `GITHUB_REPO` | GitHub repo | URL / later / none |
| `OBSIDIAN_VAULT` | Obsidian vault for docs | path / no |
| `BACKLOG_TOOL` | Backlog system | Linear + slug / M365 / GitHub Issues / none |
| `HAS_ENV` | `.env` exists? | yes / no |

## Block C — Doc architecture

See `doc-architecture-proposal.en.md`. The skill presents a 3-layer proposal:
- Story specs (repo)
- Component docs (Obsidian or `docs/components/`)
- Architecture guidelines (Obsidian or `docs/`)
- Hub: `ARCHITECTURE_DESIGN.md` in repo with §9-references auto-link

Operator confirms or adjusts.

## Block D — Optional components

See `optional-components.en.md`. Short form:

| Variable | Question | Default |
|----------|----------|---------|
| `SELF_HEALING` | Set up cron agent? | no |
| `DOC_SYNC_OBSIDIAN` | DocSync to Obsidian vault? | yes (if vault) / no (else) |
| `AUTOMATION_DAEMON` | Linear webhook daemon? | no |
| `LEARNING_LOOP` | Learning-loop level | L1 / L2 / L3 / no (default L1) |

## Label taxonomy

Project-specific labels for the backlog system. Minimum (always):
- `architecture`, `bug`, `feature`, `refactor`, `docs`, `infra`

Depending on activated add-ons:
- Privacy active → `privacy`
- Compliance active → `compliance`

Domain examples (operator extends per project):
- Web app: `frontend`, `backend`, `api`, `ux`
- AI system: `model`, `prompt`, `evaluation`, `data`
- Voice assistant: `voice`, `brain`, `memory`, `tools`, `interfaces`
- Research project: `research`, `analysis`, `hypothesis`
- Backend service: `service`, `infra`, `api`, `db`

## Hook configuration

Governance hooks are installed automatically in Phase 4. See `hooks-setup.en.md`.

No project-specific customization needed — only `PROJECT_PATH` and `ISSUE_PREFIX` in hook scripts.

## No agent/signal requirement

The skill has no assumptions about autonomous agent systems or signal files. If the project needs autonomous agents, that is clarified per story in the project — not in the bootstrap.
