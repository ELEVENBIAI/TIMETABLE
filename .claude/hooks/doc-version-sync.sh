#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  DOC-VERSION-SYNC — Governance Hook
#  Blockiert git commit wenn lib/config.js VERSION erhoeht wurde,
#  aber DOC_FILES noch die alte Version haben.
#
#  Escape-Hatch: git commit --no-verify
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
CONFIG_FILE="${PROJECT_ROOT}/lib/config.js"

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

cd "$PROJECT_ROOT" 2>/dev/null || exit 0

if ! git diff --cached --name-only 2>/dev/null | grep -q "lib/config.js"; then exit 0; fi

CURRENT_VERSION=$(grep -oP "VERSION\s*=\s*'\K[^']+" "$CONFIG_FILE" 2>/dev/null || echo "")
if [ -z "$CURRENT_VERSION" ]; then exit 0; fi

PREV_VERSION=$(git show HEAD:lib/config.js 2>/dev/null | grep -oP "VERSION\s*=\s*'\K[^']+" | head -1 || echo "")

if [ "$CURRENT_VERSION" = "$PREV_VERSION" ]; then exit 0; fi

echo "Versions-Bump erkannt: ${PREV_VERSION} -> ${CURRENT_VERSION}"
echo "Pruefe Dokumentationsdateien..."

MISMATCH=0
while IFS= read -r doc_path; do
  if [ -f "${PROJECT_ROOT}/${doc_path}" ]; then
    DOC_VERSION=$(grep -oP '\*\*Version:\*\*\s*\K[\d.]+' "${PROJECT_ROOT}/${doc_path}" 2>/dev/null | head -1 || echo "")
    if [ -n "$DOC_VERSION" ] && [ "$DOC_VERSION" != "$CURRENT_VERSION" ]; then
      echo "  ${doc_path}: v${DOC_VERSION} (erwartet: v${CURRENT_VERSION})"
      MISMATCH=1
    fi
  fi
done < <(grep -oP "path:\s*'\K[^']+" "$CONFIG_FILE" 2>/dev/null)

if [ $MISMATCH -eq 1 ]; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  DOC-VERSION-SYNC: Doku nicht auf v${CURRENT_VERSION} aktualisiert!"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "  Alle DOC_FILES auf VERSION ${CURRENT_VERSION} setzen, dann erneut committen."
  echo "  Escape-Hatch: git commit --no-verify (mit Begruendung im Commit)"
  exit 1
fi

echo "Alle Docs auf Version ${CURRENT_VERSION}"
exit 0
