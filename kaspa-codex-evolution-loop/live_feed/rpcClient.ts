import { z } from "zod";

const BlockSchema = z.object({
  hash: z.string(),
  utxoLag: z.number().nonnegative(),
  websocketErrors: z.number().int().nonnegative(),
  doubleSpends: z.number().int().nonnegative(),
  latencyMs: z.number().nonnegative()
});

export type LiveBlock = z.infer<typeof BlockSchema>;

export class RpcClient {
  constructor(private readonly endpoint: string) {}

  async fetchBlocks(limit = 20): Promise<LiveBlock[]> {
    // Endpoint contract expected from a live feed adapter:
    // GET <endpoint>/v1/live/blocks?limit=<n>
    const url = `${this.endpoint.replace(/\/$/, "")}/v1/live/blocks?limit=${limit}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) {
      throw new Error(`Live block fetch failed: ${res.status} ${res.statusText}`);
    }

    const payload = await res.json();
    if (!Array.isArray(payload)) {
      throw new Error("Live block payload must be an array");
    }

    return payload.map((item) => BlockSchema.parse(item));
  }
}
