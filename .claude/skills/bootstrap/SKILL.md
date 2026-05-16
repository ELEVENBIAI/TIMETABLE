---
name: bootstrap
version: 3.0.0
description: Setzt ein neues Projekt mit Governance-Framework auf — interaktiver Block-Interview-Flow in 4 Schritten, Doku-Architektur mit Hub-Auto-Verlinkung, optionaler Learning-Loop L1/L2/L3. Verwenden wenn der Operator ein neues Projekt aufsetzen will oder "/bootstrap" sagt.
tools: [Read, Write, Edit, Bash, Glob, Grep]
---

# Bootstrap — Neues Projekt aufsetzen (v3.0)

Setzt ein neues Projekt mit Governance-Framework auf. Der Flow ist in **4 Bloecke (A-D)** strukturiert — jeder Block mit klarem Fokus, keine Fragen-Batches.

Referenzen:
- `references/info-gathering.md` — Kern-Fragen (Block A)
- `references/existing-infra-check.md` — Bestehende Infrastruktur (Block B)
- `references/doc-architecture-proposal.md` — Doku-Architektur (Block C)
- `references/optional-components.md` — Self-Healing / DocSync / Daemon / Learning-Loop (Block D)
- `references/learning-loop.md` — L1/L2/L3 Design
- `references/file-templates.md` — Dateischablonen
- `references/skills-setup.md` — Skills aus GitHub ziehen
- `references/global-registry-update.md` — SecondBrain-Integration
- `references/hooks-setup.md` — Governance-Hooks

---

## Phase 0: Briefing (vor allen Fragen)

Den Operator zuerst informieren, dann starten:

```
Bootstrap v3.0 — ich fuehre dich durch 4 Bloecke:

  Block A — Projekt-Kern           (8 Fragen,  ~3 min)
  Block B — Bestehende Infra       (5 Fragen,  ~3 min)
  Block C — Doku-Architektur       (Vorschlag + Review)
  Block D — Optional-Komponenten   (4 Ja/Nein-Fragen am Ende)

Danach lege ich das Projekt an. Gesamt ~15 min.
Bereit? [ja / spaeter]
```

Warte auf `ja`.

---

## Phase 1: Block A — Projekt-Kern

Lies `references/info-gathering.md` fuer die vollstaendige Fragenliste. Stelle die Fragen **einzeln oder in kleinen Gruppen** (max 3 pro Rueckfrage), nicht als Batch.

### A.1 Stack-Frage (zuerst)

```
Was moechtest du entwickeln?
  a) Node.js / JavaScript Backend (API, CLI, Daemon)
  b) Frontend (React, Vue, Vanilla JS)
  c) Full-Stack (Backend + Frontend)
  d) Python (KI/ML, Scripts, FastAPI, Django)
  e) Anderes / Noch nicht klar
```

Antwort als `STACK_CHOICE` merken — bestimmt welche Linting-Tools angelegt werden:

| Wahl | Linter-Config | Formatter |
|------|--------------|-----------|
| a) Node.js | `eslint.config.mjs` | — |
| b) Frontend | `eslint.config.mjs` + `.prettierrc` | Prettier |
| c) Full-Stack | beide | Prettier |
| d) Python | `pyproject.toml` (Ruff + Black) | Black |
| e) Anderes | `eslint.config.mjs` (generisch) | — |

### A.2 Projekt-Identitaet (3 Fragen)

```
1. Projektname? (z.B. MyAnalytics)
2. Ein-Satz-Beschreibung: Was macht das System?
3. Start-Version? (default 0.1.0)
```

### A.3 Backlog (2 Fragen)

```
4. Issue-Prefix? (default aus Projektname abgeleitet, z.B. "MA-" fuer MyAnalytics)
5. Primaere Sprache fuer Doku? (de / en, default: de)
```

### A.4 Architektur-Dimensionen + Add-ons (1 Frage)

