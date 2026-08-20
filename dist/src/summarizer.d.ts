import { OverflowSplitError } from "./errors.ts";
import type { CheckpointRecord, CompactionMessage, CompactionTarget, TokenEstimator } from "./types.ts";
import type { CheckpointStore } from "./checkpoint-store.ts";
export type LlmCall = {
    provider: string;
    model: string;
    reasoningEffort?: string;
    purpose: "compaction";
    messages: CompactionMessage[];
};
export type LlmResult = {
    text: string;
    usage?: {
        input?: number;
        output?: number;
        total?: number;
    };
};
export type StreamFn = (call: LlmCall, signal?: AbortSignal) => Promise<LlmResult>;
export type SummarizeChainInput = {
    sessionId: string;
    sourceRange: {
        start: number;
        end: number;
    };
    messages: CompactionMessage[];
    target: CompactionTarget;
    contextWindow: number;
    maxInputTokens: number;
    estimate: TokenEstimator;
    stream: StreamFn;
    store: CheckpointStore;
    signal?: AbortSignal;
};
export type SummarizeChainResult = {
    summaryText: string;
    chunkCalls: LlmCall[];
    checkpoints: CheckpointRecord[];
    usage?: LlmResult["usage"];
};
export declare function summarizeChain(input: SummarizeChainInput): Promise<SummarizeChainResult>;
export { OverflowSplitError };
