import { describe, expect, it } from "vitest";
import {
  areNetworksCompatible,
  buildKaspaUri,
  connectKastle,
  connectKasware,
  signKastleMessage,
  resolveWalletNetworkFamily
} from "../src/lib/walletAdapters";

describe("buildKaspaUri", () => {
  it("builds a URI with amount and note", () => {
    const result = buildKaspaUri("kaspatest:qpv7fcvdlz6th4hqjtm9qkkms2dw0raem963x3hm8glu3kjgj7922vy69hv85", "1.25", "hello");
    expect(result).toContain("kaspatest:");
    expect(result).toContain("amount=1.25");
    expect(result).toContain("message=hello");
  });
});

describe("resolveWalletNetworkFamily", () => {
  it("maps Kasware labels to a comparable family", () => {
    expect(resolveWalletNetworkFamily("kaspa_mainnet")).toBe("mainnet");
    expect(resolveWalletNetworkFamily("kaspa_testnet")).toBe("testnet");
    expect(resolveWalletNetworkFamily("testnet-10")).toBe("testnet");
    expect(resolveWalletNetworkFamily("kaspa_devnet")).toBe("devnet");
    expect(resolveWalletNetworkFamily("unknown-network")).toBe("unknown");
  });
});

describe("areNetworksCompatible", () => {
  it("accepts matching network families and rejects mismatches", () => {
    expect(areNetworksCompatible("kaspa_testnet", "testnet-10")).toBe(true);
    expect(areNetworksCompatible("kaspa_mainnet", "testnet-10")).toBe(false);
    expect(areNetworksCompatible(undefined, "testnet-10")).toBe(true);
  });
});

describe("connectKasware", () => {
  it("uses passive account read when requestPermission=false", async () => {
    const originalWindow = globalThis.window;
    let requestCalls = 0;
    let getAccountsCalls = 0;

    const provider = {
      requestAccounts: async () => {
        requestCalls += 1;
        return ["kaspatest:requestaccount"];
      },
      getAccounts: async () => {
        getAccountsCalls += 1;
        return ["kaspatest:passiveaccount"];
      },
      getPublicKey: async () => "abcd",
      getNetwork: async () => "kaspa_testnet"
    };

    try {
      globalThis.window = { kasware: provider } as unknown as Window & typeof globalThis;

      const result = await connectKasware({ requestPermission: false });
      expect(result.address).toBe("kaspatest:passiveaccount");
      expect(requestCalls).toBe(0);
      expect(getAccountsCalls).toBeGreaterThan(0);
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it("prefers the requested account when available", async () => {
    const originalWindow = globalThis.window;

    const provider = {
      requestAccounts: async () => ["kaspatest:first", "kaspatest:second"],
      getAccounts: async () => ["kaspatest:first", "kaspatest:second"],
      getPublicKey: async () => "abcd",
      getNetwork: async () => "kaspa_testnet"
    };

    try {
      globalThis.window = { kasware: provider } as unknown as Window & typeof globalThis;

      const result = await connectKasware({
        requestPermission: false,
        preferredAddress: "kaspatest:second"
      });
      expect(result.address).toBe("kaspatest:second");
    } finally {
      globalThis.window = originalWindow;
    }
  });
});

describe("connectKastle", () => {
  it("connects and resolves address/public key/network", async () => {
    const originalWindow = globalThis.window;

    const provider = {
      connect: async () => true,
      getAccount: async () => ({
        address: "kaspatest:kastleaccount",
        publicKey: "abcd"
      }),
      request: async (method: string) => (method === "kas:get_network" ? "kaspa_testnet" : null),
      signMessage: async () => "signature"
    };

    try {
      globalThis.window = { kastle: provider } as unknown as Window & typeof globalThis;
      const result = await connectKastle();
      expect(result.address).toBe("kaspatest:kastleaccount");
      expect(result.publicKey).toBe("abcd");
      expect(result.network).toBe("kaspa_testnet");
    } finally {
      globalThis.window = originalWindow;
    }
  });
});

describe("signKastleMessage", () => {
  it("returns string signature from provider", async () => {
    const originalWindow = globalThis.window;

    const provider = {
      connect: async () => true,
      getAccount: async () => ({
        address: "kaspatest:kastleaccount"
      }),
      signMessage: async () => "signed-message",
      request: async () => "kaspa_testnet"
    };

    try {
      globalThis.window = { kastle: provider } as unknown as Window & typeof globalThis;
      const signature = await signKastleMessage("hello");
      expect(signature).toBe("signed-message");
    } finally {
      globalThis.window = originalWindow;
    }
  });
});
