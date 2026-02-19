# Kaspa Wallet Fullstack (Testnet-Ready)

Production-style fullstack starter with:

- Node.js/TypeScript backend (`/backend`) for health, balance, network metadata, and wallet session flows
- React 18 + TypeScript + Zustand + Tailwind frontend (`/frontend`)
- Kasware injected wallet flow (connect + message signing)
- Kaspium-compatible manual/deeplink mode for mobile wallet handoff
- Docker Compose for local fullstack boot

## What is implemented

- `GET /healthz`, `GET /readyz`, `GET /metrics`
- `GET /v1/network`
- `GET /v1/balance/:address`
- `POST /v1/wallet/challenge`
- `POST /v1/wallet/session`

## Prerequisites

- Node 20+
- npm 10+
- A reachable Kaspa testnet node with gRPC enabled (and `--utxoindex` for balances)

## Local development

### Backend

```bash
cd backend
cp .env.example .env
npm ci
npm run build
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm ci
npm run dev
```

## Docker run

```bash
cp .env.example .env
docker compose up --build
```

Frontend: `http://localhost:3000`
Backend: `http://localhost:8080`

## Testnet connectivity notes

- Set `KASPA_RPC_TARGET` in `.env` to a valid testnet gRPC target (`host:port`).
- If node connectivity is wrong, frontend still loads, but balance/health will show degraded state.
- For strict signature enforcement, set `ALLOW_UNVERIFIED_WALLET_SIG=false`.

## Wallet compatibility

- Kasware: browser-injected provider (`window.kasware`) for account access and message signing.
- Kaspium: manual address mode plus `kaspa:` URI deep link generation.
