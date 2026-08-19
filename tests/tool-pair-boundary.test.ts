import assert from "node:assert/strict";
import { test } from "node:test";
import { isToolPairIntact, planAtomicBlocks } from "../src/boundary-planner.ts";
import { heuristicTokenCount } from "../src/budget-resolver.ts";
import { assistantTurn, toolResult, userTurn } from "./helpers.ts";

test("keeps assistant tool-call with its tool-result in one atomic block", () => {
  const messages = [
    userTurn("list files"),
    assistantTurn("calling fs", ["fs"]),
    toolResult("fs", "a.ts\nb.ts"),
    assistantTurn("found two files"),
  ];
  const blocks = planAtomicBlocks(messages, heuristicTokenCount);
  assert.equal(isToolPairIntact(messages), true);
  assert.equal(blocks[0]!.messages.length, 1);
  assert.equal(blocks[1]!.messages.length, 3);
  assert.equal(isToolPairIntact(blocks[1]!.messages), true);
});

test("does not split an open tool pair across blocks", () => {
  const messages = [
    assistantTurn("edit", ["edit"]),
    toolResult("edit", "ok"),
    userTurn("thanks"),
  ];
  const blocks = planAtomicBlocks(messages, heuristicTokenCount);
  assert.ok(blocks[0]!.messages.some((message) => message.content.some((block) => block.type === "tool-call")));
  assert.ok(blocks[0]!.messages.some((message) => message.source?.kind === "tool"));
  assert.equal(blocks[1]!.messages[0]!.content[0]!.text, "thanks");
});
