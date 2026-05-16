# Learning Loop — L1/L2/L3 design

A portable learning loop that works across projects. Three levels — depending on project duration and metric needs. Trigger is `/sprint-review`. Storage is project-agnostic (no SQLite lock-in except in L3).

## Leading principle

**The loop systematically captures three things:**
1. **What worked** — repeat, build into pattern
2. **What did not work** — root cause, document anti-pattern
3. **Next experiment / change** — concrete, measurable

**The loop closes through:**
- `/sprint-review` writes the entry after every review
- `/ideation` reads the last entries when starting new stories and warns on anti-pattern match
- After 5-10 sprints: patterns become visible (L2 via Dataview, L3 via SQL query)

## L1 — Simple (default, for short projects)

**Characteristic:** A single MD file, free-form bullet points with date. No frontmatter, no structure requirement.

**Storage:**
- Primary: `{PROJECT_PATH}/journal/learnings.md` (git-versioned)
- Mirror (if Obsidian active): `{OBSIDIAN_VAULT}/04 Ressourcen/{PROJECT_NAME}/learnings.md` (wikilink from PMO hub)

**File template:**
```markdown
# Learnings — {{PROJECT_NAME}}

> Sprint-by-sprint lessons learned. Format: date + 3 categories.
> Fed by /sprint-review. Read by /ideation.

## {{TODAY}} — Sprint review

### What worked
- [Bullet with context + link to story if relevant]

### What did not work
- [Bullet + root cause + which story affected]

### Next experiment / change
- [Concrete, measurable, assigned to upcoming story]
```

**When learning happens (trigger points):**

1. **Write:** `/sprint-review` Step 7 (see sprint-review/SKILL.md after v3 alignment):
   - Skill explicitly asks at end of review: *"What do you want to capture as learnings?"*
   - Operator dictates 3 bullets per category
   - Skill appends with date header to `learnings.md`

2. **Read:** `/ideation` Step 0.5:
   - Skill reads the last 3 learnings entries
   - If "what did not work" thematically matches the story idea: warn operator
     *"In the last retro X did not work. Does that affect this story?"*
   - Result captured in story `Current State`

**Upgrade path to L2:** When after ~10 sprints the L1 file becomes too long or pattern recognition gets important → migrate to L2 without data loss (see below).

## L2 — Structured (recommended from 10+ sprints)

**Characteristic:** One file per sprint review with frontmatter. Metadata enables Obsidian Dataview aggregation. Trends become visible.

**Storage:**
- Primary: `{PROJECT_PATH}/journal/sprint-{YYYY-MM-XX}.md` (per sprint, git-versioned)
- Mirror (if Obsidian active): `{OBSIDIAN_VAULT}/04 Ressourcen/{PROJECT_NAME}/sprints/sprint-{YYYY-MM-XX}.md`

**File template:**
```markdown
---
type: sprint-retro
project: {{PROJECT_NAME}}
sprint: {{SPRINT_NUMBER}}
date: {{TODAY}}
duration_days: {{DAYS_SINCE_LAST_RETRO}}
stories_closed: {{COUNT}}
stories_open: {{COUNT}}
velocity_pct: {{PCT}}
what_worked: [tag1, tag2, tag3]
what_didnt: [tag1, tag2]
next_experiment: {{SHORT_TAG}}
related_issues: [PREFIX-1, PREFIX-2, PREFIX-3]
---

# Sprint {{SPRINT_NUMBER}} — Retro ({{TODAY}})

## Facts (pre-filled by skill)

- Stories closed: {{COUNT}} / open: {{COUNT}}
- Velocity: {{PCT}}%
- Major topics: {{TOP_LABELS}}

## What worked

- [Bullet with story link]
- [Bullet]

## What did not work (+ root cause)

- [Bullet] — Root cause: [why]
- [Bullet] — Root cause: [why]

## Next experiment

- **Idea:** [short]
- **Measurement criterion:** [how we know it worked]
- **Assigned story:** [PREFIX-XX or "create new"]

## Learnings for upcoming sprints

- [Meta rule that follows from the findings — goes to project LEARNINGS.md]
```

**When learning happens:**

1. **Write:** `/sprint-review` Step 7:
   - Skill pulls facts from Git log + backlog API (Linear/M365/GitHub) and auto-fills frontmatter
   - Operator answers the 4 qualitative sections
   - Skill stores both copies (repo + Obsidian) and commits the repo version

2. **Read:** `/ideation` Step 0.5:
   - Skill reads the last 2-3 sprint retros
   - Dataview-like filter: *"Which `what_didnt` tags appeared 2+ times?"*
   - Warns on anti-pattern match
   - Result in story `Current State`

