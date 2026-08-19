#!/usr/bin/env node
/**
 * Boot a real Cordis + DSH session + TokenMeter + SmartCompactionEngine and
 * run compactNow. Fails if stock one-shot path is used, if the model/effort
 * drifts, or if the surface is not reduced.
 */
import { Context } from "@deepseek-ai/cordis";
import { LlmAdapter, LlmRuntime, createUserMessage, createAssistantMessage } from "@deepseek-ai/dsh-llm";
import SessionStore, { SessionId } from "@deepseek-ai/dsh-session";
import TokenMeter from "@deepseek-ai/dsh-token-meter";
import { SmartCompactionEngine } from "../dist/src/engine.js";
import { REQUIRED_SUMMARY_SECTIONS } from "../dist/src/types.js";

const TARGET = {
  provider: "openai",
  model: "gpt-5.6-luna",
  reasoningEffort: "max",
};

function checkpointText(tag) {
  return REQUIRED_SUMMARY_SECTIONS.map((section) => `## ${section}\n${tag} ${section} file=/tmp/verify.ts id=11111111-1111-1111-1111-111111111111`).join(
    "\n\n",
  );
}

class RecordingAdapter extends LlmAdapter {
  calls = [];
  providerInfo(provider) {
    return { id: provider, name: provider };
  }
  providerRetryPolicy() {
    return undefined;
  }
  async listModels() {
    return [{ id: TARGET.model, name: TARGET.model }];
  }
  async resolveModel(provider, model) {
    return {
      provider,
      model,
      id: model,
      name: model,
      context: { contextWindow: 2_048 },
      reasoning: {
        efforts: [
          { id: "low", name: "low" },
          { id: "medium", name: "medium" },
          { id: "high", name: "high" },
          { id: "max", name: "max" },
        ],
      },
    };
  }
  async *stream(options) {
    this.calls.push({
      provider: options.provider,
      model: options.model,
      reasoningEffort: options.reasoningEffort,
      purpose: options.purpose,
      messageCount: options.messages?.length ?? 0,
      hasTools: Boolean(options.tools?.length),
    });
    if (options.provider !== TARGET.provider || options.model !== TARGET.model) {
      throw new Error(`hidden route: ${options.provider}/${options.model}`);
    }
    if (options.reasoningEffort !== TARGET.reasoningEffort) {
      throw new Error(`effort drifted: ${options.reasoningEffort}`);
    }
    if (options.purpose !== "compaction") {
      throw new Error(`purpose drifted: ${options.purpose}`);
    }
    const text = checkpointText(`live-${this.calls.length}`);
    yield { type: "block-start", index: 0, blockType: "text" };
    yield { type: "text-delta", index: 0, text };
    yield { type: "block-end", index: 0, block: { type: "text", text } };
    yield { type: "usage", usage: { inputTokens: 200, outputTokens: 80 } };
    yield { type: "finish", reason: { kind: "stop" } };
  }
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

const adapter = new RecordingAdapter();
const ctx = new Context();
await ctx.plugin(LlmRuntime);
await ctx.plugin(SessionStore);
await ctx.plugin(TokenMeter);
await ctx.plugin(SmartCompactionEngine, { auto: false, maxTokens: 2048 });

if (!(ctx.compaction instanceof SmartCompactionEngine)) {
  fail(`ctx.compaction is ${ctx.compaction?.constructor?.name}, not SmartCompactionEngine`);
}
console.log(`OK  ctx.compaction = ${ctx.compaction.constructor.name}`);
console.log(`OK  prototype = ${Object.getPrototypeOf(ctx.compaction.constructor).name}`);

ctx.llm.registerAdapter([TARGET.provider], adapter);

const session = ctx.sessions.create(SessionId("smart-live-verify"));
session.append("request/header", {
  reason: "initial",
  header: {
    config: {
      provider: TARGET.provider,
      model: TARGET.model,
      reasoningEffort: TARGET.reasoningEffort,
    },
  },
});

const filler = "x".repeat(1200);
for (let i = 0; i < 8; i += 1) {
  const turn = i + 1;
  session.append("turn/start", { turn });
  session.append(
    "user/message",
    createUserMessage({
      content: [{ type: "text", text: `turn ${i} ${filler}` }],
      source: { kind: "user" },
    }),
    { surfaceOp: "append" },
  );
  session.append("step/start", { turn, step: 1 });
  session.append(
    "assistant/message",
    {
      turn,
      step: 1,
      message: createAssistantMessage({
        content: [{ type: "text", text: `ack ${i} ${filler}` }],
        source: { provider: TARGET.provider, model: TARGET.model },
      }),
    },
    { surfaceOp: "append" },
  );
  session.append("step/end", { turn, step: 1 });
  session.append("turn/end", { turn, reason: { kind: "completed" } });
}

const before = session.surface.nodes.length;
const rawBefore = session.events.length;
console.log(`OK  surface before = ${before}, raw events before = ${rawBefore}`);

const agent = {
  session,
  options: {
    provider: TARGET.provider,
    model: TARGET.model,
    reasoningEffort: TARGET.reasoningEffort,
  },
  runMaintenance(task) {
    return task(new AbortController().signal);
  },
};

const result = await ctx.compaction.compactNow(agent, new AbortController().signal);
if (!result) fail("compactNow returned null — no range was compacted");

const after = session.surface.nodes.length;
const rawAfter = session.events.length;
console.log(`OK  compactNow shadowed ${result.shadowedSeqs.length} nodes`);
console.log(`OK  surface after = ${after}, raw events after = ${rawAfter}`);
if (!(after < before)) fail("active surface did not shrink");
if (!(rawAfter > rawBefore)) fail("raw log did not grow — events were deleted or compact did not record");
if (adapter.calls.length < 2) {
  fail(`expected multiple chunk calls, got ${adapter.calls.length} (stock one-shot?)`);
}
for (const call of adapter.calls) {
  if (call.provider !== TARGET.provider || call.model !== TARGET.model || call.reasoningEffort !== TARGET.reasoningEffort) {
    fail(`call drifted: ${JSON.stringify(call)}`);
  }
  if (call.hasTools) fail("compact call still sent tools");
}
const types = session.events.map((event) => event.type);
if (!types.includes("compaction/start") || !types.includes("compaction/summary") || !types.includes("compaction/end")) {
  fail(`missing compaction lifecycle events: ${types.filter((t) => t.startsWith("compaction")).join(",")}`);
}

console.log(`OK  chunk calls = ${adapter.calls.length}`);
console.log(`OK  every call = ${TARGET.provider}/${TARGET.model}/${TARGET.reasoningEffort} purpose=compaction`);
console.log(`OK  raw JSONL grew ${rawBefore} -> ${rawAfter}; surface shrank ${before} -> ${after}`);
console.log("PASS live compact through SmartCompactionEngine");
