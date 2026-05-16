# Optional Components — Block D

Block D is the **final block** of the bootstrap interview. All components asked here are **optional**. The operator can intentionally install them now or add them later.

Each question is asked individually with a clear recommendation and default.

## D.1 — Self-Healing agent

**Question:**
```
Set up Self-Healing agent?

What it does: Cron job runs every 15 min and checks:
  - Are all DOC_FILES on the same version as lib/config.js?
  - Do all files listed in COMPONENT_INVENTORY.md exist?
  - Are configured daemon processes running?
On drift/failure: auto-correction or alert (via Telegram if token set).

Recommended: from multiple contributors, or when doc drift would be business-critical.
Solo project with <10 stories: usually not needed.

Install now?
  [yes]  Skill creates agents/self-healing.js, generates cron entry
  [no]   (default) — can be added later
```

**If yes:**
- Render template `references/self-healing-template.js` with `PROJECT_PATH`, `OBSIDIAN_VAULT`, Telegram token if present
- Write to `agents/self-healing.js`
- Generate cron entry and show to operator:
  ```
  */15 * * * * cd {PROJECT_PATH} && node agents/self-healing.js >> /var/log/self-healing-{slug}.log 2>&1
  ```
- Operator confirms cron entry themselves (`crontab -e`)

## D.2 — DocSync to Obsidian vault

**Question:**
```
Activate DocSync to Obsidian vault?

What it does: On every /implement T_last task, component docs from
{PROJECT_PATH}/docs/components/ or {PROJECT_PATH} are mirrored into the Obsidian
vault. No cron — runs as a manual prompt (implement skill T_last).

Recommended: if Obsidian vault was set (Block B.3 = yes).

Install now?
  [yes]  (default if vault set) — Skill creates lib/doc-sync.js
  [no]   — you will have to update manually at each /implement
```

**If yes:**
- Render template `references/doc-sync-template.js` with `PROJECT_PATH`, `OBSIDIAN_VAULT`, project name
- Configure repo → vault mapping:
  ```javascript
  const MAPPINGS = [
    {
      src: '{PROJECT_PATH}/docs/components/',
      dst: '{OBSIDIAN_VAULT}/02 Projekte/{PROJECT_NAME}/Components/'
    },
    {
      src: '{PROJECT_PATH}/ARCHITECTURE_DESIGN.md',
      dst: '{OBSIDIAN_VAULT}/02 Projekte/{PROJECT_NAME}/.architecture-hub.md'
    }
  ];
  ```
- Write to `lib/doc-sync.js`
- `implement` skill T_last task references `node lib/doc-sync.js`

## D.3 — Automation daemon (Linear webhook listener)

**Question:**
```
Set up automation daemon?

What it does: Receives Linear webhook events and triggers /implement
fully automatically on story status change ("In Progress" → skill runs).

Recommended: ONLY for advanced setups with trust in the pipeline.
Security implications:
  - Every webhook can trigger code changes
  - --dangerously-skip-permissions required
  - HMAC verification mandatory

Set up now?
  [yes]  Skill creates agents/linear-automation-daemon.js
  [no]   (default) — operator approval mode stays active
```

**If yes:**
- Render daemon template (not part of this repo — operator gets skeleton and instructions)
- Extend `.env` with `LINEAR_WEBHOOK_SECRET`, `DAEMON_PORT`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`
- Generate Linear webhook URL + operator must configure in Linear dashboard
- Show `systemd`/`launchd` service template (depending on OS)

**Note:** As of v3.0 this skill does not ship a finished daemon template — operator gets skeleton and documented extension strategy.

## D.4 — Learning Loop level

**Question:**
```
Activate learning loop?

What it does: Systematic capture of lessons learned — what works, what does not,
next experiments. Fed by /sprint-review, read by /ideation (anti-pattern warning
before new stories).

Three levels:
  L1 — Simple        (one learnings.md, bullet points)          recommended for solo projects
  L2 — Structured    (sprint journal with frontmatter)          recommended from 10+ sprints
  L3 — SQLite        (quantitative metrics over time)           recommended from 50+ sprints
  no                 (no lessons-learned documentation)

Default: L1. Which level?
```

**If L1/L2/L3:**
- Create `{PROJECT_PATH}/.learning-loop` file with level string (`L1`, `L2`, `L3`) — read by `sprint-review`/`ideation`
- Create journal structure:
  - L1: `journal/learnings.md` with skeleton content
  - L2: `journal/` folder + `journal/sprint-template.md` (template copy)
  - L3: `journal/learnings.db` (SQLite initialized with schema) + `journal/write_sprint.py` (helper)
- If Obsidian active: create mirror in `04 Ressourcen/{PROJECT_NAME}/` + wikilink from PMO hub
- Extend `CLAUDE.md` with rule: "After every sprint review the learning-loop entry is mandatory"

**If no:**
- No `.learning-loop` file
- `sprint-review` skill runs without Step 7
- `ideation` skill does not read learnings

**Details:** See `learning-loop.en.md` for the full specification.

## Finalization after Block D

Skill summarizes optional components status:

```
Block D result:
  ✅ / ⏭  Self-Healing agent      — cron installed / later
  ✅ / ⏭  DocSync to Obsidian     — lib/doc-sync.js / later
  ✅ / ⏭  Automation daemon       — agents/...daemon.js / later
  Learning loop: L1 / L2 / L3 / no
```

## Subsequent activation

Each optional component can be activated later without re-running the whole bootstrap:

- **Self-Healing:** copy `bootstrap/references/self-healing-template.js` and adapt
- **DocSync:** copy `bootstrap/references/doc-sync-template.js` and adapt
- **Automation daemon:** manual + Linear webhook setup
- **Learning Loop:** create `.learning-loop` file, skill path see `learning-loop.en.md`

## Anti-patterns

- ❌ Ask Block D at the start of the interview — operator has no context yet
- ❌ Activate all optional components by default — leads to overhead for small projects
- ❌ Self-Healing without Obsidian/Telegram alert target — silently corrects, operator does not notice
- ❌ Activate learning loop but never call `/sprint-review` — dead loop
