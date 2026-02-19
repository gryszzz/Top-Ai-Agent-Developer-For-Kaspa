import { env } from "../agent/config";
import { logger } from "../agent/logger";
import { SimulationResults } from "../analytics/types";
import { runSimulation } from "../simulation/runSimulation";
import { RpcClient } from "./rpcClient";

const endpoint = process.env.KASPA_LIVE_FEED_URL;

export async function fetchLiveBlocks(): Promise<SimulationResults> {
  if (!endpoint) {
    logger.warn("KASPA_LIVE_FEED_URL missing, falling back to simulation data");
    return runSimulation();
  }

  const client = new RpcClient(endpoint);
  const blocks = await client.fetchBlocks(Math.min(env.SIM_BLOCKS, 200));

  const p95LatencyMs = blocks.length
    ? blocks
        .map((b) => b.latencyMs)
        .sort((a, b) => a - b)[Math.floor(blocks.length * 0.95)]
    : 0;

  return {
    blockCount: blocks.length,
    parallelism: env.SIM_PARALLELISM,
    users: env.SIM_USERS,
    txPerUser: env.SIM_TX_PER_USER,
    p95LatencyMs,
    utxoLagMs: blocks.reduce((max, b) => Math.max(max, b.utxoLag), 0),
    websocketErrors: blocks.reduce((sum, b) => sum + b.websocketErrors, 0),
    transactionConflicts: blocks.reduce((sum, b) => sum + b.doubleSpends, 0),
    failedJobs: 0,
    timestamp: new Date().toISOString()
  };
}
