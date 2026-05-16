#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  ORPHAN-CHECK — Governance Hook
#  Blockiert commit wenn neue *.md-Dateien nicht in
#  ARCHITECTURE_DESIGN.md §9 Referenzen eingetragen sind.
# ─────────────────────────────────────────────────────────────────────────────

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
  exit 0
fi

NEW_MDS=$(cd "$PROJECT_ROOT" && git diff --cached --name-only --diff-filter=A 2>/dev/null | grep -E '\.md$' || true)

if [ -z "$NEW_MDS" ]; then
  exit 0
fi

ORPHANS=""
while IFS= read -r md; do
  [ -z "$md" ] && continue
  base=$(basename "$md")
  if ! grep -q "$base" "$HUB"; then
    ORPHANS="${ORPHANS}\n  - $md"
  fi
done <<< "$NEW_MDS"

if [ -n "$ORPHANS" ]; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  ORPHAN-CHECK: Neue MD-Files nicht im Hub §9 Referenzen!   "
  echo "╚══════════════════════════════════════════════════════════════╝"
  printf "$ORPHANS\n"
  echo ""
  echo "  Regel: ARCHITECTURE_DESIGN.md ist Hub — alle neuen Docs muessen"
  echo "  in §9 Referenzen eingetragen sein."
  echo "  Dann erneut committen."
  exit 1
fi

exit 0
