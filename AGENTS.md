# Agent Rules (Codex)

- Always read `PLANS.md` first. If missing or outdated, update it before coding.
- Never claim completion without running verification commands.
- Prefer minimal, shippable increments over idealized architecture.
- Every non-trivial change must include tests, docs updates, and reproducible steps.
- Keep Kaspa UTXO-first assumptions intact.
- Never implement hidden fees or hidden key handling; monetary flows must be explicit.
- Preserve both wallet compatibility paths:
  - Kasware
  - Kaspium
- Validate both Kaspa address prefixes:
  - `kaspa:`
  - `kaspatest:`
