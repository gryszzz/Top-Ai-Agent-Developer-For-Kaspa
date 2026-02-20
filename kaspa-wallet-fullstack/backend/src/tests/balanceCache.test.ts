import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import express from "express";
import { createBalanceRouter } from "../routes/balance";
import type { KaspaRpcClient } from "../kaspa/kaspaRpcClient";

type StartedServer = {
  baseUrl: string;
  close: () => Promise<void>;
};

async function startServer(app: express.Express): Promise<StartedServer> {
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to determine test server address");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  };
}

test("balance route returns cached value on repeated request", async () => {
  let balanceCalls = 0;
  const stubClient = {
    async getBalanceByAddress(): Promise<bigint> {
      balanceCalls += 1;
      return 123456789n;
    },
    async getServerInfo() {
      throw new Error("not used in this test");
    },
    getHealthStatus() {
      return [];
    },
    shutdown() {
      return;
    }
  } as unknown as KaspaRpcClient;

  const app = express();
  app.use("/v1/balance", createBalanceRouter(stubClient));

  const started = await startServer(app);
  const address = "kaspatest:qpv7fcvdlz6th4hqjtm9qkkms2dw0raem963x3hm8glu3kjgj7922vy69hv85";

  try {
    const first = await fetch(`${started.baseUrl}/v1/balance/${encodeURIComponent(address)}`);
    const firstJson = (await first.json()) as { cached?: boolean };

    const second = await fetch(`${started.baseUrl}/v1/balance/${encodeURIComponent(address)}`);
    const secondJson = (await second.json()) as { cached?: boolean };

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(firstJson.cached, false);
    assert.equal(secondJson.cached, true);
    assert.equal(balanceCalls, 1);
  } finally {
    await started.close();
  }
});
