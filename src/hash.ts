import { createHash } from "node:crypto";
import type { CheckpointRecord, CompactionMessage } from "./types.ts";

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function sourceHash(messages: readonly CompactionMessage[]): string {
  return sha256(JSON.stringify(messages));
}

export function checkpointPayloadHash(record: Omit<CheckpointRecord, "checksum">): string {
  return sha256(JSON.stringify(record));
}
