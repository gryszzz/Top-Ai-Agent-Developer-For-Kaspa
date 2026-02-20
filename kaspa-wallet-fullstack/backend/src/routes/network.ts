import { Router } from "express";
import { env } from "../config/env";

export function createNetworkRouter(): Router {
  const router = Router();

  router.get("/network", (_req, res) => {
    res.status(200).json({
      network: env.KASPA_NETWORK,
      rpcTarget: env.KASPA_RPC_TARGET,
      allowedAddressPrefixes: env.KASPA_ALLOWED_ADDRESS_PREFIXES,
      effectiveAddressPrefixes: env.KASPA_EFFECTIVE_ADDRESS_PREFIXES,
      wallets: {
        kasware: {
          injectedProvider: true,
          methods: ["requestAccounts", "getAccounts", "getNetwork", "signMessage", "getPublicKey"]
        },
        kastle: {
          injectedProvider: true,
          methods: ["connect", "getAccount", "signMessage", "request(kas:get_network)"]
        },
        kaspium: {
          injectedProvider: false,
          connectMode: "manual-or-deeplink",
          uriScheme: env.KASPIUM_URI_SCHEME,
          recommendedAddressPrefixes: env.KASPA_EFFECTIVE_ADDRESS_PREFIXES
        },
        kngWeb: {
          injectedProvider: false,
          connectMode: "address-backed-session",
          note: "Use wallet address export for challenge/session login."
        },
        kngMobile: {
          injectedProvider: false,
          connectMode: "address-backed-session",
          note: "Use wallet address export for challenge/session login."
        },
        ledgerKasvault: {
          injectedProvider: false,
          connectMode: "address-backed-session",
          note: "Use Ledger-managed address from KASVault."
        },
        cliWallet: {
          injectedProvider: false,
          connectMode: "address-backed-session",
          note: "Use CLI-generated address for challenge/session login."
        }
      },
      monetization: {
        platformFeeEnabled: env.PLATFORM_FEE_ENABLED,
        platformFeeBps: env.PLATFORM_FEE_BPS,
        platformFeeMinKas: env.PLATFORM_FEE_MIN_KAS,
        platformFeeRecipient: env.PLATFORM_FEE_RECIPIENT
      },
      runtime: {
        store: env.REDIS_URL ? "redis" : "memory",
        distributed: Boolean(env.REDIS_URL)
      },
      timestamp: new Date().toISOString()
    });
  });

  return router;
}
