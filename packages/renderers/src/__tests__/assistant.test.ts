import { describe, expect, it } from "vitest";
import {
  AssistantSourceError,
  checkAgentFrontmatter,
  checkOpenCodeCommand,
  checkSkillFrontmatter,
  deriveOpenCodePermissions,
  parseFrontmatter,
  parseNeutralAgent,
  renderAgent,
  renderOpenCodeCommand,
  type ModelMap,
} from "../assistant.js";

const models: ModelMap = {
  tiers: ["economy", "standard", "frontier"],
  assistants: {
    claude: { economy: "haiku", standard: "sonnet", frontier: "opus" },
    kiro: {
      economy: "claude-sonnet-4",
      standard: "claude-sonnet-4",
      frontier: null,
    },
    opencode: { economy: null, standard: null, frontier: "acme/big-model" },
  },
};
const context = { models, skills: ["spec-tasks", "spec-new"] };
const options = {
  models,
  source: "method/agents/spec-planner.md",
  generator: "test",
};

const SOURCE = `---
name: spec-planner
description: Plans "tasks" from a design.
tools: Read, Write, Edit, Grep, Glob, Bash
tier: frontier
skills: [spec-tasks]
---

# Spec planner

Body text.
`;

describe("parseFrontmatter", () => {
  it("reads scalars, inline arrays, block sequences and mapping lists", () => {
    const { data, body } = parseFrontmatter(
      `---\na: "x \\"y\\""\nb: [p, 'q']\nc:\n  - one\n  - two\nd:\n  - action: shell\n    resource: "git *"\n    effect: ask\ne: true\n---\nbody\n`,
      "t",
    );
    expect(data).toEqual({
      a: 'x "y"',
      b: ["p", "q"],
      c: ["one", "two"],
      d: [{ action: "shell", resource: "git *", effect: "ask" }],
      e: true,
    });
    expect(body).toBe("body\n");
  });

  it("refuses a document without frontmatter or with unterminated frontmatter", () => {
    expect(() => parseFrontmatter("# no", "t")).toThrow(AssistantSourceError);
    expect(() => parseFrontmatter("---\na: b\n", "t")).toThrow(/unterminated/);
  });
});

describe("parseNeutralAgent", () => {
  it("validates and normalises a neutral source", () => {
    const { agent, body } = parseNeutralAgent(
      SOURCE,
      "spec-planner.md",
      context,
    );
    expect(agent).toEqual({
      name: "spec-planner",
      description: 'Plans "tasks" from a design.',
      tools: ["Read", "Write", "Edit", "Grep", "Glob", "Bash"],
      tier: "frontier",
      mode: "subagent",
      skills: ["spec-tasks"],
    });
    expect(body).toContain("# Spec planner");
  });

  it("reports every problem at once", () => {
    const bad = `---\nname: other\nmodel: [x]\ntier: huge\ntools: Read, Teleport\nskills: [nope]\ncolour: red\nmode: boss\n---\n`;
    try {
      parseNeutralAgent(bad, "spec-planner.md", context);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(AssistantSourceError);
      const problems = (error as AssistantSourceError).problems.join("\n");
      for (const fragment of [
        "unknown key 'colour'",
        "'name' is 'other'",
        "description",
        "'model'",
        "'tier' is 'huge'",
        "Teleport",
        "nope",
        "'mode'",
      ]) {
        expect(problems).toContain(fragment);
      }
    }
  });

  it("rejects a permission whose action or effect is unknown", () => {
    const src = `---\ndescription: d\npermissions:\n  - action: teleport\n    resource: "*"\n    effect: maybe\n---\n`;
    expect(() => parseNeutralAgent(src, "x.md", context)).toThrow(
      /KIRO_CAPABILITIES.*effect/s,
    );
  });
});

describe("renderAgent", () => {
  const { agent, body } = parseNeutralAgent(SOURCE, "spec-planner.md", context);

  it("renders the Claude Code dialect with the tier's model", () => {
    const out = renderAgent("claude", agent, body, options);
    expect(out).toBe(
      [
        "---",
        "name: spec-planner",
        'description: "Plans \\"tasks\\" from a design."',
        "tools: Read, Write, Edit, Grep, Glob, Bash",
        "model: opus",
        "skills:",
        "  - spec-tasks",
        "---",
        "",
        "<!-- generated from method/agents/spec-planner.md by test; edit the source, not this file -->",
        "",
        "# Spec planner",
        "",
        "Body text.",
        "",
      ].join("\n"),
    );
    expect(checkAgentFrontmatter("claude", out, "x")).toEqual([]);
  });

  it("namespaces Claude Code skills when the agent ships inside a plugin", () => {
    const out = renderAgent("claude", agent, body, { ...options, claudeSkillNamespace: "vellum" });
    expect(out).toContain("skills:\n  - vellum:spec-tasks\n");
  });

  it("renders the Kiro dialect: mapped tools, skill resources, no model for a null tier", () => {
    const out = renderAgent("kiro", agent, body, {
      ...options,
      kiroSkillRoot: "skills",
    });
    expect(out).toContain('tools: ["read", "write", "shell"]');
    expect(out).toContain('  - "skill://skills/spec-tasks/SKILL.md"');
    expect(out).not.toContain("model:");
    expect(checkAgentFrontmatter("kiro", out, "x")).toEqual([]);
  });

  it("renders the OpenCode dialect: no name, mode, derived denies, provider model", () => {
    const out = renderAgent("opencode", agent, body, options);
    expect(out).not.toMatch(/^name:/m);
    expect(out).toContain("mode: subagent");
    expect(out).toContain('model: "acme/big-model"');
    expect(out).toContain(
      '  - action: "webfetch"\n    resource: "*"\n    effect: deny',
    );
    expect(out).not.toContain('action: "edit"');
    expect(checkAgentFrontmatter("opencode", out, "x")).toEqual([]);
  });

  it("is deterministic", () => {
    expect(renderAgent("kiro", agent, body, options)).toBe(
      renderAgent("kiro", agent, body, options),
    );
  });
});

