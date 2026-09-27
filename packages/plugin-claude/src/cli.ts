/** `pnpm build`: render the plugin into dist/. */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildClaudePlugin } from "./build.ts";
import { readMethod } from "./method.ts";
import { writeTree } from "./write.ts";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
// The plugin ships the method for one @figentra/vellum release, so it carries that version.
const { version } = JSON.parse(
  readFileSync(join(packageRoot, "..", "vellum", "package.json"), "utf8"),
) as {
  version: string;
};
const files = buildClaudePlugin(readMethod(), { version });
writeTree(join(packageRoot, "dist"), files);
console.log(`plugin-claude: wrote ${files.size} files to dist/`);
