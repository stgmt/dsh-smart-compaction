#!/usr/bin/env node
/**
 * Make dsh-smart-compaction the compaction engine for every DSH profile and
 * every agent preset on this machine. Shipped `standard` cannot be shadowed by
 * a user preset of the same id, so this rewrites the live composition files.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const STOCK = "@deepseek-ai/dsh-compaction-basic";
const OURS = "dsh-smart-compaction";
const NAME_RE = /^([ \t]*name:[ \t]*)(['"]?)@deepseek-ai\/dsh-compaction-basic\2[ \t]*$/gm;

function dshHome() {
  return process.env.DSH_HOME?.trim() || join(homedir(), ".dsh");
}

function log(ok, message) {
  console.log(`${ok ? "OK " : "!! "} ${message}`);
}

function findShippedPresetRoots() {
  const roots = [];
  const add = (path) => {
    if (path && existsSync(path) && !roots.includes(path)) roots.push(path);
  };
  try {
    add(join(dirname(require.resolve("@deepseek-ai/dsh/package.json")), "config", "agent-presets"));
  } catch {
    /* not resolvable here */
  }
  add(join(process.env.APPDATA || "", "npm", "node_modules", "@deepseek-ai", "dsh", "config", "agent-presets"));
  add(join(dshHome(), "profiles", "node_modules", "@deepseek-ai", "dsh", "config", "agent-presets"));
  add(join(homedir(), "deepseek-harness", "apps", "cli", "config", "agent-presets"));
  return roots;
}

function collectPresetFiles() {
  const files = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      let stat;
      try {
        stat = statSync(path);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        if (name === "node_modules" || name === ".git") continue;
        walk(path);
      } else if (name === "agent.cordis.yml") {
        files.push(path);
      }
    }
  };
  for (const root of findShippedPresetRoots()) walk(root);
  walk(join(dshHome(), ".agent-presets"));
  return files;
}

function patchPresetFile(path) {
  const original = readFileSync(path, "utf8");
  if (!original.includes(STOCK)) {
    if (original.includes(`name: '${OURS}'`) || original.includes(`name: ${OURS}`) || original.includes(`name: "${OURS}"`)) {
      log(true, `already patched ${path}`);
      return "already";
    }
    log(true, `no compaction engine in ${path}`);
    return "skip";
  }
  const next = original.replace(NAME_RE, `$1$2${OURS}$2`);
  if (next === original) {
    log(false, `could not rewrite ${path}`);
    return "fail";
  }
  const bak = `${path}.dsh-smart-compaction.bak`;
  if (!existsSync(bak)) writeFileSync(bak, original);
  writeFileSync(path, next);
  log(true, `patched ${path}`);
  return "patched";
}

function writeHomePatch() {
  const path = join(dshHome(), "cordis.patch.yml");
  const ours = `# Machine-wide: never leave stock compaction-basic enabled on the host plane.
# The engine is inserted once by the dsh-smart-compaction profile bundle.
- id: compaction-basic
  disabled: true
`;
  mkdirSync(dshHome(), { recursive: true });
  if (!existsSync(path)) {
    writeFileSync(path, ours);
    log(true, `wrote ${path}`);
    return;
  }
  const existing = readFileSync(path, "utf8");
  if (existing.includes("id: compaction-basic") && existing.includes("disabled: true") && !existing.includes("id: compaction-smart")) {
    log(true, "home patch already disables stock basic");
    return;
  }
  if (existing.includes("id: compaction-smart")) {
    const bak = `${path}.dsh-smart-compaction.bak`;
    if (!existsSync(bak)) writeFileSync(bak, existing);
    writeFileSync(path, ours);
    log(true, `rewrote ${path} to disable-only (bundle inserts the engine once)`);
    return;
  }
  const bak = `${path}.dsh-smart-compaction.bak`;
  if (!existsSync(bak)) writeFileSync(bak, existing);
  const trimmed = existing.trim();
  if (trimmed === "" || trimmed === "[]") {
    writeFileSync(path, ours);
    log(true, `replaced empty ${path}`);
    return;
  }
  writeFileSync(path, `${existing.trimEnd()}\n\n${ours}`);
  log(true, `merged disable into ${path}`);
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
    log(true, "no DSH profiles yet; presets and home patch are still applied");
    return;
  }
  const probe = spawnSync("dsh", ["--version"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (probe.error || (probe.status ?? 1) !== 0) {
    log(true, "dsh CLI not on PATH; patched presets/home only");
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

console.log(`dsh-smart-compaction: installing globally under ${dshHome()}`);
const files = collectPresetFiles();
let patched = 0;
let failed = 0;
for (const file of files) {
  const status = patchPresetFile(file);
  if (status === "patched") patched += 1;
  if (status === "fail") failed += 1;
}
writeHomePatch();
addToProfiles();
if (failed > 0) process.exit(1);
console.log(`dsh-smart-compaction: ${patched} preset file(s) rewritten. Restart DSH. New sessions on standard/code/cordis now compact through ${OURS}.`);
