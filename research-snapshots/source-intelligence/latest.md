# Kaspa Live Source Intelligence

Checked: 2026-09-10T16:41:29.685Z
Facts hash: `f03368c40eb497d58d52fc96044c4c76a92057bc5d32ab45ceff30d737b52fd0`
Source health: **healthy_with_warnings**

## Primary Evidence

| Lane | Healthy | Total |
| --- | ---: | ---: |
| GitHub repositories | 7 | 7 |
| GitHub releases | 1 | 1 |
| GitHub refs | 8 | 8 |
| Web/docs/research | 6 | 6 |
| Network endpoints | 2 | 3 |
| KIP documents | 15 | 15 |

## Latest Rusty Kaspa Release

- Tag: [v2.0.1](https://github.com/kaspanet/rusty-kaspa/releases/tag/v2.0.1)
- Published: 2026-06-15T19:14:22Z
- Prerelease: no

## GitHub Refs

| Source | Ref | SHA | Status |
| --- | --- | --- | --- |
| kaspanet/rusty-kaspa | heads/master | `c338d495bec2` | ok |
| kaspanet/rusty-kaspa | heads/toccata | `0ae28f939e61` | ok |
| kaspanet/rusty-kaspa | heads/tn10 | `e5f6d1f7c86f` | ok |
| kaspanet/rusty-kaspa | heads/tn12 | `ab4c51afde90` | ok |
| kaspanet/kips | heads/master | `e4ae2332117b` | ok |
| kaspanet/docs | heads/main | `0ac77d043a80` | ok |
| kaspanet/silverscript | heads/master | `3ed973335b59` | ok |
| kaspanet/vprogs | heads/master | `f9b84a863a7c` | ok |

## Network Identity

| Endpoint | Expected | Observed | DAA | Status |
| --- | --- | --- | ---: | --- |
| [Mainnet blockDAG](https://api.kaspa.org/info/blockdag) | kaspa-mainnet | kaspa-mainnet | 536379334 | ok |
| [TN10 blockDAG](https://api-tn10.kaspa.org/info/blockdag) | kaspa-testnet-10 | kaspa-testnet-10 | 566997882 | ok |
| [TN12 blockDAG](https://api-tn12.kaspa.org/info/blockdag) | kaspa-testnet-12 |  |  | failed 503 |

## KIP Index

| KIP | Status | Title |
| --- | --- | --- |
| 1 | Implemented | Rewriting the Kaspa Full-Node in the Rust Programming Language |
| 2 | Proposed | Upgrade consensus to follow the DAGKNIGHT protocol |
| 3 | Rejected (see below) | Block sampling for efficient DAA with high BPS |
| 4 | Active | Sparse Difficulty Windows |
| 5 | Active | Message Signing |
| 6 | Draft | Proof of Chain Membership (PoChM) |
| 9 | Active | Extended mass formula for mitigating state bloat |
| 10 | Active | New Transaction Opcodes for Enhanced Script Functionality |
| 13 | Active | Transient Storage Handling |
| 14 | Active | The Crescendo Hardfork |
| 15 | Active | Canonical Transaction Ordering and SelectedParent Accepted Transactions Commitment |
| 16 | Active | New Transaction Opcodes for Verifiable Computation |
| 17 | Active | Covenants and Improved Scripting Capabilities |
| 20 | Active | Covenant IDs |
| 21 | Active | Partitioned Sequencing Commitment with O(activity) Proving |

## Warnings

- Network endpoint unavailable: TN12 blockDAG

## Claim Rules

- Do not convert endpoint failure into feature absence.
- Do not convert testnet activation into mainnet activation.
- Do not convert a merged KIP into released or activated behavior.
- Do not convert a final release with a future DAA into active behavior.
- Always record source URL, checkedAt, release tag or commit, and network identity for current claims.

