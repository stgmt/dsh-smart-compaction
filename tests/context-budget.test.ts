import assert from "node:assert/strict";
import { test } from "node:test";
import { CONSERVATIVE_WINDOW, resolveBudget } from "../src/budget-resolver.ts";

test("budget is derived from the adapter window, not a hardcoded 200k", () => {
  const small = resolveBudget({ contextWindow: 8_192 });
  const large = resolveBudget({ contextWindow: 1_000_000 });
  assert.equal(small.conservative, false);
  assert.ok(small.maxInputTokens < 8_192);
  assert.ok(large.maxInputTokens > small.maxInputTokens);
  assert.ok(large.maxInputTokens < 1_000_000);
});

test("missing metadata uses a conservative window instead of gambling", () => {
  const budget = resolveBudget({});
  assert.equal(budget.conservative, true);
  assert.equal(budget.contextWindow, CONSERVATIVE_WINDOW);
  assert.ok(budget.maxInputTokens < CONSERVATIVE_WINDOW);
});
