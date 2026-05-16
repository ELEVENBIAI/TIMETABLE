# Security Architect — Claude Code Skill

> **Security by Design** for the entire development process — from first idea to production code.
> A Claude Code skill that brings professional security engineering into every session.

**Version:** 1.1.0 | **License:** MIT | **Platform:** Claude Code (Anthropic)

---

## What This Skill Does

The Security Architect skill turns Claude Code into a full security engineering partner. Instead of treating security as an afterthought, it integrates threat modeling, code review, and auditing directly into your development workflow — automatically triggered at the right moments.

**The core problem it solves:** Most developers either skip security entirely or run a checklist at the end. This skill makes security a natural part of how you build — before code is written, while it's being written, and before it ships.

### New in v1.1.0: SKILL-SCAN Mode
Before installing skills from GitHub or other external sources, the SKILL-SCAN mode checks them for **prompt injection attacks** — malicious instructions hidden in SKILL.md files that could hijack Claude's behavior, exfiltrate your credentials, or manipulate your system configuration.

---

## Four Operating Modes

```
User is planning / brainstorming?        → DESIGN   (Threat Modeling)
User is writing / changing code?         → REVIEW   (Code Security Check)
User says "audit" / "scan"?              → AUDIT    (Full Security Scan)
User wants to install a skill/plugin?    → SKILL-SCAN (Prompt Injection Check)
```

### Mode 1: DESIGN — Threat Modeling

Triggered **before** code is written, during planning and architecture decisions.

**What happens:**
1. System scope is defined: data flows, trust boundaries, external interfaces
2. STRIDE analysis for each component and interface
3. DREAD risk scoring (1–10) for every identified threat
4. Concrete security requirements are formulated for implementation

**STRIDE Framework:**

| Threat | Question | Countermeasure |
|--------|----------|----------------|
| **S**poofing | Can someone impersonate another entity? | Strong auth, MFA |
| **T**ampering | Can data be manipulated? | Integrity checks, signatures |
| **R**epudiation | Can someone deny their actions? | Audit logs, digital signatures |
| **I**nformation Disclosure | Can confidential data leak? | Encryption, access controls |
| **D**enial of Service | Can the service be disabled? | Rate limiting, redundancy |
| **E**levation of Privilege | Can someone gain unauthorized rights? | RBAC, least privilege |

**DREAD Scoring:** Each threat rated 1–10 across Damage, Reproducibility, Exploitability, Affected Users, Discoverability.

**Output:** Threat model report with threat table, risk scores, and prioritized security requirements.

---

### Mode 2: REVIEW — Code Security Check

Triggered automatically **while code is being changed**, or on demand.

**What happens:**
1. Risk classification of the change (HIGH / MEDIUM / LOW)
2. OWASP Top 10:2025 quick check against the diff
3. Language-specific secure code patterns verified
4. Secrets check (no API keys, passwords, or tokens in code)
5. Security headers audit (for web applications)

**OWASP Top 10:2025 Checks:**

| # | Vulnerability | Check |
|---|---------------|-------|
| A01 | Broken Access Control | Auth on every endpoint? Deny by default? |
| A02 | Security Misconfiguration | Secure defaults? Debug disabled? |
| A03 | Supply Chain Failures | Versions locked? Integrity checked? |
| A04 | Cryptographic Failures | TLS 1.2+? AES-256-GCM? Argon2/bcrypt? |
| A05 | Injection | Parameterized queries? Input validation? |
| A06 | Insecure Design | Threat model present? Rate limiting? |
| A07 | Auth Failures | MFA? Breached-password check? |
| A08 | Integrity Failures | Signed packages? SRI for CDN? |
| A09 | Logging Failures | Security events logged? Alerting? |
| A10 | Exception Handling | Fail-closed? No internals exposed? |

**Output format:**
```
### Security Review: [change description]

| # | Finding | Severity | File:Line | Recommendation |
|---|---------|----------|-----------|----------------|
| 1 | SQL query with string concat | HIGH | api.py:42 | Use parameterized query |
| 2 | Missing rate limiting | MEDIUM | auth.py:15 | Add rate limiter middleware |

Risk Assessment: MEDIUM
Blocker: Yes (HIGH findings = blocker)
```

