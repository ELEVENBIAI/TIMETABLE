# Agent Patterns — Template for .claude/rules/agent-patterns.md

> **Purpose:** This file defines when and how Claude Code should work in agent teams or with
> sub-agents. It is copied into the project as `.claude/rules/agent-patterns.md` —
> Claude loads it only on demand (lazy loading = zero token overhead in the normal case).
>
> **Activation:** requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1"` in
> `~/.claude/settings.json` (checked and set during bootstrap pre-flight).

---

## Decision tree: solo vs. sub-agent vs. agent team

```
Task arrives
        │
        ▼
Single, clearly bounded task with <5 files?
        │
       YES → Solo (no sub-agent, no team)
        │
       NO
        │
        ▼
>3 independent subtasks that can be worked in PARALLEL?
        │
       NO → Sub-agent(s) — sequential or a few in parallel
        │
       YES
        │
        ▼
Do agents need to WAIT for each other's intermediate results?
        │
       NO → Parallel sub-agents (multiple agent calls in one message)
        │
       YES → Agent team (TeamCreate — 3-5x more expensive, only if needed)
```

---

## The 4 standard patterns

### Pattern 1: New feature story

**When:** New functionality with unknown scope, multiple layers affected.

```
Team:
  Lead (Sonnet)     → orchestration, final decisions, implementation
  Explore (Haiku)   → codebase exploration: which files are affected?
  Plan (Sonnet)     → architecture draft and task breakdown

Flow:
  1. Lead starts Explore agent: "find every file that touches {feature}"
  2. Lead starts Plan agent in parallel: "sketch architecture for {feature}"
  3. Lead waits for both → synthesizes → implements
```

**Trigger in spec:** `🤖 Agent team: feature`

---

### Pattern 2: Architecture review / competing hypotheses

**When:** Decision between 2+ approaches, high stakes, no clear preference.

```
Team:
  Lead (Opus)          → moderates, makes the decision
  Debater A (Sonnet)   → defends approach A (deliberately one-sided!)
  Debater B (Sonnet)   → defends approach B (deliberately one-sided!)

Flow:
  1. Lead briefs both debaters with their respective approach
  2. Both work in parallel — no contact with each other
  3. Lead reads both memos → decides with justification
```

**Trigger in spec:** `🤖 Agent team: architecture review`

---

### Pattern 3: Bugfix with unclear cause (racing hypotheses)

**When:** Incident or bug with 2+ plausible causes, time is critical.

```
Team:
  Lead (Sonnet)        → coordinates, merges result, implements fix
  Hypothesis A (Sonnet) → investigates cause A (e.g. race condition)
  Hypothesis B (Sonnet) → investigates cause B (e.g. data corruption)

Flow:
  1. Lead formulates 2 competing hypotheses
  2. Both hypothesis agents run SIMULTANEOUSLY (racing)
  3. Whoever finds evidence first — wins
  4. Lead implements the fix based on the winning hypothesis
```

**Trigger:** bug with >1 plausible causes + unclear root cause

---

### Pattern 4: Large refactoring story

**When:** Refactoring across multiple components, tests must run in parallel.

```
Team:
  Lead (Sonnet)    → plans + coordinates
  Builder (Sonnet) → implements the changes
  Tester (Haiku)   → checks whether existing tests stay green

Flow:
  1. Lead creates task list for builder
  2. Builder + tester run in parallel:
     Builder: implements task 1
     Tester: validates task 0 (previous)
  3. On tester failure: builder is paused, fix first
```

**Trigger in spec:** `🤖 Agent team: refactoring`

---

## Sub-agent rule (90% of cases)

Sub-agents are not an agent team — they are simple helpers without coordination overhead.

```
// Sub-agent ALWAYS when:
// - File search and codebase exploration (Explore sub-agent)
// - Analyzing large amounts of text (logs, diffs, docs)
// - Single, clearly bounded research task
// - Parallel independent research (multiple agent calls at once)

// Sub-agent NEVER when:
// - Tasks that take <5 minutes → solo is faster
// - When context from the main session is needed → pass context explicitly
```

---

## Cost reminder

| Pattern | Relative cost | When to use |
|---------|---------------|-------------|
| Solo | 1x | Clear, small tasks |
| Sub-agent (single) | ~1.2x | Exploration, research |
| Parallel sub-agents | ~1.5x | Independent parallel tasks |
| Agent team | 3-5x | Only for real dependencies between agents |

**Rule of thumb:** when in doubt, sub-agent rather than team.
Agent team only when agents really have to wait for each other's results.
