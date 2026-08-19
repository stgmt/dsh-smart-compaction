import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemoryCheckpointStore } from "../src/checkpoint-store.ts";
import { heuristicTokenCount } from "../src/budget-resolver.ts";
import { summarizeChain } from "../src/summarizer.ts";
import { filler, validCheckpoint } from "./helpers.ts";

test("chain returns one final summary after every chunk checkpoint", async () => {
  const store = createMemoryCheckpointStore();
  const result = await summarizeChain({
    sessionId: "commit",
    sourceRange: { start: 0, end: 2 },
    messages: [filler("A", 400), filler("B", 400), filler("C", 400)],
    target: { provider: "openai", model: "gpt-5.6-luna", reasoningEffort: "max" },
    contextWindow: 8_192,
    maxInputTokens: 180,
    estimate: heuristicTokenCount,
    store,
    stream: async () => ({ text: validCheckpoint("final-path") }),
  });
  assert.ok(result.chunkCalls.length >= 2);
  assert.equal(result.checkpoints.length, result.chunkCalls.length);
  assert.ok(result.checkpoints.every((row) => row.status === "complete"));
  assert.match(result.summaryText, /## Goal/);
});
