import crypto from "node:crypto";
import Redis from "ioredis";
import { env } from "../config/env";
import { logger } from "../logging/logger";

export type CachedBalance = {
  balanceSompi: string;
  cachedAt: string;
};

interface BalanceCacheStore {
  get(address: string): Promise<CachedBalance | null>;
  set(address: string, value: CachedBalance): Promise<void>;
}

class InMemoryBalanceCacheStore implements BalanceCacheStore {
  private readonly values = new Map<string, { expiresAt: number; value: CachedBalance }>();

  async get(address: string): Promise<CachedBalance | null> {
    const key = this.keyForAddress(address);
    const entry = this.values.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.values.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(address: string, value: CachedBalance): Promise<void> {
    const key = this.keyForAddress(address);
    this.values.set(key, {
      value,
      expiresAt: Date.now() + env.BALANCE_CACHE_TTL_SECONDS * 1000
    });
  }

  private keyForAddress(address: string): string {
    const normalized = address.trim().toLowerCase();
    return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 24);
  }
}

class RedisBalanceCacheStore implements BalanceCacheStore {
  constructor(private readonly redis: Redis, private readonly network: string) {}

  async get(address: string): Promise<CachedBalance | null> {
    const raw = await this.redis.get(this.keyForAddress(address));
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as CachedBalance;
    } catch {
      return null;
    }
  }

  async set(address: string, value: CachedBalance): Promise<void> {
    await this.redis.set(
      this.keyForAddress(address),
      JSON.stringify(value),
      "EX",
      Math.max(1, env.BALANCE_CACHE_TTL_SECONDS)
    );
  }

  private keyForAddress(address: string): string {
    const normalized = address.trim().toLowerCase();
    const hash = crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 24);
    return `forgeos:balance:${this.network}:${hash}`;
  }
}

let singletonCacheStore: BalanceCacheStore | null = null;

export function getBalanceCacheStore(): BalanceCacheStore {
  if (singletonCacheStore) {
    return singletonCacheStore;
  }

  if (!env.REDIS_URL || env.BALANCE_CACHE_TTL_SECONDS <= 0) {
    singletonCacheStore = new InMemoryBalanceCacheStore();
    return singletonCacheStore;
  }

  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: true
  });
  redis.connect().catch((error) => {
    logger.warn({ err: error }, "Redis balance cache failed to connect, using best-effort mode");
  });
  redis.on("error", (error) => {
    logger.warn({ err: error }, "Redis balance cache error");
  });

  singletonCacheStore = new RedisBalanceCacheStore(redis, env.KASPA_NETWORK);
  return singletonCacheStore;
}
