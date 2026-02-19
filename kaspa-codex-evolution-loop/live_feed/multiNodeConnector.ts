import { env } from "../agent/config";
import { logger } from "../agent/logger";
import { SimulationResults } from "../analytics/types";
import { runSimulation } from "../simulation/runSimulation";
import { RpcClient } from "./rpcClient";

export async function fetchLiveBlocks(): Promise<SimulationResults> {
  if (!env.KASPA_NODE_ENDPOINTS.length && !env.KASPA_LIVE_FEED_URL) {
    logger.warn("No live node endpoints configured. Falling back to synthetic simulation.");
    return runSimulation();
  }

  const endpoints = env.KASPA_NODE_ENDPOINTS.length
    ? env.KASPA_NODE_ENDPOINTS
    : [env.KASPA_LIVE_FEED_URL as string];

  const blocks = (
    await Promise.all(
      endpoints.map(async (endpoint) => {
        try {
          const client = new RpcClient(endpoint);
          return await client.fetchBlocks(100);
        } catch (error) {
          logger.warn({ endpoint, err: error }, "Failed to fetch from node endpoint");
          return [];
        }
      })
    )
  ).flat();

  if (!blocks.length) {
    logger.warn("No blocks received from live endpoints. Falling back to simulation.");
    return runSimulation();
  }

  const sortedLatency = blocks.map((b) => b.latencyMs).sort((a, b) => a - b);
  const p95Index = Math.min(sortedLatency.length - 1, Math.floor(sortedLatency.length * 0.95));

  return {
    blockCount: blocks.length,
    parallelism: Math.max(1, endpoints.length),
    users: env.SIM_USERS,
    txPerUser: env.SIM_TX_PER_USER,
    p95LatencyMs: sortedLatency[p95Index] ?? 0,
    utxoLagMs: blocks.reduce((max, block) => Math.max(max, block.utxoLag), 0),
    websocketErrors: blocks.reduce((sum, block) => sum + block.websocketErrors, 0),
    transactionConflicts: blocks.reduce((sum, block) => sum + block.doubleSpends, 0),
    failedJobs: 0,
    timestamp: new Date().toISOString()
  };
}