```
6. Standard-Dimensionen (immer aktiv): Reliability, Data Integrity, Security,
   Performance, Observability, Maintainability.

   Zusaetzliche Add-ons aktivieren (Multi-Select)?
   [ ] Privacy / DSGVO — fuer Voice-Assistants, personenbezogene Daten, Tier-Modelle
   [ ] Cost Efficiency — bei LLM-lastigen / SaaS-Subscription-Projekten
   [ ] Signal Quality — bei ML / Analytics / Signal-Systemen
   [ ] Compliance — fuer regulierte Branchen (Gesundheit, Finanz, Legal)
```

Jedes aktivierte Add-on ergaenzt die Architektur-Dimensionen in `ARCHITECTURE_DESIGN.md` + entsprechende Sektion in `SECURITY.md` / `GOVERNANCE.md`.

**Merken:** `ADDONS = [...aktivierte]`

Phase-1-Checkpoint: Kurze Bestaetigung der Antworten ausgeben.

---

## Phase 2: Block B — Bestehende Infrastruktur

Lies `references/existing-infra-check.md` fuer den vollstaendigen Dialog-Flow.

Der Skill respektiert bereits vorhandene Infrastruktur — nicht alles neu anlegen.

```
Hast du bereits folgendes eingerichtet? (jede Frage einzeln beantworten)

1. Projekt-Verzeichnis?
   [a] Ja + absoluter Pfad
   [b] Nein, neu anlegen — wo? (absoluter Pfad)

2. GitHub-Repo?
   [a] Ja + URL
   [b] Nein, spaeter anlegen (keine Remote jetzt)
   [c] Kein GitHub gewuenscht

3. Obsidian-Vault fuer Doku?
   [a] Ja + absoluter Pfad
   [b] Nein, nur im Repo dokumentieren

4. Backlog-System?
   [a] Linear + Team-Slug
   [b] Microsoft 365 Planner
   [c] GitHub Issues
   [d] Keines

5. API-Keys fuer das Projekt?
   [a] Existieren bereits in .env
   [b] .env.example reicht, Keys spaeter
```

**Merge-Modus:** Wenn ein Ordner/Repo/Vault existiert und Dateien enthaelt, **vor dem Ueberschreiben** fragen:

```
Warnung: {PROJECT_PATH} enthaelt bereits Dateien.
  [a] Backup anlegen + Bootstrap fortsetzen
  [b] Nur fehlende Governance-Dateien ergaenzen (merge)
  [c] Abbruch
```

**Merken:** `EXISTING_INFRA = {...}` fuer weitere Phasen.

Phase-2-Checkpoint: Zusammenfassung ausgeben.

---

## Phase 3: Block C — Doku-Architektur-Vorschlag

Lies `references/doc-architecture-proposal.md` fuer die vollstaendige Begruendung.

Basierend auf Stack-Wahl (A.1) und Infra-Status (Block B) einen konkreten Doku-Struktur-Vorschlag praesentieren:

```
Vorschlag: 3-Schichten-Doku mit ARCHITECTURE_DESIGN.md als zentralem Hub

  Schicht 1 — Story-Specs (Repo)
    Pfad:     {PROJECT_PATH}/specs/<PREFIX>XXX.md
    Zweck:    Pro Story ein Spec, git-versioniert
    Trigger:  Pflicht vor jeder Code-Aenderung (spec-gate.sh)

  Schicht 2 — Component-Docs (Obsidian)
    Pfad:     {OBSIDIAN_VAULT}/02 Projekte/{PROJECT_NAME}/Components/*.md
    Zweck:    Lebende Doku pro Komponente (Stack, Status, offene Fragen)
    Trigger:  Update bei jedem /implement (T_last-Pflicht)
    Komponenten-Vorschlag (basierend auf Stack): {STACK_SUGGESTION}

  Schicht 3 — Architektur-Vorgaben (Obsidian)
    Pfad:     {OBSIDIAN_VAULT}/02 Projekte/{PROJECT_NAME}/Architektur-Vorgaben.md
    Zweck:    Konsolidierte Leitprinzipien, Stack-Entscheidungen, verworfene Alternativen
    Trigger:  Update bei ADR-Aenderungen

  Hub (Repo)
    Pfad:     {PROJECT_PATH}/ARCHITECTURE_DESIGN.md
    Zweck:    Einstiegspunkt fuer /ideation, /architecture-review, /implement
    §9 Referenzen verlinkt automatisch auf alle obigen Dateien

Passt das? [ja / anpassen / skip Obsidian-Schicht]
```

