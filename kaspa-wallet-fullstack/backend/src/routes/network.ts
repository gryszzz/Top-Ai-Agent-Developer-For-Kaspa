import { Router } from "express";
import { env } from "../config/env";

export function createNetworkRouter(): Router {
  const router = Router();

  router.get("/network", (_req, res) => {
    res.status(200).json({
      network: env.KASPA_NETWORK,
      rpcTarget: env.KASPA_RPC_TARGET,
      allowedAddressPrefixes: env.KASPA_ALLOWED_ADDRESS_PREFIXES,
      wallets: {
        kasware: {
          injectedProvider: true,
          methods: ["requestAccounts", "signMessage", "getPublicKey"]
        },
        kaspium: {
          injectedProvider: false,
          connectMode: "manual-or-deeplink",
          uriScheme: env.KASPIUM_URI_SCHEME
        }
      },
      monetization: {
        platformFeeEnabled: env.PLATFORM_FEE_ENABLED,
        platformFeeBps: env.PLATFORM_FEE_BPS,
        platformFeeMinKas: env.PLATFORM_FEE_MIN_KAS,
        platformFeeRecipient: env.PLATFORM_FEE_RECIPIENT
      },
      timestamp: new Date().toISOString()
    });
  });

  return router;
}
