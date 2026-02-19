import fs from "node:fs/promises";
import path from "node:path";
import { analyzeResults } from "../analytics/failureAnalyzer";
import { proposeImprovements } from "./reasoningEngine";
import { metaCritique } from "./metaCritique";
import { runStressSimulation } from "./stressSimulation";

export async function runIteration(): Promise<void> {
  const events = await runStressSimulation();
  const analysis = analyzeResults(events);
  const improvements = proposeImprovements(analysis);
  const critiques = metaCritique(improvements);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.resolve(process.cwd(), "../knowledge_base/iterations");
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `iteration_${timestamp}.json`);
  await fs.writeFile(
    outPath,
    JSON.stringify({ events, analysis, improvements, critiques, timestamp: new Date().toISOString() }, null, 2),
    "utf8"
  );
}

if (require.main === module) {
  runIteration().catch((err: Error) => {
    // eslint-disable-next-line no-console
    console.error(err.message);
    process.exit(1);
  });
}
