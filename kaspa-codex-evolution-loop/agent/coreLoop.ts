import fs from "node:fs/promises";
import path from "node:path";
import { Counter, Gauge, Registry } from "prom-client";
import { analyzeResults } from "../analytics/analyzer";
import { storeLessons } from "../knowledge_base/store";
import { fetchLiveBlocks } from "../live_feed/multiNodeConnector";
import { env } from "./config";
import { logger } from "./logger";
import { metaCritique } from "./metaCritique";
import { proposeImprovements } from "./reasoningEngine";

const metricsRegistry = new Registry();
const iterationCounter = new Counter({
  name: "evolution_iterations_total",
  help: "Total completed evolution loop iterations",
  registers: [metricsRegistry]
});
const p95LatencyGauge = new Gauge({
  name: "evolution_simulation_p95_latency_ms",
  help: "Observed p95 API latency from latest simulation",
  registers: [metricsRegistry]
});

export async function coreLoop(): Promise<void> {
  logger.info("Starting codex evolution loop");
  const iterationId = `iteration_${new Date().toISOString().replace(/[:.]/g, "-")}`;

  const simulation = await fetchLiveBlocks();
  const insights = analyzeResults(simulation);
  const improvements = proposeImprovements(insights);
  const critiques = metaCritique(simulation, insights);
  const lessonPath = await storeLessons(iterationId, simulation, insights, improvements, critiques);

  iterationCounter.inc();
  p95LatencyGauge.set(simulation.p95LatencyMs);

  logger.info(
    { iterationId, simulation, insights, improvements, critiques, lessonPath },
    "Evolution loop iteration complete"
  );
  await fs.mkdir(path.resolve(process.cwd(), env.KNOWLEDGE_BASE_PATH), { recursive: true });
  await fs.writeFile(
    path.resolve(process.cwd(), "knowledge_base/latest_metrics.prom"),
    await metricsRegistry.metrics(),
    "utf8"
  );
}

if (require.main === module) {
  coreLoop().catch((error: Error) => {
    logger.error({ err: error }, "Evolution loop failed");
    process.exit(1);
  });
}
