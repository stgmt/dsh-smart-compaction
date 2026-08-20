export { SmartCompactionEngine, SmartCompactionEngine as default } from "./engine.ts";
export { resolveTarget, targetsEqual } from "./target-resolver.ts";
export { resolveBudget, heuristicTokenCount } from "./budget-resolver.ts";
export { planAtomicBlocks, isToolPairIntact } from "./boundary-planner.ts";
export { planChunks, splitOverflowChunk } from "./chunk-planner.ts";
export { summarizeChain } from "./summarizer.ts";
export { validateSummary } from "./summary-validator.ts";
export { createFileCheckpointStore, createMemoryCheckpointStore } from "./checkpoint-store.ts";
/** Cordis plugin id. The package is loaded as the compaction-basic row replacement. */
export declare const name = "dsh-smart-compaction";
export declare const inject: string[];
