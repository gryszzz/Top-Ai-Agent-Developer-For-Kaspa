---
name: kaspa-full-ecosystem-mastery
description: Deep multi-repository Kaspa protocol and wallet engineering analysis with architecture mapping, transaction and signing internals, security assessment, DeFi design patterns, and production roadmap output. Use when Codex must study or compare Kaspa core nodes, SDKs, scripting layers, and wallets including Rusty Kaspa, kaspad, kaspa-js, WASM, SilverScript, Kasia, Kaspium, and Kasware.
---

# Kaspa Full Ecosystem Mastery

## Objective

- Produce implementation-grade Kaspa ecosystem analysis.
- Prioritize code-path evidence, architecture clarity, and production decisions.
- Avoid shallow summaries.

## Required Output Contract

- Include these top-level sections in every final response:
  1. Deep Technical Explanation
  2. System Architecture (text diagram)
  3. Code-Level Breakdown
  4. Security Analysis
  5. Performance Considerations
  6. Strategic Advantage Insight
- For each repository, include all of the following:
  - Purpose of the project
  - Architecture breakdown
  - Key modules and folders
  - Interaction with Kaspa node
  - Transaction creation and signing logic
  - Security risks
  - Improvement opportunities
  - Reusable DeFi patterns
  - Fork and extension approach
  - Production-grade improvement plan
- Treat SilverScript and Kasia deep dives and wallet engineering sections as mandatory.
- State unknowns explicitly when source code cannot confirm behavior.

## Source Loading

- Start with `references/sources.md` to set canonical sources and expected local paths.
- Use `references/repo-audit-checklist.md` during repository analysis.
- Read only the subsection relevant to the current repository to preserve context.

## Workflow

1. Scope the task.
- Confirm repositories and docs in scope.
- Confirm whether analysis should use local clones only or also fetch remote updates.
- Lock evaluation criteria before deep reading.

2. Acquire source snapshots.
- Prefer local repositories when available.
- If cloning or updating is allowed, pin each repository to a concrete commit hash and record analysis date.
- Keep a per-repository evidence note with file paths and symbols.

3. Run a repository analysis pass for each target.
- Map architecture by entrypoints, services, data models, RPC layers, mempool or consensus boundaries, and wallet or signing flows.
- Trace transaction lifecycle end-to-end: builder, mass or fee calculation, serialization, signing, submission, and confirmation handling.
- Trace node integration: RPC clients, websocket streams, indexing dependencies, error handling, and retry logic.
- Audit security posture: key custody boundaries, parsing and validation trust boundaries, replay or double-spend handling, dependency risk, and supply-chain exposure.
- Extract reusable patterns for DeFi primitives and SDK-driven app architecture.

4. Run SilverScript deep dive.
- Explain execution model and opcode or scripting semantics.
- Compare to Bitcoin Script with explicit capability and constraint differences.
- Evaluate determinism, verification guarantees, and failure modes.
- Design three DeFi primitives with state model, transaction flow, and risk controls.
- Identify current limits and concrete optimization opportunities.

5. Run Kasia deep dive.
- Decompose architecture, compiler and runtime assumptions, and developer workflow.
- Compare Kasia versus SilverScript for safety, expressiveness, and ergonomics.
- Provide contract pattern examples and abstraction layering guidance.
- Propose how Kasia can support production DeFi infrastructure.

6. Run wallet engineering audit for Kaspium and Kasware.
- Break down wallet architecture and trust boundaries.
- Trace key generation, seed handling, storage, unlock, and signing boundaries.
- Inspect transaction builder and broadcast paths.
- Enumerate attack surfaces and abuse scenarios.
- Propose hardened architecture, provisioning service design, and signing relay backend design.

7. Build synthesis artifacts.
- Propose a next-gen Kaspa wallet architecture that is secure, extensible, DeFi-ready, backend-compatible, and scalable.
- Design a Kaspa-native DeFi protocol using SilverScript or Kasia.
- Design a wallet-integrated DeFi frontend architecture.
- Design a production backend architecture using Node.js plus Rust components.
- Provide a scaling plan for 100k users and a monetization model.

8. Produce final deliverable.
- Build a text architecture diagram with components, trust boundaries, and data flow.
- Include code-level references with concrete files or functions when available.
- Prioritize actionable engineering decisions over generic advice.

## Engineering Standards

- Use precise terminology for UTXO flows, signing domains, and RPC semantics.
- Include absolute dates when discussing time-sensitive claims.
- Distinguish verified facts from inferred behavior.
- Prefer primary sources and code over tertiary commentary.
- Avoid speculation without labeling it as hypothesis.

## Deliverable Skeleton

Use this shape unless the user requests a different format:

```markdown
# Deep Technical Explanation
## Repo: <name>
### Purpose
### Architecture
### Key Modules
### Node Interaction
### Transaction and Signing
### Security Risks
### Improvement Opportunities
### Reusable DeFi Patterns
### Fork and Extend Plan
### Production Improvement Plan

# System Architecture (text diagram)
<ASCII or mermaid diagram>

# Code-Level Breakdown
<file paths, major symbols, call chains>

# Security Analysis
<threat model, attack surfaces, mitigations>

# Performance Considerations
<critical paths, bottlenecks, scaling strategy>

# Strategic Advantage Insight
<ecosystem leverage, product moat, execution priorities>
```
