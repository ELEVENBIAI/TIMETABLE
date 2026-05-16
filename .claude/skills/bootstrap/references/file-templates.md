# Datei-Templates für neues Projekt

Alle Templates mit {{PLATZHALTER}} müssen mit den gesammelten Projekt-Infos befüllt werden.

---

## config.js

```javascript
// lib/config.js — Single Source of Truth
'use strict';

const VERSION = '{{VERSION_START}}';

// Dokumentationsdateien — Self-Healing überwacht Versions-Sync
const DOC_FILES = {
  'CLAUDE.md': {
    path: 'CLAUDE.md',
    versionPattern: /\*\*Version:\*\*\s*([\d.]+)/
  },
  'SYSTEM_ARCHITECTURE.md': {
    path: 'SYSTEM_ARCHITECTURE.md',
    versionPattern: /\*\*Version:\*\*\s*([\d.]+)/
  },
  'ARCHITECTURE_DESIGN.md': {
    path: 'ARCHITECTURE_DESIGN.md',
    versionPattern: /\*\*Version:\*\*\s*([\d.]+)/
  },
  'COMPONENT_INVENTORY.md': {
    path: 'COMPONENT_INVENTORY.md',
    versionPattern: /\*\*Version:\*\*\s*([\d.]+)/
  },
  'DEVELOPMENT_PROCESS.md': {
    path: 'DEVELOPMENT_PROCESS.md',
    versionPattern: /\*\*Version:\*\*\s*([\d.]+)/
  },
  'GOVERNANCE.md': {
    path: 'GOVERNANCE.md',
    versionPattern: /\*\*Version:\*\*\s*([\d.]+)/
  }
};

// Projekt-spezifische Config (anpassen)
const CONFIG = {
  PROJECT_NAME: '{{PROJECT_NAME}}',
  ISSUE_PREFIX: '{{ISSUE_PREFIX}}',
  GITHUB_REPO: '{{GITHUB_REPO}}',
};

module.exports = { VERSION, DOC_FILES, CONFIG };
```

---

## CLAUDE.md (Minimum)

```markdown
# {{PROJECT_NAME}} — AI System Reference

**Version:** {{VERSION_START}} | **Stand:** {{TODAY}}
**Repository:** {{GITHUB_REPO}}

## Identität

{{PROJECT_DESC}}

## Regeln (NIEMALS)

1. **NIEMALS** Code ändern ohne Linear Issue
2. **NIEMALS** Code ändern ohne Spec-File (`specs/{{PREFIX}}XXX.md`)
3. **NIEMALS** Issue schließen ohne Git Push + Changelog
4. **NIEMALS** API Keys im Chat — User trägt direkt in .env ein
5. **NIEMALS** Issue ohne Labels anlegen
6. **NIEMALS** `config.js` VERSION erhöhen ohne alle DOC_FILES zu bumpen
7. **NIEMALS** Sub-Task direkt von Backlog → Done — immer zuerst "In Progress"
8. **NIEMALS** neue Datei anlegen ohne Eintrag in `ARCHITECTURE_DESIGN.md §Referenzen` + `INDEX.md`
9. **NIEMALS** Issue schließen ohne Integration-Test-Check (neue Komponente abgedeckt?)
10. [Projektspezifische Regeln ergänzen]

## Governance-Hooks

Zwei automatische Git-Hooks sind aktiv:
- **spec-gate.sh**: Blockiert Commits mit Issue-Referenz wenn `specs/{{PREFIX}}XXX.md` fehlt
  oder `## Agent-Pattern` nicht ausgefüllt ist
- **doc-version-sync.sh**: Blockiert Commits wenn `config.js` VERSION erhöht wurde
  aber DOC_FILES-Einträge noch die alte Version haben

## Agent-Pattern (PFLICHT vor jeder Story)

Vor dem Start jeder Story deklarieren:
- **Solo** — 1 klar abgegrenzte Story, <5 Dateien
- **Subagent** — isolierter Task / Einzelrecherche
- **Agent-Team** — >3 unabhängige Tasks ODER Debugging mit unklarer Ursache
- **Parallel-Subagents** — mehrere unabhängige Recherchen gleichzeitig

Entscheidung in `specs/{{PREFIX}}XXX.md` unter `## Agent-Pattern` eintragen — wird von spec-gate.sh erzwungen.

## System-Architektur

[Kurze Übersicht der wichtigsten Komponenten — nach und nach ergänzen]

## Config-Werte

