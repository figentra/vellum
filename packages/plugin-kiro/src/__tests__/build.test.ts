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
import { buildKiroPower, steering } from "../build.ts";
import { readMethod } from "../method.ts";
import { writeTree } from "../write.ts";

const method = readMethod();
const files = buildKiroPower(method, { version: "1.2.3" });
const scratch = mkdtempSync(join(tmpdir(), "vellum-plugin-kiro-"));
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

describe("plugin-kiro build", () => {
  it("is deterministic: two builds write identical bytes", () => {
    const a = join(scratch, "a");
    const b = join(scratch, "b");
    writeTree(a, buildKiroPower(readMethod(), { version: "1.2.3" }));
    writeTree(b, buildKiroPower(readMethod(), { version: "1.2.3" }));
    const left = snapshot(a);
    const right = snapshot(b);
    expect([...left.keys()]).toEqual([...right.keys()]);
    expect(left.size).toBe(files.size);
    for (const [path, bytes] of left)
      expect(bytes.equals(right.get(path) as Buffer), path).toBe(true);
  });

  it("writes a minimal manifest that declares activation keywords", () => {
    const manifest = JSON.parse(files.get("plugin.json") as string);
    expect(Object.keys(manifest).sort()).toEqual([
      "description",
      "keywords",
      "name",
      "version",
    ]);
    expect(manifest.name).toBe("vellum");
    expect(manifest.keywords).toContain("spec");
    expect(
      manifest.keywords.every(
        (k: unknown) => typeof k === "string" && k.length > 0,
      ),
    ).toBe(true);
  });

  it("references the Vellum MCP server in mcp.json", () => {
    const mcp = JSON.parse(files.get("mcp.json") as string);
    expect(Object.keys(mcp.mcpServers)).toEqual(["vellum"]);
    expect(mcp.mcpServers.vellum.args).toContain("vellum-mcp");
  });

  it("steers Kiro to record task completion through vellum task complete", () => {
    const text = files.get("dev.kiro/steering/vellum.md") as string;
    expect(text).toBe(steering());
    expect(text.startsWith("---\ninclusion: always\n---\n")).toBe(true);
    expect(text).toContain("vellum task complete <NNN> <task-id>");
    expect(text).toContain("vellum task start");
  });

  it("ships every method skill verbatim with valid skill frontmatter", () => {
    expect(method.skills).toHaveLength(9);
    for (const skill of method.skills) {
      const path = `skills/${skill}/SKILL.md`;
      expect(files.get(path), path).toBe(
        readFileSync(join(method.root, path), "utf8"),
      );
      expect(
        checkSkillFrontmatter(files.get(path) as string, skill),
        path,
      ).toEqual([]);
    }
  });

  it("renders every agent in the Kiro dialect, passing its frontmatter checks", () => {
    const agents = [...files.keys()].filter((p) =>
      p.startsWith("dev.kiro/agents/"),
    );
    expect(agents).toHaveLength(12);
    for (const path of agents)
      expect(
        checkAgentFrontmatter("kiro", files.get(path) as string, path),
        path,
      ).toEqual([]);
  });

  it("ships the templates and contains no CLAUDE_PLUGIN_ROOT reference", () => {
    for (const t of ["requirements.md", "design.md", "tasks.md"])
      expect(files.has(`templates/${t}`)).toBe(true);
    expect(
      [...files]
        .filter(([, c]) => c.includes("CLAUDE_PLUGIN_ROOT"))
        .map(([p]) => p),
    ).toEqual([]);
  });
});
