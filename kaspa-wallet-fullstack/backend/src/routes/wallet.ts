import crypto from "node:crypto";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { verifyAsync } from "@noble/secp256k1";
import Redis from "ioredis";
import { z } from "zod";
import { trackBusinessEvent } from "../analytics/events";
import { env } from "../config/env";
import { validateKaspaAddress } from "../kaspa/address";
import { logger } from "../logging/logger";
import { HttpError } from "../middleware/errorHandler";
import { createIdempotencyMiddleware } from "../middleware/idempotency";

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

const idempotentWalletSession = createIdempotencyMiddleware("wallet_session");

interface ChallengeStore {
  save(nonce: string, challenge: Challenge): Promise<void>;
  consume(nonce: string): Promise<Challenge | null>;
}

class InMemoryChallengeStore implements ChallengeStore {
  private readonly challenges = new Map<string, Challenge>();

  private readonly cleanupTimer: NodeJS.Timeout;

  constructor() {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [nonce, challenge] of this.challenges.entries()) {
        if (challenge.expiresAt <= now) {
          this.challenges.delete(nonce);
        }
      }
    }, 30_000);

    this.cleanupTimer.unref();
  }

  async save(nonce: string, challenge: Challenge): Promise<void> {
    this.challenges.set(nonce, challenge);
  }

  async consume(nonce: string): Promise<Challenge | null> {
    const challenge = this.challenges.get(nonce) ?? null;
    if (challenge) {
      this.challenges.delete(nonce);
    }
    return challenge;
  }
}

class RedisChallengeStore implements ChallengeStore {
  private readonly fallback = new InMemoryChallengeStore();

  constructor(private readonly redis: Redis) {}

  async save(nonce: string, challenge: Challenge): Promise<void> {
    await this.fallback.save(nonce, challenge);

    try {
      const ttlSeconds = Math.max(30, Math.ceil((challenge.expiresAt - Date.now()) / 1000));
      await this.redis.set(this.keyForNonce(nonce), JSON.stringify(challenge), "EX", ttlSeconds);
    } catch (error) {
      logger.warn(
        { err: error },
        "Redis wallet challenge store write failed; challenge is only available on local instance"
      );
    }
  }

  async consume(nonce: string): Promise<Challenge | null> {
    try {
      const result = await this.redis.call("GETDEL", this.keyForNonce(nonce));
      if (typeof result === "string" && result.length > 0) {
        return this.parseChallenge(result);
      }
    } catch (error) {
      logger.warn(
        { err: error },
        "Redis wallet challenge consume failed; falling back to local in-memory challenge store"
      );
    }

    return this.fallback.consume(nonce);
  }

  private keyForNonce(nonce: string): string {
    return `forgeos:wallet:challenge:${env.KASPA_NETWORK}:${nonce}`;
  }

  private parseChallenge(raw: string): Challenge | null {
    try {
      const parsed = JSON.parse(raw) as Challenge;
      return parsed;
    } catch {
      return null;
    }
  }
}

let challengeStoreSingleton: ChallengeStore | null = null;

function getChallengeStore(): ChallengeStore {
  if (challengeStoreSingleton) {
    return challengeStoreSingleton;
  }

  if (!env.REDIS_URL) {
    challengeStoreSingleton = new InMemoryChallengeStore();
    return challengeStoreSingleton;
  }

  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: true
  });
  redis.connect().catch((error) => {
    logger.warn({ err: error }, "Redis wallet challenge store failed to connect; using local fallback behavior");
  });
  redis.on("error", (error) => {
    logger.warn({ err: error }, "Redis wallet challenge store error");
  });

  challengeStoreSingleton = new RedisChallengeStore(redis);
  return challengeStoreSingleton;
}

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

export function createWalletRouter(): Router {
  const router = Router();
  const challengeStore = getChallengeStore();

  router.post("/challenge", async (req, res, next) => {
    try {
      const input = ChallengeInputSchema.parse(req.body);
      const validation = validateKaspaAddress(input.address, env.KASPA_EFFECTIVE_ADDRESS_PREFIXES);
      if (!validation.valid) {
        throw new HttpError(400, "Invalid Kaspa address", { reason: validation.reason });
      }

      const nonce = crypto.randomBytes(16).toString("hex");
      const expiresAt = Date.now() + env.CHALLENGE_TTL_SECONDS * 1000;
      const message = `Kaspa wallet auth\naddress:${input.address}\nnonce:${nonce}\nnetwork:${env.KASPA_NETWORK}`;

      await challengeStore.save(nonce, {
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

  router.post("/session", idempotentWalletSession, async (req, res, next) => {
    try {
      const input = SessionInputSchema.parse(req.body);
      const challenge = await challengeStore.consume(input.nonce);

      if (!challenge) {
        throw new HttpError(400, "Unknown or expired nonce");
      }

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
