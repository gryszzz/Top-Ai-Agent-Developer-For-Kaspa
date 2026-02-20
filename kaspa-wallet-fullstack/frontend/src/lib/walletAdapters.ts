export type WalletType =
  | "kasware"
  | "kastle"
  | "kaspium"
  | "kng_web"
  | "kng_mobile"
  | "ledger_kasvault"
  | "cli_wallet";

export type WalletNetworkFamily = "mainnet" | "testnet" | "devnet" | "simnet" | "unknown";
export type KaswareSignMessageType = "auto" | "ecdsa" | "schnorr";

type KaswareProvider = {
  requestAccounts: () => Promise<string[]>;
  getAccounts?: () => Promise<string[]>;
  getPublicKey?: () => Promise<string>;
  signMessage?: (
    message: string,
    params?: { type?: KaswareSignMessageType; noAuxRand?: boolean } | KaswareSignMessageType
  ) => Promise<string | { signature?: string }>;
  signData?: (message: string) => Promise<string | { signature?: string }>;
  getNetwork?: () => Promise<string>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

type KastleProvider = {
  connect: () => Promise<boolean>;
  getAccount: () => Promise<{ address: string; publicKey?: string }>;
  signMessage: (message: string) => Promise<string>;
  request?: (method: string, args?: unknown) => Promise<unknown>;
};

type KaswareEventHandlers = {
  onAccountsChanged?: (accounts: string[]) => void;
  onNetworkChanged?: (network: string) => void;
};

declare global {
  interface Window {
    kasware?: KaswareProvider;
    kastle?: KastleProvider;
  }
}

export function hasKaswareProvider(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(window.kasware) &&
    typeof window.kasware?.requestAccounts === "function"
  );
}

export function getKaswareProvider(): KaswareProvider | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.kasware;
}

export function hasKastleProvider(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(window.kastle) &&
    typeof window.kastle?.connect === "function" &&
    typeof window.kastle?.getAccount === "function"
  );
}

export function getKastleProvider(): KastleProvider | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.kastle;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function toNetworkLabel(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && "network" in value) {
    const candidate = (value as { network?: unknown }).network;
    if (typeof candidate === "string") {
      return candidate;
    }
  }

  return undefined;
}

export function subscribeKaswareEvents(handlers: KaswareEventHandlers): () => void {
  const provider = getKaswareProvider();

  if (!provider || typeof provider.on !== "function") {
    return () => {};
  }

  const accountHandler = (value: unknown) => {
    handlers.onAccountsChanged?.(toStringArray(value));
  };
  const networkHandler = (value: unknown) => {
    const network = toNetworkLabel(value);
    if (network) {
      handlers.onNetworkChanged?.(network);
    }
  };

  provider.on("accountsChanged", accountHandler);
  provider.on("networkChanged", networkHandler);

  return () => {
    if (typeof provider.removeListener === "function") {
      provider.removeListener("accountsChanged", accountHandler);
      provider.removeListener("networkChanged", networkHandler);
    }
  };
}

type ConnectKaswareOptions = {
  requestPermission?: boolean;
  preferredAddress?: string;
};

export async function waitForKaswareProvider(timeoutMs = 2500, pollIntervalMs = 125): Promise<boolean> {
  if (hasKaswareProvider()) {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    if (hasKaswareProvider()) {
      return true;
    }
  }

  return false;
}

export async function waitForKastleProvider(timeoutMs = 2500, pollIntervalMs = 125): Promise<boolean> {
  if (hasKastleProvider()) {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    if (hasKastleProvider()) {
      return true;
    }
  }

  return false;
}

