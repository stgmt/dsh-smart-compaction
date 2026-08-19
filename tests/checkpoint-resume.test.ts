import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemoryCheckpointStore } from "../src/checkpoint-store.ts";
import { heuristicTokenCount } from "../src/budget-resolver.ts";
import { summarizeChain } from "../src/summarizer.ts";
import { filler, validCheckpoint } from "./helpers.ts";

const target = { provider: "deepseek", model: "deepseek-v4-flash", reasoningEffort: "high" };

test("mid-chain failure resumes from the last complete checkpoint", async () => {
  const store = createMemoryCheckpointStore();
  const messages = [filler("A", 400), filler("B", 400), filler("C", 400)];
  let attempts = 0;
  await assert.rejects(() =>
    summarizeChain({
      sessionId: "resume",
      sourceRange: { start: 0, end: 2 },
      messages,
      target,
      contextWindow: 8_192,
      maxInputTokens: 180,
      estimate: heuristicTokenCount,
      store,
      stream: async () => {
        attempts += 1;
        if (attempts === 2) throw new Error("boom on chunk 2");
        return { text: validCheckpoint(`ok-${attempts}`) };
      },
    }),
  );
  assert.ok(attempts >= 2);
  const seen: string[] = [];
  const resumed = await summarizeChain({
    sessionId: "resume",
    sourceRange: { start: 0, end: 2 },
    messages,
    target,
    contextWindow: 8_192,
    maxInputTokens: 180,
    estimate: heuristicTokenCount,
    store,
    stream: async (call) => {
      const label = `resume-${seen.length + 1}`;
      seen.push(label);
      assert.equal(call.provider, target.provider);
      assert.equal(call.model, target.model);
      assert.equal(call.reasoningEffort, target.reasoningEffort);
      return { text: validCheckpoint(label) };
    },
  });
  assert.ok(seen.length >= 1);
  assert.match(resumed.summaryText, /resume-/);
  assert.ok(resumed.checkpoints.length >= 2);
});
