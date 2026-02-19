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
      timestamp: new Date().toISOString()
    });
  });

  return router;
}
