import { Router } from "express";
import { env } from "../config/env";
import { KaspaRpcClient } from "../kaspa/kaspaRpcClient";

export function createHealthRouter(kaspaClient: KaspaRpcClient): Router {
  const router = Router();

  router.get("/healthz", async (_req, res) => {
    if (!env.HEALTHCHECK_INCLUDE_NODE) {
      res.status(200).json({
        status: "ok",
        checks: {
          api: true
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      const nodeInfo = await kaspaClient.getServerInfo();

      res.status(200).json({
        status: "ok",
        checks: {
          api: true,
          kaspaNode: true
        },
        node: {
          networkId: nodeInfo.networkId,
          isSynced: nodeInfo.isSynced,
          hasUtxoIndex: nodeInfo.hasUtxoIndex,
          rpcApiVersion: nodeInfo.rpcApiVersion,
          rpcApiRevision: nodeInfo.rpcApiRevision
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        status: "degraded",
        checks: {
          api: true,
          kaspaNode: false
        },
        error: error instanceof Error ? error.message : "Unknown node error",
        timestamp: new Date().toISOString()
      });
    }
  });

  router.get("/readyz", async (_req, res) => {
    try {
      const nodeInfo = await kaspaClient.getServerInfo();

      const ready = nodeInfo.hasUtxoIndex;
      res.status(ready ? 200 : 503).json({
        status: ready ? "ready" : "not_ready",
        reason: ready ? undefined : "Kaspa node must run with --utxoindex for balance queries",
        node: {
          networkId: nodeInfo.networkId,
          isSynced: nodeInfo.isSynced,
          hasUtxoIndex: nodeInfo.hasUtxoIndex,
          serverVersion: nodeInfo.serverVersion,
          virtualDaaScore: nodeInfo.virtualDaaScore
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        status: "not_ready",
        reason: "Kaspa RPC unavailable",
        error: error instanceof Error ? error.message : "Unknown node error",
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}
