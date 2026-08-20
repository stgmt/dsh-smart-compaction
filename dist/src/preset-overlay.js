import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
export const STOCK_ENGINE = "@deepseek-ai/dsh-compaction-basic";
export const OURS_ENGINE = "dsh-smart-compaction";
export const COMPOSITION_FILE = "agent.cordis.yml";
export const LEFTOVER_PRESET_ID = "smart";
export const LEFTOVER_PRESET_NAME = "Smart compaction";
export const LEFTOVER_PRESET_DESC = "hierarchical chat-model compaction";
const STOCK_NAME_RE = /^([ \t]*name:[ \t]*)(['"]?)@deepseek-ai\/dsh-compaction-basic\2[ \t]*\r?$/gm;
export function dshHome(env = process.env) {
    return env.DSH_HOME?.trim() || join(homedir(), ".dsh");
}
export function rewriteComposition(text) {
    STOCK_NAME_RE.lastIndex = 0;
    const next = text.replace(STOCK_NAME_RE, `$1$2${OURS_ENGINE}$2`);
    return { next, changed: next !== text };
}
export function compositionHasOurs(text) {
    return (text.includes(`name: '${OURS_ENGINE}'`) ||
        text.includes(`name: "${OURS_ENGINE}"`) ||
        text.includes(`name: ${OURS_ENGINE}`));
}
export function compositionHasStock(text) {
    return text.includes(STOCK_ENGINE);
}
export function patchCompositionFile(path) {
    if (!existsSync(path))
        return "skip";
    let original;
    try {
        original = readFileSync(path, "utf8");
    }
    catch {
        return "fail";
    }
    if (!compositionHasStock(original)) {
        return compositionHasOurs(original) ? "already" : "skip";
    }
    const { next, changed } = rewriteComposition(original);
    if (!changed)
        return "fail";
    const bak = `${path}.dsh-smart-compaction.bak`;
    try {
        if (!existsSync(bak))
            writeFileSync(bak, original);
        writeFileSync(path, next);
    }
    catch {
        return "fail";
    }
    if (compositionHasStock(readFileSync(path, "utf8")))
        return "fail";
    return "patched";
}
function walkCompositionFiles(dir, into) {
    if (!existsSync(dir))
        return;
    let names;
    try {
        names = readdirSync(dir);
    }
    catch {
        return;
    }
    for (const name of names) {
        const path = join(dir, name);
        let stat;
        try {
            stat = statSync(path);
        }
        catch {
            continue;
        }
        if (stat.isDirectory()) {
            if (name === "node_modules" || name === ".git")
                continue;
            walkCompositionFiles(path, into);
        }
        else if (name === COMPOSITION_FILE) {
            into.push(path);
        }
    }
}
export function findShippedPresetRoots(env = process.env) {
    const roots = [];
    const add = (path) => {
        if (path && existsSync(path) && !roots.includes(path))
            roots.push(path);
    };
    try {
        const require = createRequire(import.meta.url);
        add(join(dirname(require.resolve("@deepseek-ai/dsh/package.json")), "config", "agent-presets"));
    }
    catch {
        /* not resolvable from this process */
    }
    add(join(env.APPDATA || "", "npm", "node_modules", "@deepseek-ai", "dsh", "config", "agent-presets"));
    add(join(dshHome(env), "profiles", "node_modules", "@deepseek-ai", "dsh", "config", "agent-presets"));
    add(join(homedir(), "deepseek-harness", "apps", "cli", "config", "agent-presets"));
    return roots;
}
export function collectCompositionFiles(env = process.env) {
    const files = [];
    for (const root of findShippedPresetRoots(env))
        walkCompositionFiles(root, files);
    walkCompositionFiles(join(dshHome(env), ".agent-presets"), files);
    return files;
}
export function patchCompositionFiles(files) {
    const stats = { patched: 0, already: 0, skipped: 0, failed: 0 };
    for (const file of files) {
        const status = patchCompositionFile(file);
        if (status === "patched")
            stats.patched += 1;
        else if (status === "already")
            stats.already += 1;
        else if (status === "fail")
            stats.failed += 1;
        else
            stats.skipped += 1;
    }
    return stats;
}
export function patchKnownPresetFiles(env = process.env) {
    return patchCompositionFiles(collectCompositionFiles(env));
}
export function isLeftoverSmartPresetDir(dir) {
    const meta = join(dir, "preset.yml");
    if (!existsSync(meta))
        return false;
    let text;
    try {
        text = readFileSync(meta, "utf8");
    }
    catch {
        return false;
    }
    return text.includes(`name: ${LEFTOVER_PRESET_NAME}`) && text.includes(LEFTOVER_PRESET_DESC);
}
export function removeLeftoverSmartPreset(env = process.env) {
    const dir = join(dshHome(env), ".agent-presets", LEFTOVER_PRESET_ID);
    if (!existsSync(dir) || !isLeftoverSmartPresetDir(dir))
        return false;
    rmSync(dir, { recursive: true, force: true });
    return !existsSync(dir);
}
export function writeHomeDisablePatch(env = process.env) {
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
    let next = existing
        .replace(/^- id: compaction-smart\r?\n(?:[ \t].*\r?\n)*/gm, "")
        .replace(/^- insert:\r?\n(?:[ \t]+- id: compaction-smart\r?\n(?:[ \t]+.*\r?\n)*)/gm, "");
    const stripped = next !== existing;
    if (next.includes("id: compaction-basic") && next.includes("disabled: true") && !next.includes("id: compaction-smart")) {
        if (stripped) {
            const bak = `${path}.dsh-smart-compaction.bak`;
            if (!existsSync(bak))
                writeFileSync(bak, existing);
            writeFileSync(path, next);
        }
        return;
    }
    const bak = `${path}.dsh-smart-compaction.bak`;
    if (!existsSync(bak))
        writeFileSync(bak, existing);
    const trimmed = next.trim();
    if (trimmed === "" || trimmed === "[]") {
        writeFileSync(path, ours);
        return;
    }
    writeFileSync(path, `${next.trimEnd()}\n\n${ours}`);
}
