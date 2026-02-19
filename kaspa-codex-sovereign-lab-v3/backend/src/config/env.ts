import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const intFromEnv = (fallback: number) =>
  z.string().optional().transform((v) => {
    if (!v) return fallback;
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  });

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: intFromEnv(4100).pipe(z.number().int().min(1).max(65535)),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  CORS_ORIGIN: z.string().default("*"),
  KASPA_NETWORK: z.string().default("testnet-11"),
  KASPA_NODE_RPC: z.string().default("http://localhost:17110"),
  RATE_LIMIT_WINDOW_MS: intFromEnv(60000).pipe(z.number().int().min(1000)),
  RATE_LIMIT_MAX: intFromEnv(120).pipe(z.number().int().min(1))
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
