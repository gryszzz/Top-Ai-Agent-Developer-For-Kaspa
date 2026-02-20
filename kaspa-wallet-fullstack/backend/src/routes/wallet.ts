import crypto from "node:crypto";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { verifyAsync } from "@noble/secp256k1";
import { z } from "zod";
import { trackBusinessEvent } from "../analytics/events";
import { env } from "../config/env";
import { validateKaspaAddress } from "../kaspa/address";
import { HttpError } from "../middleware/errorHandler";

type WalletType =
  | "kasware"
  | "kastle"
  | "kaspium"
  | "kng_web"
  | "kng_mobile"
  | "ledger_kasvault"
  | "cli_wallet";

type Challenge = {
  address: string;
  walletType: WalletType;
  expiresAt: number;
  message: string;
};

const challenges = new Map<string, Challenge>();

const ChallengeInputSchema = z.object({
  address: z.string().trim().min(1),
  walletType: z.enum(["kasware", "kastle", "kaspium", "kng_web", "kng_mobile", "ledger_kasvault", "cli_wallet"])
});

const SessionInputSchema = z.object({
  nonce: z.string().min(8),
  signature: z.string().optional(),
  publicKey: z.string().optional()
});

function hexToBytes(value: string): Uint8Array {
  const normalized = value.startsWith("0x") ? value.slice(2) : value;
  return Uint8Array.from(Buffer.from(normalized, "hex"));
}

async function verifyMessageSignature(
  message: string,
  signatureHex: string,
  publicKeyHex: string
): Promise<boolean> {
  const messageBytes = Buffer.from(message, "utf8");
  const digest = crypto.createHash("sha256").update(messageBytes).digest();

  try {
    const signatureBytes = hexToBytes(signatureHex);
    const publicKeyBytes = hexToBytes(publicKeyHex);

    // Wallet providers differ on whether they sign the raw challenge message or a pre-hashed digest.
    const verifiedRaw = await verifyAsync(signatureBytes, messageBytes, publicKeyBytes);
    if (verifiedRaw) {
      return true;
    }

    return await verifyAsync(signatureBytes, digest, publicKeyBytes, { prehash: false });
  } catch {
    return false;
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [nonce, challenge] of challenges.entries()) {
    if (challenge.expiresAt <= now) {
      challenges.delete(nonce);
    }
  }
}, 30_000).unref();

export function createWalletRouter(): Router {
  const router = Router();

  router.post("/challenge", (req, res, next) => {
    try {
      const input = ChallengeInputSchema.parse(req.body);
      const validation = validateKaspaAddress(input.address, env.KASPA_EFFECTIVE_ADDRESS_PREFIXES);
      if (!validation.valid) {
        throw new HttpError(400, "Invalid Kaspa address", { reason: validation.reason });
      }

      const nonce = crypto.randomBytes(16).toString("hex");
      const expiresAt = Date.now() + env.CHALLENGE_TTL_SECONDS * 1000;
      const message = `Kaspa wallet auth\naddress:${input.address}\nnonce:${nonce}\nnetwork:${env.KASPA_NETWORK}`;

      challenges.set(nonce, {
        address: input.address,
        walletType: input.walletType,
        expiresAt,
        message
      });

      trackBusinessEvent("signup_started", input.walletType, {
        network: env.KASPA_NETWORK
      });

      res.status(201).json({
        nonce,
        message,
        expiresAt: new Date(expiresAt).toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/session", async (req, res, next) => {
    try {
      const input = SessionInputSchema.parse(req.body);
      const challenge = challenges.get(input.nonce);

      if (!challenge) {
        throw new HttpError(400, "Unknown or expired nonce");
      }

      challenges.delete(input.nonce);

      if (challenge.expiresAt <= Date.now()) {
        throw new HttpError(400, "Nonce expired");
      }

      let verified = false;
      let verificationMode: "signature-verified" | "signature-unverified" | "manual" = "manual";

      if (challenge.walletType === "kasware" || challenge.walletType === "kastle") {
        if (!input.signature) {
          throw new HttpError(400, `${challenge.walletType} session requires a signature`);
        }

        if (input.publicKey) {
          verified = await verifyMessageSignature(challenge.message, input.signature, input.publicKey);
        }

        if (!verified && !env.ALLOW_UNVERIFIED_WALLET_SIG) {
          throw new HttpError(401, "Signature verification failed");
        }

        verificationMode = verified ? "signature-verified" : "signature-unverified";
      }

      const expiresInSeconds = env.SESSION_TTL_SECONDS;
      const token = jwt.sign(
        {
          sub: challenge.address,
          walletType: challenge.walletType,
          network: env.KASPA_NETWORK,
          verificationMode
        },
        env.JWT_SECRET,
        { expiresIn: expiresInSeconds }
      );

      res.status(201).json({
        token,
        address: challenge.address,
        walletType: challenge.walletType,
        verificationMode,
        expiresInSeconds
      });

      trackBusinessEvent("activation_completed", challenge.walletType, {
        verificationMode,
        network: env.KASPA_NETWORK
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
