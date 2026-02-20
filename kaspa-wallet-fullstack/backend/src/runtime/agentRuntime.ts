import crypto from "node:crypto";
import Redis from "ioredis";
import { Counter, Histogram } from "prom-client";
import { env } from "../config/env";
import type { KaspaRpcClient } from "../kaspa/kaspaRpcClient";
import { sompiToKasString } from "../kaspa/units";
import { logger } from "../logging/logger";
import { metricsRegistry } from "../middleware/metrics";

export type AgentMode = "observe" | "accumulate";

export type AgentRuntimeState = {
  address: string;
  network: string;
  mode: AgentMode;
  running: boolean;
  intervalSeconds: number;
  cycles: number;
  startedAt?: string;
  lastTickAt?: string;
  lastKnownBalanceSompi?: string;
  lastKnownBalanceKas?: string;
  lastVirtualDaaScore?: string;
  nodeSynced?: boolean;
  lastError?: string;
  updatedAt: string;
};

type StartAgentInput = {
  address: string;
  network: string;
  mode: AgentMode;
  intervalSeconds: number;
};

export type WalletAgentRuntimeService = {
  get: (address: string) => Promise<AgentRuntimeState | null>;
  list: () => Promise<AgentRuntimeState[]>;
  start: (input: StartAgentInput) => Promise<AgentRuntimeState>;
  stop: (address: string) => Promise<AgentRuntimeState | null>;
  shutdown: () => Promise<void>;
};

const MIN_INTERVAL_SECONDS = 5;
const MAX_INTERVAL_SECONDS = 300;
const RECONCILE_INTERVAL_MS = 5_000;

const runtimeLockContentionTotal = new Counter({
  name: "agent_runtime_lock_contention_total",
  help: "Total lock contention events while ticking distributed wallet runtimes",
  labelNames: ["network"] as const,
  registers: [metricsRegistry]
});

const runtimeTickDurationSeconds = new Histogram({
  name: "agent_runtime_tick_duration_seconds",
  help: "Duration of runtime tick execution",
  labelNames: ["network", "result"] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [metricsRegistry]
});

const runtimeTickLagSeconds = new Histogram({
  name: "agent_runtime_tick_lag_seconds",
  help: "Lag between expected and actual runtime tick time",
  labelNames: ["network"] as const,
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10, 30],
  registers: [metricsRegistry]
});

class AsyncTaskQueue {
  private readonly pending: Array<() => Promise<void>> = [];

  private running = 0;

  constructor(private readonly maxConcurrency: number) {}

  async enqueue(task: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      const wrapped = async () => {
        this.running += 1;
        try {
          await task();
          resolve();
        } catch (error) {
          reject(error);
        } finally {
          this.running = Math.max(0, this.running - 1);
          this.drain();
        }
      };

      this.pending.push(wrapped);
      this.drain();
    });
  }

  private drain(): void {
    while (this.running < this.maxConcurrency && this.pending.length > 0) {
      const next = this.pending.shift();
      if (!next) {
        return;
      }
      void next();
    }
  }
}

function walletShardKey(address: string): string {
  const normalized = normalizeAddress(address);
  const hash = crypto.createHash("sha256").update(normalized).digest("hex");
  return `${hash.slice(0, 2)}:${hash.slice(0, 24)}`;
}

function normalizeIntervalSeconds(value: number): number {
  if (!Number.isFinite(value)) {
    return 15;
  }

  return Math.max(MIN_INTERVAL_SECONDS, Math.min(MAX_INTERVAL_SECONDS, Math.floor(value)));
}

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

function stateSort(a: AgentRuntimeState, b: AgentRuntimeState): number {
  return a.address.localeCompare(b.address);
}

