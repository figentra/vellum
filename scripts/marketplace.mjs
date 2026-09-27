#!/usr/bin/env node
/**
 * The Claude Code marketplace this repository serves (`claude plugin marketplace add
 * figentra/vellum`, then `claude plugin install vellum@figentra`).
 *
 * A marketplace installs from committed files, and packages/plugin-claude/dist is build output,
 * so this script copies the built plugin to plugins/claude/vellum/ and writes
 * .claude-plugin/marketplace.json with the plugin's version.
 *
 *   node scripts/marketplace.mjs          sync the committed copy from the build
 *   node scripts/marketplace.mjs --check  exit 1 if the committed copy differs from the build
 *
 * Run `pnpm --filter @vellum/plugin-claude build` first; lint runs --check after that build.
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const built = join(root, "packages", "plugin-claude", "dist");
const committed = join(root, "plugins", "claude", "vellum");
const marketplacePath = join(root, ".claude-plugin", "marketplace.json");

if (!existsSync(join(built, ".claude-plugin", "plugin.json"))) {
  console.error("marketplace: packages/plugin-claude/dist is not built; run its build first");
  process.exit(2);
}

const plugin = JSON.parse(readFileSync(join(built, ".claude-plugin", "plugin.json"), "utf8"));
const marketplace = `${JSON.stringify(
  {
    name: "figentra",
    owner: { name: "Figentra" },
    metadata: { description: "Figentra's Claude Code plugins" },
    plugins: [
      {
        name: plugin.name,
        source: `./${relative(root, committed)}`,
        description: plugin.description,
        version: plugin.version,
        license: plugin.license,
        keywords: plugin.keywords,
      },
    ],
  },
  null,
  2,
)}\n`;

function files(dir) {
  if (!existsSync(dir)) return new Map();
  const out = new Map();
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.set(relative(dir, p), readFileSync(p, "utf8"));
    }
  };
  walk(dir);
  return out;
}

if (process.argv.includes("--check")) {
  const want = files(built);
  const have = files(committed);
  const problems = [];
  for (const [path, content] of want) {
    if (!have.has(path)) problems.push(`missing: plugins/claude/vellum/${path}`);
    else if (have.get(path) !== content) problems.push(`differs: plugins/claude/vellum/${path}`);
  }
  for (const path of have.keys())
    if (!want.has(path)) problems.push(`extra: plugins/claude/vellum/${path}`);
  if (!existsSync(marketplacePath) || readFileSync(marketplacePath, "utf8") !== marketplace) {
    problems.push("differs: .claude-plugin/marketplace.json");
  }
  if (problems.length > 0) {
    console.error(
      `marketplace: committed plugin is out of date with the build:\n  ${problems.join("\n  ")}`,
    );
    console.error("Run: node scripts/marketplace.mjs");
    process.exit(1);
  }
  console.log(
    `marketplace: plugins/claude/vellum matches the build (${want.size} files, v${plugin.version})`,
  );
} else {
  rmSync(committed, { recursive: true, force: true });
  mkdirSync(dirname(committed), { recursive: true });
  cpSync(built, committed, { recursive: true });
  mkdirSync(dirname(marketplacePath), { recursive: true });
  writeFileSync(marketplacePath, marketplace);
  console.log(`marketplace: synced plugins/claude/vellum (v${plugin.version})`);
}
