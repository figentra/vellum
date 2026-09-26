/**
 * Read @vellum/method from disk as data. The only I/O in the build besides writing the
 * artifact; every list is sorted so the build does not depend on directory order.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import type { ModelMap } from "@vellum/renderers";

export interface MethodFile {
  /** Path relative to the method root, `/`-separated. */
  path: string;
  content: string;
}

export interface Method {
  root: string;
  /** Skill directory names. */
  skills: string[];
  /** Every file under skills/, templates/, plus ROSTER.md: shipped verbatim. */
  verbatim: MethodFile[];
  /** Agent sources, `agents/<name>.md`. */
  agents: MethodFile[];
  models: ModelMap;
}

function walk(root: string, dir: string): MethodFile[] {
  const out: MethodFile[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(root, path));
    else
      out.push({
        path: relative(root, path).split("\\").join("/"),
        content: readFileSync(path, "utf8"),
      });
  }
  return out;
}

/** Locate the installed @vellum/method package. */
export function methodRoot(): string {
  return dirname(
    createRequire(import.meta.url).resolve("@vellum/method/package.json"),
  );
}

export function readMethod(root: string = methodRoot()): Method {
  const skills = readdirSync(join(root, "skills"))
    .filter(
      (n) =>
        !n.startsWith(".") && statSync(join(root, "skills", n)).isDirectory(),
    )
    .sort();
  const verbatim = [
    ...walk(root, join(root, "skills")),
    ...walk(root, join(root, "templates")),
    {
      path: "ROSTER.md",
      content: readFileSync(join(root, "ROSTER.md"), "utf8"),
    },
  ];
  const agents = walk(root, join(root, "agents")).filter((f) =>
    f.path.endsWith(".md"),
  );
  const models = JSON.parse(
    readFileSync(join(root, "models.json"), "utf8"),
  ) as ModelMap;
  return { root, skills, verbatim, agents, models };
}
