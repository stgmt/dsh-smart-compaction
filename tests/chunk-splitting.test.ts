import assert from "node:assert/strict";
import { test } from "node:test";
import { planAtomicBlocks } from "../src/boundary-planner.ts";
import { heuristicTokenCount } from "../src/budget-resolver.ts";
import { planChunks, splitOverflowChunk } from "../src/chunk-planner.ts";
import { OverflowSplitError } from "../src/errors.ts";
import { assistantTurn, filler, toolResult } from "./helpers.ts";

test("oversized history becomes several chunks under a small budget", () => {
  const messages = [filler("A", 800), filler("B", 800), filler("C", 800), filler("D", 800)];
  const blocks = planAtomicBlocks(messages, heuristicTokenCount);
  const chunks = planChunks(blocks, 300, 0);
  assert.ok(chunks.length >= 4);
  for (const chunk of chunks) {
    assert.ok(chunk.tokens > 0);
    assert.ok(chunk.messages.length >= 1);
  }
});

test("overflow splits a multi-block chunk and refuses to cut a tool pair", () => {
  const pair = [assistantTurn("run", ["bash"]), toolResult("bash", "ok")];
  const messages = [...pair, filler("tail", 40)];
  const blocks = planAtomicBlocks(messages, heuristicTokenCount);
  const [chunk] = planChunks(blocks, 100_000, 0);
  const [left, right] = splitOverflowChunk(chunk!, blocks, heuristicTokenCount);
  assert.equal(left.messages.length, 2);
  assert.equal(right.messages.length, 1);
  const atomic = planChunks(blocks.slice(0, 1), 100_000, 0)[0]!;
  assert.throws(() => splitOverflowChunk(atomic, blocks.slice(0, 1), heuristicTokenCount), OverflowSplitError);
});
