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
  checkOpenCodeCommand,
  parseFrontmatter,
  checkSkillFrontmatter,
} from "@vellum/renderers";
import { buildOpenCodePackage, COMMANDS } from "../build.ts";
import { readMethod } from "../method.ts";
import { writeTree } from "../write.ts";

const method = readMethod();
const files = buildOpenCodePackage(method, { version: "1.2.3" });
const scratch = mkdtempSync(join(tmpdir(), "vellum-plugin-opencode-"));
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

describe("plugin-opencode build", () => {
  it("is deterministic: two builds write identical bytes", () => {
    const a = join(scratch, "a");
    const b = join(scratch, "b");
    writeTree(a, buildOpenCodePackage(readMethod(), { version: "1.2.3" }));
    writeTree(b, buildOpenCodePackage(readMethod(), { version: "1.2.3" }));
    const left = snapshot(a);
    const right = snapshot(b);
    expect([...left.keys()]).toEqual([...right.keys()]);
    expect(left.size).toBe(files.size);
    for (const [path, bytes] of left)
      expect(bytes.equals(right.get(path) as Buffer), path).toBe(true);
  });

  it("renders every agent in the OpenCode V2 dialect, passing its frontmatter checks", () => {
    const agents = [...files.keys()].filter((p) => p.startsWith("agents/"));
    expect(agents).toHaveLength(12);
    for (const path of agents) {
      const text = files.get(path) as string;
      expect(checkAgentFrontmatter("opencode", text, path), path).toEqual([]);
      expect(
        parseFrontmatter(text, path).data.permissions,
        `${path} permissions`,
      ).toBeInstanceOf(Array);
    }
  });

  it("denies edit and shell to a read-only reviewer", () => {
    const text = files.get("agents/code-reviewer.md") as string;
    expect(text).toContain(
      '  - action: "edit"\n    resource: "*"\n    effect: deny',
    );
    expect(text).not.toContain('action: "shell"');
  });

  it("writes the /vellum router and one command per stage skill, each passing its checks", () => {
    const commands = [...files.keys()]
      .filter((p) => p.startsWith("commands/"))
      .sort();
    expect(commands).toEqual(
      COMMANDS.map((c) => `commands/${c.name}.md`).sort(),
    );
    expect(commands).toContain("commands/vellum.md");
    for (const command of COMMANDS) {
      const path = `commands/${command.name}.md`;
      const text = files.get(path) as string;
      expect(checkOpenCodeCommand(text, path), path).toEqual([]);
      expect(text).toContain(`Load the \`${command.skill}\` skill`);
      expect(text).toContain("$ARGUMENTS");
      if (command.agent)
        expect(files.has(`agents/${command.agent}.md`), `${path} agent`).toBe(
          true,
        );
    }
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

  it("ships the templates, no plugin module, and no CLAUDE_PLUGIN_ROOT reference", () => {
    for (const t of ["requirements.md", "design.md", "tasks.md"])
      expect(files.has(`templates/${t}`)).toBe(true);
    expect([...files.keys()].filter((p) => /\.(js|ts)$/.test(p))).toEqual([]);
    expect(
      [...files]
        .filter(([, c]) => c.includes("CLAUDE_PLUGIN_ROOT"))
        .map(([p]) => p),
    ).toEqual([]);
  });
});
