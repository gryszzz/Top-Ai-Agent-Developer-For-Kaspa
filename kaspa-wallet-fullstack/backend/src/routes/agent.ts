import type { Request } from "express";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { validateKaspaAddress } from "../kaspa/address";
import { HttpError } from "../middleware/errorHandler";
import { trackBusinessEvent } from "../analytics/events";
import type { WalletAgentRuntimeService } from "../runtime/agentRuntime";

const StartSchema = z.object({
  address: z.string().trim().min(1),
  mode: z.enum(["observe", "accumulate"]).optional().default("observe"),
  intervalSeconds: z.number().int().min(5).max(300).optional().default(15)
});

const StopSchema = z.object({
  address: z.string().trim().min(1)
});

type SessionTokenPayload = {
  sub?: string;
};

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

function assertWalletAuthorization(req: Request, address: string): void {
  const token = extractBearerToken(req);
  if (!token) {
    throw new HttpError(401, "Missing wallet session token");
  }

  let payload: SessionTokenPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as SessionTokenPayload;
  } catch {
    throw new HttpError(401, "Invalid wallet session token");
  }

  if (!payload.sub || payload.sub.trim().toLowerCase() !== address.trim().toLowerCase()) {
    throw new HttpError(403, "Session token does not match wallet address");
  }
}

function assertValidWalletAddress(address: string): void {
  const validation = validateKaspaAddress(address, env.KASPA_EFFECTIVE_ADDRESS_PREFIXES);
  if (!validation.valid) {
    throw new HttpError(400, "Invalid Kaspa address", { reason: validation.reason });
  }
}

export function createAgentRouter(agentRuntime: WalletAgentRuntimeService): Router {
  const router = Router();

  router.get("/state/:address", async (req, res, next) => {
    try {
      const address = String(req.params.address || "").trim();
      assertValidWalletAddress(address);
      assertWalletAuthorization(req, address);

      const state = await agentRuntime.get(address);
      res.status(200).json({
        address,
        network: env.KASPA_NETWORK,
        state,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/start", async (req, res, next) => {
    try {
      const input = StartSchema.parse(req.body);
      assertValidWalletAddress(input.address);
      assertWalletAuthorization(req, input.address);

      const state = await agentRuntime.start({
        address: input.address,
        network: env.KASPA_NETWORK,
        mode: input.mode,
        intervalSeconds: input.intervalSeconds
      });

      trackBusinessEvent("agent_started", "unknown", {
        mode: input.mode,
        intervalSeconds: input.intervalSeconds,
        network: env.KASPA_NETWORK
      });

      res.status(200).json({
        network: env.KASPA_NETWORK,
        state,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/stop", async (req, res, next) => {
    try {
      const input = StopSchema.parse(req.body);
      assertValidWalletAddress(input.address);
      assertWalletAuthorization(req, input.address);

      const state = await agentRuntime.stop(input.address);
      if (!state) {
        throw new HttpError(404, "No runtime found for wallet");
      }

      trackBusinessEvent("agent_stopped", "unknown", {
        network: env.KASPA_NETWORK
      });

      res.status(200).json({
        network: env.KASPA_NETWORK,
        state,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