**Komponenten-Vorschlag (STACK_SUGGESTION) je nach A.1:**
- Node.js Backend → `api.md`, `db.md`, `background-jobs.md`, `auth.md`
- Frontend → `ui.md`, `state.md`, `routing.md`, `api-client.md`
- Full-Stack → `frontend.md`, `backend.md`, `api.md`, `db.md`
- Python → `cli.md`, `core.md`, `integrations.md`, `data.md`
- Anderes → fragt den Operator nach Komponenten-Namen

Operator kann Komponenten anpassen oder eigene eingeben.

**Bei `ja`:**
- Components-Skelette werden in Phase 4 angelegt
- `ARCHITECTURE_DESIGN.md §9 Referenzen` wird initial befuellt
- Optional `orphan-check.sh` Hook wird in Phase 4 installiert (fragt explizit: "Hook, der prueft ob jede neue `*.md` im Hub registriert ist? [ja, empfohlen / nein]")

**Bei `anpassen`:** Dialog fragt welche Schichten + Pfade gewuenscht sind.

**Bei `skip Obsidian-Schicht`:** Alle Docs im Repo (`docs/components/`), kein SecondBrain-Anteil.

Phase-3-Checkpoint: Doku-Struktur bestaetigen.

---

## Phase 4: Grundstruktur anlegen

### 4.1 Verzeichnisstruktur

```bash
mkdir -p {PROJECT_PATH}/{lib,agents,.claude/skills,.claude/hooks,specs,docs,journal}
```

### 4.2 Git-Repo initialisieren (falls noch nicht vorhanden)

```bash
cd {PROJECT_PATH}
git init
# Remote nur setzen wenn B.2 == Ja + URL
git remote add origin {GITHUB_REPO}
```

`.gitignore` aus `references/file-templates.md` anlegen.

### 4.3 Kern-Dateien aus Templates rendern

Aus `references/file-templates.md` mit Block-A-Angaben befuellen:

| Datei | Template-Sektion |
|-------|-----------------|
| `lib/config.js` | config.js |
| `CLAUDE.md` | CLAUDE.md (mit Hub-Regel) |
| `SYSTEM_ARCHITECTURE.md` | SYSTEM_ARCHITECTURE.md |
| `ARCHITECTURE_DESIGN.md` | ARCHITECTURE_DESIGN.md (Hub mit §9 Referenzen) |
| `INDEX.md` | INDEX.md |
| `COMPONENT_INVENTORY.md` | COMPONENT_INVENTORY.md |
| `.env.example` | .env.example |
| `CHANGELOG.md` | CHANGELOG.md |
| `specs/TEMPLATE.md` | specs/TEMPLATE.md |

Aus `references/governance-template.md`:
- `GOVERNANCE.md` mit Projektname + Prefix + aktivierten Add-ons

Aus `references/issue-writing-guidelines-template.md`:
- `.claude/ISSUE_WRITING_GUIDELINES.md` mit ISSUE_PREFIX

Zusaetzlich Skelette:
- `DEVELOPMENT_PROCESS.md` — Verweis auf GOVERNANCE.md
- `SECURITY.md` — Minimales Skelett (Add-on-Sektionen: Privacy/Compliance falls aktiviert)

> **KERN-REGEL in CLAUDE.md:** Jede neue Datei MUSS sofort in `ARCHITECTURE_DESIGN.md §9 Referenzen` UND `INDEX.md` eingetragen werden — vor dem git commit.

### 4.4 Linting-Konfiguration

Basierend auf `STACK_CHOICE` — siehe `references/file-templates.md`:
- Node.js / Full-Stack / Anderes → `eslint.config.mjs` (ESLint v9 Flat Config)
- Frontend / Full-Stack → zusaetzlich `.prettierrc`
- Python → `pyproject.toml` (Ruff + Black)