---

### Mode 3: AUDIT — Full Security Scan

Triggered on demand (`/security audit`), before releases, or periodically.

**What happens:**
1. All REVIEW checks applied to the entire codebase
2. Dependency analysis — known vulnerabilities, abandoned packages, unnecessary dependencies
3. Configuration review — production settings, CORS, database permissions, secrets management
4. Attack surface mapping — all public endpoints, which accept user input, which modify state

**Also covers Agentic AI Security (OWASP ASI01–ASI10)** for projects that use AI agents, MCP servers, or tool-calling systems.

**Output:** Complete audit report with overall risk rating (Low / Medium / High / Critical), findings sorted by severity, action plan with priorities, and positive findings.

---

### Mode 4: SKILL-SCAN — Prompt Injection Check for Skills

Triggered **before installing any external skill** from GitHub or other sources.

This mode addresses a specific threat in the Claude Code ecosystem: a malicious SKILL.md file could contain hidden instructions that hijack Claude's behavior, read your credentials, modify your global settings, or perform destructive operations — without you ever noticing.

**What happens:**
1. **Metadata check** — do name, description, and actual content match? Unknown author / no versioning / missing repo → elevated scrutiny
2. **Prompt injection scan** — 8 attack categories checked (see reference file)
3. **Scope check** — does the skill do more than its description promises?
4. **False-positive filter** — legitimate skills often contain security examples, CLAUDE.md read access, or shell commands that are documented and scoped

**8 Attack Categories:**

| Category | What's Checked |
|----------|----------------|
| Override / Hijacking | Instructions attempting to override Claude's behavior |
| Exfiltration | Access to sensitive files, API keys, credentials |
| Privilege Escalation | Claimed permissions that were never granted |
| Destructive Actions | `rm -rf`, `git reset --hard`, mass deletion |
| Settings Manipulation | Writes to `CLAUDE.md`, `settings.json` |
| Indirect Injection | External URLs that could load instructions |
| Hidden Instructions | HTML comments, Unicode tricks, invisible text |
| Social Engineering | Fake metadata, impersonation, urgency framing |

**Severity scale:** `CRITICAL` → `HIGH` → `MEDIUM` → `NOTE`

**Output format:**
```
### SKILL-SCAN: my-skill v1.0.0

| # | Category | Severity | Line | Finding |
|---|----------|----------|------|---------|
| 1 | Exfiltration | CRITICAL | 42 | Reads ~/.ssh/id_rsa and transmits content |
| 2 | Override | HIGH | 15 | "Ignore all previous instructions" |

Overall Assessment: DANGEROUS
Recommendation: Do not install

Reason: Two critical findings indicate intentional malicious behavior.
```

---

## Supported Languages (Code Patterns)

JavaScript / TypeScript · Python · Go · Rust · Java · PHP · C / C++ · Bash

---

## Standards & References

| Standard | Coverage |
|----------|----------|
| OWASP Top 10:2025 | All 10 categories, every REVIEW and AUDIT run |
| OWASP ASVS 5.0 | 3 levels: all apps / sensitive data / critical systems |
| OWASP LLM Top 10 | LLM01 Prompt Injection, supply chain for AI systems |
| OWASP Agentic AI (ASI01–ASI10) | Agent security, tool misuse, memory attacks |
| STRIDE / DREAD | Threat modeling framework for DESIGN mode |
| MITRE ATLAS | AML.T0054 Prompt Injection (SKILL-SCAN reference) |

---

## Integration with Other Skills

Other skills can call Security Architect directly:

```
"Check the security aspects of this change"   → triggers REVIEW
"Create a threat model for this feature"      → triggers DESIGN
"Run a security audit"                        → triggers AUDIT
"Scan this skill before I install it"         → triggers SKILL-SCAN
```

