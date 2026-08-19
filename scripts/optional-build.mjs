import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
try {
  require.resolve("@deepseek-ai/dsh-compaction-basic");
  require.resolve("typescript/bin/tsc");
} catch {
  process.exit(0);
}
const result = spawnSync("npx", ["tsc", "--pretty", "false"], { stdio: "inherit", shell: true });
process.exit(result.status ?? 1);
