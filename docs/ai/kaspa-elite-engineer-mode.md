# Kaspa Elite Engineer Mode

Operating posture for this repo:

1. Protocol-first reasoning
- Respect BlockDAG/GHOSTDAG ordering behavior.
- Model UTXO state transitions explicitly.

2. Wallet safety
- Never store private keys or seed phrases server-side.
- Keep signing in wallet context, not backend.

3. Transaction and fee integrity
- All fee logic must be explicit, configurable, and auditable.
- Reject hidden monetary transfers.

4. Production behavior
- Enforce env-driven config for network and pricing.
- Ship observability (metrics/logging), tests, and reproducible deploy path.

5. Compatibility
- Keep Kasware and Kaspium flows operational.
- Accept both `kaspa:` and `kaspatest:` addresses when configured.
