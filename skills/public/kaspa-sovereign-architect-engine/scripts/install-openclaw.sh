#!/usr/bin/env bash
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_ROOT="${OPENCLAW_SKILLS_DIR:-$HOME/.openclaw/skills}"
TARGET_DIR="$TARGET_ROOT/$(basename "$SKILL_DIR")"

mkdir -p "$TARGET_ROOT"
rm -rf "$TARGET_DIR"
cp -R "$SKILL_DIR" "$TARGET_DIR"

echo "Installed OpenClaw skill:"
echo "  $TARGET_DIR"
echo
echo "OpenClaw will load it from ~/.openclaw/skills (managed) or workspace ./skills."
