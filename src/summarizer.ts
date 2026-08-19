import { COMPACTION_INSTRUCTION } from "./instruction.ts";
import { EmptySummaryError, OverflowSplitError, isContextOverflow } from "./errors.ts";
import { planAtomicBlocks } from "./boundary-planner.ts";
import { planChunks, reindex, splitOverflowChunk } from "./chunk-planner.ts";
import { validateSummary } from "./summary-validator.ts";
import { sourceHash } from "./hash.ts";
import type {
  CheckpointRecord,
  Chunk,
  CompactionMessage,
  CompactionTarget,
  TokenEstimator,
} from "./types.ts";
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
  usage?: { input?: number; output?: number; total?: number };
};

export type StreamFn = (call: LlmCall, signal?: AbortSignal) => Promise<LlmResult>;

export type SummarizeChainInput = {
  sessionId: string;
  sourceRange: { start: number; end: number };
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

function summaryMessage(text: string): CompactionMessage {
  return {
    role: "user",
    content: [{ type: "text", text }],
    source: { kind: "plugin", plugin: "dsh-smart-compaction" },
  };
}

function instructionMessage(): CompactionMessage {
  return summaryMessage(COMPACTION_INSTRUCTION);
}

function extractText(result: LlmResult): string {
  return result.text.trim();
}

async function callOnce(
  stream: StreamFn,
  call: LlmCall,
  signal: AbortSignal | undefined,
): Promise<LlmResult> {
  const result = await stream(call, signal);
  if (extractText(result)) return result;
  throw new EmptySummaryError();
}

async function callWithEmptyRetry(
  stream: StreamFn,
  call: LlmCall,
  signal: AbortSignal | undefined,
): Promise<LlmResult> {
  try {
    return await callOnce(stream, call, signal);
  } catch (error) {
    if (error instanceof EmptySummaryError) {
      return callOnce(stream, call, signal);
    }
    throw error;
  }
}

function buildCall(
  target: CompactionTarget,
  previousSummary: string,
  chunk: Chunk,
): LlmCall {
  const messages: CompactionMessage[] = [];
  if (previousSummary) messages.push(summaryMessage(`Previous checkpoint:\n\n${previousSummary}`));
  messages.push(...chunk.messages);
  messages.push(instructionMessage());
  return {
    provider: target.provider,
    model: target.model,
    ...(target.reasoningEffort ? { reasoningEffort: target.reasoningEffort } : {}),
    purpose: "compaction",
    messages,
  };
}

export async function summarizeChain(input: SummarizeChainInput): Promise<SummarizeChainResult> {
  const hash = sourceHash(input.messages);
  const blocks = planAtomicBlocks(input.messages, input.estimate);
  let chunks = planChunks(blocks, input.maxInputTokens, 0);
  const existing = await input.store.load(input.sessionId, hash);
  let startIndex = 0;
  let previousSummary = "";
  let previousHash: string | null = null;
  const checkpoints: CheckpointRecord[] = [];
  const chunkCalls: LlmCall[] = [];
  let lastUsage: LlmResult["usage"];

  if (existing && existing.status === "complete") {
    startIndex = existing.chunkIndex + 1;
    previousSummary = existing.summaryText;
    previousHash = existing.checksum;
    checkpoints.push(existing);
  }

  const pending: Chunk[] = chunks.slice(startIndex);

  while (pending.length > 0) {
    const chunk = pending.shift()!;
    const call = buildCall(input.target, previousSummary, chunk);
    chunkCalls.push(call);
    let result: LlmResult;
    try {
      result = await callWithEmptyRetry(input.stream, call, input.signal);
    } catch (error) {
      if (isContextOverflow(error)) {
        const [left, right] = splitOverflowChunk(chunk, blocks, input.estimate);
        pending.unshift(left, right);
        const rest = reindex([...pending]);
        pending.length = 0;
        pending.push(...rest);
        chunkCalls.pop();
        continue;
      }
      throw error;
    }
    const text = extractText(result);
    const inputTokens = input.estimate(summaryMessage(previousSummary)) + chunk.tokens;
    validateSummary(text, Math.max(inputTokens, chunk.tokens + 1), (value) =>
      input.estimate(summaryMessage(value)),
    );
    lastUsage = result.usage;
    const saved = await input.store.save({
      schemaVersion: 1,
      sessionId: input.sessionId,
      sourceRange: input.sourceRange,
      sourceHash: hash,
      provider: input.target.provider,
      model: input.target.model,
      reasoningEffort: input.target.reasoningEffort,
      contextWindow: input.contextWindow,
      chunkIndex: checkpoints.length === 0 ? 0 : checkpoints[checkpoints.length - 1]!.chunkIndex + 1,
      chunkCount: chunks.length,
      chunkBoundaries: { startBlock: chunk.startBlock, endBlock: chunk.endBlock },
      previousCheckpointHash: previousHash,
      summaryText: text,
      summaryTokenCount: input.estimate(summaryMessage(text)),
      status: "complete",
    });
    checkpoints.push(saved);
    previousSummary = text;
    previousHash = saved.checksum;
  }

  if (!previousSummary) throw new EmptySummaryError("compaction chain produced no summary");
  return {
    summaryText: previousSummary,
    chunkCalls,
    checkpoints,
    usage: lastUsage,
  };
}

export { OverflowSplitError };