Alle Config-Werte kommen aus `lib/config.js`. VERSION ist dort SSoT.

## Handoff-Prozess

Nach Feature-Entwicklung:
1. Code committen + pushen
2. CLAUDE.md + Changelog updaten
3. Operator informieren: "Feature X fertig"
```

---

## ARCHITECTURE_DESIGN.md (Minimum)

```markdown
# {{PROJECT_NAME}} — Architecture Design

**Version:** {{VERSION_START}} | **Stand:** {{TODAY}}

## Übersicht

{{PROJECT_DESC}}

## Quality Attributes

| Attribut | Priorität | Beschreibung |
|----------|-----------|-------------|
| Reliability | Hoch | [Ausfallsicherheit, Retry-Logik] |
| Data Integrity | Hoch | [Konsistenz, Validierung] |
| Security | Hoch | [Auth, Secrets-Handling] |
| Performance | Mittel | [Latenz, Throughput] |
| Observability | Mittel | [Logging, Monitoring] |
| Maintainability | Mittel | [Code-Qualität, Doku] |

## ADRs (Architecture Decision Records)

| Nr | Datum | Titel | Status |
|----|-------|-------|--------|
| ADR-01 | {{TODAY}} | Initial Architecture | Active |

## Referenzen (alle Dateien)

> **Pflicht:** Jede neue Datei sofort hier eintragen — vor dem git commit.

| Datei | Zweck |
|-------|-------|
| `CLAUDE.md` | AI-Kontext, Regeln, Governance |
| `SYSTEM_ARCHITECTURE.md` | Komponenten, Flows, Konfiguration |
| `ARCHITECTURE_DESIGN.md` | ADRs, Quality Attributes, Referenzen |
| `INDEX.md` | Alle Docs kategorisiert |
| `COMPONENT_INVENTORY.md` | Alle Komponenten mit Status |
| `GOVERNANCE.md` | Entwicklungs-Prozess, Governance-Regeln |
| `SECURITY.md` | Security-Policy, API-Key-Regeln |
| `CHANGELOG.md` | Version-History |
| `lib/config.js` | SSoT alle Parameter |
| `specs/TEMPLATE.md` | Story-Template |
```

---

## INDEX.md (Minimum)

```markdown
# {{PROJECT_NAME}} — Docs Index

**Version:** {{VERSION_START}} | **Stand:** {{TODAY}}

> Alle Dokumente des Projekts kategorisiert.
> **Pflicht:** Jede neue Datei sofort hier eintragen — vor dem git commit.

## Core

| Datei | Zweck | Aktualisiert |
|-------|-------|-------------|
| `CLAUDE.md` | AI-Kontext, Regeln, Governance | v{{VERSION_START}} |
| `SYSTEM_ARCHITECTURE.md` | Komponenten, Agent-Liste, Flows | v{{VERSION_START}} |
| `ARCHITECTURE_DESIGN.md` | ADRs, Quality Attributes | v{{VERSION_START}} |
| `INDEX.md` | Dieses Verzeichnis | v{{VERSION_START}} |

## Governance

| Datei | Zweck |
|-------|-------|
| `GOVERNANCE.md` | Entwicklungs-Prozess, Regeln |
| `SECURITY.md` | Security-Policy |
| `CHANGELOG.md` | Version-History |
| `specs/TEMPLATE.md` | Story-Template |

## Komponenten

| Datei | Zweck |
|-------|-------|
| `COMPONENT_INVENTORY.md` | Alle Komponenten mit Status |
| `lib/config.js` | SSoT Konfiguration |
```

---

## SYSTEM_ARCHITECTURE.md (Minimum)

```markdown
# {{PROJECT_NAME}} — System Architecture

**Version:** {{VERSION_START}} | **Stand:** {{TODAY}}

## Komponenten

[Hier Komponenten eintragen wenn System wächst]

## Config

Alle Parameter in `lib/config.js`. VERSION ist SSoT.
```

---

## COMPONENT_INVENTORY.md (Minimum)

```markdown
# {{PROJECT_NAME}} — Component Inventory

**Version:** {{VERSION_START}} | **Stand:** {{TODAY}}

| Komponente | Datei | Status | Beschreibung |
|-----------|-------|--------|-------------|
| Config | `lib/config.js` | Active | SSoT alle Parameter |
```

---

## specs/TEMPLATE.md

```markdown
# {Feature Name}

> **Issue:** {{ISSUE_PREFIX}}XXX | **Erstellt:** {Datum} | **Status:** Draft / Approved / Done

