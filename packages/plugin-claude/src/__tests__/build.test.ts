import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  checkAgentFrontmatter,
  checkSkillFrontmatter,
} from "@vellum/renderers";
import { buildClaudePlugin } from "../build.ts";
import { readMethod } from "../method.ts";
import { writeTree } from "../write.ts";

const method = readMethod();
const files = buildClaudePlugin(method, { version: "1.2.3" });
const scratch = mkdtempSync(join(tmpdir(), "vellum-plugin-claude-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

function snapshot(dir: string): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  const walk = (d: string): void => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.set(relative(dir, p), readFileSync(p));
    }
  };
  walk(dir);
  return out;
}

describe("plugin-claude build", () => {
  it("is deterministic: two builds write identical bytes", () => {
    const a = join(scratch, "a");
    const b = join(scratch, "b");
    writeTree(a, buildClaudePlugin(readMethod(), { version: "1.2.3" }));
    writeTree(b, buildClaudePlugin(readMethod(), { version: "1.2.3" }));
    const left = snapshot(a);
    const right = snapshot(b);
    expect([...left.keys()]).toEqual([...right.keys()]);
    expect(left.size).toBe(files.size);
    for (const [path, bytes] of left)
      expect(bytes.equals(right.get(path) as Buffer), path).toBe(true);
  });

  it("writes a plugin manifest Claude Code accepts", () => {
    const manifest = JSON.parse(
      files.get(".claude-plugin/plugin.json") as string,
    );
    expect(manifest.name).toBe("vellum");
    expect(manifest.version).toBe("1.2.3");
    expect(typeof manifest.description).toBe("string");
    expect(Object.keys(manifest).sort()).toEqual(
      [
        "author",
        "description",
        "keywords",
        "license",
        "name",
        "version",
      ].sort(),
    );
  });

  it("references the Vellum MCP server", () => {
    const mcp = JSON.parse(files.get(".mcp.json") as string);
    expect(Object.keys(mcp.mcpServers)).toEqual(["vellum"]);
    expect(mcp.mcpServers.vellum.command).toBe("npx");
    expect(mcp.mcpServers.vellum.args).toContain("vellum-mcp");
  });

  it("ships every method skill verbatim with valid skill frontmatter", () => {
    expect(method.skills).toHaveLength(9);
    for (const skill of method.skills) {
      const path = `skills/${skill}/SKILL.md`;
      const content = files.get(path);
      expect(content, path).toBe(readFileSync(join(method.root, path), "utf8"));
      expect(checkSkillFrontmatter(content as string, skill), path).toEqual([]);
    }
  });

  it("renders every agent in the Claude Code dialect, passing its frontmatter checks", () => {
    const agents = [...files.keys()].filter((p) => p.startsWith("agents/"));
    expect(agents).toHaveLength(12);
    for (const path of agents) {
      expect(
        checkAgentFrontmatter("claude", files.get(path) as string, path),
        path,
      ).toEqual([]);
      expect(files.get(path)).not.toMatch(/^tier:/m);
    }
  });

  it("ships the templates where the skills' fallback path finds them", () => {
    for (const t of ["requirements.md", "design.md", "tasks.md"])
      expect(files.has(`templates/${t}`)).toBe(true);
    expect(files.has("ROSTER.md")).toBe(true);
  });

  it("contains no CLAUDE_PLUGIN_ROOT reference", () => {
    const offenders = [...files]
      .filter(([, c]) => c.includes("CLAUDE_PLUGIN_ROOT"))
      .map(([p]) => p);
    expect(offenders).toEqual([]);
  });
});
