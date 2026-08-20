#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
let ok = true;
const check = (cond, message) => {
  console.log(`${cond ? "OK " : "FAIL"} ${message}`);
  if (!cond) ok = false;
};

check(pkg.dsh?.bundle?.patch === "./cordis.patch.yml", "package.json declares dsh.bundle.patch");
check(existsSync(join(root, "cordis.patch.yml")), "cordis.patch.yml exists");
const patch = readFileSync(join(root, "cordis.patch.yml"), "utf8");
check(patch.includes("disabled: true") && patch.includes("compaction-smart"), "host patch disables stock basic and inserts compaction-smart");
check(existsSync(join(root, "src", "engine.ts")), "engine source present");
const home = process.env.DSH_HOME?.trim() || join(homedir(), ".dsh");
const shipped = join(
  process.env.APPDATA || "",
  "npm",
  "node_modules",
  "@deepseek-ai",
  "dsh",
  "config",
  "agent-presets",
  "standard",
  "agent.cordis.yml",
);
if (existsSync(shipped)) {
  const yaml = readFileSync(shipped, "utf8");
  check(yaml.includes("dsh-smart-compaction"), "shipped standard preset mounts this package");
  check(!yaml.includes("name: '@deepseek-ai/dsh-compaction-basic'"), "shipped standard no longer mounts stock basic");
} else {
  console.log("WARN shipped standard preset not found");
}
const homePatch = join(home, "cordis.patch.yml");
check(existsSync(homePatch) && readFileSync(homePatch, "utf8").includes("disabled: true"), "home cordis.patch.yml disables stock basic");
check(!existsSync(homePatch) || !readFileSync(homePatch, "utf8").includes("id: compaction-smart"), "home patch does not double-insert compaction-smart");
process.exit(ok ? 0 : 1);
