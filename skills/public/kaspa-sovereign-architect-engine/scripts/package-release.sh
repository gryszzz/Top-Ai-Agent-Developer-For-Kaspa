#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PUBLIC_DIR="$(cd "$SKILL_DIR/.." && pwd)"
OUT_DIR="${1:-$PWD/dist-artifacts}"
TAG_NAME="${2:-}"

SKILL_BASENAME="$(basename "$SKILL_DIR")"
BASE_NAME="kaspa-sovereign-architect-engine"
VERSION="$(node -e "const m=require(process.argv[1]); process.stdout.write(m.version);" "$SKILL_DIR/manifest.json")"
VERSION_TAG="v${VERSION}"

if [[ -n "$TAG_NAME" ]]; then
  NORMALIZED_TAG="${TAG_NAME#refs/tags/}"
  if [[ "$NORMALIZED_TAG" != "$VERSION_TAG" ]]; then
    echo "Tag/version mismatch: manifest=$VERSION_TAG tag=$NORMALIZED_TAG" >&2
    exit 1
  fi
fi

mkdir -p "$OUT_DIR"

VERSIONED_ZIP="$OUT_DIR/${BASE_NAME}-${VERSION_TAG}.zip"
VERSIONED_TAR="$OUT_DIR/${BASE_NAME}-${VERSION_TAG}.tar.gz"
LATEST_ZIP="$OUT_DIR/${BASE_NAME}.zip"
LATEST_TAR="$OUT_DIR/${BASE_NAME}.tar.gz"

(
  cd "$PUBLIC_DIR"
  zip -rq "$VERSIONED_ZIP" "$SKILL_BASENAME"
  tar -czf "$VERSIONED_TAR" "$SKILL_BASENAME"
)

cp "$VERSIONED_ZIP" "$LATEST_ZIP"
cp "$VERSIONED_TAR" "$LATEST_TAR"

(
  cd "$OUT_DIR"
  shasum -a 256 \
    "$(basename "$VERSIONED_ZIP")" \
    "$(basename "$VERSIONED_TAR")" \
    "$(basename "$LATEST_ZIP")" \
    "$(basename "$LATEST_TAR")" \
    > SHA256SUMS.txt
)

echo "Packaged release artifacts in: $OUT_DIR"
ls -1 "$OUT_DIR"
