# 🧠 Kaspa Sovereign Architect Engine

**Codex-native Kaspa engineering skill** with **cross-platform adapters** for OpenAI, Claude, Cursor, OpenClaw, and generic LLM workflows.

## 🚀 What This Is

This repository publishes a reusable AI skill package for serious Kaspa engineering.

- **Skill ID:** `$kaspa-sovereign-architect-engine`
- **Main skill file:** [`SKILL.md`](skills/public/kaspa-sovereign-architect-engine/SKILL.md)
- **Release downloads:** [GitHub Releases](https://github.com/gryszzz/Top-Ai-Agent-Developer-For-Kaspa/releases)
- **Positioning:** package-first distribution (not a website product)

## 🔥 What This Agent Is Good At

`$kaspa-sovereign-architect-engine` focuses on:

- **Protocol engineering:** BlockDAG, GHOSTDAG, mempool, UTXO semantics
- **Indexer architecture:** DAG-aware indexing, conflict handling, consistency flows
- **Backend reliability:** APIs, workers, retries, caching, validation, observability
- **Wallet + UX:** wallet-aware transaction lifecycle and confirmation state UX
- **Security rigor:** threat modeling, key boundaries, replay and double-spend controls

## ⚡ Quick Start (Codex)

Use the skill name in your prompt:

```text
$kaspa-sovereign-architect-engine
Design a production-ready Kaspa indexer + API with retry-safe workers and monitoring.
```

Or embed it directly:

```text
Use $kaspa-sovereign-architect-engine to audit my wallet backend for replay, nonce, and signing risks.
```

## 🧩 Compatibility Matrix

| Platform | Status | Adapter |
|---|---|---|
| Codex | ✅ Native | [`SKILL.md`](skills/public/kaspa-sovereign-architect-engine/SKILL.md) |
| OpenAI-style agents | ✅ Adapter | [`agents/openai.yaml`](skills/public/kaspa-sovereign-architect-engine/agents/openai.yaml) |
| Claude / Anthropic | ✅ Adapter | [`agents/anthropic.md`](skills/public/kaspa-sovereign-architect-engine/agents/anthropic.md) |
| Cursor | ✅ Adapter | [`agents/cursor.mdc`](skills/public/kaspa-sovereign-architect-engine/agents/cursor.mdc) |
| OpenClaw | ✅ Adapter | [`agents/openclaw.md`](skills/public/kaspa-sovereign-architect-engine/agents/openclaw.md) |
| Any LLM platform | ✅ Adapter | [`agents/generic-system-prompt.md`](skills/public/kaspa-sovereign-architect-engine/agents/generic-system-prompt.md) |

Compatibility metadata:

- [`manifest.json`](skills/public/kaspa-sovereign-architect-engine/manifest.json)

Automated verification:

- [Compatibility Matrix workflow](https://github.com/gryszzz/Top-Ai-Agent-Developer-For-Kaspa/actions/workflows/compatibility-matrix.yml)
- Release gating validation is enforced in [`.github/workflows/release-skill.yml`](.github/workflows/release-skill.yml)

## 🛠 Install

### Option A: Install latest release (recommended)

```bash
mkdir -p "$CODEX_HOME/skills"
curl -L -o /tmp/kaspa-sovereign-architect-engine.zip \
  https://github.com/gryszzz/Top-Ai-Agent-Developer-For-Kaspa/releases/latest/download/kaspa-sovereign-architect-engine.zip
unzip -o /tmp/kaspa-sovereign-architect-engine.zip -d "$CODEX_HOME/skills"
```

### Option B: Install from source

```bash
mkdir -p "$CODEX_HOME/skills/public"
cp -R skills/public/kaspa-sovereign-architect-engine "$CODEX_HOME/skills/public/"
```

### Option C: Install scripts

macOS/Linux:

```bash
./skills/public/kaspa-sovereign-architect-engine/scripts/install-codex.sh
```

Windows PowerShell:

```powershell
.\skills\public\kaspa-sovereign-architect-engine\scripts\install-codex.ps1
```

Export adapter bundle:

```bash
./skills/public/kaspa-sovereign-architect-engine/scripts/export-adapters.sh
```

### Option D: Install for OpenClaw

OpenClaw loads AgentSkills-compatible folders from `~/.openclaw/skills` or `<workspace>/skills`.

Install globally for OpenClaw (macOS/Linux):

```bash
./skills/public/kaspa-sovereign-architect-engine/scripts/install-openclaw.sh
```

Install manually into an OpenClaw workspace:

```bash
mkdir -p ./skills
cp -R skills/public/kaspa-sovereign-architect-engine ./skills/
```

## 🌍 Use Outside Codex

1. Open an adapter file from [`agents/`](skills/public/kaspa-sovereign-architect-engine/agents/).
2. Copy its contents into your platform's system/developer instructions.
3. Add your actual task prompt.

Example task prompt:

```text
Design a Kaspa DAG-aware indexer for 100k users with failure recovery and replay-safe event handling.
```

## 📦 Releases

- Download packages: [Releases](https://github.com/gryszzz/Top-Ai-Agent-Developer-For-Kaspa/releases)
- Automated packaging workflow: [`.github/workflows/release-skill.yml`](.github/workflows/release-skill.yml)

## 📁 Repository Map

- [`skills/public/kaspa-sovereign-architect-engine/`](skills/public/kaspa-sovereign-architect-engine/) - core skill package
- [`training-corpus/kaspa-pdf-markdown/`](training-corpus/kaspa-pdf-markdown/) - normalized Kaspa corpus
- [`kaspa-balance-api/`](kaspa-balance-api/) - production-oriented Kaspa API sample
- [`kaspa-codex-evolution-loop/`](kaspa-codex-evolution-loop/) - autonomous iteration framework
