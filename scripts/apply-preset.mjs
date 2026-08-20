#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const install = join(dirname(fileURLToPath(import.meta.url)), "install-global.mjs");
const result = spawnSync(process.execPath, [install], { stdio: "inherit" });
process.exit(result.status ?? 1);
