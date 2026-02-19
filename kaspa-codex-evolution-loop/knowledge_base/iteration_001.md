# iteration_001

## Observations
- UTXO indexer lag exceeded baseline threshold under synthetic parallel DAG load.
- WebSocket errors increased with concurrent wallet simulation.
- p95 latency rose beyond acceptable real-time wallet UX target.

## Lessons
- Implement sharded indexer workers by address partition.
- Add event batching and flow-control to websocket fanout.
- Add queue backpressure and dead-letter alarms.

## Next Iteration Focus
- Replay protection validation under nonce reuse attack simulation.
- Node outage simulation with auto-recovery and circuit breaker behavior.
