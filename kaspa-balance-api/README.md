# Kaspa Balance API

Production-ready Node.js REST API for querying balances from a Kaspa node over gRPC `MessageStream`.

## Features

- `GET /v1/balance/:address` balance lookup via `GetBalanceByAddress`
- `GET /healthz` liveness and optional Kaspa RPC dependency check
- `GET /readyz` readiness check (requires Kaspa node with `--utxoindex`)
- `GET /metrics` Prometheus metrics
- Structured JSON logging with Pino
- Input validation and centralized error handling
- Config validation via environment schema
- Basic rate limiting with optional Redis backend
- Dockerfile + docker-compose support

## Prerequisites

- Node.js 20+
- A reachable Kaspa node gRPC endpoint (`KASPA_RPC_TARGET`), typically running with `--utxoindex`

## Local Run

```bash
cp .env.example .env
npm ci
npm run build
npm start
```

Development mode:

```bash
npm run dev
```

## Docker Run

```bash
cp .env.example .env
docker compose up --build
```

## Environment Variables

See `.env.example`. Critical values:

- `KASPA_RPC_TARGET` (e.g., `127.0.0.1:16110`)
- `KASPA_ALLOWED_ADDRESS_PREFIXES` (e.g., `kaspa,kaspatest`)
- `REDIS_URL` for distributed rate limiting
- `HEALTHCHECK_INCLUDE_NODE=true` to include node connectivity in `/healthz`

## Example Requests

```bash
curl -s http://localhost:8080/healthz | jq
curl -s http://localhost:8080/readyz | jq
curl -s http://localhost:8080/v1/balance/kaspa:YOUR_ADDRESS_HERE | jq
curl -s http://localhost:8080/metrics
```

## Security Notes

- Never store private keys or seed phrases in this service.
- Keep signing infrastructure separate from this read-only API.
- Use TLS (`KASPA_RPC_USE_TLS=true`) for remote RPC targets.
- Place behind API gateway/WAF for authn, authz, and DDoS protection.

## Deployment Checklist

1. Set `NODE_ENV=production`.
2. Set non-wildcard `CORS_ORIGIN`.
3. Use Redis-backed rate limiting (`REDIS_URL`).
4. Expose through reverse proxy with TLS termination.
5. Scrape `/metrics` in Prometheus and configure alerts.
