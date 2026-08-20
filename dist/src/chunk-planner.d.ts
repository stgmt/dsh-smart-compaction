import type { AtomicBlock, Chunk, TokenEstimator } from "./types.ts";
export declare function planChunks(blocks: readonly AtomicBlock[], maxChunkTokens: number, previousSummaryTokens: number): Chunk[];
/** Split a chunk that overflowed: half the atomic blocks, never inside a pair. */
export declare function splitOverflowChunk(chunk: Chunk, blocks: readonly AtomicBlock[], estimate: TokenEstimator): [Chunk, Chunk];
export declare function reindex(chunks: Chunk[]): Chunk[];
