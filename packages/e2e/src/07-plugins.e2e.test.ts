/**
 * Scenario 7 — the three assistant plugins as built (each plugin package's dist,
 * produced by their `build` tasks, which this package's `test` depends on):
 * the structure each package test asserts on the in-memory build, re-checked
 * on the files on disk; Claude Code's own validator when the `claude` binary
 * is installed; and every `vellum <command>` a shipped skill, agent, command
 * or steering file tells an assistant to run exists in the installed
 * `vellum --help`.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, inject, it } from "vitest";
import { checkAgentFrontmatter, checkOpenCodeCommand, checkSkillFrontmatter } from "@vellum/renderers";

const PACKAGES = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dist = (plugin: string) => join(PACKAGES, `plugin-${plugin}`, "dist");
const SKILL_COUNT = 11;
const AGENT_COUNT = 12;

/** Every file under `dir`, relative to it, sorted. */
function files(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const name of readdirSync(d).sort()) {
      const path = join(d, name);
      if (statSync(path).isDirectory()) walk(path);
      else out.push(relative(dir, path));
    }
  };
  walk(dir);
  return out;
}

const read = (plugin: string, path: string) => readFileSync(join(dist(plugin), path), "utf8");
const json = (plugin: string, path: string) => JSON.parse(read(plugin, path)) as Record<string, unknown>;

function expectSkills(plugin: string): void {
  const skills = files(dist(plugin)).filter((p) => /^skills\/[^/]+\/SKILL\.md$/.test(p));
  expect(skills, plugin).toHaveLength(SKILL_COUNT);
  for (const path of skills) {
    expect(checkSkillFrontmatter(read(plugin, path), basename(dirname(path))), `${plugin}: ${path}`).toEqual([]);
  }
  for (const template of ["requirements.md", "design.md", "tasks.md"]) {
    expect(files(dist(plugin)), `${plugin}: templates/${template}`).toContain(`templates/${template}`);
  }
}

function claudeBinary(): string | null {
  const probe = spawnSync("claude", ["--version"], { encoding: "utf8" });
  return probe.status === 0 ? "claude" : null;
}
const CLAUDE = claudeBinary();
if (CLAUDE === null) {
  console.warn(
    "07-plugins: SKIPPING `claude plugin validate --strict` — the `claude` binary is not on PATH; the structural checks still run",
  );
}