## Agent-Pattern

> **PFLICHT — vor dem Start ausfuellen. Wird von spec-gate.sh erzwungen.**

- [ ] **Solo** — 1 klar abgegrenzte Story, <5 Dateien, keine parallelen Komponenten
- [ ] **Subagent** — isolierter Task / Einzelrecherche / Explore-Auftrag
- [ ] **Agent-Team** — >3 unabhaengige Tasks ODER Debugging mit unklarer Ursache ODER Cross-Layer
- [ ] **Parallel-Subagents** — mehrere unabhaengige Recherchen gleichzeitig

**Gewähltes Pattern:** [Solo / Subagent / Agent-Team / Parallel-Subagents]
**Begründung:** [Warum dieses Pattern? Tasks zaehlen, Trigger-Bedingung benennen]
**Team-Komposition:** [Nur bei Agent-Team: z.B. "Lead (Sonnet) + Explore (Haiku) + Plan (Sonnet)" — sonst "n/a"]

---

## Why

[1-2 Saetze: Welches Problem wird geloest? Warum jetzt?]

## What

[Konkretes Deliverable. Woran erkennt man, dass es fertig ist?]

## Constraints

### Must
- [Bestehende Patterns/Conventions einhalten]
- [Config SSoT in lib/config.js]

### Must Not
- [Keine neuen Dependencies ohne Begruendung]
- [Kein Code ausserhalb des Scopes aendern]
- [Keine Hardcoded Values — alles ueber config.js]
- [Keine Secrets in Code/Logs]

### Out of Scope
- [Explizit ausgeschlossene Features/Aenderungen]

## Current State

**Relevante Dateien:**
- `path/to/file.js` — [was die Datei tut, warum relevant]

**Bestehende Patterns:**
- [Konvention die eingehalten werden muss, mit Beispiel-Datei]

**Architektur-Dimensionen (betroffen):**
- [Welche Dimensionen sind relevant? Kurze Einschaetzung]

## Tasks

> Jeder Task: max 3 Dateien, unter 30min, unabhaengig committbar.
> Tasks die zusammen ausgeliefert werden muessen → gruppieren.
> Letzter Task = IMMER Dokumentation + Config.

### T0: Prozesskatalog-Check
- [ ] Gibt es einen aehnlichen Prozess der erweitert werden kann? (Referenz)
- [ ] Welche bestehenden Dateien werden beruehrt?

### T1: [Erster Task]
- [ ] [Konkrete Aufgabe]
- [ ] Verify: [Wie pruefen wir dass T1 korrekt ist?]

### T2: [Zweiter Task]
- [ ] [Konkrete Aufgabe]
- [ ] Verify: [Wie pruefen wir dass T2 korrekt ist?]

### T_last: Dokumentation + Config
- [ ] ARCHITECTURE_DESIGN.md §Referenzen um neue Dateien ergaenzen
- [ ] INDEX.md um neue Dateien ergaenzen
- [ ] COMPONENT_INVENTORY.md aktualisieren
- [ ] CHANGELOG.md Eintrag
- [ ] config.js VERSION bumpen
- [ ] Alle DOC_FILES auf neue VERSION setzen

## Dokumentations-Impact

| Datei | Was aendern |
|-------|-------------|
| `ARCHITECTURE_DESIGN.md` | §Referenzen: neue Datei eintragen |
| `INDEX.md` | Neue Datei eintragen |
| `CHANGELOG.md` | Version-Eintrag |

## Abhaengigkeiten

- **Blockiert durch:** —
- **Blockiert:** —

## Acceptance Criteria

- [ ] [Messbares Kriterium 1]
- [ ] [Messbares Kriterium 2]
- [ ] spec-gate.sh + doc-version-sync.sh gruen (kein blockierter Commit)
- [ ] Integration-Test-Skill: Neue Komponente abgedeckt oder Skill erweitert
- [ ] ESLint: 0 Errors (Warnings dokumentiert)
- [ ] Obsidian Change-Log Eintrag
```

---

## spec-gate.sh (Hook-Template)

> Anpassen: WORKSPACE-Pfad + ISSUE_PREFIX + CONTAINER_CMD (optional, nur bei Agent-Systemen).

```bash
#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  SPEC-GATE — Governance Hook
#  Blockiert git commit wenn specs/{PREFIX}XXX.md fehlt oder Agent-Pattern fehlt.
#
#  Claude Code PreToolUse Hook (Bash)
#  Input: JSON via stdin: {"tool_input": {"command": "..."}}
#  Exit 1 → Tool-Call blockiert | Exit 0 → erlaubt
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

