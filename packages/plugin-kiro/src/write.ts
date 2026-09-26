/** Write a built file tree to a directory, replacing whatever was there. */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export function writeTree(
  outDir: string,
  files: ReadonlyMap<string, string>,
): void {
  rmSync(outDir, { recursive: true, force: true });
  for (const path of [...files.keys()].sort()) {
    const target = join(outDir, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, files.get(path) as string);
  }
}
