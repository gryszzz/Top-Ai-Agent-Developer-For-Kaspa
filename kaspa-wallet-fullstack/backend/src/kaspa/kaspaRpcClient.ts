import fs from "node:fs";
import path from "node:path";
import * as grpc from "@grpc/grpc-js";
import type { ChannelCredentials, ClientDuplexStream, ServiceError } from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { env } from "../config/env";
import { logger } from "../logging/logger";

type RpcErrorPayload = {
  message?: string;
};

type RpcResponseEnvelope = {
  id?: string | number;
  getBalanceByAddressResponse?: {
    balance?: string | number;
    error?: RpcErrorPayload | null;
  };
  getServerInfoResponse?: {
    rpcApiVersion?: number;
    rpcApiRevision?: number;
    serverVersion?: string;
    networkId?: string;
    hasUtxoIndex?: boolean;
    isSynced?: boolean;
    virtualDaaScore?: string | number;
    error?: RpcErrorPayload | null;
  };
};

type RpcRequestEnvelope = {
  id: number;
  getBalanceByAddressRequest?: {
    address: string;
  };
  getServerInfoRequest?: Record<string, never>;
};

type RpcServiceClient = grpc.Client & {
  MessageStream(): ClientDuplexStream<RpcRequestEnvelope, RpcResponseEnvelope>;
};

export type NodeInfo = {
  rpcApiVersion: number;
  rpcApiRevision: number;
  serverVersion: string;
  networkId: string;
  hasUtxoIndex: boolean;
  isSynced: boolean;
  virtualDaaScore: string;
};

export type RpcEndpointHealth = {
  target: string;
  score: number;
  inflight: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  totalRequests: number;
  circuitOpenUntil?: string;
  lastError?: string;
  lastFailureAt?: string;
  lastSuccessAt?: string;
};

class KaspaRpcRequestError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = "KaspaRpcRequestError";
    this.statusCode = statusCode;
  }
}

const PROTO_PATH = path.resolve(process.cwd(), "proto/kaspad.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  keepCase: false
});

const loadedDefinition = grpc.loadPackageDefinition(packageDefinition) as unknown as {
  protowire: {
    RPC: new (address: string, credentials: ChannelCredentials) => RpcServiceClient;
  };
};

function buildCredentials(): ChannelCredentials {
  if (!env.KASPA_RPC_USE_TLS) {
    return grpc.credentials.createInsecure();
  }

  const rootCert = env.KASPA_RPC_CA_CERT_PATH ? fs.readFileSync(env.KASPA_RPC_CA_CERT_PATH) : undefined;

  return grpc.credentials.createSsl(rootCert);
}

function toErrorMessage(error: ServiceError | Error): string {
  if ("details" in error && error.details) {
    return error.details;
  }

  return error.message;
}

class KaspaRpcEndpointClient {
  private readonly client: RpcServiceClient;

  private requestCounter = 1;

  constructor(private readonly target: string) {
    this.client = new loadedDefinition.protowire.RPC(target, buildCredentials());
  }

  async getBalanceByAddress(address: string): Promise<bigint> {
    const response = await this.call("getBalanceByAddressRequest", { address }, "getBalanceByAddressResponse");

    if (response.error?.message) {
      throw new KaspaRpcRequestError(response.error.message, 502);
    }

    const balanceRaw = response.balance ?? "0";

    try {
      return BigInt(balanceRaw);
    } catch {
      throw new KaspaRpcRequestError("Kaspa node returned malformed balance", 502);
    }
  }

  async getServerInfo(): Promise<NodeInfo> {
    const response = await this.call("getServerInfoRequest", {}, "getServerInfoResponse");

    if (response.error?.message) {
      throw new KaspaRpcRequestError(response.error.message, 502);
    }

    return {
      rpcApiVersion: response.rpcApiVersion ?? 0,
      rpcApiRevision: response.rpcApiRevision ?? 0,
      serverVersion: response.serverVersion ?? "unknown",
      networkId: response.networkId ?? "unknown",
      hasUtxoIndex: Boolean(response.hasUtxoIndex),
      isSynced: Boolean(response.isSynced),
      virtualDaaScore: String(response.virtualDaaScore ?? "0")
    };
  }

