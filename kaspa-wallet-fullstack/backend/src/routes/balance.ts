import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { validateKaspaAddress } from "../kaspa/address";
import { KaspaRpcClient } from "../kaspa/kaspaRpcClient";
import { sompiToKasString } from "../kaspa/units";
import { HttpError } from "../middleware/errorHandler";

const ParamsSchema = z.object({
  address: z.string().trim().min(1)
});

export function createBalanceRouter(kaspaClient: KaspaRpcClient): Router {
  const router = Router();

  router.get("/:address", async (req, res, next) => {
    try {
      const { address } = ParamsSchema.parse(req.params);

      const validation = validateKaspaAddress(address, env.KASPA_ALLOWED_ADDRESS_PREFIXES);
      if (!validation.valid) {
        throw new HttpError(400, "Invalid Kaspa address", { reason: validation.reason });
      }

      const balanceSompi = await kaspaClient.getBalanceByAddress(address);

      res.status(200).json({
        address,
        network: env.KASPA_NETWORK,
        balanceSompi: balanceSompi.toString(),
        balanceKas: sompiToKasString(balanceSompi),
        networkPrefixesAllowed: env.KASPA_ALLOWED_ADDRESS_PREFIXES,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
