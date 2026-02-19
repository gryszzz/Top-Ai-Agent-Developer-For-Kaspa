#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CODEX_HOME_DIR="${CODEX_HOME:-$HOME/.codex}"
TARGET_DIR="$CODEX_HOME_DIR/skills/public/kaspa-sovereign-architect-engine"

mkdir -p "$CODEX_HOME_DIR/skills/public"
rm -rf "$TARGET_DIR"
cp -R "$ROOT_DIR" "$TARGET_DIR"

echo "Installed skill to: $TARGET_DIR"
echo "Invoke with: \$kaspa-sovereign-architect-engine"
