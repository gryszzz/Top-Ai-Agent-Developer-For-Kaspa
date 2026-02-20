import crypto from "node:crypto";
import Redis from "ioredis";
import { env } from "../config/env";
import type { KaspaRpcClient } from "../kaspa/kaspaRpcClient";
import { sompiToKasString } from "../kaspa/units";
import { logger } from "../logging/logger";

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
    const raw = await this.redis.get(this.stateKey(address));
    if (!raw) {
      return null;
    }
    return this.parseState(raw);
  }

  async list(): Promise<AgentRuntimeState[]> {
    const addresses = await this.redis.smembers(this.knownSetKey());
    if (addresses.length === 0) {
      return [];
    }

    const keys = addresses.map((address) => this.stateKey(address));
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

    const normalized = normalizeAddress(input.address);
    await this.redis
      .multi()
      .set(this.stateKey(normalized), JSON.stringify(next))
      .sadd(this.knownSetKey(), normalized)
      .sadd(this.runningSetKey(), normalized)
      .exec();

    await this.tickWallet(normalized);
    const state = await this.get(normalized);
    return state ?? next;
  }

  async stop(address: string): Promise<AgentRuntimeState | null> {
    const current = await this.get(address);
    if (!current) {
      return null;
    }

    const normalized = normalizeAddress(address);
    const next: AgentRuntimeState = {
      ...current,
      running: false,
      updatedAt: new Date().toISOString()
    };

    await this.redis
      .multi()
      .set(this.stateKey(normalized), JSON.stringify(next))
      .srem(this.runningSetKey(), normalized)
      .exec();

    return next;
  }

  async shutdown(): Promise<void> {
    clearInterval(this.reconcileTimer);
    await this.redis.quit().catch(() => undefined);
  }

  private stateKey(address: string): string {
    return `forgeos:agent:state:${this.network}:${normalizeAddress(address)}`;
  }

  private knownSetKey(): string {
    return `forgeos:agent:known:${this.network}`;
  }

  private runningSetKey(): string {
    return `forgeos:agent:running:${this.network}`;
  }

  private lockKey(address: string): string {
    return `forgeos:agent:lock:${this.network}:${normalizeAddress(address)}`;
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
      const running = await this.redis.smembers(this.runningSetKey());
      if (running.length === 0) {
        return;
      }

      await Promise.all(running.map((address) => this.tickWallet(address)));
    } catch (error) {
      logger.warn({ err: error }, "Redis runtime reconcile failed");
    }
  }

  private async tickWallet(address: string): Promise<void> {
    const normalized = normalizeAddress(address);
    const lockKey = this.lockKey(normalized);
    const token = `${this.instanceId}:${crypto.randomUUID()}`;

    const locked = await this.redis.set(lockKey, token, "PX", 30_000, "NX");
    if (locked !== "OK") {
      return;
    }

    try {
      const raw = await this.redis.get(this.stateKey(normalized));
      if (!raw) {
        return;
      }

      const current = this.parseState(raw);
      if (!current || !current.running) {
        return;
      }

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

      await this.redis.set(this.stateKey(normalized), JSON.stringify(updated));
    } catch (error) {
      const raw = await this.redis.get(this.stateKey(normalized));
      const current = raw ? this.parseState(raw) : null;
      if (!current) {
        return;
      }

      const updated: AgentRuntimeState = {
        ...current,
        lastError: error instanceof Error ? error.message : "Agent tick failed",
        updatedAt: new Date().toISOString()
      };
      await this.redis.set(this.stateKey(normalized), JSON.stringify(updated));
    } finally {
      await this.releaseLock(lockKey, token);
    }
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
