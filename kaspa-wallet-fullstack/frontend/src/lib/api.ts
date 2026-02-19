const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export type NetworkResponse = {
  network: string;
  rpcTarget: string;
  allowedAddressPrefixes: string[];
  wallets: {
    kasware: { injectedProvider: boolean; methods: string[] };
    kaspium: { injectedProvider: boolean; connectMode: string; uriScheme: string };
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
  walletType: "kasware" | "kaspium";
  verificationMode: "signature-verified" | "signature-unverified" | "manual";
  expiresInSeconds: number;
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

export function createWalletChallenge(address: string, walletType: "kasware" | "kaspium") {
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
