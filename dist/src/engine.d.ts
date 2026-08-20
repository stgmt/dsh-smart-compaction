import { BasicCompactionEngine } from "@deepseek-ai/dsh-compaction-basic";
import type { Agent } from "@deepseek-ai/dsh-agent";
import { type ContentBlock, type Message } from "@deepseek-ai/dsh-llm";
type SummarizationInput = {
    system?: string;
    tools?: unknown;
    messages: readonly Message[];
};
/**
 * Hierarchical compaction backend. Stock lock/range/commit stay on
 * BasicCompactionEngine; this class only replaces the one-shot summarizer
 * with sequential chunk calls on the chat-selected model.
 */
export declare class SmartCompactionEngine extends BasicCompactionEngine {
    protected summarize(input: SummarizationInput, agent: Agent, signal?: AbortSignal): Promise<{
        summary: ContentBlock[];
        provider: string;
        model: string;
        maxTokens: number;
        rawOutput: ContentBlock[];
    }>;
    private streamChunk;
}
export default SmartCompactionEngine;