function normalizeNetworkLabel(value?: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

export function resolveWalletNetworkFamily(value?: string): WalletNetworkFamily {
  const normalized = normalizeNetworkLabel(value);
  if (!normalized) {
    return "unknown";
  }

  if (
    normalized === "mainnet" ||
    normalized === "livenet" ||
    normalized === "kaspa_mainnet" ||
    normalized === "kaspa"
  ) {
    return "mainnet";
  }

  if (
    normalized.includes("testnet") ||
    normalized === "kaspa_testnet" ||
    normalized === "test"
  ) {
    return "testnet";
  }

  if (normalized.includes("devnet") || normalized === "kaspa_devnet" || normalized === "dev") {
    return "devnet";
  }

  if (normalized.includes("simnet") || normalized === "kaspa_simnet" || normalized === "sim") {
    return "simnet";
  }

  return "unknown";
}

export function areNetworksCompatible(walletNetwork: string | undefined, appNetwork: string | undefined): boolean {
  const walletFamily = resolveWalletNetworkFamily(walletNetwork);
  const appFamily = resolveWalletNetworkFamily(appNetwork);

  if (walletFamily === "unknown" || appFamily === "unknown") {
    return true;
  }

  return walletFamily === appFamily;
}

function extractSignature(value: string | { signature?: string }): string {
  if (typeof value === "string") {
    return value;
  }

  if (value.signature) {
    return value.signature;
  }

  throw new Error("Wallet returned an unsupported signature response");
}

export async function connectKasware(
  options: ConnectKaswareOptions = {}
): Promise<{ address: string; publicKey?: string; network?: string }> {
  const provider = getKaswareProvider();
  if (!provider) {
    throw new Error("Kasware extension not found");
  }

  const requestPermission = options.requestPermission ?? true;
  let selectedAccounts: string[] = [];

  if (requestPermission) {
    const accounts = await provider.requestAccounts();
    selectedAccounts = accounts || [];
  } else if (provider.getAccounts) {
    const accounts = await provider.getAccounts();
    selectedAccounts = accounts || [];
  }

  if (selectedAccounts.length === 0 && provider.getAccounts) {
    const accounts = await provider.getAccounts();
    selectedAccounts = accounts || [];
  }

  if (selectedAccounts.length === 0 && !requestPermission) {
    throw new Error("Kasware account is unavailable. Reconnect from the Connect Kasware button.");
  }

  if (selectedAccounts.length === 0) {
    const accounts = await provider.requestAccounts();
    selectedAccounts = accounts || [];
  }

  const preferredAddress = options.preferredAddress?.trim().toLowerCase();
  const preferredMatch = preferredAddress
    ? selectedAccounts.find((candidate) => candidate.trim().toLowerCase() === preferredAddress)
    : undefined;
  const address = preferredMatch || selectedAccounts[0];

  if (!address) {
    throw new Error("Kasware did not return an address");
  }

  const publicKey = provider.getPublicKey ? await provider.getPublicKey() : undefined;
  const network = provider.getNetwork ? await provider.getNetwork() : undefined;

  return { address, publicKey, network };
}

export async function connectKastle(): Promise<{ address: string; publicKey?: string; network?: string }> {
  const provider = getKastleProvider();
  if (!provider) {
    throw new Error("Kastle extension not found");
  }

  const connected = await provider.connect();
  if (!connected) {
    throw new Error("Kastle connection was rejected");
  }

  const account = await provider.getAccount();
  const address = account?.address?.trim();
  if (!address) {
    throw new Error("Kastle did not return an address");
  }

  let network: string | undefined;
  if (typeof provider.request === "function") {
    const value = await provider.request("kas:get_network");
    if (typeof value === "string") {
      network = value;
    }
  }

  return {
    address,
    publicKey: account.publicKey,
    network
  };
}

export async function signKaswareMessage(message: string): Promise<string> {
  const provider = getKaswareProvider();
  if (!provider) {
    throw new Error("Kasware extension not found");
  }

  if (provider.signMessage) {
    const signed = await provider.signMessage(message, { type: "ecdsa" });
    return extractSignature(signed);
  }

  if (provider.signData) {
    const signed = await provider.signData(message);
    return extractSignature(signed);
  }

  throw new Error("Kasware provider has no signMessage/signData method");
}

export async function signKastleMessage(message: string): Promise<string> {
  const provider = getKastleProvider();
  if (!provider) {
    throw new Error("Kastle extension not found");
  }

  const signature = await provider.signMessage(message);
  if (!signature || typeof signature !== "string") {
    throw new Error("Kastle returned an invalid signature response");
  }

  return signature;
}

export function buildKaspaUri(address: string, amountKas?: string, note?: string): string {
  const uri = new URL(address);

  if (amountKas) {
    uri.searchParams.set("amount", amountKas);
  }

  if (note) {
    uri.searchParams.set("message", note);
  }

  return uri.toString();
}
