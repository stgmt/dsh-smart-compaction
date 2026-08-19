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
check(!patch.includes("id: compaction-basic"), "host patch does not resurrect web host-plane compaction-basic");
check(existsSync(join(root, "src", "engine.ts")), "engine source present");
const home = process.env.DSH_HOME?.trim() || join(homedir(), ".dsh");
const preset = join(home, ".agent-presets", "smart", "agent.cordis.yml");
if (existsSync(preset)) {
  const yaml = readFileSync(preset, "utf8");
  check(yaml.includes("dsh-smart-compaction"), "user preset smart mounts this package");
  check(!yaml.includes("name: '@deepseek-ai/dsh-compaction-basic'"), "user preset smart no longer mounts stock basic");
} else {
  console.log("WARN user preset ~/.dsh/.agent-presets/smart not installed — run node scripts/apply-preset.mjs");
}
process.exit(ok ? 0 : 1);
