import { spawnSync } from "node:child_process";
import { globSync } from "node:fs";

const files = globSync("tests/*.test.ts");
const result = spawnSync("node", ["--experimental-strip-types", "--test", ...files], {
  stdio: "inherit",
  shell: false,
});
process.exit(result.status ?? 1);
