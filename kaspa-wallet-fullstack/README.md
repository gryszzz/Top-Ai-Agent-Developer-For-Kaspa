# Kaspa Wallet Fullstack (Revenue-Ready Starter)

Production-style fullstack starter with:

- Node.js/TypeScript backend (`/backend`) for health, balances, wallet sessions, payment quote monetization, and metrics
- React 18 + TypeScript + Zustand + Tailwind frontend (`/frontend`)
- Kasware injected wallet flow (connect + message signing)
- Kaspium-compatible manual/deeplink mode for mobile wallet handoff
- Docker Compose for one-command local boot

## Implemented API

- `GET /healthz`, `GET /readyz`, `GET /metrics`
- `GET /v1/network`
- `GET /v1/balance/:address`
- `POST /v1/wallet/challenge`
- `POST /v1/wallet/session`
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
- `KASPA_ALLOWED_ADDRESS_PREFIXES` - defaults to `kaspatest,kaspa`
- `ALLOW_UNVERIFIED_WALLET_SIG` - set `false` for strict verification

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

Backend:

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

## Troubleshooting

- `503` on `/readyz`: Kaspa node likely unavailable or missing `--utxoindex`.
- Invalid address errors: ensure prefix is in `KASPA_ALLOWED_ADDRESS_PREFIXES`.
- Payment quote rejected: check amount format (`N` or `N.x` up to 8 decimals).
- Kasware connect failure: verify extension is installed and unlocked.
- Kaspium deeplink issues: use a compatible mobile wallet with `kaspa:` URI support.
