export type WalletType = "kasware" | "kaspium";

type KaswareProvider = {
  requestAccounts: () => Promise<string[]>;
  getPublicKey?: () => Promise<string>;
  signMessage?: (message: string) => Promise<string | { signature?: string }>;
  signData?: (message: string) => Promise<string | { signature?: string }>;
  getNetwork?: () => Promise<string>;
};

declare global {
  interface Window {
    kasware?: KaswareProvider;
  }
}

export function hasKaswareProvider(): boolean {
  return typeof window !== "undefined" && Boolean(window.kasware);
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

export async function connectKasware(): Promise<{ address: string; publicKey?: string; network?: string }> {
  const provider = window.kasware;
  if (!provider) {
    throw new Error("Kasware extension not found");
  }

  const accounts = await provider.requestAccounts();
  const address = accounts[0];

  if (!address) {
    throw new Error("Kasware did not return an address");
  }

  const publicKey = provider.getPublicKey ? await provider.getPublicKey() : undefined;
  const network = provider.getNetwork ? await provider.getNetwork() : undefined;

  return { address, publicKey, network };
}

export async function signKaswareMessage(message: string): Promise<string> {
  const provider = window.kasware;
  if (!provider) {
    throw new Error("Kasware extension not found");
  }

  if (provider.signMessage) {
    const signed = await provider.signMessage(message);
    return extractSignature(signed);
  }

  if (provider.signData) {
    const signed = await provider.signData(message);
    return extractSignature(signed);
  }

  throw new Error("Kasware provider has no signMessage/signData method");
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
