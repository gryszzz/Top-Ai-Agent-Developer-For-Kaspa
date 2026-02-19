# Core Research Track

This file defines mandatory non-repository research tracks.

## 1. Protocol Theory

Sources:
- `https://eprint.iacr.org/2018/104.pdf`

Required outputs:
- Explain k-cluster selection.
- Explain blue set versus red set and ordering consequences.
- Explain security assumptions and adversary model.
- Explain throughput versus security tradeoff assumptions.
- Provide a scaling-limit discussion with explicit variables and assumptions.

## 2. Live Network Behavior

Sources:
- `https://explorer.kaspa.org/`
- `https://kas.fyi/`

Required outputs:
- UTXO behavior and common spend patterns.
- Transaction shape and observed fee behavior.
- DAG structure observations and potential congestion markers.
- Absolute timestamp on every time-sensitive claim.

## 3. Mining and Incentive Layer

Sources:
- `https://github.com/kaspanet/rusty-kaspa/tree/master/crypto`

Required outputs:
- Block creation flow and kHeavyHash boundaries.
- Propagation-latency impact on security and incentives.
- Miner behavior assumptions and failure modes.

## 4. RPC and Real-Time Data Layer

Sources:
- Rusty Kaspa repo RPC and notification definitions.

Required outputs:
- gRPC and websocket model summary.
- Subscription patterns for mempool and block events.
- Real-time indexer ingestion architecture.
- Failure handling: dedupe, replay, reconnect, backpressure.

## 5. Indexing and Query Infrastructure

Sources:
- `https://github.com/bitcoin/bitcoin/tree/master/src/index`
- `https://thegraph.com/docs/`
- `https://www.postgresql.org/docs/`
- `https://clickhouse.com/docs/`

Required outputs:
- UTXO reconstruction strategy.
- Address and script balance tracking model.
- Transaction graph data model.
- Postgres versus ClickHouse workload split.
- Caching strategy and API query layer for 100k users.

## 6. Cryptography and Wallet Standards

Sources:
- `https://cryptobook.nakov.com/`
- `https://github.com/bitcoinbook/bitcoinbook`
- `https://github.com/bitcoin/bips`

Required outputs:
- Signing and verification model description.
- HD-wallet concept mapping (BIP32, BIP39, BIP44) where applicable.
- Hash-tree and integrity-proof implications for wallet and indexer design.

## 7. UX Psychology and Trust

Sources:
- `https://www.nngroup.com/articles/`
- `https://www.refactoringui.com/`
- `https://lawsofux.com/`
- EIP-1193 and wallet-provider UX references.

Required outputs:
- Risk-reducing signing UX patterns.
- Onboarding and recovery patterns that reduce user error.
- Trust-signal model for wallet and DeFi actions.

## 8. DevOps and Global Operations

Sources:
- Docker, Kubernetes, NGINX, Redis, Cloudflare docs.

Required outputs:
- Multi-region architecture for node plus API plus frontend.
- WebSocket scaling, rate limiting, DDoS mitigation, and SLO design.
- Observability baseline with metrics, logs, tracing, and runbooks.

## 9. Security Case Studies

Study themes:
- Seed leakage
- Browser extension injection
- RPC replay
- Signature malleability and transaction confusion
- Frontend phishing injection
- Dependency or package supply-chain poisoning

Required outputs:
- Threat model with likely attacker capabilities.
- Preventative controls and detective controls.
- Recovery controls and blast-radius containment plan.
