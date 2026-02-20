import { Router } from "express";
import { env } from "../config/env";
import { KaspaRpcClient } from "../kaspa/kaspaRpcClient";
import type { WalletAgentRuntimeService } from "../runtime/agentRuntime";

export function createStatsRouter(kaspaClient: KaspaRpcClient, agentRuntime: WalletAgentRuntimeService): Router {
  const router = Router();

  router.get("/stats/realtime", async (_req, res) => {
    const states = await agentRuntime.list();
    const runningAgents = states.filter((state) => state.running).length;

    try {
      const nodeInfo = await kaspaClient.getServerInfo();

      res.status(200).json({
        network: env.KASPA_NETWORK,
        node: {
          networkId: nodeInfo.networkId,
          rpcApiVersion: nodeInfo.rpcApiVersion,
          rpcApiRevision: nodeInfo.rpcApiRevision,
          serverVersion: nodeInfo.serverVersion,
          hasUtxoIndex: nodeInfo.hasUtxoIndex,
          isSynced: nodeInfo.isSynced,
          virtualDaaScore: nodeInfo.virtualDaaScore
        },
        agents: {
          tracked: states.length,
          running: runningAgents,
          states
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        network: env.KASPA_NETWORK,
        node: null,
        agents: {
          tracked: states.length,
          running: runningAgents,
          states
        },
        error: error instanceof Error ? error.message : "Failed to fetch node stats",
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}
