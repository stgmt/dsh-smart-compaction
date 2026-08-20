import { createHash } from "node:crypto";
export function sha256(text) {
    return createHash("sha256").update(text).digest("hex");
}
export function sourceHash(messages) {
    return sha256(JSON.stringify(messages));
}
export function checkpointPayloadHash(record) {
    return sha256(JSON.stringify(record));
}
