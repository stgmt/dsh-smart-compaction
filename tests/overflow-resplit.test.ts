import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemoryCheckpointStore } from "../src/checkpoint-store.ts";
import { heuristicTokenCount } from "../src/budget-resolver.ts";
import { summarizeChain } from "../src/summarizer.ts";
import { filler, validCheckpoint } from "./helpers.ts";

test("context overflow resplits the current chunk and retries the same model", async () => {
  const models: string[] = [];
  let first = true;
  const result = await summarizeChain({
    sessionId: "overflow",
    sourceRange: { start: 0, end: 3 },
    messages: [filler("A", 200), filler("B", 200), filler("C", 200), filler("D", 200)],
    target: { provider: "openai", model: "gpt-5.6-luna", reasoningEffort: "max" },
    contextWindow: 8_192,
    maxInputTokens: 50_000,
    estimate: heuristicTokenCount,
    store: createMemoryCheckpointStore(),
    stream: async (call) => {
      models.push(`${call.provider}/${call.model}/${call.reasoningEffort}`);
      if (first) {
        first = false;
        const error = new Error("prompt is too long") as Error & { code?: string };
        error.code = "CONTEXT_WINDOW_EXCEEDED";
        throw error;
      }
      return { text: validCheckpoint("after-split") };
    },
  });
  assert.ok(models.length >= 2);
  assert.ok(models.every((row) => row === "openai/gpt-5.6-luna/max"));
  assert.match(result.summaryText, /after-split/);
});
