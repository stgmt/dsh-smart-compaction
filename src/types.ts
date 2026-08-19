/** Plugin-owned types. Keep DSH imports out of the pure planners. */

export type ReasoningEffort = string;

export type CompactionTarget = {
  provider: string;
  model: string;
  reasoningEffort?: ReasoningEffort;
};

export type Contentish = {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  arguments?: string;
  toolCallId?: string;
  content?: Contentish[];
  isError?: boolean;
};

export type CompactionMessage = {
  role: "system" | "user" | "assistant";
  content: Contentish[];
  source?: { kind?: string; [key: string]: unknown };
};

export type TokenEstimator = (message: CompactionMessage) => number;

export type Budget = {
  contextWindow: number;
  maxInputTokens: number;
  conservative: boolean;
};

export type AtomicBlock = {
  messages: CompactionMessage[];
  tokens: number;
};

export type Chunk = {
  index: number;
  messages: CompactionMessage[];
  tokens: number;
  startBlock: number;
  endBlock: number;
};

export const CHECKPOINT_SCHEMA_VERSION = 1 as const;

export type CheckpointStatus = "complete" | "pending";

export type CheckpointRecord = {
  schemaVersion: typeof CHECKPOINT_SCHEMA_VERSION;
  sessionId: string;
  sourceRange: { start: number; end: number };
  sourceHash: string;
  provider: string;
  model: string;
  reasoningEffort?: string;
  contextWindow: number;
  chunkIndex: number;
  chunkCount: number;
  chunkBoundaries: { startBlock: number; endBlock: number };
  previousCheckpointHash: string | null;
  summaryText: string;
  summaryTokenCount: number;
  status: CheckpointStatus;
  checksum: string;
};

export const REQUIRED_SUMMARY_SECTIONS = [
  "Goal",
  "Constraints",
  "Confirmed facts",
  "Decisions",
  "Files and paths",
  "Commands and IDs",
  "Open work",
  "Agent/background state",
  "Evidence and unresolved uncertainty",
] as const;
