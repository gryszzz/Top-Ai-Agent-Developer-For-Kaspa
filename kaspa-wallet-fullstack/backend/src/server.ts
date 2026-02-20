import http from "node:http";
import { env } from "./config/env";
import { createApp } from "./app";
import { KaspaRpcClient } from "./kaspa/kaspaRpcClient";
import { logger } from "./logging/logger";
import type { WalletAgentRuntimeService } from "./runtime/agentRuntime";

const kaspaClient = new KaspaRpcClient();
const app = createApp(kaspaClient);
const server = http.createServer(app);
const agentRuntime = app.locals.agentRuntime as WalletAgentRuntimeService | undefined;

server.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      nodeEnv: env.NODE_ENV,
      network: env.KASPA_NETWORK,
      kaspaRpcTarget: env.KASPA_RPC_TARGET,
      rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
      rateLimitMax: env.RATE_LIMIT_MAX
    },
    "Server started"
  );
});

function shutdown(signal: NodeJS.Signals): void {
  logger.info({ signal }, "Shutting down server");

  server.close(async (error) => {
    if (error) {
      logger.error({ err: error }, "Failed to close HTTP server cleanly");
      process.exit(1);
    }

    if (agentRuntime) {
      await agentRuntime.shutdown().catch((runtimeError) => {
        logger.warn({ err: runtimeError }, "Failed to shutdown agent runtime cleanly");
      });
    }

    kaspaClient.shutdown();
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
