import type { Express } from "express";
import rateLimit from "express-rate-limit";
import Redis from "ioredis";
import { RedisStore } from "rate-limit-redis";
import { env } from "../config/env";
import { logger } from "../logging/logger";

export function attachRateLimiter(app: Express): void {
  if (env.REDIS_URL) {
    const redisClient = new Redis(env.REDIS_URL, {
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

    app.use(
      rateLimit({
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        limit: env.RATE_LIMIT_MAX,
        standardHeaders: true,
        legacyHeaders: false,
        store: new RedisStore({
          sendCommand: (...args: string[]) =>
            redisClient.call(args[0] ?? "", ...args.slice(1)) as Promise<number>
        }),
        handler: (_req, res) => {
          res.status(429).json({
            error: "Too many requests",
            retryAfterMs: env.RATE_LIMIT_WINDOW_MS
          });
        }
      })
    );

    return;
  }

  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, res) => {
        res.status(429).json({
          error: "Too many requests",
          retryAfterMs: env.RATE_LIMIT_WINDOW_MS
        });
      }
    })
  );
}
