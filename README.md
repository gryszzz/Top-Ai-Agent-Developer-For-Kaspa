# Kaspa Sovereign Architect Engine

Production-grade AI skill for deep Kaspa protocol engineering, wallet/backend architecture, DeFi system design, and reliability-first delivery.

## What This Is

This repo ships a reusable AI skill package:

- Skill ID: `$kaspa-sovereign-architect-engine`
- Skill source: `skills/public/kaspa-sovereign-architect-engine/`
- Distribution model: GitHub Releases (zip asset)

It is not a website product. It is an installable skill package with adapters for multiple AI environments.

## What I Am

`$kaspa-sovereign-architect-engine` is a specialized Kaspa systems agent that operates across:

- Protocol: BlockDAG, GHOSTDAG, mempool, UTXO semantics.
- Indexing: DAG-aware UTXO/event indexing and conflict handling.
- Backend: production APIs, workers, retries, caching, validation.
- Frontend: wallet-aware UX, confirmation states, confidence-driven flows.
- DevOps/Security: Docker, CI/CD, observability, threat modeling.

## How To Use Me In Codex

Call the skill by name in your prompt:

```text
$kaspa-sovereign-architect-engine
Design a production-ready Kaspa indexer and API with retry-safe workers and monitoring.
```

Or embed it in a direct task:

```text
Use $kaspa-sovereign-architect-engine to audit my wallet backend for replay, nonce, and signing risks.
```

## Compatibility

- Codex native skill: `SKILL.md`
- OpenAI-compatible metadata: `agents/openai.yaml`
- Claude/Anthropic adapter: `agents/anthropic.md`
- Cursor rules adapter: `agents/cursor.mdc`
- Generic LLM adapter: `agents/generic-system-prompt.md`
- Compatibility manifest: `manifest.json`

## Install The Skill

### Option A: Install from latest release package

```bash
mkdir -p "$CODEX_HOME/skills"
curl -L -o /tmp/kaspa-sovereign-architect-engine.zip \
  https://github.com/gryszzz/Top-Ai-Agent-Developer-For-Kaspa/releases/latest/download/kaspa-sovereign-architect-engine.zip
unzip -o /tmp/kaspa-sovereign-architect-engine.zip -d "$CODEX_HOME/skills"
```

### Option B: Install from repository source

```bash
mkdir -p "$CODEX_HOME/skills/public"
cp -R skills/public/kaspa-sovereign-architect-engine "$CODEX_HOME/skills/public/"
```

### Option C: One-command install scripts

macOS/Linux:

```bash
./skills/public/kaspa-sovereign-architect-engine/scripts/install-codex.sh
```

Windows PowerShell:

```powershell
.\skills\public\kaspa-sovereign-architect-engine\scripts\install-codex.ps1
```

Export non-Codex adapter pack:

```bash
./skills/public/kaspa-sovereign-architect-engine/scripts/export-adapters.sh
```

## Using It Outside Codex

1. Pick an adapter file from `skills/public/kaspa-sovereign-architect-engine/agents/`.
2. Copy its content into your platform's system/developer instruction field.
3. Add your task prompt (for example: "Design a Kaspa DAG-aware indexer for 100k users with failure recovery").

## Releases

- Releases: [https://github.com/gryszzz/Top-Ai-Agent-Developer-For-Kaspa/releases](https://github.com/gryszzz/Top-Ai-Agent-Developer-For-Kaspa/releases)
- Packaging workflow: `.github/workflows/release-skill.yml`

## Repo Highlights

- `skills/public/kaspa-sovereign-architect-engine/` - skill definition, behavior, references.
- `training-corpus/kaspa-pdf-markdown/` - normalized corpus from source documents.
- `kaspa-balance-api/` - production-oriented Kaspa balance API example.
- `kaspa-codex-evolution-loop/` - autonomous iteration and simulation framework.
