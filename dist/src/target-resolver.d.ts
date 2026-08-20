import type { CompactionTarget } from "./types.ts";
export type RequestHeaderConfig = {
    provider?: string;
    model?: string;
    reasoningEffort?: string;
};
export type AgentOptions = {
    provider?: string;
    model?: string;
    reasoningEffort?: string;
};
/**
 * Chat-selected target only. Never consults BasicCompactionConfig
 * summarizationProvider/summarizationModel — that pair is the stock
 * auxiliary-route hole this plugin exists to close.
 */
export declare function resolveTarget(input: {
    requestHeader?: RequestHeaderConfig;
    agentOptions?: AgentOptions;
}): CompactionTarget;
export declare function targetsEqual(a: CompactionTarget, b: CompactionTarget): boolean;
