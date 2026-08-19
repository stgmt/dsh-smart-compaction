import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveTarget, targetsEqual } from "../src/target-resolver.ts";
import { TargetResolutionError } from "../src/errors.ts";

test("uses request header provider/model/effort, ignoring any compact-model pair", () => {
  const target = resolveTarget({
    requestHeader: { provider: "openai", model: "gpt-5.6-luna", reasoningEffort: "max" },
    agentOptions: { provider: "deepseek", model: "deepseek-v4-flash", reasoningEffort: "high" },
  });
  assert.deepEqual(target, { provider: "openai", model: "gpt-5.6-luna", reasoningEffort: "max" });
});

test("falls back to agent options when no header exists", () => {
  const target = resolveTarget({
    agentOptions: { provider: "xai", model: "grok", reasoningEffort: "medium" },
  });
  assert.equal(target.provider, "xai");
  assert.equal(target.model, "grok");
  assert.equal(target.reasoningEffort, "medium");
});

test("refuses to invent a target", () => {
  assert.throws(() => resolveTarget({}), TargetResolutionError);
});

test("targetsEqual distinguishes effort", () => {
  assert.equal(
    targetsEqual(
      { provider: "openai", model: "gpt-5.6-luna", reasoningEffort: "max" },
      { provider: "openai", model: "gpt-5.6-luna", reasoningEffort: "low" },
    ),
    false,
  );
});
