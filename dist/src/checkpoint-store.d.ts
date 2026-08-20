import { type CheckpointRecord } from "./types.ts";
export type CheckpointStore = {
    load(sessionId: string, sourceHash: string): Promise<CheckpointRecord | undefined>;
    save(record: Omit<CheckpointRecord, "checksum">): Promise<CheckpointRecord>;
    clear(sessionId: string, sourceHash: string): Promise<void>;
};
/**
 * Atomic JSON files under $DSH_HOME/smart-compaction.
 * Prefer ctx.storageDomain when a future caller injects a Domain-backed store;
 * this filesystem fallback never copies session history, only checkpoints.
 */
export declare function createFileCheckpointStore(): CheckpointStore;
export declare function createMemoryCheckpointStore(map?: Map<string, CheckpointRecord>): CheckpointStore;
