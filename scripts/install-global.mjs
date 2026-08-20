#!/usr/bin/env node
/**
 * One-shot overlay at install time. The host autonomy plugin repeats this on
 * every DSH boot and before each preset mount, so the user never picks a mode.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  dshHome,
  patchKnownPresetFiles,
  removeLeftoverSmartPreset,
  writeHomeDisablePatch,
} from "../dist/src/preset-overlay.js";

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const OURS = "dsh-smart-compaction";

function log(ok, message) {
  console.log(`${ok ? "OK " : "!! "} ${message}`);
}

function profileNames() {
  const root = join(dshHome(), "profiles");
  if (!existsSync(root)) return [];
  return readdirSync(root).filter((name) => {
    if (name === "node_modules") return false;
    const dir = join(root, name);
    try {
      return statSync(dir).isDirectory() && existsSync(join(dir, "package.json"));
    } catch {
      return false;
    }
  });
}

function githubSpec() {
  if (process.env.DSH_SMART_COMPACTION_SPEC) return process.env.DSH_SMART_COMPACTION_SPEC;
  try {
    const pkg = JSON.parse(readFileSync(join(pluginRoot, "package.json"), "utf8"));
    const url = String(pkg.repository?.url || "");
    const match = url.match(/github\.com[/:]([^/]+\/[^/.]+)/i);
    if (match) return `github:${match[1].replace(/\.git$/, "")}`;
  } catch {
    /* fall through */
  }
  return pluginRoot;
}

function profileHasPlugin(name) {
  try {
    const pkg = JSON.parse(readFileSync(join(dshHome(), "profiles", name, "package.json"), "utf8"));
    return Boolean(pkg.dependencies?.[OURS] || pkg.dsh?.profile?.bundles?.includes(OURS));
  } catch {
    return false;
  }
}

function addToProfiles() {
  if (process.env.DSH_SMART_COMPACTION_INSTALLING === "1") {
    log(true, "skip profile add (already inside plugin install)");
    return;
  }
  const profiles = profileNames();
  if (profiles.length === 0) {
    log(true, "no DSH profiles yet; overlay still applied");
    return;
  }
  const probe = spawnSync("dsh", ["--version"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (probe.error || (probe.status ?? 1) !== 0) {
    log(true, "dsh CLI not on PATH; overlay/home only");
    return;
  }
  const spec = githubSpec();
  const env = { ...process.env, DSH_SMART_COMPACTION_INSTALLING: "1" };
  for (const name of profiles) {
    if (profileHasPlugin(name)) {
      log(true, `profile ${name} already has ${OURS}`);
      continue;
    }
    const result = spawnSync("dsh", ["plugin", "--profile", name, "add", spec], {
      stdio: "inherit",
      shell: process.platform === "win32",
      env,
    });
    if ((result.status ?? 1) !== 0) log(false, `dsh plugin --profile ${name} add ${spec} failed`);
    else log(true, `profile ${name} has ${OURS}`);
  }
}

console.log(`dsh-smart-compaction: overlay under ${dshHome()}`);
if (removeLeftoverSmartPreset()) log(true, "removed leftover Smart compaction roster preset");
const stats = patchKnownPresetFiles();
log(stats.failed === 0, `overlay patched=${stats.patched} already=${stats.already} skipped=${stats.skipped} failed=${stats.failed}`);
writeHomeDisablePatch();
log(true, `home disable patch ${join(dshHome(), "cordis.patch.yml")}`);
addToProfiles();
if (stats.failed > 0) process.exit(1);
console.log("dsh-smart-compaction: keep your current agent mode. Overlay is in place.");
