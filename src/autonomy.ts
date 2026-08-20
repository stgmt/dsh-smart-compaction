import { watch, type FSWatcher } from "node:fs";
import { dirname, join } from "node:path";
import type { Context } from "@deepseek-ai/cordis";
import {
  dshHome,
  findShippedPresetRoots,
  patchCompositionFile,
  patchKnownPresetFiles,
  removeLeftoverSmartPreset,
  writeHomeDisablePatch,
  type PatchStatus,
} from "./preset-overlay.ts";

export const name = "dsh-smart-compaction-autonomy";

type PresetRow = { id: string; path: string };

type Roster = {
  list(): Promise<PresetRow[]>;
  mount(agentCtx: unknown, id?: string): Promise<unknown>;
  copy(from: string, id: string, name?: string): Promise<void>;
  standingKeyFor(id?: string): Promise<unknown>;
  recompose(agentCtx: unknown, id: string): Promise<unknown>;
};

export type AutonomyOptions = {
  watch?: boolean;
  boot?: boolean;
};

function logStatus(ctx: Context, path: string, status: PatchStatus): void {
  if (status === "patched") ctx.logger.info("smart-compaction: overlay %s", path);
  if (status === "fail") ctx.logger.warn("smart-compaction: overlay failed %s", path);
}

async function patchRoster(ctx: Context, roster: Roster, id?: string): Promise<void> {
  const rows = await roster.list();
  const targets = id ? rows.filter((row) => row.id === id) : rows;
  const files = targets.length > 0 ? targets : rows;
  for (const row of files) logStatus(ctx, row.path, patchCompositionFile(row.path));
}

function wrapRoster(ctx: Context, roster: Roster): () => void {
  const origMount = roster.mount.bind(roster);
  const origCopy = roster.copy.bind(roster);
  const origStanding = roster.standingKeyFor.bind(roster);
  const origRecompose = roster.recompose.bind(roster);

  roster.mount = async (agentCtx, id) => {
    await patchRoster(ctx, roster, id);
    return origMount(agentCtx, id);
  };
  roster.copy = async (from, id, name) => {
    await origCopy(from, id, name);
    await patchRoster(ctx, roster, id);
  };
  roster.standingKeyFor = async (id) => {
    await patchRoster(ctx, roster, id);
    return origStanding(id);
  };
  roster.recompose = async (agentCtx, id) => {
    await patchRoster(ctx, roster, id);
    return origRecompose(agentCtx, id);
  };

  return () => {
    roster.mount = origMount;
    roster.copy = origCopy;
    roster.standingKeyFor = origStanding;
    roster.recompose = origRecompose;
  };
}

function watchRoots(ctx: Context, roots: string[]): () => void {
  const watchers: FSWatcher[] = [];
  const seen = new Set<string>();
  for (const root of roots) {
    if (seen.has(root)) continue;
    seen.add(root);
    try {
      const watcher = watch(root, { recursive: true }, (_event, filename) => {
        if (!filename) return;
        const name = filename.toString();
        if (!name.replaceAll("\\", "/").endsWith("agent.cordis.yml")) return;
        const path = join(root, name);
        logStatus(ctx, path, patchCompositionFile(path));
      });
      watcher.on("error", () => undefined);
      watchers.push(watcher);
    } catch {
      /* unwatchable root — boot/mount overlay still runs */
    }
  }
  return () => {
    for (const watcher of watchers) watcher.close();
  };
}

function uniqueDirs(paths: string[]): string[] {
  const dirs: string[] = [];
  for (const path of paths) {
    const dir = dirname(path);
    const root = dirname(dir);
    if (!dirs.includes(root)) dirs.push(root);
  }
  return dirs;
}

/**
 * Host-plane overlay. Never adds a roster preset. Rewrites every composition
 * that still mounts stock compaction-basic, including presets created later.
 */
export function apply(ctx: Context, options: AutonomyOptions = {}): void {
  if (options.boot !== false) {
    removeLeftoverSmartPreset();
    writeHomeDisablePatch();
    const boot = patchKnownPresetFiles();
    if (boot.patched > 0) ctx.logger.info("smart-compaction: overlaid %s preset file(s)", boot.patched);
    if (boot.failed > 0) ctx.logger.warn("smart-compaction: overlay failed on %s file(s)", boot.failed);
  }

  ctx.inject(["agentPresets"], (scoped) => {
    const roster = scoped.get("agentPresets") as Roster | undefined;
    if (roster === undefined) return;
    const unwrap = wrapRoster(ctx, roster);
    scoped.effect(() => unwrap, "smart-compaction.roster-hooks");
    void patchRoster(ctx, roster);
    if (options.watch === false) return;
    void roster.list().then((rows) => {
      const roots = uniqueDirs(rows.map((row) => row.path));
      for (const extra of [...findShippedPresetRoots(), join(dshHome(), ".agent-presets")]) {
        if (!roots.includes(extra)) roots.push(extra);
      }
      const stop = watchRoots(ctx, roots);
      scoped.effect(() => stop, "smart-compaction.watch");
    });
  });
}
