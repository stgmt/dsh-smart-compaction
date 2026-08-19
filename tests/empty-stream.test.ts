import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemoryCheckpointStore } from "../src/checkpoint-store.ts";
import { heuristicTokenCount } from "../src/budget-resolver.ts";
import { EmptySummaryError } from "../src/errors.ts";
import { summarizeChain } from "../src/summarizer.ts";
import { filler, validCheckpoint } from "./helpers.ts";

const target = { provider: "xai", model: "grok", reasoningEffort: "medium" };

test("empty stream retries once on the same model and does not swap routes", async () => {
  const models: string[] = [];
  let n = 0;
  const result = await summarizeChain({
    sessionId: "empty",
    sourceRange: { start: 0, end: 0 },
    messages: [filler("only", 400)],
    target,
    contextWindow: 8_192,
    maxInputTokens: 2_000,
    estimate: heuristicTokenCount,
    store: createMemoryCheckpointStore(),
    stream: async (call) => {
      models.push(`${call.provider}/${call.model}/${call.reasoningEffort}`);
      n += 1;
      if (n === 1) return { text: "   " };
      return { text: validCheckpoint("recovered") };
    },
  });
  assert.deepEqual(models, ["xai/grok/medium", "xai/grok/medium"]);
  assert.match(result.summaryText, /recovered/);
});

test("two empty streams fail without deleting work or changing target", async () => {
  await assert.rejects(
    () =>
      summarizeChain({
        sessionId: "empty-fail",
        sourceRange: { start: 0, end: 0 },
        messages: [filler("only", 400)],
        target,
        contextWindow: 8_192,
        maxInputTokens: 2_000,
        estimate: heuristicTokenCount,
        store: createMemoryCheckpointStore(),
        stream: async () => ({ text: "" }),
      }),
    EmptySummaryError,
  );
});
