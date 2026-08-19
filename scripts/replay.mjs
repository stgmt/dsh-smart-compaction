#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { planAtomicBlocks, isToolPairIntact } from "../src/boundary-planner.ts";
import { heuristicTokenCount } from "../src/budget-resolver.ts";
import { planChunks } from "../src/chunk-planner.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = process.argv[2] || join(root, "fixtures", "oversized-session.jsonl");
const messages = readFileSync(file, "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const budget = Number(process.argv[3] || 200);
const blocks = planAtomicBlocks(messages, heuristicTokenCount);
const chunks = planChunks(blocks, budget, 0);
console.log(
  JSON.stringify(
    {
      file,
      messages: messages.length,
      toolPairsIntact: isToolPairIntact(messages),
      atomicBlocks: blocks.length,
      chunks: chunks.map((chunk) => ({
        index: chunk.index,
        messages: chunk.messages.length,
        tokens: chunk.tokens,
        startBlock: chunk.startBlock,
        endBlock: chunk.endBlock,
      })),
    },
    null,
    2,
  ),
);
