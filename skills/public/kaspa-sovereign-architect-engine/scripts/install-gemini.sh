#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ADAPTER_SOURCE="$SKILL_DIR/agents/gemini.md"

GEMINI_HOME="${GEMINI_HOME:-$HOME/.gemini}"
GLOBAL_GEMINI_MD="$GEMINI_HOME/GEMINI.md"
TARGET_ADAPTER="$GEMINI_HOME/kaspa-sovereign-architect-engine.gemini.md"
IMPORT_LINE="@${TARGET_ADAPTER}"

mkdir -p "$GEMINI_HOME"
cp "$ADAPTER_SOURCE" "$TARGET_ADAPTER"

if [[ ! -f "$GLOBAL_GEMINI_MD" ]]; then
  {
    echo "# Gemini CLI global context"
    echo
    echo "$IMPORT_LINE"
  } >"$GLOBAL_GEMINI_MD"
else
  if ! grep -Fqx "$IMPORT_LINE" "$GLOBAL_GEMINI_MD"; then
    {
      echo
      echo "$IMPORT_LINE"
    } >>"$GLOBAL_GEMINI_MD"
  fi
fi

echo "Installed Gemini adapter:"
echo "  $TARGET_ADAPTER"
echo "Updated Gemini context:"
echo "  $GLOBAL_GEMINI_MD"
