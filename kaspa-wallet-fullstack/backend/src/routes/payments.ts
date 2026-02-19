import { Router } from "express";
import { z } from "zod";
import { trackBusinessEvent } from "../analytics/events";
import { env } from "../config/env";
import { validateKaspaAddress } from "../kaspa/address";
import { HttpError } from "../middleware/errorHandler";
import { quotePlatformFee } from "../monetization/platformFee";

const PaymentQuoteInputSchema = z.object({
  fromAddress: z.string().trim().min(1),
  toAddress: z.string().trim().min(1),
  amountKas: z.string().trim().min(1),
  walletType: z.enum(["kasware", "kaspium"]).optional().default("kaspium"),
  note: z.string().trim().max(120).optional()
});

function buildKaspaUri(address: string, amountKas: string, note?: string): string {
  const uri = new URL(address);
  uri.searchParams.set("amount", amountKas);

  if (note) {
    uri.searchParams.set("message", note);
  }

  return uri.toString();
}

export function createPaymentsRouter(): Router {
  const router = Router();

  router.post("/quote", (req, res, next) => {
    try {
      const input = PaymentQuoteInputSchema.parse(req.body);
      const fromValidation = validateKaspaAddress(input.fromAddress, env.KASPA_ALLOWED_ADDRESS_PREFIXES);
      if (!fromValidation.valid) {
        throw new HttpError(400, "Invalid sender address", { reason: fromValidation.reason });
      }

      const toValidation = validateKaspaAddress(input.toAddress, env.KASPA_ALLOWED_ADDRESS_PREFIXES);
      if (!toValidation.valid) {
        throw new HttpError(400, "Invalid destination address", { reason: toValidation.reason });
      }

      const breakdown = quotePlatformFee(input.amountKas);

      const paymentIntents = {
        primary: {
          toAddress: input.toAddress,
          amountKas: breakdown.amountKas,
          uri: buildKaspaUri(input.toAddress, breakdown.amountKas, input.note)
        },
        platformFee:
          breakdown.applied && breakdown.enabled
            ? {
                toAddress: breakdown.recipientAddress,
                amountKas: breakdown.feeKas,
                uri: buildKaspaUri(breakdown.recipientAddress, breakdown.feeKas, "Platform fee")
              }
            : null
      };

      trackBusinessEvent("payment_intent_created", input.walletType, {
        network: env.KASPA_NETWORK,
        feeEnabled: breakdown.enabled,
        feeApplied: breakdown.applied
      });

      res.status(200).json({
        network: env.KASPA_NETWORK,
        walletType: input.walletType,
        fromAddress: input.fromAddress,
        toAddress: input.toAddress,
        pricing: {
          platformFee: breakdown,
          disclosure:
            "Platform fee is explicitly disclosed and configurable via backend environment variables."
        },
        paymentIntents,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
