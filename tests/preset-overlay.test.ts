import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { apply } from "../src/autonomy.ts";
import {
  LEFTOVER_PRESET_DESC,
  LEFTOVER_PRESET_NAME,
  OURS_ENGINE,
  STOCK_ENGINE,
  compositionHasOurs,
  compositionHasStock,
  isLeftoverSmartPresetDir,
  patchCompositionFile,
  removeLeftoverSmartPreset,
  rewriteComposition,
  writeHomeDisablePatch,
} from "../src/preset-overlay.ts";

const STOCK_YAML = `# compaction
- id: compaction
  config:
    - id: compaction-basic
      name: '@deepseek-ai/dsh-compaction-basic'
`;

test("rewrite handles lf, crlf, and both quote styles", () => {
  const lf = "      name: '@deepseek-ai/dsh-compaction-basic'\n";
  const crlf = "      name: \"@deepseek-ai/dsh-compaction-basic\"\r\n";
  const unquoted = "      name: @deepseek-ai/dsh-compaction-basic\n";
  for (const text of [lf, crlf, unquoted]) {
    const { next, changed } = rewriteComposition(text);
    assert.equal(changed, true);
    assert.equal(compositionHasStock(next), false);
    assert.equal(compositionHasOurs(next), true);
  }
});

test("rewrite is a no-op when already ours or compaction is absent", () => {
  const ours = "      name: 'dsh-smart-compaction'\n";
  const empty = "# no compaction\n- id: tool-fs\n  name: '@deepseek-ai/dsh-tool-fs'\n";
  assert.equal(rewriteComposition(ours).changed, false);
  assert.equal(rewriteComposition(empty).changed, false);
});

test("patchCompositionFile rewrites stock, then already, then skip", () => {
  const dir = mkdtempSync(join(tmpdir(), "smart-overlay-"));
  try {
    const path = join(dir, "agent.cordis.yml");
    writeFileSync(path, STOCK_YAML);
    assert.equal(patchCompositionFile(path), "patched");
    assert.equal(readFileSync(path, "utf8").includes(OURS_ENGINE), true);
    assert.equal(patchCompositionFile(path), "already");
    writeFileSync(path, emptyComposition());
    assert.equal(patchCompositionFile(path), "skip");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("leftover Smart compaction preset is the only directory removed", () => {
  const home = mkdtempSync(join(tmpdir(), "dsh-home-"));
  try {
    const leftover = join(home, ".agent-presets", "smart");
    mkdirSync(leftover, { recursive: true });
    writeFileSync(
      join(leftover, "preset.yml"),
      `name: ${LEFTOVER_PRESET_NAME}\ndescription: Standard coding agent with ${LEFTOVER_PRESET_DESC} instead of stock one-shot compact.\n`,
    );
    writeFileSync(join(leftover, "agent.cordis.yml"), STOCK_YAML);
    const other = join(home, ".agent-presets", "reels-dsh");
    mkdirSync(other, { recursive: true });
    writeFileSync(join(other, "preset.yml"), "name: reels-dsh\ndescription: mine\n");
    assert.equal(isLeftoverSmartPresetDir(leftover), true);
    assert.equal(isLeftoverSmartPresetDir(other), false);
    assert.equal(removeLeftoverSmartPreset({ DSH_HOME: home }), true);
    assert.equal(isLeftoverSmartPresetDir(leftover), false);
    assert.equal(readFileSync(join(other, "preset.yml"), "utf8").includes("reels-dsh"), true);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("autonomy copy hook overlays a newly authored preset without a roster row of our own", async () => {
  const dir = mkdtempSync(join(tmpdir(), "smart-copy-"));
  try {
    const path = join(dir, "agent.cordis.yml");
    writeFileSync(path, STOCK_YAML);
    const roster = {
      async list() {
        return [{ id: "mine", path }];
      },
      async mount() {
        return {};
      },
      async copy(_from: string, _id: string, _name?: string) {
        /* authoring already wrote path */
      },
      async standingKeyFor() {
        return {};
      },
      async recompose() {
        return {};
      },
    };
    const ctx = {
      logger: { info() {}, warn() {} },
      inject(_deps: string[], fn: (scoped: { get: (name: string) => unknown; effect: (cb: () => () => void, label?: string) => void }) => void) {
        fn({
          get(name: string) {
            return name === "agentPresets" ? roster : undefined;
          },
          effect(cb) {
            cb();
          },
        });
      },
    };
    apply(ctx as never, { watch: false, boot: false });
    await roster.copy("standard", "mine");
    assert.equal(readFileSync(path, "utf8").includes(OURS_ENGINE), true);
    assert.equal(readFileSync(path, "utf8").includes(STOCK_ENGINE), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("home disable patch does not wipe sibling rows", () => {
  const home = mkdtempSync(join(tmpdir(), "dsh-home-patch-"));
  try {
    writeFileSync(
      join(home, "cordis.patch.yml"),
      `- id: keep-me
  name: my-other-plugin
- id: compaction-smart
  name: dsh-smart-compaction
`,
    );
    writeHomeDisablePatch({ DSH_HOME: home });
    const text = readFileSync(join(home, "cordis.patch.yml"), "utf8");
    assert.equal(text.includes("id: keep-me"), true);
    assert.equal(text.includes("id: compaction-smart"), false);
    assert.equal(text.includes("disabled: true"), true);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

function emptyComposition(): string {
  return "# no compaction\n- id: tool-fs\n  name: '@deepseek-ai/dsh-tool-fs'\n";
}
