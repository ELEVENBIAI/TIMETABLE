# Git Hook Templates — Governance Enforcement

Diese Hooks sichern maschinell die Kern-Governance-Regeln ab.
Beide Hooks liegen unter `.claude/hooks/` und werden via Claude Code `settings.json` aktiviert.

---

## spec-gate.sh

Blockiert `git commit` mit Issue-Referenz (z.B. `ISSUE-42`) wenn:
1. kein Spec-File `specs/ISSUE-42.md` existiert
2. das Spec-File kein ausgefülltes `## Agent-Pattern` Feld enthält
3. Pattern = `Agent-Team` aber keine Team-Komposition angegeben

```bash
#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  SPEC-GATE — Governance Hook
#  Blockiert git commit wenn Spec-File fehlt oder Agent-Pattern nicht ausgefüllt
#
#  Claude Code PreToolUse Hook (Bash)
#  Input: JSON via stdin: {"tool_input": {"command": "..."}}
#  Exit 1 → Tool-Call blockiert | Exit 0 → erlaubt
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")

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

# ISSUE-XXX aus Commit-Message extrahieren (z.B. PROJ-42, ISSUE-123)
ISSUE=$(echo "$CMD" | grep -oP '[A-Z]+-\d+' | head -1 || echo "")
if [ -z "$ISSUE" ]; then
  exit 0  # Kein Issue referenziert → kein Gate
fi

# ── Check 1: Spec-File vorhanden? ────────────────────────────────────────────
SPEC_FILE="${PROJECT_ROOT}/specs/${ISSUE}.md"
if [ ! -f "$SPEC_FILE" ]; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  🚫  GOVERNANCE-SPERRE: specs/${ISSUE}.md fehlt!            "
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "  Commit mit ${ISSUE} ist BLOCKIERT."
  echo "  Regel: NIEMALS Code ändern ohne Spec-File"
  echo ""
  echo "  Nächste Schritte:"
  echo "  1. specs/TEMPLATE.md lesen"
  echo "  2. specs/${ISSUE}.md erstellen + befüllen"
  echo "  3. git add specs/${ISSUE}.md && git commit -m 'docs: specs/${ISSUE}.md'"
  echo ""
  exit 1
fi

# ── Check 2: Agent-Pattern Sektion vorhanden? ────────────────────────────────
if ! grep -q "## Agent-Pattern" "$SPEC_FILE"; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  🚫  GOVERNANCE-SPERRE: Agent-Pattern fehlt in Spec!        "
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "  Commit mit ${ISSUE} ist BLOCKIERT."
  echo "  Regel: Jede Spec braucht ## Agent-Pattern Sektion"
  echo ""
  echo "  Nächste Schritte:"
  echo "  1. specs/${ISSUE}.md öffnen"
  echo "  2. ## Agent-Pattern Sektion aus specs/TEMPLATE.md einfügen"
  echo "  3. Gewähltes Pattern + Begründung ausfüllen"
  echo ""
  exit 1
fi

# ── Check 3: Gewähltes Pattern nicht leer/TBD/Platzhalter? ───────────────────
PATTERN=$(grep "^\*\*Gewähltes Pattern:\*\*" "$SPEC_FILE" | sed 's/\*\*Gewähltes Pattern:\*\* //' | tr -d '[:space:]' || echo "")
if [ -z "$PATTERN" ] || [ "$PATTERN" = "TBD" ] || echo "$PATTERN" | grep -q "\["; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  🚫  GOVERNANCE-SPERRE: Agent-Pattern nicht ausgefüllt!     "
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "  'Gewähltes Pattern:' ist leer, TBD oder noch Platzhalter."
  echo "  Erlaubte Werte: Solo | Subagent | Agent-Team | Parallel-Subagents"
  echo ""
  exit 1
fi

# ── Check 4: Agent-Team → Team-Komposition vorhanden? ────────────────────────
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
    echo "  Eintragen: **Team-Komposition:** in specs/${ISSUE}.md"
    echo ""
    exit 1
  fi
fi

exit 0
```

**Aktivierung in `.claude/settings.json`:**
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash {{PROJECT_PATH}}/.claude/hooks/spec-gate.sh"
          }
        ]
      }
    ]
  }
}
```

> **Anpassen für neues Projekt:** `PROJECT_ROOT` wird per `git rev-parse` automatisch gesetzt.
> Nur der `PROJECT_PATH` Platzhalter in `settings.json` muss mit dem absoluten Projektpfad ersetzt werden.

---

## doc-version-sync.sh

Blockiert `git commit` wenn `lib/config.js` mit erhöhter VERSION gestaged ist, aber Dokumentationsdateien (lt. DOC_FILES in config.js) noch auf alter Version stehen.

```bash
#!/bin/bash
# .claude/hooks/doc-version-sync.sh
# Blockiert git commit wenn config.js VERSION erhoeht aber Doku veraltet
# Aktivierung: in .claude/settings.json als PreToolUse-Hook auf Bash-Calls

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
CONFIG_FILE="${PROJECT_ROOT}/lib/config.js"

# Pruefen ob config.js gestaged ist
if ! git diff --cached --name-only | grep -q "lib/config.js"; then
  exit 0  # config.js nicht gestaged → kein Check noetig
fi

# Aktuelle VERSION aus config.js extrahieren
CURRENT_VERSION=$(grep -oP "VERSION\s*=\s*'\K[^']+" "$CONFIG_FILE" 2>/dev/null)
if [ -z "$CURRENT_VERSION" ]; then
  exit 0  # Kein VERSION-Pattern → skip
