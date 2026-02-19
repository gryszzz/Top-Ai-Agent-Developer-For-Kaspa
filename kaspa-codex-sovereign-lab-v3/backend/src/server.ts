import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import pino from "pino";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import routes from "./api/routes";

const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true, ignore: "pid,hostname" } }
      : undefined
});

const app = express();
app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN }));
app.use(rateLimit({ windowMs: env.RATE_LIMIT_WINDOW_MS, limit: env.RATE_LIMIT_MAX }));
app.use(express.json({ limit: "64kb" }));
app.use("/api", routes);

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, network: env.KASPA_NETWORK }, "backend started");
});
