import { Router } from "express";
import { env } from "../config/env";
import { KaspaRpcClient } from "../kaspa/kaspaRpcClient";
import type { WalletAgentRuntimeService } from "../runtime/agentRuntime";

type RealtimeSnapshot = {
  network: string;
  node: {
    networkId: string;
    rpcApiVersion: number;
    rpcApiRevision: number;
    serverVersion: string;
    hasUtxoIndex: boolean;
    isSynced: boolean;
    virtualDaaScore: string;
  } | null;
  agents: {
    tracked: number;
    running: number;
    states: Awaited<ReturnType<WalletAgentRuntimeService["list"]>>;
  };
  rpcPool?: ReturnType<KaspaRpcClient["getHealthStatus"]>;
  error?: string;
  timestamp: string;
};

async function buildRealtimeSnapshot(
  kaspaClient: KaspaRpcClient,
  agentRuntime: WalletAgentRuntimeService
): Promise<RealtimeSnapshot> {
  const states = await agentRuntime.list();
  const runningAgents = states.filter((state) => state.running).length;

  try {
    const nodeInfo = await kaspaClient.getServerInfo();

    return {
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
      rpcPool: kaspaClient.getHealthStatus(),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      network: env.KASPA_NETWORK,
      node: null,
      agents: {
        tracked: states.length,
        running: runningAgents,
        states
      },
      rpcPool: kaspaClient.getHealthStatus(),
      error: error instanceof Error ? error.message : "Failed to fetch node stats",
      timestamp: new Date().toISOString()
    };
  }
}

export function createStatsRouter(kaspaClient: KaspaRpcClient, agentRuntime: WalletAgentRuntimeService): Router {
  const router = Router();

  router.get("/stats/realtime", async (_req, res) => {
    const snapshot = await buildRealtimeSnapshot(kaspaClient, agentRuntime);
    res.status(snapshot.node ? 200 : 503).json(snapshot);
  });

  router.get("/stats/stream", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    let closed = false;
    let lastFingerprint = "";
    let heartbeatCount = 0;

    const emitEvent = (event: string, payload: unknown) => {
      res.write(`event: ${event}\\n`);
      res.write(`data: ${JSON.stringify(payload)}\\n\\n`);
    };

    const publish = async (force = false) => {
      if (closed) {
        return;
      }

      const snapshot = await buildRealtimeSnapshot(kaspaClient, agentRuntime);
      const fingerprint = JSON.stringify({
        node: snapshot.node?.virtualDaaScore ?? "error",
        tracked: snapshot.agents.tracked,
        running: snapshot.agents.running,
        pool: snapshot.rpcPool?.map((endpoint) => [endpoint.target, endpoint.score, endpoint.circuitOpenUntil]) ?? []
      });

      if (force || fingerprint !== lastFingerprint) {
        lastFingerprint = fingerprint;
        heartbeatCount = 0;
        emitEvent("snapshot", snapshot);
        return;
      }

      heartbeatCount += 1;
      if (heartbeatCount >= 5) {
        heartbeatCount = 0;
        emitEvent("heartbeat", { timestamp: new Date().toISOString() });
      }
    };

    void publish(true).catch((error) => {
      emitEvent("error", { message: error instanceof Error ? error.message : "stats stream failed" });
    });

    const timer = setInterval(() => {
      void publish(false).catch((error) => {
        emitEvent("error", { message: error instanceof Error ? error.message : "stats stream failed" });
      });
    }, 2_000);
    timer.unref();

    req.on("close", () => {
      closed = true;
      clearInterval(timer);
    });
  });

  return router;
}
