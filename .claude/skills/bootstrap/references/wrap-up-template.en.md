# Wrap-Up Skill — Bootstrap Template

## Bootstrap: no questions needed

The `/wrap-up` skill is fully generic and doesn't need project-specific questions.
Bootstrap links it via symlink or copies it into the project.

**Adapt after installation (optional):**
- In `SKILL.md`: adjust memory path if not default
- In `SKILL.md`: extend synthesis hints with project-specific focal points

---

## Skeleton SKILL.md (used via symlink or copied)

```markdown
---
name: wrap-up
version: 1.0.0
description: Session close for {{PROJECT_NAME}}. Summary of what was decided,
  built, and learned — persistently stored in auto-memory.
  Trigger when the operator says "Exit", "bye", "end", "done" or "/wrap-up".
  Prevents important session insights from being lost.
tools: [Read, Write, Edit, Bash, Glob, Grep]
---

# /wrap-up — Session close

**Triggers:** "Exit", "bye", "end", "wrap up", "close session", "/wrap-up"

**Purpose:** every session ends with a structured memory update so the next
session starts in context — no repeat briefing.

---

## Step 1: Read session activity

```bash
# What changed during this session?
cd {{PROJECT_PATH}} && git log --oneline -10
git diff HEAD~5 HEAD --stat 2>/dev/null || git diff --stat
```

Read in parallel:
- Memory index: `/root/.claude/projects/{{MEMORY_PATH}}/memory/MEMORY.md`
- Current open issues: Linear backlog (if MCP available)

---

## Step 2: Synthesis

Mentally answer these questions:

| Question | What to save |
|----------|---------------|
| What was **decided**? | Architectural decisions, directions, ADRs |
| What was **built**? | Completed features, stories, fixes (only if done) |
| What is **open**? | Started, blockers, next steps |
| What was **learned**? | Surprises, corrections, new patterns |
| What **feedback** came? | Corrections by operator, confirmed approaches |

**Do not save:**
- What is already visible in git history
- Temporary debugging steps
- Information directly readable from code

---

## Step 3: Write memory

Memory directory: `/root/.claude/projects/{{MEMORY_PATH}}/memory/`

Write an appropriate memory file for every relevant insight:

**Type `project`** — project decisions, milestones:
```yaml
---
name: [short title]
description: [one-line description — used in MEMORY.md index]
type: project
---
[facts/decision]

**Why:** [motivation or constraint]
**How to apply:** [how it influences future sessions]
```

**Type `feedback`** — corrections or confirmed approaches from the operator:
```yaml
---
name: feedback_[topic]
description: [rule in one sentence]
type: feedback
---
[the rule itself]

**Why:** [why the rule holds]
**How to apply:** [when/where it applies]
```

**Type `user`** — insights about the operator:
```yaml
---
name: user_[topic]
description: [brief what was learned]
type: user
---
[what was learned about the operator]
```

**Type `reference`** — external resources, URLs, tools:
```yaml
---
name: reference_[topic]
description: [what this pointer leads to]
type: reference
---
[URL/path + context]
```

After every memory write: add or update the entry in `MEMORY.md`.
Format: `- [Title](filename.md) — one-line hook (max 150 chars)`

---

## Step 4: Confirmation

Output:

```
## Session Wrap-Up ✓

**Decided:** [1–3 bullets]
**Built:** [1–3 bullets or "nothing committed"]
**Open for next session:** [top 1–2 points]
**Memory updates:** [N entries updated/new]
```

Then: "Session closed. Until next time!"
```

---

## Activation in CLAUDE.md

After installation add this line to CLAUDE.md §3:

```
> **MANDATORY at session end:** On "Exit", "bye", "end", "done" → `/wrap-up` ALWAYS first.
```

(Bootstrap phase 1 does this automatically if wrap-up was selected.)
