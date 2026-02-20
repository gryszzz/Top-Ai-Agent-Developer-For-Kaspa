import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { validateKaspaAddress } from "../kaspa/address";
import { getBalanceCacheStore } from "../kaspa/balanceCache";
import { KaspaRpcClient } from "../kaspa/kaspaRpcClient";
import { sompiToKasString } from "../kaspa/units";
import { HttpError } from "../middleware/errorHandler";

const ParamsSchema = z.object({
  address: z.string().trim().min(1)
});

export function createBalanceRouter(kaspaClient: KaspaRpcClient): Router {
  const router = Router();
  const balanceCache = getBalanceCacheStore();

  router.get("/:address", async (req, res, next) => {
    try {
      const { address } = ParamsSchema.parse(req.params);

      const validation = validateKaspaAddress(address, env.KASPA_EFFECTIVE_ADDRESS_PREFIXES);
      if (!validation.valid) {
        throw new HttpError(400, "Invalid Kaspa address", { reason: validation.reason });
      }

      const cachedBalance = await balanceCache.get(address);
      const balanceSompi =
        cachedBalance && env.BALANCE_CACHE_TTL_SECONDS > 0
          ? BigInt(cachedBalance.balanceSompi)
          : await kaspaClient.getBalanceByAddress(address);

      if (!cachedBalance && env.BALANCE_CACHE_TTL_SECONDS > 0) {
        await balanceCache.set(address, {
          balanceSompi: balanceSompi.toString(),
          cachedAt: new Date().toISOString()
        });
      }

      res.status(200).json({
        address,
        network: env.KASPA_NETWORK,
        balanceSompi: balanceSompi.toString(),
        balanceKas: sompiToKasString(balanceSompi),
        cached: Boolean(cachedBalance),
        networkPrefixesAllowed: env.KASPA_EFFECTIVE_ADDRESS_PREFIXES,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
