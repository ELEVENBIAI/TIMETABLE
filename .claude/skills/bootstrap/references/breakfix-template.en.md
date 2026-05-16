# Breakfix Skill — Bootstrap Template

## Bootstrap: questions for the operator

When the operator wants to install `/breakfix`, ask these questions **before**
generating SKILL.md:

```
For the /breakfix skill I need a quick note on:

1. Issue prefix for incidents? (e.g. INC-, BUG- — default: INC-)
2. Directory for incident files? (default: journal/incidents/)
3. Are there daemons / background processes to monitor?
   (Yes → which? / No → keep diagnosis step generic)
4. Which log files are relevant for diagnosis?
   (e.g. trading.log, app.log, or: "unclear yet")
```

Wait for answers. Then generate SKILL.md from the skeleton below and write it to
`{PROJECT_PATH}/.claude/skills/breakfix/SKILL.md`.
Replace placeholders:
- `{{ISSUE_PREFIX}}` → answer 1 (default: INC-)
- `{{INCIDENT_DIR}}` → answer 2 (default: journal/incidents/)
- `{{DAEMON_LIST}}` → answer 3 (comma-separated, or "TBD")
- `{{LOG_FILES}}` → answer 4 (or "TBD")
- `{{LINEAR_TEAM}}` → from phase 0 info-gathering
- `{{PROJECT_NAME}}` → from phase 0 info-gathering

---

## Skeleton SKILL.md (generated)

```markdown
---
name: breakfix
version: 1.0.0
description: Incident response workflow for {{PROJECT_NAME}}. 7-step process: detect, diagnose, fix, verify, document, prevent, CLAUDE.md rule. Reads previous incidents before starting a new diagnosis.
---

# /breakfix — Incident response

**Triggers:** when something is broken, the system behaves wrongly, or the operator says "/breakfix".

---

## Before starting: read previous incidents

```bash
ls {{INCIDENT_DIR}} 2>/dev/null | tail -5
```

Read the last 2–3 incident files. Check whether known patterns exist.
Known incidents help with diagnosis.

---

## 7-step process

### Step 1: DETECT — what is the problem?

- Capture the error message / symptom from the operator
- Check system status:
```bash
# Check running processes
ps aux | grep -E "{{DAEMON_LIST}}" | grep -v grep
# Recent log entries
tail -50 {{LOG_FILES}}
```
- Check Telegram alerts of the last hour (if active)
- Narrow down the first occurrence time

**Result:** clear one-sentence error description.

---

### Step 2: DIAGNOSE — what's the cause?

Systematic root-cause analysis:

1. **Processes alive?**
```bash
# For every relevant daemon:
# {{DAEMON_LIST}}
```

2. **Recent changes?**
```bash
git log --oneline -10
git diff HEAD~1
```

3. **Errors in the log?**
```bash
grep -i "error\|fatal\|crash" {{LOG_FILES}} | tail -20
```

4. **Resources OK?**
```bash
df -h && free -m
```

**Result:** root cause identified. Formulate hypothesis.

---

### Step 3: FIX — resolve the problem

- Implement the fix (smallest possible change)
- Solve only the problem — no refactoring on the side
- When unsure: backup/snapshot first

```bash
# After the fix: syntax check if code changed
# node -c {file} (Node.js) / python -m py_compile {file} (Python)
```

---

### Step 4: VERIFY — does the fix work?

- Restart the system (if necessary)
- Check the original symptom: is it gone?
- No new errors in the log?
- Observe for 5 minutes

```bash
tail -f {{LOG_FILES}}
```

**Result:** fix verified (yes/no). On no → back to step 2.

---

### Step 5: DOCUMENT — document the incident

Create the incident file:

```bash
mkdir -p {{INCIDENT_DIR}}
# Determine next INC number:
ls {{INCIDENT_DIR}} | grep -oE '[0-9]+' | sort -n | tail -1
```

Create `{{INCIDENT_DIR}}/{{ISSUE_PREFIX}}XXX.md`:

```markdown
# {{ISSUE_PREFIX}}XXX — [incident title]

**Date:** YYYY-MM-DD HH:MM UTC
**Severity:** [P1-critical / P2-high / P3-medium]
**Duration:** [minutes]

## Symptom
[What was broken?]

## Root cause
[Why did it break?]

## Fix
[What changed? Commit hash?]

## Timeline
- HH:MM — incident noticed
- HH:MM — root cause identified
- HH:MM — fix deployed
- HH:MM — verified

## Lessons learned
[What can be learned from this?]
```

Create a Linear issue: `{{LINEAR_TEAM}}/{{ISSUE_PREFIX}}XXX` with label `bug`.

---

### Step 6: PREVENT — avoid recurrence

Ask: "What would have prevented this incident?"

- [ ] Missing monitoring check? → extend `agents/self-healing.js`
- [ ] Missing config validation? → add a startup check
- [ ] Automatic restart? → set up cron/daemon starter
- [ ] Better error handling in the code?

Create a Linear issue for concrete action if effort > 30 minutes.

---

### Step 7: CLAUDE.md RULE — capture lesson learned (MANDATORY)

**Last step every time — no exception:**

1. Ask: "Which CLAUDE.md rule would have prevented this incident?"
2. Phrase the rule: `**NEVER [X] without [Y]** — [brief reason]`
3. Add the rule to CLAUDE.md §4 "Core rules"
4. Document the rule in the incident file:
   ```
   ## CLAUDE.md rule
   **NEVER [X] without [Y]** — [brief reason]
   (added after {{ISSUE_PREFIX}}XXX, {{TODAY}})
   ```

Inform the operator: "Step 7 complete. New rule: [rule text]"

> **Goal:** every incident makes the system permanently more resilient.
> Without this step the incident repeats — the root cause remains unanchored in
> governance and can happen again.
> After 10 incidents: 10 new CLAUDE.md rules = the system learned from 10 mistakes.

---

## Incident severity definitions

| Level | Criterion | Response time |
|-------|-----------|---------------|
| P1 — Critical | System completely down, data loss looming | Immediately |
| P2 — High | Core function broken, workaround exists | < 1 hour |
| P3 — Medium | Secondary function broken, system still running | < 1 day |

---

## TODO: adapt project-specifically

These sections must be concretized for {{PROJECT_NAME}}:

- `{{DAEMON_LIST}}` → which processes run? (currently: placeholder)
- `{{LOG_FILES}}` → which logs are relevant?
- Step 2: add further project-specific diagnostic checks
- Step 4: concrete verify commands for your system
- Severity definitions: align with domain-specific criticality
```
