#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(scriptPath), "..");
const manifestPath = path.join(rootDir, "manifest.json");
const openaiPath = path.join(rootDir, "agents", "openai.yaml");
const logoPath = path.join(rootDir, "assets", "forge-os-logo.png");

const requiredTargets = ["codex", "openai", "anthropic", "cursor", "openclaw", "generic"];

function ok(msg) {
  console.log(`[ok] ${msg}`);
}

function fail(msg) {
  console.error(`[fail] ${msg}`);
  process.exitCode = 1;
}

function readFile(p) {
  return fs.readFileSync(p, "utf8");
}

function assertFile(p, label) {
  if (!fs.existsSync(p)) {
    fail(`${label} missing: ${p}`);
    return false;
  }
  const stat = fs.statSync(p);
  if (!stat.isFile() || stat.size === 0) {
    fail(`${label} is empty or not a file: ${p}`);
    return false;
  }
  ok(`${label} present: ${p}`);
  return true;
}

function parseArgs(argv) {
  const args = { all: false, target: null };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--all") args.all = true;
    if (argv[i] === "--target" && i + 1 < argv.length) args.target = argv[i + 1];
  }
  return args;
}

function validateManifest() {
  if (!assertFile(manifestPath, "manifest.json")) return null;
  let manifest;
  try {
    manifest = JSON.parse(readFile(manifestPath));
  } catch (err) {
    fail(`manifest.json parse error: ${err.message}`);
    return null;
  }

  if (!manifest.name || !manifest.version || !Array.isArray(manifest.targets)) {
    fail("manifest.json missing required keys: name, version, targets[]");
    return null;
  }

  const targetIds = manifest.targets.map((t) => t.id);
  for (const id of requiredTargets) {
    if (!targetIds.includes(id)) {
      fail(`manifest.json missing target id: ${id}`);
    }
  }
  ok("manifest.json schema looks valid");
  return manifest;
}

function validateOpenAIYaml() {
  if (!assertFile(openaiPath, "OpenAI adapter")) return;
  const content = readFile(openaiPath);
  for (const token of ["interface:", "display_name:", "default_prompt:"]) {
    if (!content.includes(token)) fail(`openai.yaml missing token: ${token}`);
  }

  const iconMatch = content.match(/icon_small:\s*["'](.+)["']/);
  if (iconMatch) {
    const p = path.resolve(path.dirname(openaiPath), iconMatch[1]);
    assertFile(p, "openai icon_small");
  } else {
    fail("openai.yaml missing icon_small path");
  }

  if (assertFile(logoPath, "Forge logo asset")) {
    ok("logo asset is present for adapters");
  }
}

function validateTarget(targetId, manifest) {
  const target = manifest.targets.find((t) => t.id === targetId);
  if (!target) {
    fail(`target not found in manifest: ${targetId}`);
    return;
  }

  const entryPath = path.join(rootDir, target.entry);
  if (!assertFile(entryPath, `target:${targetId} entry`)) return;
  const content = readFile(entryPath);

  switch (targetId) {
    case "codex":
      if (!content.includes("Required Output Contract")) {
        fail("codex skill missing 'Required Output Contract' section");
      } else {
        ok("codex skill contract found");
      }
      break;
    case "openai":
      validateOpenAIYaml();
      break;
    case "anthropic":
      if (!content.includes("System Architecture (text diagram)")) {
        fail("anthropic adapter missing required output structure");
      } else {
        ok("anthropic adapter includes output structure");
      }
      break;
    case "cursor":
      if (!content.includes("---") || !content.includes("description:")) {
        fail("cursor adapter missing frontmatter");
      } else {
        ok("cursor adapter frontmatter present");
      }
      break;
    case "openclaw":
      if (!content.includes("Required Output Structure")) {
        fail("openclaw adapter missing required output contract");
      } else {
        ok("openclaw adapter includes output contract");
      }
      break;
    case "generic":
      if (!content.includes("Every response must include")) {
        fail("generic adapter missing required response contract");
      } else {
        ok("generic adapter response contract present");
      }
      break;
    default:
      fail(`unrecognized target: ${targetId}`);
  }
}

function validateScripts() {
  const bashInstall = path.join(rootDir, "scripts", "install-codex.sh");
  const pwshInstall = path.join(rootDir, "scripts", "install-codex.ps1");
  const exportScript = path.join(rootDir, "scripts", "export-adapters.sh");

  assertFile(bashInstall, "install-codex.sh");
  assertFile(pwshInstall, "install-codex.ps1");
  assertFile(exportScript, "export-adapters.sh");
}

function main() {
  const args = parseArgs(process.argv);
  const manifest = validateManifest();
  if (!manifest) process.exit(1);

  const targets = args.all
    ? requiredTargets
    : args.target
      ? [args.target]
      : requiredTargets;

  for (const targetId of targets) {
    validateTarget(targetId, manifest);
  }
  validateScripts();

  if (process.exitCode && process.exitCode !== 0) {
    console.error("Compatibility validation failed.");
    process.exit(process.exitCode);
  }
  console.log("Compatibility validation passed.");
}

main();
