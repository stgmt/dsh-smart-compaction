import { BasicCompactionEngine } from "@deepseek-ai/dsh-compaction-basic";
import type { Agent } from "@deepseek-ai/dsh-agent";
import {
  BlockAssembler,
  createMessage,
  type ContentBlock,
  type GenerateOptions,
  type Message,
} from "@deepseek-ai/dsh-llm";

type SummarizationInput = {
  system?: string;
  tools?: unknown;
  messages: readonly Message[];
};
import { heuristicTokenCount, resolveBudget } from "./budget-resolver.ts";
import { createFileCheckpointStore } from "./checkpoint-store.ts";
import { sourceHash } from "./hash.ts";
import { summarizeChain, type LlmCall, type LlmResult } from "./summarizer.ts";
import { resolveTarget } from "./target-resolver.ts";
import type { CompactionMessage, Contentish } from "./types.ts";

function asContent(blocks: Contentish[]): ContentBlock[] {
  return blocks as ContentBlock[];
}

function fromDsh(message: Message): CompactionMessage {
  return {
    role: message.role,
    content: message.content as Contentish[],
    source: message.source as CompactionMessage["source"],
  };
}

function toDsh(message: CompactionMessage, call: LlmCall): Message {
  if (message.role === "assistant") {
    return createMessage({
      role: "assistant",
      content: asContent(message.content),
      source: { kind: "model", provider: call.provider, model: call.model },
    });
  }
  return createMessage({
    role: message.role,
    content: asContent(message.content),
    source: { kind: "plugin", plugin: "dsh-smart-compaction" },
  });
}

/**
 * Hierarchical compaction backend. Stock lock/range/commit stay on
 * BasicCompactionEngine; this class only replaces the one-shot summarizer
 * with sequential chunk calls on the chat-selected model.
 */
export class SmartCompactionEngine extends BasicCompactionEngine {
  protected override async summarize(
    input: SummarizationInput,
    agent: Agent,
    signal?: AbortSignal,
  ) {
    const header = agent.session.requestHeader()?.config;
    const target = resolveTarget({
      requestHeader: header,
      agentOptions: {
        provider: agent.options.provider,
        model: agent.options.model,
        reasoningEffort: (agent.options as { reasoningEffort?: string }).reasoningEffort,
      },
    });
    let contextWindow: number | undefined;
    try {
      const info = await this.ctx.llm.resolveModelInfo(target.provider, target.model, signal);
      contextWindow = info.context?.contextWindow;
    } catch {
      contextWindow = undefined;
    }
    const budget = resolveBudget({
      contextWindow,
      system: input.system,
      toolsJsonChars: input.tools ? JSON.stringify(input.tools).length : 0,
    });
    const messages = input.messages.map(fromDsh);
    const store = createFileCheckpointStore();
    const chain = await summarizeChain({
      sessionId: String(agent.session.id),
      sourceRange: { start: 0, end: Math.max(0, input.messages.length - 1) },
      messages,
      target,
      contextWindow: budget.contextWindow,
      maxInputTokens: budget.maxInputTokens,
      estimate: heuristicTokenCount,
      stream: (call, abort) => this.streamChunk(call, agent, abort),
      store,
      signal,
    });
    await store.clear(String(agent.session.id), sourceHash(messages));
    const summary: ContentBlock[] = [{ type: "text", text: chain.summaryText }];
    return {
      summary,
      provider: target.provider,
      model: target.model,
      maxTokens: this.config.maxTokens,
      rawOutput: summary,
    };
  }

  private async streamChunk(
    call: LlmCall,
    agent: Agent,
    signal?: AbortSignal,
  ): Promise<LlmResult> {
    const assembler = new BlockAssembler();
    const options: GenerateOptions = {
      provider: call.provider,
      model: call.model,
      messages: call.messages.map((message) => toDsh(message, call)),
      purpose: "compaction",
      sessionId: agent.session.id,
      maxTokens: this.config.maxTokens,
      ...(call.reasoningEffort ? { reasoningEffort: call.reasoningEffort as GenerateOptions["reasoningEffort"] } : {}),
      ...(signal ? { signal } : {}),
    };
    for await (const chunk of this.ctx.llm.stream(options)) assembler.push(chunk);
    const finish = assembler.finish;
    if (finish.kind === "error" || finish.kind === "aborted") {
      const error = new Error(finish.failure.message) as Error & { code?: string };
      error.code = finish.failure.code;
      throw error;
    }
    const text = assembler
      .blocks()
      .filter((block) => block.type === "text")
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("\n");
    return { text };
  }
}

export default SmartCompactionEngine;
