import { OverflowSplitError } from "./errors.js";
import { tokensOf } from "./budget-resolver.js";
export function planChunks(blocks, maxChunkTokens, previousSummaryTokens) {
    const budget = Math.max(1, maxChunkTokens - previousSummaryTokens);
    const chunks = [];
    let start = 0;
    while (start < blocks.length) {
        let used = 0;
        let end = start;
        while (end < blocks.length) {
            const next = blocks[end].tokens;
            if (end > start && used + next > budget)
                break;
            used += next;
            end += 1;
            if (used >= budget)
                break;
        }
        if (end === start)
            end = start + 1;
        const slice = blocks.slice(start, end);
        chunks.push({
            index: chunks.length,
            messages: slice.flatMap((block) => block.messages),
            tokens: slice.reduce((sum, block) => sum + block.tokens, 0),
            startBlock: start,
            endBlock: end - 1,
        });
        start = end;
    }
    return chunks;
}
/** Split a chunk that overflowed: half the atomic blocks, never inside a pair. */
export function splitOverflowChunk(chunk, blocks, estimate) {
    const span = blocks.slice(chunk.startBlock, chunk.endBlock + 1);
    if (span.length < 2) {
        throw new OverflowSplitError("context overflow on an atomic tool-paired block that cannot be split further");
    }
    const mid = Math.ceil(span.length / 2);
    const leftBlocks = span.slice(0, mid);
    const rightBlocks = span.slice(mid);
    const leftMessages = leftBlocks.flatMap((block) => block.messages);
    const rightMessages = rightBlocks.flatMap((block) => block.messages);
    const left = {
        index: chunk.index,
        messages: leftMessages,
        tokens: tokensOf(leftMessages, estimate),
        startBlock: chunk.startBlock,
        endBlock: chunk.startBlock + mid - 1,
    };
    const right = {
        index: chunk.index + 1,
        messages: rightMessages,
        tokens: tokensOf(rightMessages, estimate),
        startBlock: chunk.startBlock + mid,
        endBlock: chunk.endBlock,
    };
    return [left, right];
}
export function reindex(chunks) {
    return chunks.map((chunk, index) => ({ ...chunk, index }));
}
