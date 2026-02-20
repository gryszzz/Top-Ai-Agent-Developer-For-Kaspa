import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import express from "express";
import { createIdempotencyMiddleware } from "../middleware/idempotency";

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

test("idempotency middleware replays cached response for same key and payload", async () => {
  let handlerCalls = 0;
  const app = express();
  app.use(express.json());

  app.post("/v1/idempotent", createIdempotencyMiddleware("test_idempotency"), (req, res) => {
    handlerCalls += 1;
    res.status(201).json({
      ok: true,
      handlerCalls,
      payload: req.body
    });
  });

  const started = await startServer(app);

  try {
    const requestBody = { amount: "1.0", wallet: "kaspatest:qexample" };
    const headers = {
      "content-type": "application/json",
      "idempotency-key": "wallet-session-123"
    };

    const first = await fetch(`${started.baseUrl}/v1/idempotent`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody)
    });
    const firstJson = (await first.json()) as { handlerCalls: number };

    const second = await fetch(`${started.baseUrl}/v1/idempotent`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody)
    });
    const secondJson = (await second.json()) as { handlerCalls: number };

    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    assert.equal(second.headers.get("idempotency-replayed"), "true");
    assert.equal(firstJson.handlerCalls, 1);
    assert.equal(secondJson.handlerCalls, 1);
    assert.equal(handlerCalls, 1);
  } finally {
    await started.close();
  }
});

test("idempotency middleware rejects same key with different payload", async () => {
  let handlerCalls = 0;
  const app = express();
  app.use(express.json());

  app.post("/v1/idempotent", createIdempotencyMiddleware("test_idempotency_conflict"), (req, res) => {
    handlerCalls += 1;
    res.status(200).json({
      ok: true,
      handlerCalls,
      payload: req.body
    });
  });

  const started = await startServer(app);

  try {
    const headers = {
      "content-type": "application/json",
      "idempotency-key": "wallet-session-456"
    };

    const first = await fetch(`${started.baseUrl}/v1/idempotent`, {
      method: "POST",
      headers,
      body: JSON.stringify({ amount: "1.0" })
    });

    const second = await fetch(`${started.baseUrl}/v1/idempotent`, {
      method: "POST",
      headers,
      body: JSON.stringify({ amount: "2.0" })
    });
    const secondJson = (await second.json()) as { error?: string };

    assert.equal(first.status, 200);
    assert.equal(second.status, 409);
    assert.match(secondJson.error || "", /different payload/i);
    assert.equal(handlerCalls, 1);
  } finally {
    await started.close();
  }
});
