#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  SPEC-GATE — Governance Hook
#  Blockiert git commit wenn specs/TT-XXX.md fehlt oder Agent-Pattern fehlt.
#
#  Claude Code PreToolUse Hook (Bash)
#  Input: JSON via stdin: {"tool_input": {"command": "..."}}
#  Exit 1 → Tool-Call blockiert | Exit 0 → erlaubt
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")

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

ISSUE=$(echo "$CMD" | grep -oP '[A-Z]+-[0-9]+' | head -1 || echo "")
if [ -z "$ISSUE" ]; then
  exit 0
fi

SPEC_FILE="${PROJECT_ROOT}/specs/${ISSUE}.md"
if [ ! -f "$SPEC_FILE" ]; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  GOVERNANCE-SPERRE: specs/${ISSUE}.md fehlt!               "
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "  Commit mit ${ISSUE} ist BLOCKIERT."
  echo ""
  echo "  Naechste Schritte:"
  echo "  1. specs/TEMPLATE.md lesen"
  echo "  2. specs/${ISSUE}.md erstellen + befuellen"
  echo "  3. git add specs/${ISSUE}.md && git commit -m 'docs: specs/${ISSUE}.md'"
  echo ""
  exit 1
fi

if ! grep -q "## Agent-Pattern" "$SPEC_FILE"; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  GOVERNANCE-SPERRE: Agent-Pattern fehlt in Spec!            "
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "  Commit mit ${ISSUE} ist BLOCKIERT."
  echo ""
  echo "  Naechste Schritte:"
  echo "  1. specs/${ISSUE}.md oeffnen"
  echo "  2. ## Agent-Pattern Sektion aus specs/TEMPLATE.md einfuegen"
  echo "  3. Gewaehltes Pattern ausfuellen"
  echo ""
  exit 1
fi

PATTERN=$(grep "^\*\*Gewähltes Pattern:\*\*" "$SPEC_FILE" | sed 's/\*\*Gewähltes Pattern:\*\* //' | tr -d '[:space:]' || echo "")
if [ -z "$PATTERN" ] || [ "$PATTERN" = "TBD" ] || echo "$PATTERN" | grep -q "\["; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  GOVERNANCE-SPERRE: Agent-Pattern nicht ausgefuellt!        "
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "  Erlaubte Werte: Solo | Subagent | Agent-Team | Parallel-Subagents"
  echo ""
  exit 1
fi

if echo "$PATTERN" | grep -qi "Agent-Team"; then
  TEAM=$(grep "^\*\*Team-Komposition:\*\*" "$SPEC_FILE" | sed 's/\*\*Team-Komposition:\*\* //' | tr -d '[:space:]' || echo "")
  if [ -z "$TEAM" ] || [ "$TEAM" = "n/a" ] || echo "$TEAM" | grep -q "\["; then
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  GOVERNANCE-SPERRE: Team-Komposition fehlt!                 "
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  Pattern 'Agent-Team' gewaehlt aber Team-Komposition ist leer."
    echo "  Beispiel: Lead (Sonnet) + Explore (Haiku) + Plan (Sonnet)"
    echo ""
    exit 1
  fi
fi

exit 0
