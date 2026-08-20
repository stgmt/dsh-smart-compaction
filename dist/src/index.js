export { SmartCompactionEngine, SmartCompactionEngine as default } from "./engine.js";
export { resolveTarget, targetsEqual } from "./target-resolver.js";
export { resolveBudget, heuristicTokenCount } from "./budget-resolver.js";
export { planAtomicBlocks, isToolPairIntact } from "./boundary-planner.js";
export { planChunks, splitOverflowChunk } from "./chunk-planner.js";
export { summarizeChain } from "./summarizer.js";
export { validateSummary } from "./summary-validator.js";
export { createFileCheckpointStore, createMemoryCheckpointStore } from "./checkpoint-store.js";
/** Cordis plugin id. The package is loaded as the compaction-basic row replacement. */
export const name = "dsh-smart-compaction";
export const inject = ["llm", "tokenMeter", "sessions"];
