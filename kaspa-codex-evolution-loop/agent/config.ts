import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const intFromEnv = (fallback: number) =>
  z.string().optional().transform((value) => {
    if (!value) return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  });

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  SIM_BLOCKS: intFromEnv(1000).pipe(z.number().int().min(10)),
  SIM_PARALLELISM: intFromEnv(5).pipe(z.number().int().min(1)),
  SIM_USERS: intFromEnv(500).pipe(z.number().int().min(1)),
  SIM_TX_PER_USER: intFromEnv(20).pipe(z.number().int().min(1)),
  SIM_TIMEOUT_MS: intFromEnv(120000).pipe(z.number().int().min(5000)),
  INSIGHT_THRESHOLD_UTXO_LAG: intFromEnv(250).pipe(z.number().int().min(1)),
  INSIGHT_THRESHOLD_WS_ERRORS: intFromEnv(10).pipe(z.number().int().min(0)),
  INSIGHT_THRESHOLD_P95_LATENCY: intFromEnv(750).pipe(z.number().int().min(1)),
  KNOWLEDGE_BASE_PATH: z.string().default("./knowledge_base"),
  KASPA_NETWORK: z.enum(["mainnet", "testnet-10", "testnet-11", "simnet", "devnet"]).default("testnet-11"),
  KASPA_NODE1_RPC: z.string().optional(),
  KASPA_NODE2_RPC: z.string().optional(),
  KASPA_NODE3_RPC: z.string().optional(),
  KASPA_LIVE_FEED_URL: z.string().optional()
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  KASPA_NODE_ENDPOINTS: [
    parsed.data.KASPA_NODE1_RPC,
    parsed.data.KASPA_NODE2_RPC,
    parsed.data.KASPA_NODE3_RPC
  ].filter((endpoint): endpoint is string => Boolean(endpoint && endpoint.trim()))
};
