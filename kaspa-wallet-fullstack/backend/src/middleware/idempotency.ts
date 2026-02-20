import crypto from "node:crypto";
import type { Request, RequestHandler } from "express";
import Redis from "ioredis";
import { env } from "../config/env";
import { logger } from "../logging/logger";

type CachedIdempotencyResponse = {
  fingerprint: string;
  status: number;
  body: unknown;
  createdAt: string;
};

type InflightAcquireResult = "acquired" | "in_progress" | "conflict";

interface IdempotencyStore {
  getResponse(scope: string, key: string): Promise<CachedIdempotencyResponse | null>;
  saveResponse(scope: string, key: string, value: CachedIdempotencyResponse): Promise<void>;
  acquireInflight(scope: string, key: string, fingerprint: string): Promise<InflightAcquireResult>;
  releaseInflight(scope: string, key: string): Promise<void>;
}

class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly responses = new Map<string, { expiresAt: number; value: CachedIdempotencyResponse }>();

  private readonly inflight = new Map<string, { expiresAt: number; fingerprint: string }>();

  async getResponse(scope: string, key: string): Promise<CachedIdempotencyResponse | null> {
    const cacheKey = this.responseKey(scope, key);
    const entry = this.responses.get(cacheKey);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.responses.delete(cacheKey);
      return null;
    }

    return entry.value;
  }

  async saveResponse(scope: string, key: string, value: CachedIdempotencyResponse): Promise<void> {
    this.responses.set(this.responseKey(scope, key), {
      value,
      expiresAt: Date.now() + env.IDEMPOTENCY_TTL_SECONDS * 1000
    });
  }

  async acquireInflight(scope: string, key: string, fingerprint: string): Promise<InflightAcquireResult> {
    const inflightKey = this.inflightKey(scope, key);
    const existing = this.inflight.get(inflightKey);

    if (existing && existing.expiresAt > Date.now()) {
      return existing.fingerprint === fingerprint ? "in_progress" : "conflict";
    }

    this.inflight.set(inflightKey, {
      fingerprint,
      expiresAt: Date.now() + Math.max(30, env.IDEMPOTENCY_TTL_SECONDS) * 1000
    });

    return "acquired";
  }

  async releaseInflight(scope: string, key: string): Promise<void> {
    this.inflight.delete(this.inflightKey(scope, key));
  }

  private responseKey(scope: string, key: string): string {
    return `response:${scope}:${key}`;
  }

  private inflightKey(scope: string, key: string): string {
    return `inflight:${scope}:${key}`;
  }
}

class RedisIdempotencyStore implements IdempotencyStore {
  constructor(private readonly redis: Redis) {}

  async getResponse(scope: string, key: string): Promise<CachedIdempotencyResponse | null> {
    const raw = await this.redis.get(this.responseKey(scope, key));
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as CachedIdempotencyResponse;
    } catch {
      return null;
    }
  }

  async saveResponse(scope: string, key: string, value: CachedIdempotencyResponse): Promise<void> {
    await this.redis.set(
      this.responseKey(scope, key),
      JSON.stringify(value),
      "EX",
      Math.max(30, env.IDEMPOTENCY_TTL_SECONDS)
    );
  }

  async acquireInflight(scope: string, key: string, fingerprint: string): Promise<InflightAcquireResult> {
    const inflightKey = this.inflightKey(scope, key);
    const acquired = await this.redis.set(
      inflightKey,
      fingerprint,
      "EX",
      Math.max(30, env.IDEMPOTENCY_TTL_SECONDS),
      "NX"
    );

    if (acquired === "OK") {
      return "acquired";
    }

    const current = await this.redis.get(inflightKey);
    if (!current) {
      return "acquired";
    }

    return current === fingerprint ? "in_progress" : "conflict";
  }

  async releaseInflight(scope: string, key: string): Promise<void> {
    await this.redis.del(this.inflightKey(scope, key));
  }

  private responseKey(scope: string, key: string): string {
    return `forgeos:idempotency:response:${scope}:${key}`;
  }

  private inflightKey(scope: string, key: string): string {
    return `forgeos:idempotency:inflight:${scope}:${key}`;
  }
}

let singletonStore: IdempotencyStore | null = null;

function getStore(): IdempotencyStore {
  if (singletonStore) {
    return singletonStore;
  }

  if (!env.REDIS_URL) {
    singletonStore = new InMemoryIdempotencyStore();
    return singletonStore;
  }

  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: true
  });
  redis.connect().catch((error) => {
    logger.warn({ err: error }, "Redis idempotency store failed to connect, requests may fallback to non-shared mode");
  });
  redis.on("error", (error) => {
    logger.warn({ err: error }, "Redis idempotency store error");
  });

  singletonStore = new RedisIdempotencyStore(redis);
  return singletonStore;
}

function computeFingerprint(req: Request): string {
  const payload = {
    method: req.method,
    path: req.baseUrl + req.path,
    params: req.params,
    query: req.query,
    body: req.body
  };

  const serialized = JSON.stringify(payload);
  return crypto.createHash("sha256").update(serialized).digest("hex");
}

function sanitizeIdempotencyKey(raw: string): string {
  return raw.trim().replace(/[^a-zA-Z0-9:_\-.]/g, "").slice(0, 128);
}

export function createIdempotencyMiddleware(scope: string): RequestHandler {
  const store = getStore();

  return (req, res, next) => {
    if (req.method.toUpperCase() !== "POST") {
      next();
      return;
    }

    const headerValue = req.header("idempotency-key") || req.header("x-idempotency-key");
    if (!headerValue) {
      next();
      return;
    }

    const idempotencyKey = sanitizeIdempotencyKey(headerValue);
    if (!idempotencyKey) {
      res.status(400).json({
        error: "Invalid idempotency key"
      });
      return;
    }

    const scopeKey = `${scope}:${req.baseUrl}${req.path}`;
    const fingerprint = computeFingerprint(req);

    void (async () => {
      const cached = await store.getResponse(scopeKey, idempotencyKey);
      if (cached) {
        if (cached.fingerprint !== fingerprint) {
          res.status(409).json({
            error: "Idempotency key reuse with different payload"
          });
          return;
        }

        res.setHeader("Idempotency-Replayed", "true");
        res.status(cached.status).json(cached.body);
        return;
      }

      const acquireResult = await store.acquireInflight(scopeKey, idempotencyKey, fingerprint);
      if (acquireResult !== "acquired") {
        res.status(409).json({
          error:
            acquireResult === "conflict"
              ? "Idempotency key is in-flight for a different payload"
              : "Idempotent request is already processing, retry shortly"
        });
        return;
      }

      const originalJson = res.json.bind(res);
      let responseBody: unknown = undefined;
      let responseCaptured = false;

      res.json = ((body: unknown) => {
        responseBody = body;
        responseCaptured = true;
        return originalJson(body);
      }) as typeof res.json;

      res.on("finish", () => {
        void (async () => {
          try {
            if (responseCaptured && res.statusCode < 500) {
              await store.saveResponse(scopeKey, idempotencyKey, {
                fingerprint,
                status: res.statusCode,
                body: responseBody,
                createdAt: new Date().toISOString()
              });
            }
          } finally {
            await store.releaseInflight(scopeKey, idempotencyKey);
          }
        })();
      });

      next();
    })().catch((error: unknown) => {
      next(error);
    });
  };
}
