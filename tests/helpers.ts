import { REQUIRED_SUMMARY_SECTIONS, type CompactionMessage } from "../src/types.ts";

export function userTurn(text: string): CompactionMessage {
  return { role: "user", content: [{ type: "text", text }], source: { kind: "user" } };
}

export function assistantTurn(text: string, toolCalls: string[] = []): CompactionMessage {
  return {
    role: "assistant",
    content: [
      { type: "text", text },
      ...toolCalls.map((name, index) => ({
        type: "tool-call",
        id: `call-${name}-${index}`,
        name,
        arguments: "{}",
      })),
    ],
    source: { kind: "model" },
  };
}

export function toolResult(name: string, text: string): CompactionMessage {
  return {
    role: "user",
    content: [{ type: "tool-result", toolCallId: `call-${name}-0`, content: [{ type: "text", text }] }],
    source: { kind: "tool" },
  };
}

export function filler(label: string, chars: number): CompactionMessage {
  return userTurn(`${label} ${"x".repeat(chars)}`);
}

export function validCheckpoint(extra = "working on the task"): string {
  return REQUIRED_SUMMARY_SECTIONS.map((section) => `## ${section}\n${extra} ${section}`).join("\n\n");
}
