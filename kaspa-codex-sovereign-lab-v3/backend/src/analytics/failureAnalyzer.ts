export type ExperimentEvent = {
  type: "tx" | "fork" | "latency";
  value: number;
};

export function analyzeResults(events: ExperimentEvent[]) {
  const scalingBottlenecks: string[] = [];
  const securityRisks: string[] = [];
  const uxIssues: string[] = [];

  const forkCount = events.filter((e) => e.type === "fork").length;
  const highLatency = events.filter((e) => e.type === "latency" && e.value > 1000).length;

  if (highLatency > 0) scalingBottlenecks.push("High latency observed in experiment run");
  if (forkCount > 0) securityRisks.push("Fork conflicts observed; verify confirmation confidence rules");
  if (highLatency > 2) uxIssues.push("Realtime confirmation UX may appear stale");

  return { scalingBottlenecks, securityRisks, uxIssues };
}
