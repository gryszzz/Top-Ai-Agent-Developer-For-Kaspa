# Developer Notes

## Read Order

1. `docs/kaspa/links.md`
2. `docs/ai/kaspa-elite-engineer-mode.md`
3. `README.md`
4. `PLANS.md`

## Active Product Surface

Primary runnable app for fullstack wallet work:

- `kaspa-wallet-fullstack/backend`
- `kaspa-wallet-fullstack/frontend`

## Verification Baseline

```bash
cd kaspa-wallet-fullstack/backend && npm ci && npm run build && npm run lint && npm test
cd kaspa-wallet-fullstack/frontend && npm ci && npm run build && npm run lint && npm test
```

## Monetization Guardrail

The platform fee flow is explicit and configurable by env vars. Do not implement hidden routing or undisclosed fee extraction.
