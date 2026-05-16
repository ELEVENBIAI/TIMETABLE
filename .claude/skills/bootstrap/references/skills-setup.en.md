# Skills Setup — New project installation

Skills are fetched from the official GitHub repo via `git clone` into a temp folder and copied into `{PROJECT_PATH}/.claude/skills/`. No symlinks to VPS paths, no global `/root/.claude/skills/`.

## Installation (standard flow)

```bash
# Temp folder
SKILL_SRC=$(mktemp -d)

# Clone current skills repo (shallow)
git clone --depth 1 https://github.com/vibercoder79/KI-Masterclass-Koerting- "$SKILL_SRC"

# Create skills directory in project
cd {PROJECT_PATH}
mkdir -p .claude/skills

# Copy selected skills
for skill in ideation implement backlog; do
  cp -R "$SKILL_SRC/$skill" ".claude/skills/$skill"
done

# Cleanup
rm -rf "$SKILL_SRC"
```

## Available skills

| Skill | Description | Tier |
|-------|-------------|------|
| `ideation` | Deep research + user story creation | Minimum |
| `implement` | Implementation workflow with governance gates | Minimum |
| `backlog` | Sprint planning + backlog overview | Minimum |
| `architecture-review` | Architecture review (standard dimensions + active add-ons) | Standard |
| `sprint-review` | Periodic audit + **learning-loop entry** (see `learning-loop.en.md`) | Standard |
| `research` | Deep research via WebSearch + Perplexity | Standard |
| `security-architect` | Security review (STRIDE/OWASP) | Standard |
| `skill-creator` | Create and package new skills | Standard |
| `grafana` | Grafana dashboard development | Optional |
| `cloud-system-engineer` | VPS infrastructure | Optional |
| `visualize` | Architecture diagrams in Miro | Optional |
| `design-md-generator` | Extract DESIGN.md from website/PDF | Optional |

## Skill tier selection in bootstrap

```
Which skills to install?
  a) Minimum   (ideation, implement, backlog)
  b) Standard  (+ architecture-review, sprint-review, research, security-architect, skill-creator)
  c) Full      (all available)
  d) Manual    (operator selects individually)
```

## Customization of installed skills

**Generic (default):** Skills are copied unchanged from the master repo. References stay generic (no project assumptions) and work directly.

**Project-specific (only when needed):** If the project requires domain-specific adjustments, the path is:

1. Edit the file in the installed skill locally
2. Document the adjustment as project-specific (e.g. in `specs/JAR-XXX.md` the first story on it)
3. Optional: Package the adjustment as a skill variant via `/skill-creator`

**Never** commit master skills from the project — the master stays generic.

## Update strategy

If a master skill gets an update:

```bash
SKILL_SRC=$(mktemp -d)
git clone --depth 1 https://github.com/vibercoder79/KI-Masterclass-Koerting- "$SKILL_SRC"

# Show diff before overwrite
diff -r "$SKILL_SRC/<skill>" ".claude/skills/<skill>"

# Apply updates selectively — operator decides per file
```

## Install order

1. `research` — no dependencies
2. `ideation` — needs story templates (included in skill)
3. `backlog` — needs Linear/M365/GitHub connector
4. `implement` — needs `change-checklist.md` + Git
5. `architecture-review` — needs dimensions reference
6. `security-architect` — standalone
7. `sprint-review` — needs `learning-loop.en.md` if learning loop active
8. Optional (full tier): `grafana`, `cloud-system-engineer`, `visualize`, `design-md-generator`
9. `skill-creator` — standalone

## ISSUE_WRITING_GUIDELINES.md

NOT copied from an external path; rendered from `references/issue-writing-guidelines-template.md` (prefix substituted). See SKILL.md Phase 4.3.

## implement skill — governance integration

The `implement` skill contains these mandatory steps (active when installed):

| Step | What | Governance impact |
|------|------|-------------------|
| 3 | Context — read `ARCHITECTURE_DESIGN.md` Hub + component doc | Hub-first navigation |
| 3b | Governance validation (8 dimensions + security) | Mandatory before plan |
| 3c | Spec file gate (spec-gate.sh enforces it) | Spec required |
| 5 | Implementation incl. T_last doc update | Component doc + Hub §9 + `lib/config.js` VERSION bump |
| 6a | Linting gate (ESLint/Ruff — 0 errors required) | Quality gate |

## Learning-loop integration (when active)

When Block D = L1/L2/L3:

- `sprint-review` skill gains Step 7 (learning-loop entry) — see `learning-loop.en.md`
- `ideation` skill gains Step 0.5 (read learnings context before story creation)

Activation: `.learning-loop` file in project root with content `L1`, `L2` or `L3`.