### 4.5 Component-Skelette (wenn Block C = ja)

Fuer jede Komponente aus dem Doku-Architektur-Vorschlag:
- **Wenn Obsidian-Schicht:** `{OBSIDIAN_VAULT}/02 Projekte/{PROJECT_NAME}/Components/{component}.md`
- **Wenn Obsidian geskipped:** `{PROJECT_PATH}/docs/components/{component}.md`

Skelett-Struktur siehe `references/doc-architecture-proposal.md` (Frontmatter + Zweck + Stack + Architektur + Konfiguration + Phase-Status + Verbundene Stories + Offene Fragen + Referenzen).

Alle Component-Docs werden in `ARCHITECTURE_DESIGN.md §9 Referenzen` eingetragen.

### 4.6 Governance-Hooks installieren

Siehe `references/hooks-setup.md` fuer Details.

Hooks:
- `spec-gate.sh` — blockiert `git commit` mit `<PREFIX>XXX` wenn Spec-File fehlt
- `doc-version-sync.sh` — blockiert wenn `lib/config.js` VERSION erhoeht aber DOC_FILES nicht synchron
- Optional (bei Block C = ja, orphan-check = ja): `orphan-check.sh` — blockiert wenn neue `*.md` nicht im Hub §9 registriert

Registrierung:
```json
// {PROJECT_PATH}/.claude/settings.json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [
        { "type": "command", "command": "bash {PROJECT_PATH}/.claude/hooks/spec-gate.sh" },
        { "type": "command", "command": "bash {PROJECT_PATH}/.claude/hooks/doc-version-sync.sh" }
      ]
    }]
  }
}
```

> **Hinweis:** Der Claude-Code-Harness kann `.claude/settings.json` bei Permission-Grants auto-regenerieren und Hook-Sektionen stripppen. Als robusten Fallback: Hooks zusaetzlich in `.claude/settings.local.json` (gitignored) registrieren.

Hook-Test (probeweise):
```bash
cd {PROJECT_PATH}
echo "test" > test.txt && git add test.txt
git commit -m "test: {ISSUE_PREFIX}1 — should be blocked"
# Erwartet: Governance-Sperre
git restore --staged test.txt && rm test.txt
```

### 4.7 .env anlegen

Wenn `B.5 == Ja (existiert)`: Operator setzt `.env` selbst — Skill referenziert nur.

Wenn `B.5 == Nein`:
```
Ich habe .env.example angelegt. Bitte trage deine Keys in {PROJECT_PATH}/.env ein.
Variablen-Namen stehen in .env.example.
NIEMALS echte Keys im Chat nennen.
```

Warte auf Bestaetigung `done` bevor weiter.

### 4.8 Backlog-Labels einrichten

Wenn `B.4 == Linear`: Skill bietet an, Standard-Labels via Linear-MCP anzulegen:
- `architecture`, `bug`, `feature`, `refactor`, `docs`, `infra`
- Plus Add-on-Labels: `privacy` (wenn Privacy aktiviert), `compliance` (wenn Compliance aktiviert)

Wenn `B.4 == M365 Planner` / `GitHub Issues`: Operator bekommt Label-Liste zum manuellen Anlegen.

Wenn `B.4 == Keines`: Skip.

### 4.9 Erster Git-Commit

```bash
cd {PROJECT_PATH}
git add -A
git commit -m "v{VERSION_START} — Initial Governance Setup"
# Push nur wenn B.2 == Ja
git push -u origin main
```

Phase-4-Checkpoint: Zusammenfassung der angelegten Dateien.

---

## Phase 5: Skills installieren

Lies `references/skills-setup.md` fuer Details.

Skills werden aus dem offiziellen GitHub-Repo via `git clone` in einen Temp-Ordner geholt und in `{PROJECT_PATH}/.claude/skills/` kopiert.

```bash
# Temp-Ordner fuer Skill-Quelle
SKILL_SRC=$(mktemp -d)
git clone --depth 1 https://github.com/vibercoder79/KI-Masterclass-Koerting- "$SKILL_SRC"
```

### Skill-Auswahl

