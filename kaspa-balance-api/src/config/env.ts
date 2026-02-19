import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

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
  RATE_LIMIT_MAX: intFromEnv(60).pipe(z.number().int().min(1)),
  REDIS_URL: z.string().optional(),

  KASPA_RPC_TARGET: z
    .string()
    .min(3)
    .default("127.0.0.1:16110")
    .describe("host:port of Kaspa node gRPC endpoint"),
  KASPA_RPC_TIMEOUT_MS: intFromEnv(5_000).pipe(z.number().int().min(500).max(60_000)),
  KASPA_RPC_USE_TLS: boolFromEnv,
  KASPA_RPC_CA_CERT_PATH: z.string().optional(),
  KASPA_ALLOWED_ADDRESS_PREFIXES: z.string().default("kaspa,kaspatest,kaspasim,kaspadev"),

  HEALTHCHECK_INCLUDE_NODE: boolFromEnv
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const envValues = parsed.data;

export const env = {
  ...envValues,
  KASPA_ALLOWED_ADDRESS_PREFIXES: envValues.KASPA_ALLOWED_ADDRESS_PREFIXES.split(",")
    .map((prefix) => prefix.trim().toLowerCase())
    .filter(Boolean),
  KASPA_RPC_CA_CERT_PATH: envValues.KASPA_RPC_CA_CERT_PATH
    ? path.resolve(envValues.KASPA_RPC_CA_CERT_PATH)
    : undefined
};

export type Env = typeof env;
