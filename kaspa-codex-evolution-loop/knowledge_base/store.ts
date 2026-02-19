import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../agent/config";
import { Insights, SimulationResults } from "../analytics/types";

export async function storeLessons(
  iterationId: string,
  liveBlocks: SimulationResults,
  analysis: Insights,
  improvements: string[],
  critiques: string[]
): Promise<string> {
  const base = path.resolve(process.cwd(), env.KNOWLEDGE_BASE_PATH, "iterations");
  await fs.mkdir(base, { recursive: true });

  const filePath = path.join(base, `${iterationId}.md`);
  const content = [
    `# Iteration ${iterationId}`,
    "",
    "## Live Blocks Summary",
    "```json",
    JSON.stringify(liveBlocks, null, 2),
    "```",
    "",
    "## Analysis",
    "```json",
    JSON.stringify(analysis, null, 2),
    "```",
    "",
    "## Proposed Improvements",
    ...improvements.map((item) => `- ${item}`),
    "",
    "## Meta Critique",
    ...(critiques.length ? critiques.map((item) => `- ${item}`) : ["- No critique findings"]),
    ""
  ].join("\n");

  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}
