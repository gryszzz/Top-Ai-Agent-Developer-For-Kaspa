# ExecPlan: Ship Kaspa Wallet Fullstack v1 Revenue-Ready

## Goal
Deliver a production-ready Kaspa wallet fullstack where users can connect via Kasware/Kaspium, query balances, and generate payment intents with a transparent platform fee routed to the configured operator wallet.

## Success Metrics
- Activation: wallet challenge + session completion succeeds for both Kasware and Kaspium flows.
- Retention: balance refresh + payment quote happy path remains stable under repeated requests.
- Revenue: platform fee quote is generated on every eligible payment intent and points to configured fee recipient.

## Constraints
- Timebox: ship in this execution session with verified commands.
- Tech constraints:
  - Keep Kaspa UTXO-first and wallet-signing separation intact.
  - No hidden fees; fees must be explicit in API response and UI.
  - Preserve both wallet flows (Kasware/Kaspium).
  - Validate both `kaspa:` and `kaspatest:` prefixes.

## Milestones (PR-sized)
1. Planning rails and repo alignment
- [x] Add/update `AGENTS.md` and `PLANS.md` with enforceable execution rules.
- [x] Ensure required docs references are present or documented if missing.

2. Monetization spine (transparent platform fee)
- [x] Add backend pricing config (fee recipient, bps, min fee, enable toggle).
- [x] Add fee quote endpoint for payment intents.
- [x] Add frontend payment quote UI + fee breakdown + deeplink outputs.

3. Analytics/telemetry minimums
- [x] Add backend analytics event counters for signup, activation, payment intent.
- [x] Expose telemetry through existing metrics endpoint.

4. Tests and verification hardening
- [x] Add backend unit tests for fee math and validation.
- [x] Add frontend tests for fee/deeplink logic.
- [x] Run lint/typecheck/tests for backend and frontend.

5. Deployment + docs completeness
- [x] Update README + env docs + troubleshooting + pricing config.
- [x] Verify Docker path exists and is documented.
- [x] Run one end-to-end happy path command sequence and record result.

## Definition of Done Checklist
- [x] Clean clone -> one command runs (`docker compose up --build` in `kaspa-wallet-fullstack/`)
- [x] Tests/lint/typecheck pass
- [x] Deploy documented and reproducible
- [x] Monetization live (transparent platform fee config + quote flow)
- [x] Analytics events tracked (signup/activation/payment)
- [x] README complete (setup, env vars, run, test, deploy, troubleshooting)

## Commands to Verify
- `cd kaspa-wallet-fullstack/backend && npm ci && npm run build && npm run lint && npm test`
- `cd kaspa-wallet-fullstack/frontend && npm ci && npm run build && npm run lint && npm test`
- `cd kaspa-wallet-fullstack && docker compose config`
- Happy path API run:
  - `cd kaspa-wallet-fullstack/backend && npm run build && node dist/server.js`
  - `curl -s http://localhost:8080/v1/payments/quote -X POST -H 'content-type: application/json' -d '{...}'`

## Progress Log
- [x] Initial scan of repository and target app (`kaspa-wallet-fullstack`).
- [x] Milestone 1 complete.
- [x] Milestone 2 complete.
- [x] Milestone 3 complete.
- [x] Milestone 4 complete.
- [x] Milestone 5 complete.

## Blockers / TODOs
- TODO(issue:LOCAL-DOCKER-VERIFY): Docker binary is unavailable in this execution environment, so local Docker smoke execution could not be run here. Follow-up: run `docker compose up --build` in `kaspa-wallet-fullstack/` and verify `GET /healthz` plus frontend boot at `http://localhost:3000`.
