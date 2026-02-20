import type { Express, Request } from "express";
import rateLimit from "express-rate-limit";
import Redis from "ioredis";
import { RedisStore } from "rate-limit-redis";
import { env } from "../config/env";
import { logger } from "../logging/logger";

type LimitTier = "default" | "auth" | "agent" | "stats";

function normalizeAddressCandidate(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim().toLowerCase();
  return trimmed || undefined;
}

function walletScopedKey(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const bodyAddress = normalizeAddressCandidate((req.body as Record<string, unknown> | undefined)?.address);
  const paramsAddress = normalizeAddressCandidate((req.params as Record<string, string> | undefined)?.address);
  const wallet = bodyAddress || paramsAddress;
  return wallet ? `${ip}:${wallet}` : ip;
}

function buildStore(redisClient?: Redis): RedisStore | undefined {
  if (!redisClient) {
    return undefined;
  }

  return new RedisStore({
    sendCommand: (...args: string[]) =>
      redisClient.call(args[0] ?? "", ...args.slice(1)) as Promise<number>
  });
}

function createTierLimiter(options: {
  tier: LimitTier;
  limit: number;
  redisClient?: Redis;
  keyGenerator?: (req: Request) => string;
}) {
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: options.limit,
    standardHeaders: true,
    legacyHeaders: false,
    store: buildStore(options.redisClient),
    keyGenerator: options.keyGenerator,
    handler: (_req, res) => {
      res.status(429).json({
        error: "Too many requests",
        tier: options.tier,
        retryAfterMs: env.RATE_LIMIT_WINDOW_MS
      });
    }
  });
}

export function attachRateLimiter(app: Express): void {
  let redisClient: Redis | undefined;

  if (env.REDIS_URL) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: true
    });

    redisClient.on("error", (error) => {
      logger.error({ err: error }, "Redis rate-limiter connection error");
    });

    redisClient.connect().catch((error) => {
      logger.warn({ err: error }, "Redis rate-limiter unavailable, traffic controls may degrade");
    });
  }

  const defaultLimiter = createTierLimiter({
    tier: "default",
    limit: env.RATE_LIMIT_MAX,
    redisClient
  });

  const authLimiter = createTierLimiter({
    tier: "auth",
    limit: env.RATE_LIMIT_AUTH_MAX,
    redisClient,
    keyGenerator: walletScopedKey
  });

  const agentLimiter = createTierLimiter({
    tier: "agent",
    limit: env.RATE_LIMIT_AGENT_MAX,
    redisClient,
    keyGenerator: walletScopedKey
  });

  const statsLimiter = createTierLimiter({
    tier: "stats",
    limit: env.RATE_LIMIT_STATS_MAX,
    redisClient
  });

  app.use(defaultLimiter);

  app.use("/v1/wallet/challenge", authLimiter);
  app.use("/v1/wallet/session", authLimiter);

  app.use("/v1/agent/start", agentLimiter);
  app.use("/v1/agent/stop", agentLimiter);
  app.use("/v1/agent/state", agentLimiter);

  app.use("/v1/stats/realtime", statsLimiter);
  app.use("/v1/stats/stream", statsLimiter);
}
