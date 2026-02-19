export function proposeImprovements(analysis: {
  scalingBottlenecks: string[];
  securityRisks: string[];
  uxIssues: string[];
}): string[] {
  const improvements: string[] = [];
  if (analysis.scalingBottlenecks.length) improvements.push("Batch DAG websocket updates and shard indexer workers");
  if (analysis.securityRisks.length) improvements.push("Tighten replay protection and double-spend alerting");
  if (analysis.uxIssues.length) improvements.push("Improve confidence refresh cadence and UI state transitions");
  return improvements;
}
