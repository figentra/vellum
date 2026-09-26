/**
 * Engine purity: the engine imports only @vellum/protocol, and reads no
 * ambient state.
 *
 * Every non-test source file under src/ may import only `@vellum/protocol`
 * and relative paths that stay inside src/. That rules out Node builtins in
 * either spelling (`node:fs`, `fs`), other workspace packages and any npm
 * package. Nor may it read the clock (`Date.now(`, `new Date()` with no
 * argument), draw randomness (`Math.random(`) or reach the host through
 * `process.` or `globalThis.` — time and anything else ambient is a parameter
 * the caller supplies. Test files (`__tests__/`, `*.test.ts`, `*.spec.ts`)
 * are exempt: they are not part of the engine and need vitest.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ALLOWED_PACKAGES = new Set(["@vellum/protocol"]);

/** Every module specifier in a source text: static, re-export, side-effect, dynamic and require. */
export function moduleSpecifiers(source: string): string[] {
  const patterns = [
    /\bfrom\s*["']([^"']+)["']/g, // import … from "x" / export … from "x"
    /\bimport\s*["']([^"']+)["']/g, // import "x"
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g, // import("x"), typeof import("x")
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g, // require("x")
  ];
  const found: string[] = [];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      if (match[1] !== undefined) found.push(match[1]);
    }
  }
  return found;
}

/** Why a specifier is forbidden in `file`, or null when it is allowed. */
export function violation(file: string, specifier: string, srcRoot: string): string | null {
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const target = resolve(dirname(file), specifier);
    const inside = target === srcRoot || target.startsWith(srcRoot + sep);
    return inside ? null : `relative import escapes src/: ${specifier}`;
  }
  if (ALLOWED_PACKAGES.has(specifier)) {
    return null;
  }
  if (specifier.startsWith("node:")) {
    return `Node builtin: ${specifier}`;
  }
  return `not @vellum/protocol: ${specifier}`;
}

/** Ambient reads the engine must not make, each with the reason reported. */
const AMBIENT_READS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bDate\.now\s*\(/g, "reads the clock: Date.now("],
  [/\bnew\s+Date\s*\(\s*\)/g, "reads the clock: new Date()"],
  [/\bnew\s+Date\b(?!\s*\()/g, "reads the clock: new Date"],
  [/\bMath\.random\s*\(/g, "draws randomness: Math.random("],
  [/\bprocess\s*\./g, "reads the host: process."],
  [/\bglobalThis\s*\./g, "reads the host: globalThis."],
];

/** Strip comments so prose that names a forbidden call is not a violation. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

/** Every ambient read in a source text, one reason per occurrence. */
export function ambientReads(source: string): string[] {
  const code = stripComments(source);
  return AMBIENT_READS.flatMap(([pattern, reason]) =>
    [...code.matchAll(pattern)].map(() => reason),
  );
}

function isTestFile(path: string): boolean {
  return path.split(sep).includes("__tests__") || /\.(test|spec)\.tsx?$/.test(path);
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !isTestFile(path) ? [path] : [];
  });
}

describe("engine purity", () => {
  it("finds engine source files to check", () => {
    expect(sourceFiles(SRC).length).toBeGreaterThan(50);
  });

  it("imports nothing but @vellum/protocol and files inside src/", () => {
    const violations = sourceFiles(SRC).flatMap((file) =>
      moduleSpecifiers(readFileSync(file, "utf8"))
        .map((specifier) => violation(file, specifier, SRC))
        .filter((reason): reason is string => reason !== null)
        .map((reason) => `${relative(SRC, file)}: ${reason}`),
    );
    expect(violations).toEqual([]);
  });

  it("reads no clock, randomness, process or globalThis", () => {
    const violations = sourceFiles(SRC).flatMap((file) =>
      ambientReads(readFileSync(file, "utf8")).map((reason) => `${relative(SRC, file)}: ${reason}`),
    );
    expect(violations).toEqual([]);
  });

  it("recognises every forbidden ambient read (the check can fail)", () => {
    const source = [
      "const a = Date.now();",
      "const b = new Date();",
      "const c = new Date;",
      "const d = Math.random();",
      "const e = process.env.HOME;",
      "const f = globalThis.fetch;",
      "const ok1 = new Date(entry.timestamp).getTime();",
      "const ok2 = Date.parse(entry.timestamp);",
      "// Date.now() in a comment is prose, not a read",
      "/* process.exit() in a block comment */",
      'const url = "https://example.com"; // Math.random() trailing comment',
    ].join("\n");

    expect(ambientReads(source).sort()).toEqual(
      [
        "reads the clock: Date.now(",
        "reads the clock: new Date()",
        "reads the clock: new Date",
        "draws randomness: Math.random(",
        "reads the host: process.",
        "reads the host: globalThis.",
      ].sort(),
    );
  });

  it("recognises every forbidden form (the check can fail)", () => {
    const file = join(SRC, "gate", "example.ts");
    const source = [
      'import { readFile } from "node:fs/promises";',
      'import { createHash } from "crypto";',
      'import "@vellum/storage";',
      'export { x } from "../../../storage/src/index.js";',
      'const m = await import("node:child_process");',
      'const p = require("path");',
      'import type { Finding } from "@vellum/protocol";',
      'import { y } from "../validate/finding.js";',
    ].join("\n");

    const reasons = moduleSpecifiers(source)
      .map((specifier) => violation(file, specifier, SRC))
      .filter((reason): reason is string => reason !== null)
      .sort();

    expect(reasons).toEqual(
      [
        "Node builtin: node:fs/promises",
        "not @vellum/protocol: crypto",
        "not @vellum/protocol: @vellum/storage",
        "relative import escapes src/: ../../../storage/src/index.js",
        "Node builtin: node:child_process",
        "not @vellum/protocol: path",
      ].sort(),
    );
  });
});