```
Welche Skills installieren?
  a) Minimum (ideation, implement, backlog)
  b) Standard (+ architecture-review, sprint-review, research, security-architect, skill-creator)
  c) Voll (alle verfuegbaren: + grafana, cloud-system-engineer, visualize, design-md-generator)
  d) Manuell auswaehlen
```

### Kopieren

Fuer jeden gewaehlten Skill:
```bash
cp -R "$SKILL_SRC/{skill}" "{PROJECT_PATH}/.claude/skills/{skill}"
```

### Projekt-spezifische Anpassung (generisch, nicht trading-spezifisch)

- `.claude/ISSUE_WRITING_GUIDELINES.md` wird aus `references/issue-writing-guidelines-template.md` gerendert (Issue-Prefix eingesetzt)
- `implement/references/change-checklist.md` enthaelt generische Change-Typen — keine projekt-spezifische Anpassung noetig. Projekt-spezifische Spezial-Checklisten koennen spaeter via `/skill-creator` ergaenzt werden.

### Aufraeumen

```bash
rm -rf "$SKILL_SRC"
```

Phase-5-Checkpoint: Installierte Skills auflisten.

---

## Phase 6: Block D — Optional-Komponenten

Lies `references/optional-components.md` fuer die Implementation-Details.

Jede Frage einzeln mit klarer Empfehlung und Default:

### D.1 Self-Healing-Agent

```
Self-Healing-Agent einrichten?
(Cron alle 15 min: prueft Dok-Versionen, Datei-Integritaet, sendet Alerts)

Empfohlen: ab mehreren Mitwirkenden oder wenn Doku-Drift kritisch ist.
[ja / nein (default)]
```

Wenn `ja`: `agents/self-healing.js` aus `references/self-healing-template.js` rendern + Cron-Eintrag generieren.

### D.2 DocSync zum Obsidian-Vault

```
DocSync zum Obsidian-Vault?
(Bei jedem /implement werden Component-Docs im Vault mit-aktualisiert)

Kein Cron — laeuft als Manuelle-Aufforderung via implement-Skill T_last.
Empfohlen wenn Obsidian-Vault angegeben.
[ja (default wenn Vault) / nein]
```

Wenn `ja`: `lib/doc-sync.js` aus `references/doc-sync-template.js` rendern + Mapping Repo → Vault.

### D.3 Automation-Daemon (Linear-Webhook-Listener)

```
Automation-Daemon?
(Vollautomatische Story-Umsetzung ohne Operator-Freigabe — Linear Webhook triggert /implement)

Nur fuer fortgeschrittene Setups mit Linear. Sicherheits-Implikationen beachten.
[ja / nein (default)]
```

Wenn `ja`: Setup-Schritte fuer Linear-Webhook + Daemon.

### D.4 Learning-Loop-Level

Lies `references/learning-loop.md` fuer das vollstaendige Design.

```
Learning-Loop aktivieren?
Der Loop erfasst systematisch: was funktioniert hat, was nicht, naechste Experimente.
Trigger: /sprint-review. Speicherort: journal/ + optional Obsidian.

  L1 — Einfach     (learnings.md, Bullet-Points — empfohlen fuer Solo-Projekte)
  L2 — Strukturiert (Sprint-Journal mit Frontmatter — empfohlen ab 10+ Sprints)
  L3 — SQLite      (quantitative Metriken — empfohlen ab 50+ Sprints)
  nein             (keine Lessons-Learned dokumentieren)

Default: L1. Welches Level?
```

Wenn `L1/L2/L3` gewaehlt:
- `journal/`-Struktur entsprechend anlegen
- `.learning-loop`-Config im Repo (Level speichern)
- Wenn Obsidian aktiv: `04 Ressourcen/{PROJECT_NAME}/learnings.md` als Cross-Link vom PMO-Hub

Learning-Loop wird von `sprint-review` gefuettert (Pflicht-Schritt am Ende des Reviews) und von `ideation` bei Story-Erstellung gelesen (Anti-Pattern-Warnung).

Phase-6-Checkpoint: Optional-Komponenten-Status.

---

## Phase 7: Finalisierung

