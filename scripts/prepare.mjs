#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
spawnSync(process.execPath, [join(dir, "optional-build.mjs")], { stdio: "inherit" });
if (process.env.DSH_SMART_COMPACTION_SKIP_GLOBAL === "1") process.exit(0);
const result = spawnSync(process.execPath, [join(dir, "install-global.mjs")], { stdio: "inherit" });
process.exit(result.status ?? 0);
