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

  const rootCert = env.KASPA_RPC_CA_CERT_PATH
    ? fs.readFileSync(env.KASPA_RPC_CA_CERT_PATH)
    : undefined;

  return grpc.credentials.createSsl(rootCert);
}

function toErrorMessage(error: ServiceError | Error): string {
  if ("details" in error && error.details) {
    return error.details;
  }

  return error.message;
}

export class KaspaRpcClient {
  private readonly client: RpcServiceClient;

  private requestCounter = 1;

  constructor() {
    this.client = new loadedDefinition.protowire.RPC(env.KASPA_RPC_TARGET, buildCredentials());
  }

  async getBalanceByAddress(address: string): Promise<bigint> {
    const response = await this.call(
      "getBalanceByAddressRequest",
      { address },
      "getBalanceByAddressResponse"
    );

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
    const response = await this.call(
      "getServerInfoRequest",
      {},
      "getServerInfoResponse"
    );

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

        logger.error({ err: error, target: env.KASPA_RPC_TARGET }, "Kaspa RPC stream failed");
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

export { KaspaRpcRequestError };