Lies `references/global-registry-update.md` fuer die genaue Pfad-Liste.

### 7.1 SecondBrain-Integration (wenn B.3 == Obsidian aktiv)

- `{OBSIDIAN_VAULT}/02 Projekte/{PROJECT_NAME}/` anlegen
- `{PROJECT_NAME} - PMO HUB.md` mit Projekt-Frontmatter, Phase-Tabelle, Backlog-Link, Referenzen-Block
- `Components/`, `Decisions/`, `Meetings/`, `Research/` Ordner anlegen
- `Architektur-Vorgaben.md` Skelett (wird bei /ideation mit Research-Konsolidierung gefuellt)
- Eintrag in `{OBSIDIAN_VAULT}/00 Kontext/Projekte.md` (Projekt-Index)

### 7.2 Globale Registry (~/.claude/)

Wenn der Operator in `~/.claude/CLAUDE.md` eine Projekt-Tabelle hat:
- Projekt-Zeile ergaenzen (Name, Pfad, GitHub, Obsidian-Pfad, Sprint-Review-Frequenz)
- Skill listet Operator die Zeile vor, der bestaetigt den Einfuegepunkt

### 7.3 Finaler Commit

```bash
cd {PROJECT_PATH}
git add -A
git commit -m "v{VERSION_START} — Complete Governance Bootstrap"
git push  # nur wenn B.2 == Ja
```

### 7.4 Abschluss-Tabelle

| Phase | Was | Status |
|-------|-----|--------|
| Block A | Projekt-Kern + Stack + Add-ons | done |
| Block B | Bestehende Infrastruktur | done |
| Block C | Doku-Architektur (3 Schichten + Hub) | done |
| Phase 4 | Grundstruktur (Dateien, Git, Linting, Hooks, Labels) | done |
| Phase 5 | Skills installiert ({skill_count}) | done |
| Block D | Optional-Komponenten | {D-Status} |
| Phase 7 | SecondBrain + Registry + Final-Commit | done |

### 7.5 VS Code Extensions (optional, basierend auf STACK_CHOICE)

**Fuer alle Stacks:**
- ESLint `dbaeumer.vscode-eslint`
- SonarLint `SonarSource.sonarlint-vscode`
- Error Lens `usernamehw.errorlens`
- Claude Code `anthropic.claude-code`

**Node.js:** REST Client `humao.rest-client`

**Frontend / Full-Stack:** Prettier `esbenp.prettier-vscode`, Auto Rename Tag `formulahendry.auto-rename-tag`, CSS Peek `pranaygp.vscode-css-peek`

**Python:** Python `ms-python.python`, Black Formatter `ms-python.black-formatter`, Ruff `charliermarsh.ruff`

### 7.6 Naechste Schritte

```
Bootstrap fertig. Weiter mit:

  1. VS Code Extensions installieren (Liste oben)
  2. cd {PROJECT_PATH} && claude
  3. /ideation — erste Story erstellen
  4. Wenn Learning-Loop aktiv: nach 1-2 Sprints /sprint-review laufen lassen
```

---

## Fehlerbehandlung

| Problem | Loesung |
|---------|---------|
| git push schlaegt fehl | SSH Key pruefen: `ssh -T git@github.com` |
| Linear API Fehler | Linear-API-Key in .env pruefen, Team-Slug validieren |
| Obsidian-Pfad nicht erreichbar | Pfad mit `ls` verifizieren, ggf. iCloud-Sync aktiv |
| Hook blockiert Commit | Spec-File anlegen aus `specs/TEMPLATE.md`, Agent-Pattern ausfuellen |
| doc-version-sync blockiert | Alle DOC_FILES auf neue VERSION setzen, dann `git add` |
| Harness strippt Hooks aus settings.json | Hook-Registrierung in `.claude/settings.local.json` (gitignored) als Fallback |
| Component-Doc fehlt nach /implement | T_last-Task im specs/TEMPLATE.md pruefen — muss Component-Update enthalten |
| Learning-Loop-Eintrag vergessen | /sprint-review erneut aufrufen, Schritt 7 ausfuehren |
