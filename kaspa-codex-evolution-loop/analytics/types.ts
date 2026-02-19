export type SimulationResults = {
  blockCount: number;
  parallelism: number;
  users: number;
  txPerUser: number;
  p95LatencyMs: number;
  utxoLagMs: number;
  websocketErrors: number;
  transactionConflicts: number;
  failedJobs: number;
  timestamp: string;
};

export type Insights = {
  scalingRisks: string[];
  securityRisks: string[];
  uxFailures: string[];
  indexerBottlenecks: string[];
  proposedChanges: string[];
  summary: string;
};
