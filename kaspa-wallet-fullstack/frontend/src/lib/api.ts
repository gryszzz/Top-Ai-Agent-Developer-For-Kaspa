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
  return jsonRequest<WalletSessionResponse>("/v1/wallet/session", {
    method: "POST",
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
  return jsonRequest<PaymentQuoteResponse>("/v1/payments/quote", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchRealtimeStats(): Promise<RealtimeStatsResponse> {
  return jsonRequest<RealtimeStatsResponse>("/v1/stats/realtime");
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
  return jsonRequest<AgentMutationResponse>("/v1/agent/start", {
    method: "POST",
    headers: {
      authorization: `Bearer ${payload.sessionToken}`
    },
    body: JSON.stringify({
      address: payload.address,
      mode: payload.mode,
      intervalSeconds: payload.intervalSeconds
    })
  });
}

export function stopAgentRuntime(payload: { address: string; sessionToken: string }): Promise<AgentMutationResponse> {
  return jsonRequest<AgentMutationResponse>("/v1/agent/stop", {
    method: "POST",
    headers: {
      authorization: `Bearer ${payload.sessionToken}`
    },
    body: JSON.stringify({
      address: payload.address
    })
  });
}
