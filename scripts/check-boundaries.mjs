#!/usr/bin/env node
/**
 * Enforce the package dependency direction on DIRECT edges.
 *
 *   protocol ← engine ← storage ← cli / mcp
 *   renderers → engine, protocol
 *   method    → no code dependencies at all
 *   plugins   → method, renderers
 *   vellum    → cli, mcp
 *   testing   → any package; private; nothing depends on it
 *   tooling   → nothing; anything but method may depend on it
 *
 * Why a script and not only turbo.json `boundaries`: Turborepo evaluates tag
 * rules over the transitive graph, so it cannot say "plugins reach engine only
 * through renderers", and `turbo boundaries` also fails on every member that
 * imports the root-hoisted `vitest` without declaring it. This check reads
 * every workspace member's manifest (dependencies, devDependencies,
 * peerDependencies, optionalDependencies) and fails on any workspace edge not
 * in the table, on any member it cannot classify, and on a non-private
 * testing package. Node builtins only.
 *
 * Usage: node scripts/check-boundaries.mjs   (exit 0 = clean, 1 = violations)
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");

/** Tier of a workspace package, from its name. */
function tierOf(name) {
  if (name === "@figentra/vellum") return "vellum";
  if (name.startsWith("@vellum/plugin-")) return "plugin";
  const fixed = {
    "@vellum/protocol": "protocol",
    "@vellum/engine": "engine",
    "@vellum/storage": "storage",
    "@vellum/renderers": "renderers",
    "@vellum/cli": "cli",
    "@vellum/mcp": "mcp",
    "@vellum/method": "method",
    "@vellum/testing": "testing",
    "@vellum/tsconfig": "tooling",
    "@vellum/oxlint-config": "tooling",
    "@vellum/vitest-config": "tooling",
  };
  return fixed[name];
}

const ANY = Symbol("any");

/** Tiers each tier may depend on directly. */
const ALLOWED = {
  protocol: ["tooling"],
  engine: ["protocol", "tooling"],
  storage: ["engine", "protocol", "tooling"],
  renderers: ["engine", "protocol", "tooling"],
  cli: ["storage", "renderers", "engine", "protocol", "tooling"],
  mcp: ["storage", "renderers", "engine", "protocol", "tooling"],
  method: [],
  plugin: ["method", "renderers", "tooling"],
  vellum: ["cli", "mcp", "tooling"],
  testing: ANY,
  tooling: [],
};

const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

/** Workspace member directories from pnpm-workspace.yaml (`dir/*` and plain `dir` entries). */
function workspaceDirs() {
  const yaml = readFileSync(join(ROOT, "pnpm-workspace.yaml"), "utf8");
  const block = yaml.split(/^packages:\s*$/m)[1] ?? "";
  const globs = [];
  for (const line of block.split("\n")) {
    const match = line.match(/^\s+-\s*['"]?([^'"#]+?)['"]?\s*$/);
    if (match) globs.push(match[1]);
    else if (/^\S/.test(line)) break; // next top-level key
  }
  if (globs.length === 0) throw new Error("pnpm-workspace.yaml: no packages entries found");

  return globs.flatMap((glob) => {
    if (glob.endsWith("/*")) {
      const parent = join(ROOT, glob.slice(0, -2));
      if (!existsSync(parent)) return [];
      return readdirSync(parent, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => join(parent, e.name));
    }
    if (glob.includes("*")) throw new Error(`unsupported workspace glob: ${glob}`);
    return [join(ROOT, glob)];
  });
}

function readManifests() {
  return workspaceDirs()
    .filter((dir) => existsSync(join(dir, "package.json")))
    .map((dir) => ({ dir, manifest: JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) }));
}

export function check(members) {
  const names = new Set(members.map((m) => m.manifest.name));
  const errors = [];

  for (const { dir, manifest } of members) {
    const where = `${manifest.name} (${dir.slice(ROOT.length + 1)})`;
    const tier = tierOf(manifest.name);
    if (!tier) {
      errors.push(`${where}: no tier assigned; add it to scripts/check-boundaries.mjs`);
      continue;
    }
    if (tier === "testing" && manifest.private !== true) {
      errors.push(`${where}: the testing package must be private`);
    }

    for (const field of DEPENDENCY_FIELDS) {
      for (const dep of Object.keys(manifest[field] ?? {})) {
        if (tier === "method") {
          errors.push(`${where}: method has no code dependencies, but ${field} lists ${dep}`);
          continue;
        }
        if (!names.has(dep)) continue; // external package; not a workspace edge
        const depTier = tierOf(dep);
        const allowed = ALLOWED[tier];
        if (allowed === ANY) continue;
        if (!allowed.includes(depTier)) {
          errors.push(`${where}: ${tier} may not depend on ${depTier} (${field}: ${dep})`);
        }
      }
    }
  }
  return errors;
}

const members = readManifests();
const errors = check(members);
if (errors.length > 0) {
  console.error(`Dependency boundaries: ${errors.length} violation(s)`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`Dependency boundaries: ${members.length} workspace members checked, no violations`);
