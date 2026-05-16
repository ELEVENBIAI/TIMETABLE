# Architecture Design Template

> **Usage:** this template is generated in phase 1 of the `/bootstrap` skill.
> All `{{PLACEHOLDERS}}` are filled with project info from phase 0.
> `ARCHITECTURE_DESIGN.md` is, per CLAUDE.md, the **entry document** — every new component
> is recorded here first, before the git commit.

---

# {{PROJECT_NAME}} — Architecture Design

**Version:** {{VERSION_START}} | **Updated:** {{TODAY}}
**Owner:** {{OWNER_NAME}}

> **Entry document.** Every new component and new file is recorded here first —
> before the git commit.

---

## Big Picture

[System map — overview of all components and their connections.
ASCII diagram or descriptive text when the system is still small.]

```
[Component A] → [Component B] → [Output]
      ↑
[External API]
```

---

## Design rationale ("the why")

[Reasoning behind the major architectural decisions.
Why this stack? Why this structure?
Answers "Why did we build X like this?" for new engineers and AI assistants.]

| Decision | Reason | Rejected alternative |
|----------|--------|----------------------|
| [e.g. Node.js instead of Python] | [reason] | [what was rejected and why] |

---

## ADR — Architecture Decision Records

> ADRs document important architectural decisions with context, decision, and consequences.
> **Status:** Proposed → Active → Deprecated

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| ADR-01 | [First architectural decision] | Active | {{TODAY}} |

### ADR-01: [title]

**Status:** Active | **Date:** {{TODAY}}

**Context:** [what problem or situation forced this decision?]

**Decision:** [what was decided?]

**Consequences:**
- ✅ [positive effect]
- ⚠️ [limitation or trade-off]

---

## Component overview

> Every new component MUST be entered here — before the git commit.

| Component | File/Path | Responsibility | Dependencies |
|-----------|-----------|----------------|--------------|
| Config (SSoT) | `lib/config.js` | VERSION, DOC_FILES, project config | — |
| [New component] | `[Path]` | [What does it do?] | [Which other components does it need?] |

---

## Quality dimensions

> Check every story against these dimensions (architecture review):

| # | Dimension | Questions for this project |
|---|-----------|----------------------------|
| 1 | **Reliability** | Graceful degradation? Kill-switch present? |
| 2 | **Data Integrity** | SSoT respected? No dual-write? |
| 3 | **Security** | API keys in .env? Inputs validated? |
| 4 | **Performance** | Latency acceptable? Rate limits? Memory stable? |
| 5 | **Observability** | Logging? Alerts configured? |
| 6 | **Maintainability** | No code duplication? Config SSoT? Docs current? |
| 7 | **Cost Efficiency** | API costs calculated? Cheaper alternative? |
| 8 | **Domain Quality** | Does it improve the core quality of the project? |

---

## References

> Links to all connected architecture documents — SSoT for cross-references.

| Document | Path | Content |
|----------|------|---------|
| System architecture | `SYSTEM_ARCHITECTURE.md` | Components, data flow |
| Component inventory | `COMPONENT_INVENTORY.md` | Detailed component list |
| Governance | `GOVERNANCE.md` | Framework rules, ADRs |
| API inventory | `API_INVENTORY.md` | External APIs (must be updated!) |
| Process catalog | `PROCESS_CATALOG.md` | How the system works |

---

*Updated by Claude Code on every architectural decision.*