describe("deriveOpenCodePermissions", () => {
  it("denies every action a read-only grant lacks", () => {
    expect(
      deriveOpenCodePermissions(["Read", "Grep"])?.map((p) => p.action),
    ).toEqual(["edit", "shell", "webfetch", "websearch", "subagent"]);
  });
  it("allows everything when the grant reaches every action", () => {
    expect(
      deriveOpenCodePermissions([
        "Edit",
        "Bash",
        "WebFetch",
        "WebSearch",
        "Task",
      ]),
    ).toEqual([{ action: "*", resource: "*", effect: "allow" }]);
  });
  it("leaves permissions unset when the source grants no tools list", () => {
    expect(deriveOpenCodePermissions(undefined)).toBeUndefined();
  });
});

describe("checkAgentFrontmatter", () => {
  it("rejects keys, tools and models outside each dialect", () => {
    const claude =
      "---\nname: Bad_Name\ndescription: d\ntools: Read, Teleport\nmodel: gpt-9\ntier: frontier\n---\n";
    expect(checkAgentFrontmatter("claude", claude, "x")).toEqual([
      "'tier' is not a claude agent key",
      "missing provenance comment",
      "name 'Bad_Name' is not kebab-case",
      "unknown Claude Code tool 'Teleport'",
      "model 'gpt-9' is not a Claude Code alias or id",
    ]);
    const kiro =
      '---\nname: a\ndescription: d\ntools: ["read", "fly"]\nresources:\n  - file://x\n---\n<!-- generated from x -->\n';
    expect(checkAgentFrontmatter("kiro", kiro, "x")).toEqual([
      "unknown Kiro tool 'fly'",
      "resource 'file://x' is not a skill:// URI",
    ]);
    const opencode =
      "---\nname: a\ndescription: d\nmode: boss\nmodel: sonnet\npermissions:\n  - action: fly\n    effect: maybe\n---\n<!-- generated from x -->\n";
    expect(checkAgentFrontmatter("opencode", opencode, "x")).toEqual([
      "'name' is not a opencode agent key",
      "mode 'boss' is not one of primary, subagent, all",
      "model 'sonnet' is not provider/model",
      "permissions[0].action 'fly' is not an OpenCode action",
      "permissions[0].resource is missing",
      "permissions[0].effect 'maybe' is not allow, ask or deny",
    ]);
  });

  it("reports a missing frontmatter block instead of throwing", () => {
    expect(checkAgentFrontmatter("claude", "# none", "x")).toEqual([
      'missing frontmatter (must start with "---")',
    ]);
  });
});

describe("skills and commands", () => {
  it("checks SKILL.md frontmatter against its directory", () => {
    expect(
      checkSkillFrontmatter(
        "---\nname: spec\ndescription: Entry point.\n---\n",
        "spec",
      ),
    ).toEqual([]);
    expect(checkSkillFrontmatter("---\nname: other\n---\n", "spec")).toEqual([
      "name 'other' must equal its directory 'spec'",
      "missing 'description'",
    ]);
  });

  it("renders and checks an OpenCode command", () => {
    const out = renderOpenCodeCommand(
      { description: "Run the spec", agent: "build" },
      "Load it. $ARGUMENTS\n\n",
      {
        source: "s",
        generator: "g",
      },
    );
    expect(out).toBe(
      '---\ndescription: "Run the spec"\nagent: build\n---\n\n<!-- generated from s by g; edit the source, not this file -->\n\nLoad it. $ARGUMENTS\n',
    );
    expect(checkOpenCodeCommand(out, "x")).toEqual([]);
    expect(checkOpenCodeCommand("---\nsubtask: true\n---\n", "x")).toEqual([
      "'subtask' is not an OpenCode command key",
      "missing 'description'",
    ]);
  });
});
