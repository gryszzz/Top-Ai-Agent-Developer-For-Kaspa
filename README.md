# Top AI Agent Developer For Kaspa

This repository contains Kaspa-focused projects, training corpora, and a custom Codex skill:

- **Skill name:** `$kaspa-sovereign-architect-engine`
- **Skill path:** `skills/public/kaspa-sovereign-architect-engine`
- **Purpose:** protocol-first Kaspa architecture, reliability engineering, threat simulation, and iterative optimization.

## Use The Agent

In Codex, invoke the skill explicitly in your prompt:

```text
$kaspa-sovereign-architect-engine
Design a production-ready Kaspa indexer + API with chaos testing and recovery playbooks.
```

Or include it inline:

```text
Use $kaspa-sovereign-architect-engine to audit my Kaspa wallet backend for replay and double-spend risks.
```

## What The Agent Enforces

- First-principles reasoning for BlockDAG, GHOSTDAG, UTXO, transaction lifecycle.
- Multi-layer design coverage: protocol, indexer, backend, frontend, DevOps, security.
- Dynamic validation: unit/integration/stress/chaos checks and recovery planning.
- Iteration loop: reflection, comparative optimization, and next-step experiment rules.

## GitHub Pages Docs

A static docs site is included under `docs/` and deployed with GitHub Actions.

Expected URL (after Pages is enabled):

- [https://gryszzz.github.io/Top-Ai-Agent-Developer-For-Kaspa/](https://gryszzz.github.io/Top-Ai-Agent-Developer-For-Kaspa/)

## Repo Highlights

- `skills/public/kaspa-sovereign-architect-engine/` – custom skill definition and references
- `training-corpus/kaspa-pdf-markdown/` – extracted PDF training corpus
- `kaspa-balance-api/` – production-oriented Kaspa balance API example
- `kaspa-codex-evolution-loop/` – autonomous iteration and simulation framework

## Local Preview For Docs

```bash
python3 -m http.server 8000 -d docs
```

Then open `http://localhost:8000`.
