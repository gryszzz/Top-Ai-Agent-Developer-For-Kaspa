# Kaspa Codex Sovereign Multi-Node Lab

Autonomous iteration loop for Kaspa architecture hardening using live or simulated DAG data.

## Quick Start

```bash
cp .env.example .env
npm ci
npm run build
npm start
```

## Docker

```bash
cp .env.example .env
docker compose -f docker/docker-compose.yml up --build
```

## Outputs

- Iteration markdown artifacts: `knowledge_base/iterations/`
- Prometheus text metrics: `knowledge_base/latest_metrics.prom`

## Notes

- Set `KASPA_NODE1_RPC`, `KASPA_NODE2_RPC`, `KASPA_NODE3_RPC` to enable multi-node mode.
- If no live endpoints are set, the loop uses the synthetic simulator.
