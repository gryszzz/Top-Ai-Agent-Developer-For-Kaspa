#!/usr/bin/env python3
import argparse
import json
import random
from datetime import datetime, timezone


def main() -> None:
    parser = argparse.ArgumentParser(description="Synthetic DAG simulator")
    parser.add_argument("--blocks", type=int, required=True)
    parser.add_argument("--parallelism", type=int, required=True)
    parser.add_argument("--users", type=int, required=True)
    parser.add_argument("--tx-per-user", type=int, required=True)
    args = parser.parse_args()

    # Deterministic seed for reproducible CI runs.
    random.seed(args.blocks * 31 + args.parallelism * 17 + args.users * 13 + args.tx_per_user)

    base_latency = 120 + (args.parallelism * 25)
    load_penalty = (args.users * args.tx_per_user) // 30
    p95_latency_ms = base_latency + load_penalty + random.randint(0, 120)
    utxo_lag_ms = max(20, (args.parallelism * 40) + random.randint(0, 220))
    websocket_errors = max(0, (args.users // 80) - 2 + random.randint(0, 10))
    transaction_conflicts = max(0, args.parallelism - 2 + random.randint(0, 3))
    failed_jobs = max(0, (args.users * args.tx_per_user) // 700 + random.randint(0, 2))

    result = {
        "blockCount": args.blocks,
        "parallelism": args.parallelism,
        "users": args.users,
        "txPerUser": args.tx_per_user,
        "p95LatencyMs": p95_latency_ms,
        "utxoLagMs": utxo_lag_ms,
        "websocketErrors": websocket_errors,
        "transactionConflicts": transaction_conflicts,
        "failedJobs": failed_jobs,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    print(json.dumps(result))


if __name__ == "__main__":
    main()
