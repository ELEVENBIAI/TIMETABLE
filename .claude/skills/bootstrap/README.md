[🇬🇧 English](#english) · [🇩🇪 Deutsch](#deutsch)

---

<a name="english"></a>

# OpenCLAW Bootstrap Skill

> A **portable Claude Code skill** that sets up a complete AI-driven development governance framework for any new project — in 4 interview blocks (A-D) plus 7 setup phases, with zero external dependencies.

**Version 3.0 (April 2026)** — generic, interview-friendly, with portable learning loop (L1/L2/L3). No project-type lock-in, no trading-specific residue.
**Foundation:** Claude Code Best Practice Checklist v10 (OWLIST GmbH, 2026) — context engineering, global settings, context protection, and agent patterns are integrated into the bootstrap process.

---

## Big Picture

![Bootstrap Skill — Interview-Block flow (A–D) + setup phases (0, 4, 5, 7)](docs/bootstrap-big-picture.en.png)

*Four interview blocks (A–D) frame the decisions, four setup phases (0, 4, 5, 7) execute them. Block D activates optional components only on demand. A dedicated Learning-Loop cycle (`/sprint-review` → `journal/learnings.md` → `/ideation`) makes the framework smarter with every sprint. [Excalidraw source](docs/bootstrap-big-picture.en.excalidraw)*

**Also available:** [Artifact Map](docs/artifact-map.en.excalidraw) — visual map of every artifact bootstrap creates (governance files, hooks, specs, self-healing, skills) and how they interact.

---

## Why This Framework?

Most AI development frameworks are either too much automation (black box, no traceability) or too little structure (cursor rules without governance). This one hits the sweet spot:

| Strength | What it means |
|----------|---------------|
| 🔒 **Governance enforced via Git hooks** | `spec-gate.sh` blocks every commit without a spec file. `doc-version-sync.sh` blocks every push on version drift. No other AI framework enforces this at the machine level. |
| 🔗 **Complete traceability** | Every change follows the path: Idea → Linear Issue → Spec → Commit → Changelog. Fully traceable — even months later. |
| 🔄 **Self-healing as safety net** | A cron agent checks every 15 minutes: Versions in sync? Files present? Daemons running? Auto-corrects when possible — no human intervention. |
| 👤 **Human-in-the-loop strictly enforced** | No code change without operator approval. No issue without spec. No spec without architecture dimensions. Claude asks — you decide. |

> **Comparison:** CrewAI has role-based crews. AutoGen has debate patterns. This framework has **enforced governance** — the only framework that machine-level guarantees AI-generated code meets the same quality standards as human code.

---

## What the Skill Does

When you type `/bootstrap` in Claude Code, it walks you through setting up:

| What | Why |
|------|-----|
| **GOVERNANCE.md** | Blueprint for the AI-driven development lifecycle — rules, workflows, quality gates |
| **CLAUDE.md** | Identity and rules file for Claude as AI operator |
| **Self-Healing Agent** | Watches document versions + daemon health every 15 min (cron) |
| **Doc-sync module** | Keeps all docs on the same version, optionally mirrored to Obsidian |
| **Issue writing guidelines** | Structured story format for AI + human collaboration |
| **Skills installation** | Wires up ideation, implement, backlog, architecture-review, and more |
| **Linear + GitHub + Obsidian** | Connects your toolchain into one coherent lifecycle |

---

## Industry-Standard 7-Stage SDLC

This framework mirrors proven development practices from Google, Amazon, and Meta, covering their **7-stage Software Development Lifecycle** fully with AI-supported skills.

| # | Phase | Google/Amazon standard | Our equivalent | Skills | Status |
|---|-------|------------------------|----------------|--------|--------|
| 1 | **Requirements** | PRD, user stories | `/ideation` → Linear issue | `/ideation` | ✅ |
| 2 | **Design** | Design doc, arch review, ADRs | `/ideation` (8 dims) + `/architecture-review` | `/ideation`, `/architecture-review` | ✅ |
| 3 | **Planning** | Task breakdown, sprint planning | `/implement` step 4 → `specs/ISSUE-XX.md` + `/backlog` | `/implement`, `/backlog` | ✅ |
| 4 | **Build** | Code, tests, CI | `/implement` steps 5–6 | `/implement` | ✅ |
| 5 | **Review** | Code review, QA, security | `/implement` step 7 post-validation | `/implement` | ✅ |
| 6 | **Deploy** | CI/CD, staging, rollout | Git push → handoff | — | ⚠️ Partial |
| 7 | **Monitor** | Observability, alerting | Self-Healing (15 min cron), `/status`, `/breakfix` | `/breakfix`, `/status` | ✅ |

---

## Core Flow

```
Idea → /ideation → Linear Issue → /backlog → /implement → Code + Docs → Git Push → Done
```

Every change is:
1. **Authorized** via a Linear issue (no code without ticket)
2. **Documented** in the same commit (no code without doc update)
3. **Monitored** by the self-healing agent (version drift detected within 15 min)
4. **Reproducible** — every workflow is a skill

---

## Installation

### On an existing Claude Code system
```bash
cp -r bootstrap/ ~/.claude/skills/bootstrap/
# Then in Claude Code: /bootstrap
```

### On a fresh machine (portable mode)
```bash
mkdir -p ~/.claude/skills/
cp -r bootstrap/ ~/.claude/skills/bootstrap/
claude
# /bootstrap
```

Zero external dependencies. All templates are embedded in `references/`.

---

## Bootstrap Phases (v3.0)

The bootstrap is structured as **4 interview blocks (A-D)** followed by **execution phases (4-7)**.

| Phase | What happens | Input needed? |
|-------|--------------|---------------|
| **Phase 0** — Briefing | Skill announces the 4-block flow | Confirmation "ready" |
| **Block A** — Project core | Stack + name + prefix + version + add-ons (Privacy, Cost, Signal, Compliance) | 7 questions |
| **Block B** — Existing infrastructure | GitHub/Obsidian/Backlog/Env — integrates into existing state | 5 questions |
| **Block C** — Doc architecture | 3-layer proposal (Story-Specs, Component-Docs, Architecture-Guidelines) + Hub-auto-linking | Confirmation / customization |
| **Phase 4** — Base structure | Directories, Git, core files, `.claudeignore`, hooks, component skeletons | `.env` confirmation |
| **Phase 5** — Skills via git-clone | Skills copied from `KI-Masterclass-Koerting-` repo (no VPS symlinks) | Skill tier |
| **Block D** — Optional components | Self-Healing / DocSync / Automation-Daemon / Learning-Loop (L1/L2/L3) — all at the end | 4 yes/no + loop level |
| **Phase 7** — Registry + finalization | Obsidian PMO hub + project index + final commit | None |

---

## What Gets Created

After `/bootstrap`, your project and global environment have:

### Global (one-time, for all projects)
```
~/.claude/
├── settings.json          ← autoMemoryEnabled + Agent Teams + Permissions
└── CLAUDE.md              ← Model routing, agent strategy, secrets policy
```

### In the project
```
my-project/
├── lib/config.js · doc-sync.js         ← Single source of truth
├── agents/self-healing.js              ← Cron health monitor (15 min)
├── CLAUDE.md · CLAUDE.local.md         ← Project identity + personal overrides
├── ARCHITECTURE_DESIGN.md              ← Architectural decisions entry point
├── SYSTEM_ARCHITECTURE.md              ← Components, data flow, dependencies
├── COMPONENT_INVENTORY.md              ← File inventory (self-healing checks this)
├── GOVERNANCE.md · DEVELOPMENT_PROCESS.md · SECURITY.md
├── CHANGELOG.md · API_INVENTORY.md · INDEX.md · PROCESS_CATALOG.md
├── .env · .env.example · .gitignore · .claudeignore
├── specs/TEMPLATE.md                   ← Story template
├── journal/STRATEGY_LOG.md · LEARNINGS.md
└── .claude/
    ├── settings.json                   ← Hooks (spec-gate, guard, format, Stop)
    ├── ISSUE_WRITING_GUIDELINES.md
    ├── hooks/spec-gate.sh · doc-version-sync.sh · guard.sh · format.sh
    ├── rules/agent-patterns.md
    └── skills/                         ← Linked based on selected skill tier
```

For the full map of artifacts and how they interconnect, see the [Artifact Map](docs/artifact-map.en.excalidraw) (PNG: [docs/artifact-map.en.png](docs/artifact-map.en.png)).

---

## The 8 Inviolable Rules

Claude follows these rules across the entire framework:

1. **Never implement without a Linear issue** — every change must be traceable
2. **Never close an issue without a changelog** — history must be complete
3. **Never change code without asking first** — human-in-the-loop for risk control
4. **Never claim "done" without git push** — code must always be on remote
5. **Never shorten an operator briefing in Linear** — original text is truth
6. **Never create an issue without labels** — labels are essential for filtering
7. **Never move sub-tasks directly to Done** — always through "In Progress" first
8. **Never add an API integration without updating the API inventory**

---

## Interfaces with Other Skills

The bootstrap skill is the **source** for every other skill in the repo. It installs, wires, and configures them all.

| Downstream skill | What bootstrap sets up for it |
|------------------|------------------------------|
| `/ideation` | `ARCHITECTURE_DESIGN.md` scaffold, 8-dimension references, story templates |
| `/backlog` | Linear integration, issue-writing guidelines, dependency fields |
| `/implement` | Spec templates, governance hooks, 8-step protocol wiring |
| `/architecture-review` | Dimensions reference, document structure |
| `/sprint-review` | Template for quarterly audit |
| `/research` | `OPENROUTER_API_KEY` slot in `.env`, skill references |
| `/security-architect` | Security-by-design section, STRIDE/OWASP references |
| `/grafana` | Grafana MCP slot, PromQL conventions |
| `/cloud-system-engineer` | Hostinger MCP slot, infra-dimension reference |
| `/visualize` | Miro MCP slot, required doc structure |
| `/skill-creator` | Global registry entry |
| `/design-md-generator` | Output folder wiring |

Every skill in this repo starts from the foundation bootstrap lays.

---

## Self-Healing Mechanism

```
Cron (every 15 min)
  └── node agents/self-healing.js
      ├── Check M: All DOC_FILES on same VERSION as config.js?
      │   → No: alert + auto-sync via doc-sync.js
      ├── Check U: All documented components on disk?
      │   → No: warning
      └── Check P: All daemon processes running (lock files)?
          → No: restart via start-script with backoff
```

The version number in `config.js` is the **single source of truth**. Bump it → self-healing updates all doc files on the next cron run.

---

## Portability

Zero external dependencies:

| Needed | Source |
|--------|--------|
| GOVERNANCE.md content | `references/governance-template.md` (embedded) |
| Self-healing script | `references/self-healing-template.js` (embedded) |
| Doc-sync script | `references/doc-sync-template.js` (embedded) |
| Issue guidelines | `references/issue-writing-guidelines-template.md` (embedded) |
| File templates | `references/file-templates.md` (embedded) |

Copy the `bootstrap/` folder anywhere → it works immediately.

---

## Prerequisites

### Required
| What | Why |
|------|-----|
| **Claude Code** | The AI operator |
| **Node.js** | Self-healing + doc-sync |
| **GitHub repository** | Already created (empty or with code) |
| **SSH access to GitHub** | For `git push` without password |
| **Linear** account | Issue tracking (free tier works) |

### Optional
Obsidian, Telegram Bot Token, OpenRouter API Key, Hostinger API Key, Miro Access Token, Grafana Cloud, Prometheus.

---

## License

MIT — free to use, adapt for your project.

Part of the **OpenCLAW Governance Framework**.
Skills repo: [github.com/vibercoder79/KI-Masterclass-Koerting-](https://github.com/vibercoder79/KI-Masterclass-Koerting-)

---

---

<a name="deutsch"></a>

# OpenCLAW Bootstrap Skill

> Ein **portabler Claude Code Skill**, der ein vollständiges KI-gesteuertes Entwicklungs-Governance-Framework für jedes neue Projekt einrichtet — in 4 Interview-Blöcken (A-D) plus 7 Setup-Phasen, ohne externe Abhängigkeiten.

**Version 3.0 (April 2026)** — generisch, interview-freundlich, mit portablem Learning-Loop (L1/L2/L3). Kein Projekt-Typ-Lock-in, keine trading-spezifischen Altlasten mehr.
**Grundlage:** Claude Code Best Practice Checkliste v10 (OWLIST GmbH, 2026) — Context Engineering, Global Settings, Kontextschutz und Agent-Patterns sind als integraler Bestandteil in den Bootstrap-Prozess eingeflossen.

---

## Big Picture

![Bootstrap Skill — Interview-Block-Flow (A–D) + Setup-Phasen (0, 4, 5, 7)](docs/bootstrap-big-picture.png)

*Vier Interview-Blöcke (A–D) umrahmen die Entscheidungen, vier Setup-Phasen (0, 4, 5, 7) setzen sie um. Block D aktiviert optionale Komponenten nur auf Wunsch. Ein eigener Learning-Loop-Kreislauf (`/sprint-review` → `journal/learnings.md` → `/ideation`) macht das Framework mit jedem Sprint klüger. [Excalidraw-Quelldatei](docs/bootstrap-big-picture.excalidraw)*

---

## Warum dieses Framework?

Die meisten AI-Development-Frameworks sind entweder zu viel Automation (Black Box, kein Traceability) oder zu wenig Struktur (Cursor-Rules ohne Governance). Dieses Framework trifft den Sweet Spot:

| Stärke | Was das bedeutet |
|--------|-----------------|
| 🔒 **Governance-Enforcement durch Git Hooks** | `spec-gate.sh` blockiert jeden Commit ohne Spec-File. `doc-version-sync.sh` blockiert jeden Push bei Versions-Drift. Kein anderes AI-Framework erzwingt das maschinell. |
| 🔗 **Vollständige Traceability** | Jede Änderung folgt dem Pfad: Idee → Linear Issue → Spec → Commit → Changelog. Lückenlos nachvollziehbar, auch Monate später. |
| 🔄 **Self-Healing als Safety-Net** | Ein Cron-Agent prüft alle 15 Minuten: Versionen synchron? Dateien vorhanden? Daemons laufen? Und korrigiert automatisch — ohne menschliche Intervention. |
| 👤 **Human-in-the-Loop konsequent erzwungen** | Kein Code-Change ohne Operator-Freigabe. Kein Issue ohne Spec. Kein Spec ohne Architekturdimensionen. Claude fragt — du entscheidest. |

> **Vergleich:** CrewAI hat Role-based Crews. AutoGen hat Debate-Pattern. Dieses Framework hat **erzwungene Governance** — das einzige Framework das maschinell sicherstellt, dass KI-generierter Code dieselben Qualitätsstandards erfüllt wie menschlicher Code.

---

## Detaillierter Framework-Vergleich

### OpenCLAW Bootstrap vs. CrewAI vs. AutoGen vs. BMAD vs. Cursor Rules

> Tausende AI-Development-Frameworks existieren. Hier ist eine ehrliche Einordnung — was andere besser machen, was dieses Framework einzigartig macht, und wann du welches wählen solltest.

| Dimension | **OpenCLAW Bootstrap** | CrewAI | AutoGen / AG2 | BMAD | Cursor Rules |
|-----------|------------------------|--------|---------------|------|--------------|
| **Governance-Enforcement** | ✅ Maschinell erzwungen (Git Hooks) | ❌ Keine | ❌ Keine | ⚠️ Manuell | ❌ Keine |
| **Traceability** | ✅ Idee → Issue → Spec → Commit | ❌ | ❌ | ⚠️ Partiell | ❌ |
| **Human-in-the-Loop** | ✅ Erzwungen (Spec-Freigabe) | ⚠️ Optional | ⚠️ Optional | ✅ Explizit | ❌ |
| **Self-Healing** | ✅ Cron, 15 Min, auto-korrigiert | ❌ | ❌ | ❌ | ❌ |
| **Learning-Loop** | ✅ Outcome-Check + LEARNINGS.md | ❌ | ❌ | ❌ | ❌ |
| **Modell-Routing** | ✅ Opus/Sonnet/Haiku je Task-Typ | ⚠️ Konfigurierbar | ✅ Gut | ❌ | ❌ |
| **Multi-Agent Orchestrierung** | ✅ Agent-Teams + Parallel-Subagents | ✅ Stark | ✅ Sehr stark | ⚠️ Manuell | ❌ |
| **Deploy-Automation** | ⚠️ Teilweise (Git Push + Manual) | ❌ | ❌ | ❌ | ❌ |
| **Portabilität** | ✅ Zero Dependencies, 1 Ordner | ⚠️ pip install | ⚠️ pip install | ⚠️ Prompt-Files | ✅ |
| **Projekt-Setup-Zeit** | ~30 Min (geführt) | Stunden | Stunden | ~1h | Minuten |
| **Zielgruppe** | Solo-Dev bis kleines Team | Enterprise-Teams | Forschung / Quality | Agile Teams | Einzelentwickler |

### Was andere Frameworks besser machen

| Framework | Echte Stärke | Wann bevorzugen |
|-----------|-------------|-----------------|
| **CrewAI** | Skalierbare Role-based Crews für Enterprise — 60% der Fortune 500 nutzen es. Beste Wahl wenn >10 Agents koordiniert werden müssen. | Großes Team, viele parallele Workflows, Enterprise-Compliance-Anforderungen |
| **AutoGen / AG2** | Debate-Pattern: 2 Agents argumentieren gegeneinander bis zur besten Lösung. Höchste Ausgabequalität für komplexe Analyse-Aufgaben. | Forschung, Code-Review mit höchsten Qualitätsanforderungen, offline Batch-Prozesse |
| **BMAD** | Strukturierter Agile-Workflow mit klaren Rollen (PM, Architect, Developer). Gut dokumentiert, große Community. | Teams die Scrum/Agile bereits kennen und einen AI-nativen Workflow wollen |
| **Cursor Rules** | Sofort einsatzbereit, keine Setup-Zeit, direkt im Editor. | Einzelentwickler die schnell starten wollen ohne Governance-Overhead |

### Was OpenCLAW Bootstrap einzigartig macht

**1. Governance ist maschinell erzwungen — nicht nur dokumentiert**

Andere Frameworks haben READMEs mit Best Practices. Dieses Framework hat Git Hooks die physisch blockieren:
```
git commit → spec-gate.sh → BLOCKED wenn kein specs/ISSUE-XX.md existiert
git push   → doc-version-sync.sh → BLOCKED wenn Doku-Dateien veraltet sind
```
Kein anderes Framework in diesem Vergleich hat das.

**2. Vollständige Traceability ohne manuellen Aufwand**

Jede Änderung hinterlässt automatisch eine vollständige Spur:
```
💡 Idee → /ideation → 📋 Linear Issue (4 Perspektiven + ACs)
→ specs/ISSUE-XX.md (Operator-Freigabe) → git commit "T1: ..."
→ CHANGELOG.md (auto) → Obsidian Vault (auto-sync) → Issue Done
```
6 Monate später weißt du exakt warum jede Codezeile existiert.

**3. Learning-Loop: Framework wird mit jeder Story klüger**

Beim Setup: Primärmetrik + Baseline + Ziel definieren (z.B. "WinRate 33% → 45%").
Nach jedem Issue-Close: Outcome-Check-Datum gesetzt, Ergebnis in `journal/LEARNINGS.md`.
Claude weiß nach 10 Stories: "Stories mit Typ X verbessern die Metrik, Typ Y nicht."
Kein anderes Framework tracked Business-Outcomes systematisch.

**4. Self-Healing ohne Ops-Team**

Ein Cron-Agent läuft alle 15 Minuten und korrigiert automatisch:
- Versions-Drift zwischen Doku-Dateien → auto-sync
- Gestoppte Daemons → auto-restart mit Backoff
- Telegram-Alert bei Anomalien

Solo-Entwickler oder kleines Team ohne dediziertes Ops kann damit zuverlässig produzieren.

**5. Portabel — ein Ordner, null Dependencies**

```bash
cp -r bootstrap/ ~/.claude/skills/bootstrap/
# Fertig. Keine pip install, keine npm, keine Cloud-Abhängigkeiten.
```
Läuft auf Mac, VPS, Claude Code Desktop — überall gleich.

### Wann OpenCLAW Bootstrap wählen

✅ **Ideal wenn:**
- Solo-Entwickler oder Team bis ~5 Personen
- Langlebiges Projekt (>3 Monate) das wartbar bleiben muss
- Produktion mit echten Business-Metriken (WinRate, Conversion, Latenz)
- Compliance oder Audit-Anforderungen (vollständige Traceability benötigt)
- Claude Code als primäres AI-Tool

⚠️ **Nicht ideal wenn:**
- Kurzes Experiment oder Proof-of-Concept (<2 Wochen)
- Großes Team (>10) mit eigener CI/CD-Pipeline (→ CrewAI oder AutoGen besser)
- Maximale Ausgabequalität wichtiger als Governance (→ AutoGen Debate-Pattern)
- Kein Linear-Account gewünscht (Ticket-System ist Kernvoraussetzung)

---

## Was dieser Skill macht

Wenn du `/bootstrap` in Claude Code eingibst, führt er dich durch die Einrichtung von:

| Was | Warum |
|-----|-------|
| **GOVERNANCE.md** | Blueprint für den KI-gesteuerten Entwicklungslebenszyklus — Regeln, Workflows, Qualitätsgates |
| **CLAUDE.md** | Identitäts- und Regeldatei für Claude als KI-Operator |
| **Self-Healing Agent** | Überwacht Dokumentversionen + Daemon-Gesundheit alle 15 Min (Cron) |
| **Doc-Sync-Modul** | Hält alle Docs auf derselben Version, optional gespiegelt nach Obsidian |
| **Issue-Schreibrichtlinien** | Strukturiertes Story-Format für KI + Mensch-Kollaboration |
| **Skills-Installation** | Verknüpft ideation, implement, backlog, architecture-review und mehr |
| **Linear + GitHub + Obsidian** | Verbindet deine Toolchain zu einem kohärenten Lebenszyklus |

---

## Industriestandard 7-stufiger Entwicklungsprozess

Dieses Framework orientiert sich an den bewährten Entwicklungspraktiken führender Tech-Unternehmen wie **Google, Amazon und Meta** und bildet deren **7-stufigen Software Development Lifecycle (SDLC)** vollständig mit KI-unterstützten Skills ab.

> **Kernprinzip:** Jede Entwicklungsphase — von der Idee bis zur Überwachung — wird durch einen dedizierten Claude Code Skill unterstützt. Claude Code ist der Operator, der diese Skills orchestriert und sicherstellt, dass Governance-Regeln in jeder Phase eingehalten werden.

| # | Phase | Google/Amazon-Standard | Unser Äquivalent | Skill(s) | Status |
|---|-------|------------------------|------------------|----------|--------|
| 1 | **Anforderungen** | PRD, User Stories, Stakeholder Input | `/ideation` → Linear Issue (4 Perspektiven, ACs, Abhängigkeiten) | `/ideation` | ✅ Abgedeckt |
| 2 | **Design** | Design Doc, Architecture Review, ADRs | `/ideation` (8 Dimensionen) + Architecture Design Doc im Issue + `/architecture-review` | `/ideation`, `/architecture-review` | ✅ Abgedeckt |
| 3 | **Planung** | Task Breakdown, Sprint Planning, Spec | `/implement` Schritt 4 → `specs/ISSUE-XX.md` (neu!) + `/backlog` für Priorisierung | `/implement`, `/backlog` | ✅ Abgedeckt |
| 4 | **Build** | Code, Tests, CI Pipeline | `/implement` Schritte 5–6 → Tasks aus Spec (T1→Verify→Commit→T2...) | `/implement` | ✅ Abgedeckt |
| 5 | **Review** | Code Review, QA, Security Review | `/implement` Schritt 7 → Post-Implement Validation (AC, Architektur-Quick-Check, Smoke Test, Security-Findings) | `/implement` | ✅ Abgedeckt |
| 6 | **Deploy** | CI/CD, Staging, Rollout | Git Push → Handoff → System liest CLAUDE.md. Daemon-Prozesse per Start-Scripts neugestartet | — | ⚠️ Teilweise |
| 7 | **Monitor** | Observability, Alerting, Incident Response | Self-Healing (Cron, 15 Min), Telegram-Alerts, `/breakfix`, `/status`, Morning Briefing | `/breakfix`, `/status` | ✅ Abgedeckt |

> **Fazit: 6 von 7 Phasen** sind vollständig durch Skills abgedeckt. **Deploy (Phase 6)** ist projektspezifisch und wird nicht automatisiert — hier gibt es eine separate [Monitoring-Empfehlung](#monitoring-empfehlung-außerhalb-bootstrap) mit Prometheus + Grafana.

```mermaid
flowchart LR
    P1["1️⃣ Anforderungen\n/ideation\nLinear Issue"] --> P2["2️⃣ Design\n/ideation\n/architecture-review"]
    P2 --> P3["3️⃣ Planung\n/implement\n/backlog + Spec"]
    P3 --> P4["4️⃣ Build\n/implement\nT1→T2→... Commits"]
    P4 --> P5["5️⃣ Review\n/implement\nPost-Validation"]
    P5 --> P6["6️⃣ Deploy\nGit Push\n⚠️ Manuell"]
    P6 --> P7["7️⃣ Monitor\n/breakfix + /status\nSelf-Healing"]
    P7 -.->|"Feedback Loop"| P1
```

---

## Die Kernidee

```
Idee → /ideation → Linear Issue → /backlog → /implement → Code + Docs → Git Push → Fertig
```

Jede Änderung ist:
1. **Autorisiert** durch ein Linear-Issue (kein Code ohne Ticket)
2. **Dokumentiert** im selben Commit (kein Code ohne Doku-Update)
3. **Überwacht** durch den Self-Healing Agent (Versions-Drift in 15 Min erkannt)
4. **Reproduzierbar**, weil jeder Workflow ein Skill ist

```mermaid
flowchart LR
    A["💡 Idee"] --> B["/ideation\nRecherche + Story"]
    B --> C["📋 Linear Issue"]
    C --> D["/implement\n7-stufiger SDLC"]
    D --> E{"🔒 spec-gate.sh\nSpec vorhanden?"}
    E -->|"Kein Spec"| F["Erstelle\nspecs/ISSUE-XX.md"]
    F --> E
    E -->|"Spec OK"| G{"🔒 doc-version-sync.sh\nVersionen synchron?"}
    G -->|"Drift"| H["Sync alle DOC_FILES"]
    H --> G
    G -->|"Synchron"| I["📦 git push\nCode + Docs"]
    I --> J["✅ Fertig + Changelog"]
    K["🔄 Self-Healing\nalle 15 Min"] -.-> J
```

---

## Installation

### Auf einem bestehenden Claude Code System (gleicher Server)

```bash
# Bootstrap Skill in das Claude Code Skills-Verzeichnis kopieren
cp -r bootstrap/ ~/.claude/skills/bootstrap/

# Claude Code in einem beliebigen Verzeichnis starten und eingeben:
# /bootstrap
```

### Auf einem neuen Server (portabler Modus)

```bash
# 1. Claude Code installieren
# 2. Diesen Ordner in das Skills-Verzeichnis kopieren
mkdir -p /root/.claude/skills/
cp -r bootstrap/ ~/.claude/skills/bootstrap/

# 3. Claude Code öffnen
claude

# 4. Eingeben: /bootstrap
```

Keine Abhängigkeiten auf andere Dateien. Alle Templates sind in `references/` eingebettet.

---

## Was du vorher brauchst

### Bereithalten — was Bootstrap dich im Interview fragt

**Block A (Projekt-Kern, 7 Fragen):**
- Stack (Node.js / Frontend / Full-Stack / Python / Anderes)
- Projektname + Ein-Satz-Beschreibung
- Absoluter Pfad zum Projektverzeichnis
- Backlog-Tool (`linear` / `github-issues` / `none`) + Issue-Präfix (z.B. `PROJ-`)
- Startversion (z.B. `1.0.0`)
- Architektur-Add-ons: Privacy / Cost / Signal / Compliance (beliebige Kombination, auch keine)

**Block B (Bestehende Infrastruktur, 5 Fragen):**
- GitHub-Repo vorhanden? (URL oder "neu anlegen")
- Obsidian-Vault im Einsatz? (Pfad oder "nein")
- Backlog-Tool schon konfiguriert?
- `.env` schon da?
- `CLAUDE.md` schon da? (mergen oder überschreiben)

**Block C (Doku-Architektur):** Bootstrap schlägt 3 Schichten + Hub vor — du bestätigst oder passt an.

**Block D (Optional-Komponenten, am Ende):** 4 Ja/Nein-Fragen (Self-Healing / DocSync / Automation-Daemon / Learning-Loop L1/L2/L3).

**Optionale API-Keys (kannst du auch später nachtragen):**
- Telegram Bot Token (für Self-Healing Alerts)
- OpenRouter/Perplexity API Key (für `/research` Deep-Tier)
- Grafana Cloud URL + API Key (für Monitoring-Dashboards)

---

## Dateistruktur

```
bootstrap/
├── SKILL.md                                    ← Skill-Definition (Claude liest dies)
├── README.md                                   ← Diese Datei
├── GAPS.md                                     ← Gap-Analyse: was fehlt noch (internes Audit)
├── docs/
│   └── diagrams/                               ← Visuelle Diagramme (Excalidraw + PNG-Exports)
│       ├── 00-big-picture.excalidraw
│       ├── 01-anforderungen.excalidraw … 07-monitor.excalidraw
│       └── *.png                               ← Exportierte PNG-Versionen
└── references/                                 ← Alle Templates eingebettet — keine externen Deps
    │
    ├── PROJEKT-SETUP
    ├── info-gathering.md                       ← Checkliste der zu sammelnden Infos (inkl. MCP, Telegram, Grafana)
    ├── file-templates.md                       ← config.js, CLAUDE.md, .env.example, .gitignore, .claudeignore etc.
    ├── governance-template.md                  ← Vollständige GOVERNANCE.md (portabel, eingebettet)
    ├── architecture-design-template.md         ← ARCHITECTURE_DESIGN.md Starter
    │
    ├── GOVERNANCE & HOOKS
    ├── hooks-setup.md                          ← spec-gate.sh + doc-version-sync.sh Templates
    ├── issue-writing-guidelines-template.md    ← Issue-Format-Richtlinien für KI + Mensch
    │
    ├── INFRASTRUKTUR & SERVICES
    ├── mcp-setup.md                            ← MCP-Server einrichten (Linear, Grafana, Supabase, Hostinger …)
    ├── telegram-setup.md                       ← Telegram Bot + Chat-ID + Linear-Webhook vollständig
    ├── grafana-monitoring.md                   ← Grafana Cloud + Alloy + /grafana Skill Nutzungsmuster
    │
    ├── CODE-QUALITÄT & AGENTS
    ├── agent-patterns.md                       ← 4 Team-Patterns als .claude/rules/ Vorlage (Lazy Loading)
    │
    ├── RUNTIME
    ├── self-healing-template.js                ← Self-Healing Agent Starter-Code
    ├── doc-sync-template.js                    ← Doc-Sync-Modul Starter-Code
    │
    ├── SKILLS
    ├── skills-setup.md                         ← Symlinks vs. Kopien, Reihenfolge, generierte Skills
    ├── breakfix-template.md                    ← /breakfix Skeleton (projekt-individuell generiert)
    ├── integration-test-template.md            ← /integration-test Skeleton
    ├── status-template.md                      ← /status Skeleton
    ├── wrap-up-template.md                     ← /wrap-up Skill (Session-Abschluss + Auto-Memory)
    │
    └── ABSCHLUSS
        └── global-registry-update.md          ← Wie Projekt in ~/.claude/CLAUDE.md registrieren
```

---

## Die Bootstrap-Phasen (v3.0)

Der Bootstrap ist in **4 Interview-Bloecken (A-D)** plus **Execution-Phasen (4-7)** strukturiert.

| Phase | Was passiert | Eingabe noetig? |
|-------|-------------|----------------|
| **Phase 0** — Briefing | Skill kuendigt den 4-Block-Flow an | Bestaetigung "bereit" |
| **Block A** — Projekt-Kern | Stack + Name + Prefix + Version + Add-ons (Privacy, Cost, Signal, Compliance) | 7 Fragen |
| **Block B** — Bestehende Infrastruktur | GitHub/Obsidian/Backlog/Env — integriert in bestehenden Stand | 5 Fragen |
| **Block C** — Doku-Architektur | 3-Schichten-Vorschlag (Story-Specs, Component-Docs, Architektur-Vorgaben) + Hub-Auto-Verlinkung | Bestaetigung / Anpassung |
| **Phase 4** — Grundstruktur | Verzeichnisse, Git, Kerndateien, `.claudeignore`, Hooks, Component-Skelette | `.env`-Bestaetigung |
| **Phase 5** — Skills via git-clone | Skills aus `KI-Masterclass-Koerting-` kopieren (keine VPS-Symlinks) | Skill-Tier |
| **Block D** — Optional-Komponenten | Self-Healing / DocSync / Automation-Daemon / Learning-Loop (L1/L2/L3) — alle am Ende | 4 Ja/Nein + Loop-Level |
| **Phase 7** — Registry + Finalisierung | Obsidian PMO-Hub + Projekt-Index + Final-Commit | Keine |

```mermaid
flowchart LR
    P0["📋 Phase 0\nBriefing\nFlow ankuendigen"]
    BA["🅰️ Block A\nProjekt-Kern\nStack + 7 Fragen\n+ Add-ons"]
    BB["🅱️ Block B\nBestehende Infra\nGitHub · Obsidian\nBacklog · Env"]
    BC["🇨 Block C\nDoku-Architektur\n3 Schichten + Hub"]
    P4["🏗️ Phase 4\nGrundstruktur\nDateien · Git · Hooks"]
    P5["📦 Phase 5\nSkills via git-clone\n(keine Symlinks)"]
    BD["🇩 Block D\nOptional-Komponenten\nSelf-Healing · DocSync\nDaemon · Learning-Loop"]
    P7["🌐 Phase 7\nFinalisierung\nSecondBrain + Registry"]
    DONE["🚀 Bereit fuer\n/ideation"]
    LL["🔁 Learning-Loop\n/sprint-review →\njournal/learnings.md →\n/ideation"]

    P0 --> BA --> BB --> BC --> P4 --> P5 --> BD --> P7 --> DONE
    DONE -.-> LL
    LL -.-> BA
```

---

## Was erstellt wird

Nach `/bootstrap` hat dein Projekt und deine globale Umgebung:

### Global (einmalig — gilt für alle Projekte)

```
~/.claude/
├── settings.json          ← autoMemoryEnabled + Agent Teams + Permissions
└── CLAUDE.md              ← Modell-Routing, Agent-Strategie, Secrets-Policy
```

### Im Projekt

```
mein-projekt/
├── lib/
│   ├── config.js          ← VERSION + DOC_FILES — einzige Wahrheitsquelle
│   └── doc-sync.js        ← Synchronisiert alle Docs + Obsidian Vault
├── agents/
│   └── self-healing.js    ← Cron-Gesundheitsmonitor (alle 15 Min)
│
├── CLAUDE.md              ← Projekt-Identität, Regeln, Quick-Referenz
├── CLAUDE.local.md        ← Persönliche Overrides (gitignored)
├── ARCHITECTURE_DESIGN.md ← Einstiegsdokument für Architekturentscheidungen
├── SYSTEM_ARCHITECTURE.md ← Komponenten, Datenfluss, externe Abhängigkeiten
├── COMPONENT_INVENTORY.md ← Datei-Inventar (Self-Healing prüft dies)
├── GOVERNANCE.md          ← Vollständiges Governance-Blueprint
├── DEVELOPMENT_PROCESS.md ← Entwicklungsprozess für dieses Projekt
├── SECURITY.md            ← API Key-Policy, Bedrohungsmodell
├── CHANGELOG.md           ← Auto-aktualisiert durch doc-sync
├── API_INVENTORY.md       ← Alle externen APIs dokumentiert
├── INDEX.md               ← Docs-Index (Claude navigiert damit)
├── PROCESS_CATALOG.md     ← Alle Prozesse und Workflows
│
├── .env                   ← API Keys (gitignored)
├── .env.example           ← Format-Erklärungen für jeden Key (nie echte Keys!)
├── .gitignore             ← inkl. .env, CLAUDE.local.md, node_modules
├── .claudeignore          ← Kontextschutz: node_modules, .env, Logs (Claude liest diese nie)
│
├── specs/
│   └── TEMPLATE.md        ← Story-Template mit Agent-Pattern, DB-Impact, Rollback
├── journal/
│   ├── STRATEGY_LOG.md    ← Pflichtlektüre vor /ideation — verhindert Wiederholungen
│   └── LEARNINGS.md       ← Outcome-Tracking nach Issue-Close
│
└── .claude/
    ├── settings.json      ← Projekt-Permissions + Hooks (spec-gate, guard, format, Stop)
    ├── ISSUE_WRITING_GUIDELINES.md
    ├── hooks/
    │   ├── spec-gate.sh           ← Blockiert Commit ohne Spec-File
    │   ├── doc-version-sync.sh    ← Blockiert Push bei Versions-Drift
    │   ├── guard.sh               ← Blockiert Zugriff auf .env + Schlüsseldateien
    │   └── format.sh              ← Auto-Format nach Edit/Write (Biome/Black)
    ├── rules/
    │   └── agent-patterns.md      ← 4 Team-Patterns, Lazy Loading (0 Token-Overhead)
    └── skills/
        ├── ideation/      ← lokale Kopie via git clone (v3.0)
        ├── implement/     → Symlink oder Kopie
        ├── backlog/       ← lokale Kopie via git clone (v3.0)
        └── ...            → je nach gewähltem Skill-Tier
```

---

## Die 8 unverbrüchlichen Regeln

Claude folgt diesen Regeln im gesamten Framework:

1. **Niemals ohne Linear-Issue implementieren** — jede Änderung muss nachverfolgbar sein
2. **Niemals ein Issue ohne Changelog schließen** — die Geschichte muss vollständig sein
3. **Niemals Code ändern ohne vorherige Rückfrage** — Mensch-in-der-Schleife für Risikokontrolle
4. **Niemals "fertig" behaupten ohne Git Push** — Code muss immer im Remote sein
5. **Niemals ein Operator-Briefing in Linear kürzen** — Originaltext ist Wahrheit
6. **Niemals ein Issue ohne Labels anlegen** — Labels sind essenziell für die Filterung
7. **Niemals Sub-Tasks direkt nach Done verschieben** — immer durch "In Progress" zuerst
8. **Niemals eine API-Integration hinzufügen ohne das API-Inventar zu aktualisieren**

```mermaid
sequenceDiagram
    participant Dev as Claude Code
    participant SG as 🔒 spec-gate.sh
    participant DS as 🔒 doc-version-sync.sh
    participant GH as 📦 GitHub

    Dev->>SG: git commit Versuch
    alt Kein Spec-File gefunden
        SG-->>Dev: BLOCKIERT — erstelle specs/ISSUE-XX.md zuerst
    else Spec-File vorhanden
        SG->>DS: ✅ Spec OK — Versionen prüfen
        alt VERSION-Mismatch in DOC_FILES
            DS-->>Dev: BLOCKIERT — sync alle Docs auf aktuelle VERSION
        else Alle DOC_FILES synchron
            DS->>GH: ✅ Commit + Push
            GH-->>Dev: Fertig — Issue kann geschlossen werden
        end
    end
```

---

## Der Self-Healing-Mechanismus

```
Cron (alle 15 Min)
    └── node agents/self-healing.js
            ├── Check M: Alle DOC_FILES auf derselben VERSION wie config.js?
            │   → Nein: Alert + Auto-Sync via doc-sync.js
            ├── Check U: Alle dokumentierten Komponenten auf dem Dateisystem?
            │   → Nein: Warnung
            └── Check P: Alle Daemon-Prozesse laufen (Lock-Files)?
                → Nein: Neustart via Start-Script + Backoff
```

Die Versionsnummer in `config.js` ist die **einzige Wahrheitsquelle**. Wenn du sie erhöhst, aktualisiert Self-Healing automatisch alle Dok-Dateien beim nächsten Cron-Lauf.

---

## Alle Skills im Überblick

Dieser Bootstrap-Skill richtet dein Projekt für folgende Skills ein:

| Skill | Auslöser | Zweck | SDLC Phase |
|-------|---------|-------|------------|
| `/ideation` | "Ich habe eine Idee" | Recherche → Architektur-Design → Linear Issue | 1, 2 |
| `/implement` | "los", "starte ISSUE-XX" | 7-stufiger SDLC-Workflow mit Qualitätsgates | 3, 4, 5 |
| `/backlog` | "was steht an" | Sprint-Planung + Abhängigkeitsanalyse | 3 |
| `/architecture-review` | "Architektur prüfen" | 8-Dimensionen-Qualitätsbericht | 2 |
| `/sprint-review` | "Sprint Review" | Quartals-Audit + Tech Debt | 5 |
| `/research` | "recherchiere X" | 2-Tier: WebSearch + Perplexity Deep Research | 1, 2 |
| `/breakfix` | "System kaputt" | Incident Response: Detect → Fix → Document | 7 |
| `/status` | "Status" | System Status Dashboard | 7 |
| `/wrap-up` | "Exit", "Ende" | Session-Abschluss + Memory-Persistierung | 7 |

Alle Skills sind aus dem gleichen OpenCLAW-Framework und arbeiten zusammen.

---

## Monitoring-Empfehlung (außerhalb Bootstrap)

> ⚠️ **Wichtiger Hinweis:** Dieser Abschnitt beschreibt eine **Empfehlung** — keinen automatischen Bootstrap-Schritt. Der hier beschriebene Setup muss **manuell nach dem Bootstrap** eingerichtet werden und ist **nicht** Teil des Bootstrap-Prozesses.

Der Bootstrap-Prozess richtet ein einfaches Self-Healing-Monitoring ein (Check M, U, P — alle 15 Min). Für ein vollständiges **Produktions-Monitoring** empfehlen wir folgenden Stack — so wie wir es im CLAW Trading System produktiv einsetzen:

### Empfohlener Monitoring-Stack

| Komponente | Zweck | Kosten |
|-----------|-------|--------|
| **Prometheus** | Metriken sammeln + speichern (Time-Series-Datenbank) | Open Source — kostenlos |
| **Node Exporter** | Server-Metriken exportieren (CPU, RAM, Disk, Prozesse) | Open Source — kostenlos |
| **Grafana Cloud** | Dashboards + Alerting + Visualisierung | Free Tier verfügbar |

### Warum dieser Stack?

- **Prometheus** ist der Industriestandard für Metriken-Sammlung (verwendet von Google, Netflix, Spotify)
- **Grafana Cloud** ermöglicht professionelle Dashboards ohne eigene Infrastruktur
- Der **`/grafana` Skill** (OpenCLAW Framework) erstellt und verwaltet Dashboards direkt via Grafana MCP Server — Claude baut die Dashboards für dich

### Kurzanleitung

```bash
# 1. Prometheus auf deinem Server installieren
# → Offizielle Doku: https://prometheus.io/docs/introduction/first_steps/

# 2. Node Exporter für Server-Metriken installieren
# → Offizielle Doku: https://prometheus.io/docs/guides/node-exporter/

# 3. Grafana Cloud Account anlegen (Free Tier reicht für den Einstieg)
# → https://grafana.com/products/cloud/

# 4. Prometheus als Data Source in Grafana konfigurieren
# → Grafana UI: Connections → Data Sources → Prometheus → URL eingeben

# 5. Optional: /grafana Skill in Claude Code installieren
# → Erstellt und verwaltet Dashboards direkt via Grafana MCP Server
cp -r /root/.claude/skills/grafana/ .claude/skills/grafana/
```

### Was du damit überwachst

- Laufende Daemon-Prozesse (via Node Exporter)
- API-Latenz und Fehlerrate (Custom Metriken)
- Versions-Drift-Warnungen (Self-Healing Alerts)
- Projekt-spezifische Business-Metriken

---

## Portabilität

Dieser Skill hat **keine externen Abhängigkeiten**:

| Gebraucht | Quelle |
|-----------|--------|
| GOVERNANCE.md Inhalt | `references/governance-template.md` (eingebettet) |
| Self-Healing Skript | `references/self-healing-template.js` (eingebettet) |
| Doc-Sync Skript | `references/doc-sync-template.js` (eingebettet) |
| Issue-Richtlinien | `references/issue-writing-guidelines-template.md` (eingebettet) |
| Datei-Templates | `references/file-templates.md` (eingebettet) |

Den `bootstrap/` Ordner irgendwohin kopieren → es funktioniert sofort.

---

## Voraussetzungen

### Pflicht

| Was | Warum |
|-----|-------|
| **Claude Code** | claude.ai/claude-code — der KI-Operator |
| **Node.js** | für self-healing + doc-sync |
| **GitHub Repository** | bereits angelegt (leer oder mit Code) |
| **SSH-Zugang zu GitHub** | damit `git push` ohne Passwort funktioniert — **siehe unten** |
| **Linear** Account | Issue-Tracking (Free Tier reicht) |

### SSH-Zugang zu GitHub einrichten

Bootstrap führt am Ende `git push` aus. Dafür muss SSH konfiguriert sein.

**Mac / lokaler PC:**
```bash
# 1. SSH Key generieren (falls noch keiner vorhanden)
ssh-keygen -t ed25519 -C "deine@email.com"
# → Key liegt in ~/.ssh/id_ed25519.pub

# 2. Public Key in GitHub hinterlegen
# GitHub → Settings → SSH and GPG Keys → New SSH Key
cat ~/.ssh/id_ed25519.pub  # diesen Text in GitHub einfügen

# 3. Testen
ssh -T git@github.com
# Erwartet: "Hi username! You've successfully authenticated..."
```

**VPS / Server (z.B. Hostinger):**
```bash
# Gleicher Prozess — auf dem Server ausführen
ssh-keygen -t ed25519 -C "vps@meinprojekt.com"
cat ~/.ssh/id_ed25519.pub
# → In GitHub unter Settings → SSH Keys hinterlegen
ssh -T git@github.com  # Test
```

**Claude Code Desktop (Mac App):**
```bash
# Claude Code nutzt den SSH-Agenten des Systems
# Wenn ssh -T git@github.com funktioniert → Claude Code kann pushen
# Falls nicht: ssh-add ~/.ssh/id_ed25519
```

> **Hinweis:** Bootstrap prüft SSH in Phase 0 automatisch mit `ssh -T git@github.com`.
> Wenn der Test fehlschlägt, hält Bootstrap an und zeigt die Einrichtungsanleitung.

### Optional

| Was | Wofür |
|-----|-------|
| **Obsidian** | Doc-Sync in Vault |
| **Telegram Bot** | Self-Healing Alerts |
| **OpenRouter API Key** | `/research` Deep-Tier via Perplexity |
| **Hostinger API Key** | `/cloud-system-engineer` Skill |
| **Miro Access Token** | `/visualize` Skill |
| **notebooklm-py** CLI | `/notebooklm` Skill |
| **Grafana Cloud Account** | Monitoring-Dashboards (Empfehlung — siehe oben) |
| **Prometheus** | Metriken-Sammlung (Empfehlung — siehe oben) |

---

## Lizenz

MIT — frei verwendbar, adaptierbar für dein Projekt.

Teil des **OpenCLAW Governance Frameworks**.
Quelle: [github.com/vibercoder79/openclaw_trading](https://github.com/vibercoder79/openclaw_trading)