fi

# Letzte committete VERSION ermitteln
PREV_VERSION=$(git show HEAD:lib/config.js 2>/dev/null | grep -oP "VERSION\s*=\s*'\K[^']+" | head -1)

if [ "$CURRENT_VERSION" = "$PREV_VERSION" ]; then
  exit 0  # Keine Versionsänderung → kein Check noetig
fi

echo "📋 Versions-Bump erkannt: ${PREV_VERSION} → ${CURRENT_VERSION}"
echo "   Pruefe Dokumentationsdateien..."

# DOC_FILES aus config.js extrahieren (einfacher Pattern-Match)
MISMATCH=0
while IFS= read -r doc_path; do
  if [ -f "${PROJECT_ROOT}/${doc_path}" ]; then
    DOC_VERSION=$(grep -oP '\*\*Version:\*\*\s*\K[\d.]+' "${PROJECT_ROOT}/${doc_path}" 2>/dev/null | head -1)
    if [ -n "$DOC_VERSION" ] && [ "$DOC_VERSION" != "$CURRENT_VERSION" ]; then
      echo "   ⚠️  ${doc_path}: v${DOC_VERSION} (erwartet: v${CURRENT_VERSION})"
      MISMATCH=1
    fi
  fi
done < <(grep -oP "path:\s*'\K[^']+" "$CONFIG_FILE" 2>/dev/null)

if [ $MISMATCH -eq 1 ]; then
  echo ""
  echo "⛔ DOC-VERSION-SYNC: Dokumentationsdateien auf alte Version aktualisieren!"
  echo "   Bypass: git commit --no-verify (nur bei bewusstem Bypass, mit Begruendung im Commit)"
  exit 1
fi

echo "✓ Alle Docs auf Version ${CURRENT_VERSION}"
exit 0
```

---

## Portabilitaet

Beide Hooks haben **keine externen Dependencies** — nur Bash, grep, git, python3.

Anpassen fuer neues Projekt:
- Issue-Prefix wird in spec-gate.sh automatisch aus der Commit-Message extrahiert (Pattern `[A-Z]+-\d+`) — keine manuelle Anpassung noetig
- `versionPattern` → je nach Doku-Format anpassen (Standard: `**Version:** X.Y.Z`)

## Harness-Override — settings.json wird ggf. auto-regeneriert

**Wichtig:** Der Claude-Code-Harness kann `.claude/settings.json` bei Permission-Grants auto-regenerieren und Hook-Sektionen dabei stripppen. Das ist ein bekanntes Verhalten.

**Robuster Fallback:** Hooks zusaetzlich in `.claude/settings.local.json` registrieren (gitignored, bleibt stabil):

```json
// {PROJECT_PATH}/.claude/settings.local.json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "bash {PROJECT_PATH}/.claude/hooks/spec-gate.sh" },
          { "type": "command", "command": "bash {PROJECT_PATH}/.claude/hooks/doc-version-sync.sh" }
        ]
      }
    ]
  }
}
```

Settings laden in der Reihenfolge: user → project → local. `settings.local.json` hat also Prioritaet und ueberlebt Harness-Regeneration.

Der Bootstrap-Skill legt **beide** an — `settings.json` als primaere Registrierung (fuer Team-Nutzung, gitted) und `settings.local.json` als Fallback (lokal, gitignored).

`.gitignore` wird um `.claude/settings.local.json` erweitert.

## Optional: orphan-check.sh

Wenn in Block C (Doku-Architektur) die Hub-Auto-Verlinkung aktiviert wurde, installiert der Bootstrap-Skill einen dritten Hook `orphan-check.sh`, der pre-commit prueft ob jede neue `*.md` im `ARCHITECTURE_DESIGN.md §9 Referenzen`-Block eingetragen ist.

```bash
#!/bin/bash
# orphan-check.sh — blockiert commit wenn neue *.md nicht im Hub §9 registriert

set -euo pipefail

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
HUB="${PROJECT_ROOT}/ARCHITECTURE_DESIGN.md"

INPUT=$(cat)
CMD=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('command', ''))
except:
    print('')
" 2>/dev/null || echo "")

if ! echo "$CMD" | grep -qE 'git commit'; then
  exit 0
fi

if [ ! -f "$HUB" ]; then
  exit 0  # Kein Hub → kein Check
fi

# Neue .md-Files im Staging
NEW_MDS=$(git diff --cached --name-only --diff-filter=A | grep -E '\.md$' || true)

if [ -z "$NEW_MDS" ]; then
  exit 0
fi

ORPHANS=""
while IFS= read -r md; do
  base=$(basename "$md")
  if ! grep -q "$base" "$HUB"; then
    ORPHANS="${ORPHANS}\n  - $md"
  fi
done <<< "$NEW_MDS"

if [ -n "$ORPHANS" ]; then
  echo ""
  echo "⛔ ORPHAN-CHECK: Neue MD-Files nicht im Hub §9 Referenzen:"
  echo -e "$ORPHANS"
  echo ""
  echo "  Regel: ARCHITECTURE_DESIGN.md ist Hub — alle neuen Docs muessen dort verlinkt sein."
  echo "  Bitte §9 Referenzen ergaenzen, dann erneut committen."
  exit 1
fi

exit 0
```
