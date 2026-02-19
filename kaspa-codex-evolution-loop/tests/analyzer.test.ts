import test from "node:test";
import assert from "node:assert/strict";
import { analyzeResults } from "../analytics/analyzer";

test("analyzer reports bottlenecks when thresholds exceeded", () => {
  const insights = analyzeResults({
    blockCount: 1000,
    parallelism: 8,
    users: 2000,
    txPerUser: 30,
    p95LatencyMs: 1600,
    utxoLagMs: 800,
    websocketErrors: 120,
    transactionConflicts: 11,
    failedJobs: 5,
    timestamp: new Date().toISOString()
  });

  assert.ok(insights.indexerBottlenecks.length > 0);
  assert.ok(insights.scalingRisks.length > 0);
  assert.ok(insights.proposedChanges.length > 0);
});
