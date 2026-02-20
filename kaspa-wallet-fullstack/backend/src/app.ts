import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { KaspaRpcClient } from "./kaspa/kaspaRpcClient";
import { logger } from "./logging/logger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { metricsMiddleware, metricsRegistry } from "./middleware/metrics";
import { attachRateLimiter } from "./middleware/rateLimiter";
import { createWalletAgentRuntimeService } from "./runtime/agentRuntime";
import { createAgentRouter } from "./routes/agent";
import { createBalanceRouter } from "./routes/balance";
import { createHealthRouter } from "./routes/health";
import { createNetworkRouter } from "./routes/network";
import { createPaymentsRouter } from "./routes/payments";
import { createStatsRouter } from "./routes/stats";
import { createWalletRouter } from "./routes/wallet";

export function createApp(kaspaClient: KaspaRpcClient) {
  const app = express();
  const agentRuntime = createWalletAgentRuntimeService(kaspaClient);
  app.locals.agentRuntime = agentRuntime;

  app.disable("x-powered-by");

  if (env.TRUST_PROXY) {
    app.set("trust proxy", 1);
  }

  app.use(
    pinoHttp({
      logger,
      customLogLevel: (_req, res, error) => {
        if (error || res.statusCode >= 500) {
          return "error";
        }
        if (res.statusCode >= 400) {
          return "warn";
        }
        return "info";
      }
    })
  );

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",") }));
  app.use(express.json({ limit: "64kb" }));
  app.use(metricsMiddleware);

  attachRateLimiter(app);

  app.use(createHealthRouter(kaspaClient));
  app.use("/v1/balance", createBalanceRouter(kaspaClient));
  app.use("/v1", createNetworkRouter());
  app.use("/v1", createStatsRouter(kaspaClient, agentRuntime));
  app.use("/v1/wallet", createWalletRouter());
  app.use("/v1/agent", createAgentRouter(agentRuntime));
  app.use("/v1/payments", createPaymentsRouter());

  app.get("/metrics", async (_req, res, next) => {
    try {
      res.setHeader("Content-Type", metricsRegistry.contentType);
      res.send(await metricsRegistry.metrics());
    } catch (error) {
      next(error);
    }
  });

  app.get("/", (_req, res) => {
    res.status(200).json({
      service: "kaspa-wallet-backend",
      version: "1.5.0",
      endpoints: [
        "GET /healthz",
        "GET /readyz",
        "GET /v1/network",
        "GET /v1/stats/realtime",
        "GET /v1/stats/stream",
        "GET /v1/balance/:address",
        "POST /v1/wallet/challenge",
        "POST /v1/wallet/session",
        "GET /v1/agent/state/:address",
        "POST /v1/agent/start",
        "POST /v1/agent/stop",
        "POST /v1/payments/quote",
        "GET /metrics"
      ]
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
