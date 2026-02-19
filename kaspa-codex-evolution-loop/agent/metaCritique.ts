import { Insights, SimulationResults } from "../analytics/types";

export function metaCritique(results: SimulationResults, insights: Insights): string[] {
  const critiques: string[] = [];

  if (results.blockCount < 100) {
    critiques.push("Sample size is small; confidence in conclusions is limited.");
  }

  if (!insights.proposedChanges.length) {
    critiques.push("No changes proposed; ensure thresholds are strict enough for continuous improvement.");
  }

  if (results.websocketErrors === 0 && results.parallelism > 1) {
    critiques.push("Zero websocket errors under parallel load may indicate an unrealistic simulation profile.");
  }

  return critiques;
}
