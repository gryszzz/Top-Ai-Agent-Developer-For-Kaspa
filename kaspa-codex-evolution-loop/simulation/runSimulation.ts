import { spawn } from "node:child_process";
import path from "node:path";
import { env } from "../agent/config";
import { logger } from "../agent/logger";
import { SimulationResults } from "../analytics/types";

function isSimulationResults(value: unknown): value is SimulationResults {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.blockCount === "number" &&
    typeof v.parallelism === "number" &&
    typeof v.users === "number" &&
    typeof v.txPerUser === "number" &&
    typeof v.p95LatencyMs === "number" &&
    typeof v.utxoLagMs === "number" &&
    typeof v.websocketErrors === "number" &&
    typeof v.transactionConflicts === "number" &&
    typeof v.failedJobs === "number" &&
    typeof v.timestamp === "string"
  );
}

export async function runSimulation(): Promise<SimulationResults> {
  const scriptPath = path.resolve(process.cwd(), "simulation/dag_simulator.py");
  const args = [
    scriptPath,
    "--blocks",
    String(env.SIM_BLOCKS),
    "--parallelism",
    String(env.SIM_PARALLELISM),
    "--users",
    String(env.SIM_USERS),
    "--tx-per-user",
    String(env.SIM_TX_PER_USER)
  ];

  logger.info({ args }, "Starting simulation engine");

  return new Promise((resolve, reject) => {
    const child = spawn("python3", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Simulation timed out after ${env.SIM_TIMEOUT_MS}ms`));
    }, env.SIM_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("exit", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        return reject(new Error(`Simulation failed with code ${code}: ${stderr.trim()}`));
      }

      try {
        const parsed = JSON.parse(stdout.trim());
        if (!isSimulationResults(parsed)) {
          return reject(new Error("Simulation output schema invalid"));
        }
        resolve(parsed);
      } catch (error) {
        reject(new Error(`Unable to parse simulation JSON output: ${(error as Error).message}`));
      }
    });
  });
}