  shutdown(): void {
    this.client.close();
  }

  private nextId(): number {
    this.requestCounter += 1;
    if (this.requestCounter > Number.MAX_SAFE_INTEGER - 1) {
      this.requestCounter = 1;
    }
    return this.requestCounter;
  }

  private call<
    RequestField extends keyof RpcRequestEnvelope,
    ResponseField extends keyof RpcResponseEnvelope
  >(
    requestField: RequestField,
    payload: NonNullable<RpcRequestEnvelope[RequestField]>,
    responseField: ResponseField
  ): Promise<NonNullable<RpcResponseEnvelope[ResponseField]>> {
    const requestId = this.nextId();

    return new Promise((resolve, reject) => {
      const stream = this.client.MessageStream();
      let settled = false;

      const timeout = setTimeout(() => {
        if (settled) {
          return;
        }

        settled = true;
        stream.cancel();
        reject(new KaspaRpcRequestError("Timed out while waiting for Kaspa RPC response", 504));
      }, env.KASPA_RPC_TIMEOUT_MS);

      const cleanup = () => {
        clearTimeout(timeout);
        stream.removeAllListeners();
      };

      stream.on("data", (message: RpcResponseEnvelope) => {
        if (settled) {
          return;
        }

        if (Number(message.id) !== requestId) {
          return;
        }

        const payloadResponse = message[responseField];
        if (!payloadResponse) {
          settled = true;
          cleanup();
          stream.end();
          reject(new KaspaRpcRequestError(`Kaspa RPC response missing ${String(responseField)}`, 502));
          return;
        }

        settled = true;
        cleanup();
        stream.end();
        resolve(payloadResponse as NonNullable<RpcResponseEnvelope[ResponseField]>);
      });

      stream.on("error", (error: ServiceError) => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();

        logger.error({ err: error, target: this.target }, "Kaspa RPC stream failed");
        reject(new KaspaRpcRequestError(toErrorMessage(error), 502));
      });

      stream.on("end", () => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        reject(new KaspaRpcRequestError("Kaspa RPC stream ended before response", 502));
      });

      const requestEnvelope: RpcRequestEnvelope = {
        id: requestId,
        [requestField]: payload
      };

      stream.write(requestEnvelope);
    });
  }
}

type EndpointState = {
  target: string;
  client: KaspaRpcEndpointClient;
  score: number;
  inflight: number;
  totalRequests: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  circuitOpenUntilMs: number;
  lastError?: string;
  lastFailureAt?: string;
  lastSuccessAt?: string;
};

export class KaspaRpcClient {
  private readonly endpoints: EndpointState[];

  constructor() {
    this.endpoints = env.KASPA_RPC_TARGETS.map((target) => ({
      target,
      client: new KaspaRpcEndpointClient(target),
      score: 100,
      inflight: 0,
      totalRequests: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      circuitOpenUntilMs: 0
    }));

    logger.info(
      {
        rpcTargets: this.endpoints.map((endpoint) => endpoint.target),
        maxAttempts: env.KASPA_RPC_MAX_ATTEMPTS,
        circuitBreakerFailureThreshold: env.KASPA_RPC_CIRCUIT_BREAKER_FAILURE_THRESHOLD,
        circuitBreakerCooldownMs: env.KASPA_RPC_CIRCUIT_BREAKER_COOLDOWN_MS
      },
      "Kaspa RPC client pool initialized"
    );
  }

  async getBalanceByAddress(address: string): Promise<bigint> {
    return this.withFailover((endpoint) => endpoint.client.getBalanceByAddress(address));
  }

  async getServerInfo(): Promise<NodeInfo> {
    return this.withFailover((endpoint) => endpoint.client.getServerInfo());
  }