class InMemoryWalletAgentRuntimeService implements WalletAgentRuntimeService {
  private readonly states = new Map<string, AgentRuntimeState>();

  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly kaspaClient: KaspaRpcClient) {}

  async get(address: string): Promise<AgentRuntimeState | null> {
    return this.states.get(normalizeAddress(address)) ?? null;
  }

  async list(): Promise<AgentRuntimeState[]> {
    return [...this.states.values()].sort(stateSort);
  }

  async start(input: StartAgentInput): Promise<AgentRuntimeState> {
    const key = normalizeAddress(input.address);
    const nowIso = new Date().toISOString();
    const intervalSeconds = normalizeIntervalSeconds(input.intervalSeconds);
    const existing = this.states.get(key);

    const state: AgentRuntimeState = {
      address: input.address.trim(),
      network: input.network.trim(),
      mode: input.mode,
      running: true,
      intervalSeconds,
      cycles: existing?.cycles ?? 0,
      startedAt: existing?.startedAt ?? nowIso,
      lastTickAt: existing?.lastTickAt,
      lastKnownBalanceSompi: existing?.lastKnownBalanceSompi,
      lastKnownBalanceKas: existing?.lastKnownBalanceKas,
      lastVirtualDaaScore: existing?.lastVirtualDaaScore,
      nodeSynced: existing?.nodeSynced,
      lastError: undefined,
      updatedAt: nowIso
    };

    this.states.set(key, state);
    this.stopTimer(key);
    this.schedule(key, intervalSeconds);
    await this.tick(key);

    return this.states.get(key) ?? state;
  }

  async stop(address: string): Promise<AgentRuntimeState | null> {
    const key = normalizeAddress(address);
    const current = this.states.get(key);
    if (!current) {
      return null;
    }

    this.stopTimer(key);
    const next: AgentRuntimeState = {
      ...current,
      running: false,
      updatedAt: new Date().toISOString()
    };
    this.states.set(key, next);
    return next;
  }

  async shutdown(): Promise<void> {
    for (const key of this.timers.keys()) {
      this.stopTimer(key);
    }
  }

  private schedule(key: string, intervalSeconds: number): void {
    const timer = setInterval(() => {
      void this.tick(key);
    }, intervalSeconds * 1000);
    timer.unref();
    this.timers.set(key, timer);
  }

  private stopTimer(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(key);
    }
  }

  private async tick(key: string): Promise<void> {
    const current = this.states.get(key);
    if (!current || !current.running) {
      return;
    }

    try {
      const [balanceSompi, serverInfo] = await Promise.all([
        this.kaspaClient.getBalanceByAddress(current.address),
        this.kaspaClient.getServerInfo()
      ]);

      const updated: AgentRuntimeState = {
        ...current,
        cycles: current.cycles + 1,
        lastTickAt: new Date().toISOString(),
        lastKnownBalanceSompi: balanceSompi.toString(),
        lastKnownBalanceKas: sompiToKasString(balanceSompi),
        lastVirtualDaaScore: serverInfo.virtualDaaScore,
        nodeSynced: serverInfo.isSynced,
        lastError: undefined,
        updatedAt: new Date().toISOString()
      };

      this.states.set(key, updated);
    } catch (error) {
      const updated: AgentRuntimeState = {
        ...current,
        lastError: error instanceof Error ? error.message : "Agent tick failed",
        updatedAt: new Date().toISOString()
      };
      this.states.set(key, updated);
    }
  }
}

class RedisWalletAgentRuntimeService implements WalletAgentRuntimeService {
  private readonly instanceId = `${process.pid}-${crypto.randomUUID()}`;

  private readonly reconcileTimer: NodeJS.Timeout;

  private readonly tickQueue = new AsyncTaskQueue(8);

  constructor(
    private readonly kaspaClient: KaspaRpcClient,
    private readonly redis: Redis,
    private readonly network: string
  ) {
    this.reconcileTimer = setInterval(() => {
      void this.reconcile();
    }, RECONCILE_INTERVAL_MS);
    this.reconcileTimer.unref();
  }

  async get(address: string): Promise<AgentRuntimeState | null> {
    const shard = walletShardKey(address);
    const raw = await this.redis.get(this.stateKeyForShard(shard));
    if (!raw) {
      return null;
    }
    return this.parseState(raw);
  }

  async list(): Promise<AgentRuntimeState[]> {
    const shards = await this.redis.smembers(this.knownSetKey());
    if (shards.length === 0) {
      return [];
    }

    const keys = shards.map((shard) => this.stateKeyForShard(shard));
    const values = await this.redis.mget(keys);

    const states: AgentRuntimeState[] = [];
    for (const value of values) {
      if (!value) {
        continue;
      }
      const parsed = this.parseState(value);
      if (parsed) {
        states.push(parsed);
      }
    }

    return states.sort(stateSort);
  }

  async start(input: StartAgentInput): Promise<AgentRuntimeState> {
    const existing = await this.get(input.address);
    const nowIso = new Date().toISOString();
    const intervalSeconds = normalizeIntervalSeconds(input.intervalSeconds);

    const next: AgentRuntimeState = {
      address: input.address.trim(),
      network: input.network.trim(),
      mode: input.mode,
      running: true,
      intervalSeconds,
      cycles: existing?.cycles ?? 0,
      startedAt: existing?.startedAt ?? nowIso,
      lastTickAt: existing?.lastTickAt,
      lastKnownBalanceSompi: existing?.lastKnownBalanceSompi,
      lastKnownBalanceKas: existing?.lastKnownBalanceKas,
      lastVirtualDaaScore: existing?.lastVirtualDaaScore,
      nodeSynced: existing?.nodeSynced,
      lastError: undefined,
      updatedAt: nowIso
    };

    const shard = walletShardKey(input.address);
    await this.redis
      .multi()
      .set(this.stateKeyForShard(shard), JSON.stringify(next))
      .sadd(this.knownSetKey(), shard)
      .sadd(this.runningSetKey(), shard)
      .exec();

    await this.tickQueue.enqueue(() => this.tickWallet(shard));
    const state = await this.get(next.address);
    return state ?? next;
  }

  async stop(address: string): Promise<AgentRuntimeState | null> {
    const current = await this.get(address);
    if (!current) {
      return null;
    }

    const shard = walletShardKey(address);
    const next: AgentRuntimeState = {
      ...current,
      running: false,
      updatedAt: new Date().toISOString()
    };

    await this.redis
      .multi()
      .set(this.stateKeyForShard(shard), JSON.stringify(next))
      .srem(this.runningSetKey(), shard)
      .exec();

    return next;
  }