describe("scenario 7: plugins as built", () => {
  describe("Claude Code", () => {
    it("has a manifest, the MCP server, every skill and agent in the Claude dialect", () => {
      const manifest = json("claude", ".claude-plugin/plugin.json");
      expect(Object.keys(manifest).sort()).toEqual(["author", "description", "keywords", "license", "name", "version"]);
      expect(manifest.name).toBe("vellum");
      const mcp = json("claude", ".mcp.json") as { mcpServers: Record<string, { command: string; args: string[] }> };
      expect(Object.keys(mcp.mcpServers)).toEqual(["vellum"]);
      expect(mcp.mcpServers.vellum!.args).toContain("vellum-mcp");
      expectSkills("claude");
      const agents = files(dist("claude")).filter((p) => p.startsWith("agents/"));
      expect(agents).toHaveLength(AGENT_COUNT);
      for (const path of agents) {
        expect(checkAgentFrontmatter("claude", read("claude", path), path), path).toEqual([]);
      }
    });

    it.skipIf(CLAUDE === null)("passes `claude plugin validate --strict`", () => {
      // Its own HOME, so no user setting or credential of this machine is read.
      const home = mkdtempSync(join(tmpdir(), "vellum-e2e-claude-"));
      try {
        const result = spawnSync(CLAUDE!, ["plugin", "validate", "--strict", dist("claude")], {
          env: { PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR ?? tmpdir() },
          encoding: "utf8",
          timeout: 60_000,
        });
        expect(`${result.stdout}${result.stderr}`).toContain("Validation passed");
        expect(result.status).toBe(0);
      } finally {
        rmSync(home, { recursive: true, force: true });
      }
    });
  });

  describe("Kiro", () => {
    it("has a minimal manifest, the MCP server, steering, every skill and agent in the Kiro dialect", () => {
      const manifest = json("kiro", "plugin.json");
      expect(Object.keys(manifest).sort()).toEqual(["description", "keywords", "name", "version"]);
      expect(manifest.keywords).toContain("spec");
      const mcp = json("kiro", "mcp.json") as { mcpServers: Record<string, { args: string[] }> };
      expect(Object.keys(mcp.mcpServers)).toEqual(["vellum"]);
      expect(mcp.mcpServers.vellum!.args).toContain("vellum-mcp");
      const steering = read("kiro", "dev.kiro/steering/vellum.md");
      expect(steering.startsWith("---\ninclusion: always\n---\n")).toBe(true);
      expect(steering).toContain("vellum task complete <NNN> <task-id>");
      expectSkills("kiro");
      const agents = files(dist("kiro")).filter((p) => p.startsWith("dev.kiro/agents/"));
      expect(agents).toHaveLength(AGENT_COUNT);
      for (const path of agents) {
        expect(checkAgentFrontmatter("kiro", read("kiro", path), path), path).toEqual([]);
      }
    });
  });

  describe("OpenCode", () => {
    it("has every agent in the OpenCode dialect, the commands, every skill, and no plugin module", () => {
      const all = files(dist("opencode"));
      const agents = all.filter((p) => p.startsWith("agents/"));
      expect(agents).toHaveLength(AGENT_COUNT);
      for (const path of agents) {
        expect(checkAgentFrontmatter("opencode", read("opencode", path), path), path).toEqual([]);
      }
      const commands = all.filter((p) => p.startsWith("commands/"));
      expect(commands).toContain("commands/vellum.md");
      for (const path of commands) {
        const text = read("opencode", path);
        expect(checkOpenCodeCommand(text, path), path).toEqual([]);
        expect(text).toContain("$ARGUMENTS");
      }
      expectSkills("opencode");
      expect(all.filter((p) => /\.(js|ts|mjs|cjs)$/.test(p))).toEqual([]);
    });
  });

  it("names only vellum commands the installed CLI has", () => {
    const help = spawnSync(join(inject("vellumBinDir"), "vellum"), ["--help"], { encoding: "utf8" });
    expect(help.status).toBe(0);
    // `  <command> …` lines of the COMMANDS section; `task start` / `task complete` are two words.
    const section = help.stdout.split("\nCOMMANDS\n")[1]!.split("\nEXIT STATUS\n")[0]!;
    const available = new Set(
      [...section.matchAll(/^ {2}([a-z][a-z-]*(?: (?:start|complete))?)\b/gm)].map((m) => m[1]!),
    );
    expect([...available].sort()).toEqual(
      ["approve", "check", "doctor", "lint", "status", "task complete", "task start", "verify"].sort(),
    );

    const mentioned = new Map<string, string>();
    for (const plugin of ["claude", "kiro", "opencode"]) {
      for (const path of files(dist(plugin)).filter((p) => p.endsWith(".md"))) {
        const text = read(plugin, path);
        // Commands appear in code: inline spans and fenced blocks.
        const code = [...text.matchAll(/```[\s\S]*?```|`[^`\n]+`/g)].map((m) => m[0]).join("\n");
        for (const m of code.matchAll(/(?:^|[\s`(])(?:npx )?vellum ([a-z][a-z-]*)(?: (start|complete)\b)?/gm)) {
          const command = m[1] === "task" && m[2] !== undefined ? `task ${m[2]}` : m[1]!;
          if (!mentioned.has(command)) mentioned.set(command, `${plugin}/${path}`);
        }
      }
    }
    expect(mentioned.size).toBeGreaterThan(3);
    const unknown = [...mentioned].filter(([command]) => !available.has(command)).map(([c, where]) => `${c} (${where})`);
    expect(unknown).toEqual([]);
  });
});
