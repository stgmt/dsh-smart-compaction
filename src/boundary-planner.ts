import type { AtomicBlock, CompactionMessage, TokenEstimator } from "./types.ts";

function toolCallDelta(message: CompactionMessage): number {
  let delta = 0;
  for (const block of message.content) {
    if (block.type === "tool-call") delta += 1;
  }
  if (message.source?.kind === "tool") return delta - 1;
  for (const block of message.content) {
    if (block.type === "tool-result") delta -= 1;
  }
  return delta;
}

/**
 * Split history into atomic blocks that never cut a tool_call from its
 * tool_result. A block is one user turn, or an assistant message plus every
 * following tool result until the in-flight call count returns to zero, plus
 * any immediate follow-up assistant messages that continue the same step.
 */
export function planAtomicBlocks(
  messages: readonly CompactionMessage[],
  estimate: TokenEstimator,
): AtomicBlock[] {
  const blocks: AtomicBlock[] = [];
  let i = 0;
  while (i < messages.length) {
    const start = i;
    const first = messages[i]!;
    i += 1;
    let inFlight = toolCallDelta(first);
    if (first.role === "assistant" || inFlight > 0) {
      while (i < messages.length && inFlight > 0) {
        inFlight += toolCallDelta(messages[i]!);
        i += 1;
      }
      while (i < messages.length && messages[i]!.role === "assistant") {
        const extra = toolCallDelta(messages[i]!);
        if (extra > 0) break;
        i += 1;
      }
    }
    const slice = messages.slice(start, i);
    blocks.push({
      messages: slice,
      tokens: slice.reduce((sum, message) => sum + estimate(message), 0),
    });
  }
  return blocks;
}

export function isToolPairIntact(messages: readonly CompactionMessage[]): boolean {
  let inFlight = 0;
  for (const message of messages) {
    inFlight += toolCallDelta(message);
    if (inFlight < 0) return false;
  }
  return inFlight === 0;
}
