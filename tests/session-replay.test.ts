import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { isToolPairIntact, planAtomicBlocks } from "../src/boundary-planner.ts";
import { heuristicTokenCount } from "../src/budget-resolver.ts";
import { planChunks } from "../src/chunk-planner.ts";
import type { CompactionMessage } from "../src/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadFixture(name: string): CompactionMessage[] {
  const raw = readFileSync(join(root, "fixtures", name), "utf8")
    .split(/\r?\n/)
    .filter(Boolean);
  return raw.map((line) => JSON.parse(line) as CompactionMessage);
}

test("replays an oversized fixture into multiple chunks without breaking tool pairs", () => {
  const messages = loadFixture("oversized-session.jsonl");
  assert.equal(isToolPairIntact(messages), true);
  const blocks = planAtomicBlocks(messages, heuristicTokenCount);
  const chunks = planChunks(blocks, 200, 0);
  assert.ok(chunks.length >= 3);
  for (const chunk of chunks) assert.equal(isToolPairIntact(chunk.messages), true);
});

test("tool-pair fixture stays in one atomic block", () => {
  const messages = loadFixture("tool-pair-session.jsonl");
  const blocks = planAtomicBlocks(messages, heuristicTokenCount);
  assert.ok(blocks.some((block) => block.messages.length >= 2));
  assert.equal(isToolPairIntact(messages), true);
});
