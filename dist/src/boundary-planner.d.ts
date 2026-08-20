import type { AtomicBlock, CompactionMessage, TokenEstimator } from "./types.ts";
/**
 * Split history into atomic blocks that never cut a tool_call from its
 * tool_result. A block is one user turn, or an assistant message plus every
 * following tool result until the in-flight call count returns to zero, plus
 * any immediate follow-up assistant messages that continue the same step.
 */
export declare function planAtomicBlocks(messages: readonly CompactionMessage[], estimate: TokenEstimator): AtomicBlock[];
export declare function isToolPairIntact(messages: readonly CompactionMessage[]): boolean;
