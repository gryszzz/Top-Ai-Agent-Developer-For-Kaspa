import assert from "node:assert/strict";
import test from "node:test";
import { createWalletAgentRuntimeService } from "../runtime/agentRuntime";

test("agent runtime starts, ticks, and stops for a wallet", async () => {
  let balanceCalls = 0;

  const mockKaspaClient = {
    async getBalanceByAddress() {
      balanceCalls += 1;
      return 123_000_000n;
    },
    async getServerInfo() {
      return {
        rpcApiVersion: 1,
        rpcApiRevision: 0,
        serverVersion: "test",
        networkId: "kaspa-testnet-10",
        hasUtxoIndex: true,
        isSynced: true,
        virtualDaaScore: "42"
      };
    }
  };

  const runtime = createWalletAgentRuntimeService(mockKaspaClient as never);
  const started = await runtime.start({
    address: "kaspatest:qpv7fcvdlz6th4hqjtm9qkkms2dw0raem963x3hm8glu3kjgj7922vy69hv85",
    network: "testnet-10",
    mode: "observe",
    intervalSeconds: 5
  });

  assert.equal(started.running, true);
  assert.ok(started.lastTickAt);
  assert.equal(started.lastKnownBalanceKas, "1.23");
  assert.equal(started.lastVirtualDaaScore, "42");
  assert.ok(balanceCalls >= 1);

  const stopped = await runtime.stop(started.address);
  assert.ok(stopped);
  assert.equal(stopped?.running, false);

  await runtime.shutdown();
});
