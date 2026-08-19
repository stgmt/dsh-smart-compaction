#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, "..");

function dshHome() {
  return process.env.DSH_HOME?.trim() || join(homedir(), ".dsh");
}

function findStandardPreset() {
  const candidates = [];
  try {
    const dshPkg = dirname(require.resolve("@deepseek-ai/dsh/package.json"));
    candidates.push(join(dshPkg, "config", "agent-presets", "standard"));
  } catch {
    /* not resolvable from this package */
  }
  candidates.push(
    join(process.env.APPDATA || "", "npm", "node_modules", "@deepseek-ai", "dsh", "config", "agent-presets", "standard"),
  );
  return candidates.find((path) => existsSync(join(path, "agent.cordis.yml")));
}

function replaceEngine(yaml) {
  return yaml.replaceAll(
    "name: '@deepseek-ai/dsh-compaction-basic'",
    "name: 'dsh-smart-compaction'",
  );
}

const source = findStandardPreset();
if (!source) {
  console.error("dsh-smart-compaction: could not find the shipped standard preset; skip apply-preset");
  process.exit(0);
}

const dest = join(dshHome(), ".agent-presets", "smart");
mkdirSync(dirname(dest), { recursive: true });
cpSync(source, dest, { recursive: true });
const composition = join(dest, "agent.cordis.yml");
const yaml = readFileSync(composition, "utf8");
const next = replaceEngine(yaml);
if (next === yaml) {
  console.error("dsh-smart-compaction: standard preset has no compaction-basic row to replace");
  process.exit(1);
}
writeFileSync(composition, next);
writeFileSync(
  join(dest, "preset.yml"),
  [
    "name: Smart compaction",
    "description: Standard coding agent with hierarchical chat-model compaction instead of stock one-shot compact.",
    "",
  ].join("\n"),
);
const stamp = join(pkgRoot, "scripts", ".applied-preset");
writeFileSync(stamp, `${dest}\n`);
console.log(`dsh-smart-compaction: wrote user preset ${dest}`);
console.log("Select the `smart` agent preset in DSH. Do not enable this engine on the host-plane compaction-basic row in the web profile.");
