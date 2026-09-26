/** `pnpm build`: render the plugin into dist/. */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildKiroPower } from "./build.ts";
import { readMethod } from "./method.ts";
import { writeTree } from "./write.ts";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const { version } = JSON.parse(
  readFileSync(join(packageRoot, "package.json"), "utf8"),
) as {
  version: string;
};
const files = buildKiroPower(readMethod(), { version });
writeTree(join(packageRoot, "dist"), files);
console.log(`plugin-kiro: wrote ${files.size} files to dist/`);
