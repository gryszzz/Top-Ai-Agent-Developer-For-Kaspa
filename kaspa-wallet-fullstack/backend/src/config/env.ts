import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";
import { validateKaspaAddress } from "../kaspa/address";

dotenv.config();

const truthy = new Set(["1", "true", "yes", "on"]);

const boolFromEnv = z
  .string()
  .optional()
  .transform((value) => {
    if (!value) {
      return false;
    }

    return truthy.has(value.toLowerCase());
  });

const boolFromEnvDefault = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (!value) {
        return fallback;
      }

      return truthy.has(value.toLowerCase());
    });

const intFromEnv = (fallback: number) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (!value) {
        return fallback;
      }

      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : fallback;
    });

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: intFromEnv(8080).pipe(z.number().int().min(1).max(65535)),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  CORS_ORIGIN: z.string().default("*"),
  TRUST_PROXY: boolFromEnv,

  RATE_LIMIT_WINDOW_MS: intFromEnv(60_000).pipe(z.number().int().min(1000)),
  RATE_LIMIT_MAX: intFromEnv(120).pipe(z.number().int().min(1)),
  REDIS_URL: z.string().optional(),

  KASPA_RPC_TARGET: z.string().min(3).default("127.0.0.1:16210"),
  KASPA_RPC_TIMEOUT_MS: intFromEnv(5_000).pipe(z.number().int().min(500).max(60_000)),
  KASPA_RPC_USE_TLS: boolFromEnv,
  KASPA_RPC_CA_CERT_PATH: z.string().optional(),
  KASPA_ALLOWED_ADDRESS_PREFIXES: z.string().default("kaspatest,kaspa"),
  KASPA_NETWORK: z.string().default("testnet-10"),

  HEALTHCHECK_INCLUDE_NODE: boolFromEnv,

  JWT_SECRET: z.string().min(8).default("change-me-in-production"),
  SESSION_TTL_SECONDS: intFromEnv(3600).pipe(z.number().int().min(60).max(86400 * 30)),
  CHALLENGE_TTL_SECONDS: intFromEnv(300).pipe(z.number().int().min(30).max(3600)),
  ALLOW_UNVERIFIED_WALLET_SIG: boolFromEnv,
  KASPIUM_URI_SCHEME: z.string().default("kaspa"),

  PLATFORM_FEE_ENABLED: boolFromEnvDefault(true),
  PLATFORM_FEE_BPS: intFromEnv(100).pipe(z.number().int().min(0).max(10_000)),
  PLATFORM_FEE_MIN_KAS: z.string().default("0.01"),
  PLATFORM_FEE_RECIPIENT: z
    .string()
    .default("kaspatest:qpv7fcvdlz6th4hqjtm9qkkms2dw0raem963x3hm8glu3kjgj7922vy69hv85")
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const envValues = parsed.data;

function expectedPrefixesForNetwork(network: string): string[] {
  const normalized = network.trim().toLowerCase();

  if (normalized.includes("mainnet")) {
    return ["kaspa"];
  }

  if (normalized.includes("testnet")) {
    return ["kaspatest"];
  }

  if (normalized.includes("devnet")) {
    return ["kaspadev"];
  }

  if (normalized.includes("simnet")) {
    return ["kaspasim"];
  }

  return [];
}

const allowedPrefixes = envValues.KASPA_ALLOWED_ADDRESS_PREFIXES.split(",")
  .map((prefix) => prefix.trim().toLowerCase())
  .filter(Boolean);

const expectedPrefixes = expectedPrefixesForNetwork(envValues.KASPA_NETWORK);
const strictPrefixes =
  expectedPrefixes.length > 0
    ? allowedPrefixes.filter((prefix) => expectedPrefixes.includes(prefix))
    : allowedPrefixes;
const effectivePrefixes = strictPrefixes.length > 0 ? strictPrefixes : allowedPrefixes;

export const env = {
  ...envValues,
  KASPA_ALLOWED_ADDRESS_PREFIXES: allowedPrefixes,
  KASPA_EFFECTIVE_ADDRESS_PREFIXES: effectivePrefixes,
  KASPA_RPC_CA_CERT_PATH: envValues.KASPA_RPC_CA_CERT_PATH
    ? path.resolve(envValues.KASPA_RPC_CA_CERT_PATH)
    : undefined
};

const feeRecipientValidation = validateKaspaAddress(
  env.PLATFORM_FEE_RECIPIENT,
  env.KASPA_EFFECTIVE_ADDRESS_PREFIXES
);

if (!feeRecipientValidation.valid) {
  // eslint-disable-next-line no-console
  console.error("Invalid PLATFORM_FEE_RECIPIENT", feeRecipientValidation.reason);
  process.exit(1);
}

export type Env = typeof env;
