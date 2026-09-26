/**
 * Engine purity: the engine imports only @vellum/protocol.
 *
 * Every non-test source file under src/ may import only `@vellum/protocol`
 * and relative paths that stay inside src/. That rules out Node builtins in
 * either spelling (`node:fs`, `fs`), other workspace packages and any npm
 * package. Test files (`__tests__/`, `*.test.ts`, `*.spec.ts`) are exempt:
 * they are not part of the engine and need vitest.
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