  getHealthStatus(): RpcEndpointHealth[] {
    const now = Date.now();

    return this.endpoints.map((endpoint) => ({
      target: endpoint.target,
      score: endpoint.score,
      inflight: endpoint.inflight,
      totalRequests: endpoint.totalRequests,
      consecutiveFailures: endpoint.consecutiveFailures,
      consecutiveSuccesses: endpoint.consecutiveSuccesses,
      circuitOpenUntil:
        endpoint.circuitOpenUntilMs > now ? new Date(endpoint.circuitOpenUntilMs).toISOString() : undefined,
      lastError: endpoint.lastError,
      lastFailureAt: endpoint.lastFailureAt,
      lastSuccessAt: endpoint.lastSuccessAt
    }));
  }

  shutdown(): void {
    for (const endpoint of this.endpoints) {
      endpoint.client.shutdown();
    }
  }

  private async withFailover<T>(operation: (endpoint: EndpointState) => Promise<T>): Promise<T> {
    const now = Date.now();
    const openCandidates = this.endpoints
      .filter((endpoint) => endpoint.circuitOpenUntilMs <= now)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        if (left.inflight !== right.inflight) {
          return left.inflight - right.inflight;
        }

        return left.consecutiveFailures - right.consecutiveFailures;
      });

    const fallbackCandidates = this.endpoints
      .filter((endpoint) => endpoint.circuitOpenUntilMs > now)
      .sort((left, right) => left.circuitOpenUntilMs - right.circuitOpenUntilMs);

    const ordered = [...openCandidates, ...fallbackCandidates];
    if (ordered.length === 0) {
      throw new KaspaRpcRequestError("No Kaspa RPC endpoints configured", 503);
    }

    const attempts = Math.min(env.KASPA_RPC_MAX_ATTEMPTS, ordered.length);
    let lastError: unknown = null;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const endpoint = ordered[attempt];
      endpoint.inflight += 1;
      endpoint.totalRequests += 1;

      try {
        const result = await operation(endpoint);
        this.markSuccess(endpoint);
        return result;
      } catch (error) {
        lastError = error;
        this.markFailure(endpoint, error);
      } finally {
        endpoint.inflight = Math.max(0, endpoint.inflight - 1);
      }
    }

    throw this.toPoolError(lastError);
  }

  private markSuccess(endpoint: EndpointState): void {
    endpoint.score = Math.min(200, endpoint.score + 5);
    endpoint.consecutiveFailures = 0;
    endpoint.consecutiveSuccesses += 1;
    endpoint.lastError = undefined;
    endpoint.lastSuccessAt = new Date().toISOString();
    if (endpoint.circuitOpenUntilMs > 0 && endpoint.circuitOpenUntilMs <= Date.now()) {
      endpoint.circuitOpenUntilMs = 0;
    }
  }

  private markFailure(endpoint: EndpointState, error: unknown): void {
    endpoint.score = Math.max(0, endpoint.score - 20);
    endpoint.consecutiveFailures += 1;
    endpoint.consecutiveSuccesses = 0;
    endpoint.lastError = error instanceof Error ? error.message : "RPC request failed";
    endpoint.lastFailureAt = new Date().toISOString();

    if (endpoint.consecutiveFailures >= env.KASPA_RPC_CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
      endpoint.circuitOpenUntilMs = Date.now() + env.KASPA_RPC_CIRCUIT_BREAKER_COOLDOWN_MS;
      endpoint.consecutiveFailures = 0;
      logger.warn(
        {
          target: endpoint.target,
          score: endpoint.score,
          circuitOpenUntil: new Date(endpoint.circuitOpenUntilMs).toISOString(),
          error: endpoint.lastError
        },
        "Kaspa RPC endpoint circuit opened"
      );
      return;
    }

    logger.warn(
      {
        target: endpoint.target,
        score: endpoint.score,
        consecutiveFailures: endpoint.consecutiveFailures,
        error: endpoint.lastError
      },
      "Kaspa RPC endpoint request failed"
    );
  }

  private toPoolError(error: unknown): KaspaRpcRequestError {
    if (error instanceof KaspaRpcRequestError) {
      return error;
    }

    if (error instanceof Error) {
      return new KaspaRpcRequestError(error.message, 502);
    }

    return new KaspaRpcRequestError("Kaspa RPC request failed across all endpoints", 502);
  }
}

export { KaspaRpcRequestError };
