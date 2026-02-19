# Scaling Plan

This repository is now designed for repeatable distribution at scale.

## Distribution Hardening

- Release workflow publishes both `.zip` and `.tar.gz` artifacts.
- Release workflow publishes `SHA256SUMS.txt` for integrity verification.
- Release workflow enforces `tag == manifest version` through packaging validation.

## Compatibility Hardening

- CI validates all adapter targets on each skill change.
- Installer smoke tests run on:
  - Linux (`install-codex.sh`, `install-openclaw.sh`, `install-gemini.sh`)
  - macOS (`install-codex.sh`, `install-openclaw.sh`, `install-gemini.sh`)
  - Windows (`install-codex.ps1`)

## Operational Checklist

- Keep `manifest.json` version aligned with release tag.
- Keep `release-notes/vX.Y.Z.md` present before tagging.
- Keep `docs/` pages updated for product positioning and onboarding.
- Run compatibility validation locally before pushing:

```bash
node skills/public/kaspa-sovereign-architect-engine/scripts/validate-compatibility.mjs --all
```

## Growth Checklist

- Publish each tagged release to Kaspa communities.
- Track install friction by platform and improve install scripts first.
- Keep adapter files minimal and deterministic to reduce drift.
- Add additional adapters only with CI coverage from day one.
