import { Insights } from "../analytics/types";

export function proposeImprovements(analysis: Insights): string[] {
  const improvements = [...analysis.proposedChanges];

  if (analysis.indexerBottlenecks.length) {
    improvements.push("Add block-partitioned indexer workers with bounded lag SLO");
  }

  if (analysis.securityRisks.length) {
    improvements.push("Strengthen replay protection and signature domain separation");
  }

  if (analysis.scalingRisks.length) {
    improvements.push("Apply adaptive worker concurrency and websocket event batching");
  }

  return Array.from(new Set(improvements));
}
