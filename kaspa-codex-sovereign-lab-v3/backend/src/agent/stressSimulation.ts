import type { ExperimentEvent } from "../analytics/failureAnalyzer";

export async function runStressSimulation(): Promise<ExperimentEvent[]> {
  const events: ExperimentEvent[] = [];
  for (let i = 0; i < 100; i += 1) {
    events.push({ type: "tx", value: Math.floor(Math.random() * 1000) });
  }

  // controlled fork and latency events
  events.push({ type: "fork", value: 1 });
  events.push({ type: "latency", value: 1200 });
  events.push({ type: "latency", value: 820 });

  return events;
}