3. **Meta aggregation (SecondBrain Dataview):**
   - `{OBSIDIAN_VAULT}/04 Ressourcen/{PROJECT_NAME}/patterns.md` with Dataview query:
     ```dataview
     TABLE what_worked, what_didnt, next_experiment
     FROM "04 Ressourcen/{{PROJECT_NAME}}/sprints"
     WHERE type = "sprint-retro"
     SORT date DESC
     ```
   - Top-5 most common `what_didnt` → candidate for architecture change
   - Successful `next_experiment` → reuse

4. **Quarterly meta retro** (automatic on every 4th sprint review or on `/sprint-review --quarterly`):
   - Skill consolidates all sprint retros of the quarter
   - Writes `{PROJECT_PATH}/journal/quarterly-{YYYY-QX}.md` with trends, top anti-patterns, successful experiments
   - PMO hub entry in SecondBrain

## L3 — SQLite-based (recommended from 50+ sprints or for metrics needs)

**Characteristic:** In addition to L2 MD files, a SQLite DB for quantitative analysis. Only needed when concrete questions arise like: *"Sprints with >3 privacy changes → 40% more blockers?"*

**Storage:**
- `{PROJECT_PATH}/journal/learnings.db` (gitignored — local analysis)
- MD files continue to be maintained (L2 format stays)

**Schema:**
```sql
CREATE TABLE sprints (
  id INTEGER PRIMARY KEY,
  number INTEGER UNIQUE NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  stories_closed INTEGER,
  stories_open INTEGER,
  velocity_pct REAL
);

CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  sprint_id INTEGER REFERENCES sprints(id),
  type TEXT NOT NULL CHECK(type IN ('what_worked', 'what_didnt', 'experiment', 'learning', 'blocker')),
  content TEXT NOT NULL,
  tags TEXT,
  linked_issue TEXT
);

CREATE TABLE metrics (
  sprint_id INTEGER REFERENCES sprints(id),
  key TEXT NOT NULL,
  value REAL,
  PRIMARY KEY (sprint_id, key)
);

CREATE TABLE experiments (
  id INTEGER PRIMARY KEY,
  proposed_sprint INTEGER REFERENCES sprints(number),
  description TEXT NOT NULL,
  measurement_criterion TEXT,
  result TEXT CHECK(result IN ('pending', 'success', 'failure', 'aborted')),
  result_sprint INTEGER REFERENCES sprints(number)
);
```

**When learning happens:**

1. **Write:** `/sprint-review` Step 7 writes in parallel:
   - MD file (L2 format) for humans
   - SQLite insert via Python helper (`journal/write_sprint.py`)

2. **Read:** Separate helper skill `/learnings-query`:
   - Answers metric questions: *"How has velocity developed over the last 10 sprints?"*
   - Query examples: see DE version for full samples.

3. **Read by /ideation:** Like L2, but with additional SQL context when stack decisions are due.

## Migration between levels

**L1 → L2:** Skill helper reads existing `learnings.md`, splits into pseudo-sprints (sections by date), adds frontmatter. Operator confirms sprint numbering. MD files are newly created. `learnings.md` remains as archive.

**L2 → L3:** SQLite DB initialized, all existing L2 MD files parsed (frontmatter + sections) and inserted as rows. MD files stay unchanged.

**L3 → L2 (downgrade):** SQLite DB removed from gitignore and deleted. MD files continue.

## Activation in bootstrap

In Block D (optional components) operator selects level. Skill writes the level as text to `{PROJECT_PATH}/.learning-loop` (`L1`, `L2`, `L3`). This file is read by `sprint-review` and `ideation`.

## SecondBrain cross-linking

If Obsidian vault active:
- PMO hub gets wikilink section: `## Learnings → [[../../../04 Ressourcen/{{PROJECT_NAME}}/learnings]]`
- For L2/L3: SecondBrain shows Dataview aggregation over all sprint retros
- If `ingest` skill active: all new sprint retros are automatically linked into the vault wiki

## Integration with other skills

| Skill | Integration |
|-------|-------------|
| `/sprint-review` | **Writes** the learning loop entry as mandatory Step 7 |
| `/ideation` | **Reads** the last 3 entries before story creation (Step 0.5) |
| `/architecture-review` | **References** learnings when architecture decision is due |
| `/breakfix` | **Writes** breakfix learnings as `what_didnt` with root cause + prevention |
| `/wrap-up` | **Reads** open experiment statuses and reminds operator |

## Anti-patterns

- ❌ **SQLite for solo project with 5 sprints** — overkill, L1 is enough
- ❌ **L1 with 100+ sprints** — file becomes unwieldy, migrate to L2
- ❌ **Writing without reading** — if `/ideation` does not read the learnings, the loop is open
- ❌ **Private experiments not documented** — also write failed experiments (that's the most valuable learning)
