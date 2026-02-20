const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
export type SessionWalletType =
  | "kasware"
  | "kastle"
  | "kaspium"
  | "kng_web"
  | "kng_mobile"
  | "ledger_kasvault"
  | "cli_wallet";

export type NetworkResponse = {
  network: string;
  rpcTarget: string;
  allowedAddressPrefixes: string[];
  effectiveAddressPrefixes?: string[];
  monetization: {
    platformFeeEnabled: boolean;
    platformFeeBps: number;
    platformFeeMinKas: string;
    platformFeeRecipient: string;
  };
  runtime?: {
    store: "redis" | "memory";
    distributed: boolean;
  };
  wallets: {
    kasware: { injectedProvider: boolean; methods: string[] };
    kastle?: { injectedProvider: boolean; methods: string[] };
    kaspium: {
      injectedProvider: boolean;
      connectMode: string;
      uriScheme: string;
      recommendedAddressPrefixes?: string[];
    };
    kngWeb?: { injectedProvider: boolean; connectMode: string; note?: string };
    kngMobile?: { injectedProvider: boolean; connectMode: string; note?: string };
    ledgerKasvault?: { injectedProvider: boolean; connectMode: string; note?: string };
    cliWallet?: { injectedProvider: boolean; connectMode: string; note?: string };
  };
  timestamp: string;
};

export type BalanceResponse = {
  address: string;
  network: string;
  balanceSompi: string;
  balanceKas: string;
  timestamp: string;
};

export type WalletChallengeResponse = {
  nonce: string;
  message: string;
  expiresAt: string;
};

export type WalletSessionResponse = {
  token: string;
  address: string;
  walletType: SessionWalletType;
  verificationMode: "signature-verified" | "signature-unverified" | "manual";
  expiresInSeconds: number;
};

export type PaymentQuoteResponse = {
  network: string;
  walletType: SessionWalletType;
  fromAddress: string;
  toAddress: string;
  pricing: {
    platformFee: {
      recipientAddress: string;
      feeBps: number;
      minFeeKas: string;
      feeSompi: string;
      feeKas: string;
      amountSompi: string;
      amountKas: string;
      totalDebitSompi: string;
      totalDebitKas: string;
      applied: boolean;
      enabled: boolean;
    };
    disclosure: string;
  };
  paymentIntents: {
    primary: {
      toAddress: string;
      amountKas: string;
      uri: string;
    };
    platformFee: {
      toAddress: string;
      amountKas: string;
      uri: string;
    } | null;
  };
  timestamp: string;
};

export type AgentRuntimeState = {
  address: string;
  network: string;
  mode: "observe" | "accumulate";
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

export type AgentStateResponse = {
  address: string;
  network: string;
  state: AgentRuntimeState | null;
  timestamp: string;
};

export type AgentMutationResponse = {
  network: string;
  state: AgentRuntimeState;
  timestamp: string;
};

export type RealtimeStatsResponse = {
  network: string;
  node: {
    networkId: string;
    rpcApiVersion: number;
    rpcApiRevision: number;
    serverVersion: string;
    hasUtxoIndex: boolean;
    isSynced: boolean;
    virtualDaaScore: string;
  } | null;
  agents: {
    tracked: number;
    running: number;
    states: AgentRuntimeState[];
  };
  rpcPool?: Array<{
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
  }>;
  error?: string;
  timestamp: string;
};

async function jsonRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = typeof payload.error === "string" ? payload.error : `HTTP ${response.status}`;
    throw new Error(message);
  }

  return (await response.json()) as T;
}

function buildDeterministicIdempotencyKey(prefix: string, parts: Array<string | number | undefined>): string {
  const sanitized = parts
    .map((value) => String(value ?? "").trim().toLowerCase())
    .filter(Boolean)
    .join(":")
    .replace(/[^a-z0-9:_.-]/g, "");

  return `${prefix}:${sanitized}`.slice(0, 128);
}

export function fetchNetwork(): Promise<NetworkResponse> {
  return jsonRequest<NetworkResponse>("/v1/network");
}

