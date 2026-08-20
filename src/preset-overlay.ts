import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const STOCK_ENGINE = "@deepseek-ai/dsh-compaction-basic";
export const OURS_ENGINE = "dsh-smart-compaction";
export const COMPOSITION_FILE = "agent.cordis.yml";
export const LEFTOVER_PRESET_ID = "smart";
export const LEFTOVER_PRESET_NAME = "Smart compaction";
export const LEFTOVER_PRESET_DESC = "hierarchical chat-model compaction";

const STOCK_NAME_RE =
  /^([ \t]*name:[ \t]*)(['"]?)@deepseek-ai\/dsh-compaction-basic\2[ \t]*\r?$/gm;

export type PatchStatus = "patched" | "already" | "skip" | "fail";

export function dshHome(env: NodeJS.ProcessEnv = process.env): string {
  return env.DSH_HOME?.trim() || join(homedir(), ".dsh");
}

export function rewriteComposition(text: string): { next: string; changed: boolean } {
  STOCK_NAME_RE.lastIndex = 0;
  const next = text.replace(STOCK_NAME_RE, `$1$2${OURS_ENGINE}$2`);
  return { next, changed: next !== text };
}

export function compositionHasOurs(text: string): boolean {
  return (
    text.includes(`name: '${OURS_ENGINE}'`) ||
    text.includes(`name: "${OURS_ENGINE}"`) ||
    text.includes(`name: ${OURS_ENGINE}`)
  );
}

export function compositionHasStock(text: string): boolean {
  return text.includes(STOCK_ENGINE);
}

export function patchCompositionFile(path: string): PatchStatus {
  if (!existsSync(path)) return "skip";
  let original: string;
  try {
    original = readFileSync(path, "utf8");
  } catch {
    return "fail";
  }
  if (!compositionHasStock(original)) {
    return compositionHasOurs(original) ? "already" : "skip";
  }
  const { next, changed } = rewriteComposition(original);
  if (!changed) return "fail";
  const bak = `${path}.dsh-smart-compaction.bak`;
  try {
    if (!existsSync(bak)) writeFileSync(bak, original);
    writeFileSync(path, next);
  } catch {
    return "fail";
  }
  if (compositionHasStock(readFileSync(path, "utf8"))) return "fail";
  return "patched";
}

function walkCompositionFiles(dir: string, into: string[]): void {
  if (!existsSync(dir)) return;
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    const path = join(dir, name);
    let stat;
    try {
      stat = statSync(path);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      if (name === "node_modules" || name === ".git") continue;
      walkCompositionFiles(path, into);
    } else if (name === COMPOSITION_FILE) {
      into.push(path);
    }
  }
}

export function findShippedPresetRoots(env: NodeJS.ProcessEnv = process.env): string[] {
  const roots: string[] = [];
  const add = (path: string | undefined) => {
    if (path && existsSync(path) && !roots.includes(path)) roots.push(path);
  };
  try {
    const require = createRequire(import.meta.url);
    add(join(dirname(require.resolve("@deepseek-ai/dsh/package.json")), "config", "agent-presets"));
  } catch {
    /* not resolvable from this process */
  }
  add(join(env.APPDATA || "", "npm", "node_modules", "@deepseek-ai", "dsh", "config", "agent-presets"));
  add(join(dshHome(env), "profiles", "node_modules", "@deepseek-ai", "dsh", "config", "agent-presets"));
  add(join(homedir(), "deepseek-harness", "apps", "cli", "config", "agent-presets"));
  return roots;
}

export function collectCompositionFiles(env: NodeJS.ProcessEnv = process.env): string[] {
  const files: string[] = [];
  for (const root of findShippedPresetRoots(env)) walkCompositionFiles(root, files);
  walkCompositionFiles(join(dshHome(env), ".agent-presets"), files);
  return files;
}

export function patchCompositionFiles(files: readonly string[]): {
  patched: number;
  already: number;
  skipped: number;
  failed: number;
} {
  const stats = { patched: 0, already: 0, skipped: 0, failed: 0 };
  for (const file of files) {
    const status = patchCompositionFile(file);
    if (status === "patched") stats.patched += 1;
    else if (status === "already") stats.already += 1;
    else if (status === "fail") stats.failed += 1;
    else stats.skipped += 1;
  }
  return stats;
}

export function patchKnownPresetFiles(env: NodeJS.ProcessEnv = process.env) {
  return patchCompositionFiles(collectCompositionFiles(env));
}

export function isLeftoverSmartPresetDir(dir: string): boolean {
  const meta = join(dir, "preset.yml");
  if (!existsSync(meta)) return false;
  let text: string;
  try {
    text = readFileSync(meta, "utf8");
  } catch {
    return false;
  }
  return text.includes(`name: ${LEFTOVER_PRESET_NAME}`) && text.includes(LEFTOVER_PRESET_DESC);
}

export function removeLeftoverSmartPreset(env: NodeJS.ProcessEnv = process.env): boolean {
  const dir = join(dshHome(env), ".agent-presets", LEFTOVER_PRESET_ID);
  if (!existsSync(dir) || !isLeftoverSmartPresetDir(dir)) return false;
  rmSync(dir, { recursive: true, force: true });
  return !existsSync(dir);
}

export function writeHomeDisablePatch(env: NodeJS.ProcessEnv = process.env): void {
  const path = join(dshHome(env), "cordis.patch.yml");
  const ours = `# Machine-wide: never leave stock compaction-basic enabled on the host plane.
# The engine is not a host row. Autonomy rewrites each preset isolate group.
- id: compaction-basic
  disabled: true
`;
  mkdirSync(dshHome(env), { recursive: true });
  if (!existsSync(path)) {
    writeFileSync(path, ours);
    return;
  }
  const existing = readFileSync(path, "utf8");
  if (existing.includes("id: compaction-smart")) {
    const bak = `${path}.dsh-smart-compaction.bak`;
    if (!existsSync(bak)) writeFileSync(bak, existing);
    writeFileSync(path, ours);
    return;
  }
  if (existing.includes("id: compaction-basic") && existing.includes("disabled: true")) return;
  const bak = `${path}.dsh-smart-compaction.bak`;
  if (!existsSync(bak)) writeFileSync(bak, existing);
  const trimmed = existing.trim();
  if (trimmed === "" || trimmed === "[]") {
    writeFileSync(path, ours);
    return;
  }
  writeFileSync(path, `${existing.trimEnd()}\n\n${ours}`);
}
