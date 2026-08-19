import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemoryCheckpointStore } from "../src/checkpoint-store.ts";
import { heuristicTokenCount } from "../src/budget-resolver.ts";
import { summarizeChain, type LlmCall } from "../src/summarizer.ts";
import { filler, validCheckpoint } from "./helpers.ts";
import { targetsEqual } from "../src/target-resolver.ts";
import type { CompactionTarget } from "../src/types.ts";

const target: CompactionTarget = { provider: "openai", model: "gpt-5.6-luna", reasoningEffort: "max" };

test("rolls N sequential calls on the same provider/model/effort", async () => {
  const calls: LlmCall[] = [];
  const messages = [filler("A", 400), filler("B", 400), filler("C", 400)];
  const result = await summarizeChain({
    sessionId: "s1",
    sourceRange: { start: 1, end: 3 },
    messages,
    target,
    contextWindow: 8_192,
    maxInputTokens: 180,
    estimate: heuristicTokenCount,
    store: createMemoryCheckpointStore(),
    stream: async (call) => {
      calls.push(call);
      return { text: validCheckpoint(`chunk-${calls.length}`) };
    },
  });
  assert.ok(calls.length >= 2);
  for (const call of calls) {
    assert.equal(call.purpose, "compaction");
    assert.ok(
      targetsEqual(
        {
          provider: call.provider,
          model: call.model,
          reasoningEffort: call.reasoningEffort,
        },
        target,
      ),
      `call drifted from chat target: ${call.provider}/${call.model}/${call.reasoningEffort}`,
    );
  }
  assert.match(result.summaryText, /chunk-/);
  assert.ok(result.checkpoints.length === calls.length);
});