  async shutdown(): Promise<void> {
    clearInterval(this.reconcileTimer);
    await this.redis.quit().catch(() => undefined);
  }

  private stateKeyForShard(shard: string): string {
    return `forgeos:agent:state:${this.network}:${shard}`;
  }

  private knownSetKey(): string {
    return `forgeos:agent:known:${this.network}`;
  }

  private runningSetKey(): string {
    return `forgeos:agent:running:${this.network}`;
  }

  private lockKeyForShard(shard: string): string {
    return `forgeos:agent:lock:${this.network}:${shard}`;
  }

  private parseState(raw: string): AgentRuntimeState | null {
    try {
      const parsed = JSON.parse(raw) as AgentRuntimeState;
      if (!parsed?.address || !parsed?.updatedAt) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private async reconcile(): Promise<void> {
    try {
      const runningShards = await this.redis.smembers(this.runningSetKey());
      if (runningShards.length === 0) {
        return;
      }

      await Promise.all(runningShards.map((shard) => this.tickQueue.enqueue(() => this.tickWallet(shard))));
    } catch (error) {
      logger.warn({ err: error }, "Redis runtime reconcile failed");
    }
  }

  private async tickWallet(shard: string): Promise<void> {
    const lockKey = this.lockKeyForShard(shard);
    const token = `${this.instanceId}:${crypto.randomUUID()}`;

    const locked = await this.redis.set(lockKey, token, "PX", 30_000, "NX");
    if (locked !== "OK") {
      runtimeLockContentionTotal.inc({ network: this.network });
      return;
    }

    const tickStartedAt = process.hrtime.bigint();

    try {
      const raw = await this.redis.get(this.stateKeyForShard(shard));
      if (!raw) {
        return;
      }

      const current = this.parseState(raw);
      if (!current || !current.running) {
        return;
      }

      const lagSeconds = this.computeTickLagSeconds(current);
      runtimeTickLagSeconds.observe({ network: this.network }, lagSeconds);

      const [balanceSompi, serverInfo] = await Promise.all([
        this.kaspaClient.getBalanceByAddress(current.address),
        this.kaspaClient.getServerInfo()
      ]);

      const updated: AgentRuntimeState = {
        ...current,
        cycles: current.cycles + 1,
        lastTickAt: new Date().toISOString(),
        lastKnownBalanceSompi: balanceSompi.toString(),
        lastKnownBalanceKas: sompiToKasString(balanceSompi),
        lastVirtualDaaScore: serverInfo.virtualDaaScore,
        nodeSynced: serverInfo.isSynced,
        lastError: undefined,
        updatedAt: new Date().toISOString()
      };

      await this.redis.set(this.stateKeyForShard(shard), JSON.stringify(updated));
      runtimeTickDurationSeconds.observe(
        { network: this.network, result: "ok" },
        Number(process.hrtime.bigint() - tickStartedAt) / 1_000_000_000
      );
    } catch (error) {
      const raw = await this.redis.get(this.stateKeyForShard(shard));
      const current = raw ? this.parseState(raw) : null;
      if (!current) {
        return;
      }

      const updated: AgentRuntimeState = {
        ...current,
        lastError: error instanceof Error ? error.message : "Agent tick failed",
        updatedAt: new Date().toISOString()
      };
      await this.redis.set(this.stateKeyForShard(shard), JSON.stringify(updated));
      runtimeTickDurationSeconds.observe(
        { network: this.network, result: "error" },
        Number(process.hrtime.bigint() - tickStartedAt) / 1_000_000_000
      );
    } finally {
      await this.releaseLock(lockKey, token);
    }
  }

  private computeTickLagSeconds(state: AgentRuntimeState): number {
    const reference = state.lastTickAt || state.startedAt;
    if (!reference) {
      return 0;
    }

    const referenceMs = Date.parse(reference);
    if (!Number.isFinite(referenceMs)) {
      return 0;
    }

    const expectedNextTickMs = referenceMs + state.intervalSeconds * 1000;
    return Math.max(0, (Date.now() - expectedNextTickMs) / 1000);
  }

  private async releaseLock(lockKey: string, token: string): Promise<void> {
    const releaseScript = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      end
      return 0
    `;
    await this.redis.eval(releaseScript, 1, lockKey, token);
  }
}

export function createWalletAgentRuntimeService(kaspaClient: KaspaRpcClient): WalletAgentRuntimeService {
  if (!env.REDIS_URL) {
    logger.warn("REDIS_URL is not set; using in-memory runtime (single-instance only)");
    return new InMemoryWalletAgentRuntimeService(kaspaClient);
  }

  const redis = new Redis(env.REDIS_URL, {
    enableReadyCheck: true,
    maxRetriesPerRequest: 3
  });
  redis.on("error", (error) => {
    logger.warn({ err: error }, "Redis runtime client error");
  });

  logger.info({ redisUrlConfigured: true }, "Using Redis-backed distributed runtime");
  return new RedisWalletAgentRuntimeService(kaspaClient, redis, env.KASPA_NETWORK);
}
