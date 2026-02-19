import { env } from "../agent/config";
import { Insights, SimulationResults } from "./types";

export function analyzeResults(results: SimulationResults): Insights {
  const insights: Insights = {
    scalingRisks: [],
    securityRisks: [],
    uxFailures: [],
    indexerBottlenecks: [],
    proposedChanges: [],
    summary: ""
  };

  if (results.utxoLagMs > env.INSIGHT_THRESHOLD_UTXO_LAG) {
    insights.indexerBottlenecks.push(
      `UTXO indexer lag ${results.utxoLagMs}ms exceeded threshold ${env.INSIGHT_THRESHOLD_UTXO_LAG}ms`
    );
    insights.proposedChanges.push("Shard UTXO indexer workers by wallet address range");
  }

  if (results.websocketErrors > env.INSIGHT_THRESHOLD_WS_ERRORS) {
    insights.scalingRisks.push(
      `WebSocket errors ${results.websocketErrors} exceeded threshold ${env.INSIGHT_THRESHOLD_WS_ERRORS}`
    );
    insights.proposedChanges.push("Enable batched event fanout and websocket backpressure control");
  }

  if (results.p95LatencyMs > env.INSIGHT_THRESHOLD_P95_LATENCY) {
    insights.scalingRisks.push(
      `p95 latency ${results.p95LatencyMs}ms exceeded threshold ${env.INSIGHT_THRESHOLD_P95_LATENCY}ms`
    );
    insights.proposedChanges.push("Increase API worker pool and add Redis hot-key cache");
  }

  if (results.transactionConflicts > 0) {
    insights.securityRisks.push("Transaction conflict events detected; verify double-spend handling path");
    insights.proposedChanges.push("Add deterministic conflict-resolution audit logs per txid");
  }

  if (results.failedJobs > 0) {
    insights.scalingRisks.push(`${results.failedJobs} background jobs failed during simulation`);
    insights.proposedChanges.push("Tune retry policy and dead-letter queue alert thresholds");
  }

  if (results.p95LatencyMs > 1200 || results.websocketErrors > 50) {
    insights.uxFailures.push("Real-time wallet updates likely feel stale under current load");
  }

  if (!insights.proposedChanges.length) {
    insights.summary = "Simulation passed thresholds. Keep current architecture and continue monitoring.";
  } else {
    insights.summary = `Detected ${insights.proposedChanges.length} improvement opportunities from current run.`;
  }

  return insights;
}