export function fetchBalance(address: string): Promise<BalanceResponse> {
  return jsonRequest<BalanceResponse>(`/v1/balance/${encodeURIComponent(address)}`);
}

export function createWalletChallenge(address: string, walletType: SessionWalletType) {
  return jsonRequest<WalletChallengeResponse>("/v1/wallet/challenge", {
    method: "POST",
    body: JSON.stringify({ address, walletType })
  });
}

export function createWalletSession(payload: {
  nonce: string;
  signature?: string;
  publicKey?: string;
}) {
  const idempotencyKey = buildDeterministicIdempotencyKey("wallet-session", [payload.nonce]);
  return jsonRequest<WalletSessionResponse>("/v1/wallet/session", {
    method: "POST",
    headers: {
      "idempotency-key": idempotencyKey
    },
    body: JSON.stringify(payload)
  });
}

export function createPaymentQuote(payload: {
  fromAddress: string;
  toAddress: string;
  amountKas: string;
  walletType: SessionWalletType;
  note?: string;
}) {
  const idempotencyKey = buildDeterministicIdempotencyKey("payment-quote", [
    payload.walletType,
    payload.fromAddress,
    payload.toAddress,
    payload.amountKas,
    payload.note || ""
  ]);
  return jsonRequest<PaymentQuoteResponse>("/v1/payments/quote", {
    method: "POST",
    headers: {
      "idempotency-key": idempotencyKey
    },
    body: JSON.stringify(payload)
  });
}

export function fetchRealtimeStats(): Promise<RealtimeStatsResponse> {
  return jsonRequest<RealtimeStatsResponse>("/v1/stats/realtime");
}

export function openRealtimeStatsStream(handlers: {
  onSnapshot: (value: RealtimeStatsResponse) => void;
  onError?: (message: string) => void;
}): () => void {
  const source = new EventSource(`${API_BASE}/v1/stats/stream`);

  source.addEventListener("snapshot", (event) => {
    try {
      const parsed = JSON.parse((event as MessageEvent).data) as RealtimeStatsResponse;
      handlers.onSnapshot(parsed);
    } catch (error) {
      handlers.onError?.(error instanceof Error ? error.message : "Failed to parse stats stream event");
    }
  });

  source.addEventListener("error", (event) => {
    const payload = (event as MessageEvent)?.data;
    if (payload) {
      handlers.onError?.(payload);
    }
  });

  return () => {
    source.close();
  };
}

export function fetchAgentState(address: string, sessionToken: string): Promise<AgentStateResponse> {
  return jsonRequest<AgentStateResponse>(`/v1/agent/state/${encodeURIComponent(address)}`, {
    headers: {
      authorization: `Bearer ${sessionToken}`
    }
  });
}

export function startAgentRuntime(payload: {
  address: string;
  mode: "observe" | "accumulate";
  intervalSeconds: number;
  sessionToken: string;
}): Promise<AgentMutationResponse> {
  const idempotencyKey = buildDeterministicIdempotencyKey("agent-start", [
    payload.address,
    payload.mode,
    payload.intervalSeconds
  ]);
  return jsonRequest<AgentMutationResponse>("/v1/agent/start", {
    method: "POST",
    headers: {
      authorization: `Bearer ${payload.sessionToken}`,
      "idempotency-key": idempotencyKey
    },
    body: JSON.stringify({
      address: payload.address,
      mode: payload.mode,
      intervalSeconds: payload.intervalSeconds
    })
  });
}

export function stopAgentRuntime(payload: { address: string; sessionToken: string }): Promise<AgentMutationResponse> {
  const idempotencyKey = buildDeterministicIdempotencyKey("agent-stop", [payload.address]);
  return jsonRequest<AgentMutationResponse>("/v1/agent/stop", {
    method: "POST",
    headers: {
      authorization: `Bearer ${payload.sessionToken}`,
      "idempotency-key": idempotencyKey
    },
    body: JSON.stringify({
      address: payload.address
    })
  });
}