WORKSPACE="{{PROJECT_PATH}}"
ISSUE_PREFIX="{{ISSUE_PREFIX}}"  # z.B. "PROJ-"

# JSON parsen → Command extrahieren
INPUT=$(cat)
CMD=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('command', ''))
except:
    print('')
" 2>/dev/null || echo "")

# Nur git commit Befehle prüfen
if ! echo "$CMD" | grep -qE 'git commit'; then
  exit 0
fi

# {PREFIX}XXX aus Commit-Message extrahieren (dynamisch)
PREFIX_ESC=$(echo "$ISSUE_PREFIX" | sed 's/[-]/\\-/g')
ISSUE=$(echo "$CMD" | grep -oP "${PREFIX_ESC}[0-9]+" | head -1 || echo "")
if [ -z "$ISSUE" ]; then
  exit 0  # Kein Issue referenziert → kein Gate
fi

# Spec-File prüfen
SPEC_FILE="$WORKSPACE/specs/${ISSUE}.md"
if [ ! -f "$SPEC_FILE" ]; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  🚫  GOVERNANCE-SPERRE: specs/${ISSUE}.md fehlt!           "
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "  Commit mit ${ISSUE} ist BLOCKIERT."
  echo ""
  echo "  Nächste Schritte:"
  echo "  1. specs/TEMPLATE.md lesen"
  echo "  2. specs/${ISSUE}.md erstellen + befüllen"
  echo "  3. git add specs/${ISSUE}.md && git commit -m 'docs: specs/${ISSUE}.md'"
  echo ""
  exit 1
fi

# Agent-Pattern prüfen — Sektion vorhanden?
if ! grep -q "## Agent-Pattern" "$SPEC_FILE"; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  🚫  GOVERNANCE-SPERRE: Agent-Pattern fehlt in Spec!        "
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "  Commit mit ${ISSUE} ist BLOCKIERT."
  echo ""
  echo "  Nächste Schritte:"
  echo "  1. specs/${ISSUE}.md öffnen"
  echo "  2. ## Agent-Pattern Sektion aus specs/TEMPLATE.md einfügen"
  echo "  3. Gewähltes Pattern ausfüllen"
  echo ""
  exit 1
fi

# Agent-Pattern prüfen — nicht leer/TBD
PATTERN=$(grep "^\*\*Gewähltes Pattern:\*\*" "$SPEC_FILE" | sed 's/\*\*Gewähltes Pattern:\*\* //' | tr -d '[:space:]' || echo "")
if [ -z "$PATTERN" ] || [ "$PATTERN" = "TBD" ] || echo "$PATTERN" | grep -q "\["; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  🚫  GOVERNANCE-SPERRE: Agent-Pattern nicht ausgefüllt!     "
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "  Erlaubte Werte: Solo | Subagent | Agent-Team | Parallel-Subagents"
  echo ""
  exit 1
fi

# Agent-Team: Team-Komposition prüfen
if echo "$PATTERN" | grep -qi "Agent-Team"; then
  TEAM=$(grep "^\*\*Team-Komposition:\*\*" "$SPEC_FILE" | sed 's/\*\*Team-Komposition:\*\* //' | tr -d '[:space:]' || echo "")
  if [ -z "$TEAM" ] || [ "$TEAM" = "n/a" ] || echo "$TEAM" | grep -q "\["; then
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  🚫  GOVERNANCE-SPERRE: Team-Komposition fehlt!             "
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  Pattern 'Agent-Team' gewählt aber Team-Komposition ist leer."
    echo "  Beispiel: Lead (Sonnet) + Explore (Haiku) + Plan (Sonnet)"
    echo ""
    exit 1
  fi
fi

exit 0
```

---

## doc-version-sync.sh (Hook-Template)

> Anpassen: WORKSPACE-Pfad.

```bash
#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  DOC-VERSION-SYNC — Governance Hook
#  Blockiert git commit wenn lib/config.js VERSION erhöht wurde,
#  aber DOC_FILES noch die alte Version haben.
#
#  Escape-Hatch: git commit --no-verify
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

WORKSPACE="{{PROJECT_PATH}}"

INPUT=$(cat)
CMD=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('command', ''))
except:
    print('')
" 2>/dev/null || echo "")

if ! echo "$CMD" | grep -qE 'git commit'; then exit 0; fi
if echo "$CMD" | grep -q "\-\-no-verify"; then exit 0; fi

