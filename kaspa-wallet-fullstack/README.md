# Kaspa Wallet Fullstack (Revenue-Ready Starter)

Production-style fullstack starter with:

- Node.js/TypeScript backend (`/backend`) for health, balances, wallet sessions, payment quote monetization, and metrics
- React 18 + TypeScript + Zustand + Tailwind frontend (`/frontend`)
- Kasware + Kastle injected wallet flows (connect + message signing)
- Kasware live event handling (`accountsChanged`, `networkChanged`) with automatic session safety
- Kaspium-compatible mode with per-network address memory (first connect only)
- Wallet compatibility slots for KNG web/mobile, Ledger + KASVault, and CLI wallets (address-backed session mode)
- Wallet-scoped runtime agent control with reconnect auto-resume preferences
- Live node/BlockDAG telemetry from Kaspa RPC (`virtualDaaScore`, sync state, runtime counts)
- Docker Compose for one-command local boot

## Implemented API

- `GET /healthz`, `GET /readyz`, `GET /metrics`
- `GET /v1/network`
- `GET /v1/stats/realtime`
- `GET /v1/balance/:address`
- `POST /v1/wallet/challenge`
- `POST /v1/wallet/session`
- `GET /v1/agent/state/:address` (requires wallet session token)
- `POST /v1/agent/start` (requires wallet session token)
- `POST /v1/agent/stop` (requires wallet session token)
- `POST /v1/payments/quote` (transparent platform fee + deeplink intents)

## One-command run (clean clone)

```bash
cp .env.example .env
docker compose up --build
```

Frontend: `http://localhost:3000`  
Backend: `http://localhost:8080`

## Env vars

Core:

- `KASPA_RPC_TARGET` - Kaspa gRPC endpoint (`host:port`)
- `KASPA_NETWORK` - example: `testnet-10`
- `KASPA_ALLOWED_ADDRESS_PREFIXES` - allowed prefixes for this deployment
- `ALLOW_UNVERIFIED_WALLET_SIG` - set `false` for strict verification
- `KASPA_ALLOWED_ADDRESS_PREFIXES` should be set per environment for strict separation:
  - testnet: `kaspatest`
  - mainnet: `kaspa`
- Backend enforces an effective prefix set derived from `KASPA_NETWORK` to prevent cross-network address mistakes.
- `REDIS_URL` enables distributed runtime (multi-instance, sticky-free); without it runtime falls back to single-instance memory.

Monetization:

- `PLATFORM_FEE_ENABLED` - `true|false`
- `PLATFORM_FEE_BPS` - fee in basis points (100 = 1%)
- `PLATFORM_FEE_MIN_KAS` - minimum fee in KAS
- `PLATFORM_FEE_RECIPIENT` - fee recipient address

## Local dev (without Docker)

Backend:

```bash
cd backend
cp .env.example .env
npm ci
npm run build
npm run dev
```

Frontend:

```bash
cd frontend
cp .env.example .env
npm ci
npm run dev
```

## Test + typecheck

Fullstack CI (repo root):

```bash
cd kaspa-wallet-fullstack
npm run ci
```

Backend only:

```bash
cd backend
npm run build
npm run lint
npm test
```

Frontend:

```bash
cd frontend
npm run build
npm test
```

## Deploy path

- Dockerized deployment via `docker compose` included.
- Frontend serves via nginx image; backend exposes health + metrics endpoints.
- For production:
  - set strong `JWT_SECRET`
  - point `KASPA_RPC_TARGET` at a hardened node
  - set `ALLOW_UNVERIFIED_WALLET_SIG=false`
  - set production `CORS_ORIGIN`

## Analytics / telemetry

`/metrics` includes:

- HTTP request counters and latency histograms
- business event counters:
  - `signup_started`
  - `activation_completed`
  - `payment_intent_created`
  - `agent_started`
  - `agent_stopped`

## Troubleshooting

- `503` on `/readyz`: Kaspa node likely unavailable or missing `--utxoindex`.
- Invalid address errors: ensure prefix is in `KASPA_ALLOWED_ADDRESS_PREFIXES`.
- Payment quote rejected: check amount format (`N` or `N.x` up to 8 decimals).
- Kasware connect failure: verify extension is installed and unlocked.
- Kasware account/network switched: app auto-resyncs and may require reconnect if network no longer matches app profile.
- Kaspium first connect requires one valid address for the active network; it is saved per network for later sign-ins.
- Address-backed wallet slots (KNG/Ledger/CLI) use the same secure challenge/session flow as Kaspium with strict prefix validation.
- Kaspium deeplink issues: use a compatible mobile wallet with `kaspa:`/`kaspatest:` URI support.
- Agent runtime endpoints require `Authorization: Bearer <wallet-session-token>`.
- If node telemetry is blank, verify backend can reach `KASPA_RPC_TARGET` and node is synced on expected network.
- If `runtime store` shows `memory`, set `REDIS_URL` so runtime state is shared across instances.
