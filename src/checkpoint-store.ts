import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { CHECKPOINT_SCHEMA_VERSION, type CheckpointRecord } from "./types.ts";
import { checkpointPayloadHash } from "./hash.ts";

export type CheckpointStore = {
  load(sessionId: string, sourceHash: string): Promise<CheckpointRecord | undefined>;
  save(record: Omit<CheckpointRecord, "checksum">): Promise<CheckpointRecord>;
  clear(sessionId: string, sourceHash: string): Promise<void>;
};

function dshHome(): string {
  return process.env.DSH_HOME?.trim() || join(homedir(), ".dsh");
}

function recordPath(sessionId: string, sourceHash: string): string {
  const safeSession = sessionId.replace(/[^A-Za-z0-9._-]/g, "_");
  return join(dshHome(), "smart-compaction", safeSession, `${sourceHash}.json`);
}

function withChecksum(record: Omit<CheckpointRecord, "checksum">): CheckpointRecord {
  const checksum = checkpointPayloadHash(record);
  return { ...record, checksum };
}

function verify(record: CheckpointRecord): CheckpointRecord {
  const { checksum, ...rest } = record;
  const expected = checkpointPayloadHash(rest);
  if (checksum !== expected) {
    throw new Error("checkpoint checksum mismatch; refusing to resume a corrupt record");
  }
  if (record.schemaVersion !== CHECKPOINT_SCHEMA_VERSION) {
    throw new Error(`unsupported checkpoint schema ${record.schemaVersion}`);
  }
  return record;
}

/**
 * Atomic JSON files under $DSH_HOME/smart-compaction.
 * Prefer ctx.storageDomain when a future caller injects a Domain-backed store;
 * this filesystem fallback never copies session history, only checkpoints.
 */
export function createFileCheckpointStore(): CheckpointStore {
  return {
    async load(sessionId, sourceHash) {
      const path = recordPath(sessionId, sourceHash);
      if (!existsSync(path)) return undefined;
      const raw = await readFile(path, "utf8");
      try {
        return verify(JSON.parse(raw) as CheckpointRecord);
      } catch {
        return undefined;
      }
    },
    async save(record) {
      const complete = withChecksum({ ...record, schemaVersion: CHECKPOINT_SCHEMA_VERSION });
      const path = recordPath(complete.sessionId, complete.sourceHash);
      await mkdir(dirname(path), { recursive: true });
      const tmp = `${path}.${process.pid}.tmp`;
      await writeFile(tmp, `${JSON.stringify(complete, null, 2)}\n`, "utf8");
      await rename(tmp, path);
      return complete;
    },
    async clear(sessionId, sourceHash) {
      const path = recordPath(sessionId, sourceHash);
      if (existsSync(path)) await rm(path, { force: true });
    },
  };
}

export function createMemoryCheckpointStore(
  map: Map<string, CheckpointRecord> = new Map(),
): CheckpointStore {
  const key = (sessionId: string, sourceHash: string) => `${sessionId}:${sourceHash}`;
  return {
    async load(sessionId, sourceHash) {
      const record = map.get(key(sessionId, sourceHash));
      return record ? verify(record) : undefined;
    },
    async save(record) {
      const complete = withChecksum({ ...record, schemaVersion: CHECKPOINT_SCHEMA_VERSION });
      map.set(key(complete.sessionId, complete.sourceHash), complete);
      return complete;
    },
    async clear(sessionId, sourceHash) {
      map.delete(key(sessionId, sourceHash));
    },
  };
}