cd "$WORKSPACE" 2>/dev/null || exit 0
STAGED=$(git diff --staged --name-only 2>/dev/null || echo "")
if ! echo "$STAGED" | grep -q "lib/config.js"; then exit 0; fi

RESULT=$(node -e "
const { execSync } = require('child_process');
const { readFileSync, existsSync } = require('fs');
const path = require('path');
const BASE = '$WORKSPACE';

try {
  const staged = execSync('git show :lib/config.js', { cwd: BASE }).toString();
  let head = '';
  try { head = execSync('git show HEAD:lib/config.js', { cwd: BASE }).toString(); } catch {}

  const newVer = (staged.match(/const VERSION\s*=\s*'([\d.]+)'/) || [])[1];
  const oldVer = (head.match(/const VERSION\s*=\s*'([\d.]+)'/)  || [])[1] || '';
  if (!newVer || newVer === oldVer) { process.exit(0); }

  const docRe = /'[^']+\.md'\s*:\s*\{\s*path:\s*'([^']+)'\s*,\s*versionPattern:\s*(\/[^/\n]+\/[gimsuy]*)/g;
  const mismatches = [];
  let m;
  while ((m = docRe.exec(staged)) !== null) {
    const relPath = m[1];
    const patStr  = m[2];
    const fullPath = path.join(BASE, relPath);
    if (!existsSync(fullPath)) continue;
    const parts = patStr.match(/^\/(.+)\/([gimsuy]*)$/);
    if (!parts) continue;
    const pat = new RegExp(parts[1], parts[2]);
    const content = readFileSync(fullPath, 'utf8');
    const match = content.match(pat);
    if (!match || match[1] === newVer) continue;
    mismatches.push(relPath + '|||' + match[1]);
  }

  if (mismatches.length === 0) { process.exit(0); }
  process.stdout.write('MISMATCH:' + newVer + ':' + oldVer + ':' + mismatches.join(':::'));
} catch (e) { process.exit(0); }
" 2>/dev/null || echo "")

if [ -z "$RESULT" ] || [[ "$RESULT" != MISMATCH:* ]]; then exit 0; fi

NEW_VER=$(echo "$RESULT" | cut -d: -f2)
OLD_VER=$(echo "$RESULT" | cut -d: -f3)
ENTRIES=$(echo "$RESULT" | cut -d: -f4-)

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  🚫  DOC-VERSION-SYNC: Doku nicht auf v${NEW_VER} aktualisiert!"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  lib/config.js VERSION: ${OLD_VER} → ${NEW_VER}"
echo "  Folgende Doku-Dateien haben noch die alte Version:"
echo ""
echo "$ENTRIES" | tr ':::' '\n' | while IFS= read -r entry; do
  [ -z "$entry" ] && continue
  FILE=$(echo "$entry" | cut -d'|' -f1)
  OLDV=$(echo "$entry" | cut -d'|' -f4)
  echo "    ❌  ${FILE}  (hat: ${OLDV})"
done
echo ""
echo "  Escape-Hatch: git commit --no-verify"
echo ""
exit 1
```

---

## .gitignore

```
node_modules/
.env
*.log
*.pid
*.lock
.DS_Store
dist/
build/
__pycache__/
*.pyc
.venv/
venv/
```

---

## .env.example

```bash
# Linear
LINEAR_API_KEY=

# Telegram (optional)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Research (optional)
OPENROUTER_API_KEY=

# Automation Daemon (optional)
LINEAR_WEBHOOK_SECRET=
DAEMON_PORT=3001

# Claude Code
CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
```

---

## CHANGELOG.md

```markdown
# Changelog — {{PROJECT_NAME}}

## v{{VERSION_START}} — {{TODAY}}

- Initial project setup with OpenCLAW Governance Framework
- Governance hooks installed: spec-gate.sh, doc-version-sync.sh
- Base skills installed
```

---

## eslint.config.mjs (Node.js / Full-Stack)

```javascript
// eslint.config.mjs — ESLint v9+ Flat Config
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        process: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'semi': ['error', 'always'],
      'no-undef': 'error',
    },
  },
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**'],
  },
];
```

---

## .prettierrc (Frontend / Full-Stack)

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

---

## pyproject.toml (Python)

```toml
[tool.ruff]
line-length = 100
target-version = "py311"
select = ["E", "F", "W", "I"]
ignore = []

[tool.black]
line-length = 100
target-version = ["py311"]
```