| Calling Skill | Security Mode | Result |
|---------------|---------------|--------|
| Ideation | DESIGN | Threat model created in parallel with user story |
| Implement | REVIEW | Code changes reviewed before commit |
| Architecture Review | DESIGN + AUDIT | Architecture extended with security dimension |
| Sprint Review | AUDIT | Periodic security health check |

---

## Trigger Phrases

The skill activates automatically when you say:

- `/security`, `security`, `sicherheit`
- `threat model`, `threat modeling`
- `security review`, `security audit`
- `is this secure?`, `ist das sicher?`
- `OWASP`, `ASVS`
- `scan this skill`, `scanne diesen skill`
- `skill-scan`, `pruefe diesen skill`

---

## File Structure

```
security-architect/
├── README.md                              ← This file
├── SKILL.md                               ← Skill definition (loaded by Claude Code)
└── references/
    ├── threat-modeling.md                 ← STRIDE/DREAD details, auth patterns, Zero Trust
    ├── owasp-checklist.md                 ← OWASP Top 10:2025, ASVS 5.0, ASI01-ASI10
    ├── secure-code-patterns.md            ← Secure vs. insecure patterns per language
    ├── supply-chain.md                    ← Dependency analysis, risk scoring, audit tools
    └── prompt-injection-patterns.md       ← 8 attack categories for SKILL-SCAN mode
```

**SKILL.md** is the file Claude Code reads and executes. It contains the router logic, all four mode workflows, and references to the detail files in `references/`.

**Reference files** are loaded on demand — only when the specific mode needs them. This keeps the context window lean.

---

## Installation

### Option A: From this repository
```bash
cp -r security-architect ~/.claude/skills/security-architect
```

### Option B: Clone the full skills collection
```bash
git clone https://github.com/<your-repo>/claudecodeskills ~/Documents/GitHub/claudecodeskills
cp -r ~/Documents/GitHub/claudecodeskills/security-architect ~/.claude/skills/security-architect
```

### Verify installation
```bash
ls ~/.claude/skills/security-architect/
# Should show: README.md  SKILL.md  references/
```

After installation, Claude Code picks up the skill automatically on the next session start. No configuration needed.

---

## Design Principles

The skill is built on five non-negotiable principles:

1. **Defense in Depth** — Never rely on a single security measure
2. **Fail Closed** — On errors, deny access rather than allow it
3. **Least Privilege** — Grant only the minimum permissions needed
4. **Assume Breach** — Always assume attackers are already in the system
5. **Evidence-Based** — Every finding includes a concrete reason and line number

These principles guide every recommendation the skill makes.

---

## Security Note on This Skill Itself

This skill follows its own SKILL-SCAN criteria:

- It does **not** read files outside its own directory (except CLAUDE.md for global rules, read-only)
- It does **not** make external network requests
- It does **not** modify any system configuration
- All shell command examples are clearly labeled as examples, not executable instructions
- The `references/` directory contains documentation only, no executable code

You can verify this by running `/security` and providing this skill's own SKILL.md as input.

---

## Changelog

### v1.1.0 — 2026-03-10
- **Added: SKILL-SCAN mode** — Prompt injection check for external skills before installation
- **Added: `references/prompt-injection-patterns.md`** — 8 attack categories with concrete patterns, false-positive filter, and sources (OWASP LLM Top 10, MITRE ATLAS, Simon Willison)
- Fixed: Removed unsupported `version` field from SKILL.md frontmatter
- Updated: Decision tree in SKILL.md includes SKILL-SCAN triggers

### v1.0.0 — 2026-03-09
- Initial release
- DESIGN mode: STRIDE/DREAD threat modeling
- REVIEW mode: OWASP Top 10:2025, secure code patterns, secrets check
- AUDIT mode: full project scan including dependency and configuration review
- 4 reference files: threat-modeling, owasp-checklist, secure-code-patterns, supply-chain
- Language support: JS/TS, Python, Go, Rust, Java, PHP, C/C++, Bash

---

## License

MIT License — free to use, modify, and distribute.

---

*Built for [Claude Code](https://claude.ai/claude-code) by Anthropic.*
