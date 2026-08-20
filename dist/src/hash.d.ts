import type { CheckpointRecord, CompactionMessage } from "./types.ts";
export declare function sha256(text: string): string;
export declare function sourceHash(messages: readonly CompactionMessage[]): string;
export declare function checkpointPayloadHash(record: Omit<CheckpointRecord, "checksum">): string;
