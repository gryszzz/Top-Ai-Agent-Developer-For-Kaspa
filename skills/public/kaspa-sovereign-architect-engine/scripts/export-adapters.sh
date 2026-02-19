#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${1:-$PWD/kaspa-sovereign-adapters}"

mkdir -p "$OUT_DIR"
cp -R "$ROOT_DIR/agents" "$OUT_DIR/agents"
cp "$ROOT_DIR/manifest.json" "$OUT_DIR/manifest.json"

echo "Exported adapter pack to: $OUT_DIR"
echo "Files:"
echo "- $OUT_DIR/agents/openai.yaml"
echo "- $OUT_DIR/agents/anthropic.md"
echo "- $OUT_DIR/agents/cursor.mdc"
echo "- $OUT_DIR/agents/generic-system-prompt.md"
