import type { Budget, CompactionMessage, TokenEstimator } from "./types.ts";
/** Safety margin so a chunk + previous summary + instruction cannot kiss the window. */
export declare const SAFETY_RATIO = 0.12;
/** When the adapter does not report capacity, refuse to gamble a huge request. */
export declare const CONSERVATIVE_WINDOW = 32768;
export declare const INSTRUCTION_RESERVE_TOKENS = 1200;
export declare function heuristicTokenCount(message: CompactionMessage): number;
export declare function resolveBudget(input: {
    contextWindow?: number;
    system?: string;
    toolsJsonChars?: number;
    estimator?: TokenEstimator;
}): Budget;
export declare function tokensOf(messages: readonly CompactionMessage[], estimate: TokenEstimator): number;
