/**
 * Criterion 003:14.8: an MCP tool returns what the CLI returns for equal
 * inputs over the same repository state. Each case runs `vellum <cmd> --json`
 * through @vellum/cli's run() and the matching tool through @vellum/mcp's
 * callTool() on one temp git repository, and compares the documents.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseSpecId } from "@vellum/protocol";
import { run, type CliContext } from "@vellum/cli";
import { callTool } from "@vellum/mcp";
import { FixtureBuilder, createMinimalSpec } from "../framework.js";

async function cli(
  cwd: string,
  argv: string[],
): Promise<{ status: number; stdout: string; stderr: string }> {
  let stdout = "";
  let stderr = "";
  const ctx: CliContext = {
    json: true,
    cwd,
    ci: true,
    interactive: false,
    assistantSession: null,
    stdout: { write: (c: string) => (stdout += c) },
    stderr: { write: (c: string) => (stderr += c) },
  };
  const status = await run(argv, ctx);
  return { status, stdout, stderr };
}

async function tool(
  cwd: string,
  name: string,
  args: object,
): Promise<{ isError: boolean; value: unknown }> {
  const result = await callTool(cwd, name, args);
  return {
    isError: result.isError === true,
    value: JSON.parse(result.content[0]!.text),
  };
}

describe("MCP tools return the CLI's --json documents", () => {
  const builder = new FixtureBuilder("parity");
  let repo: string;
  let gitHome: string;
  const savedGlobal = process.env.GIT_CONFIG_GLOBAL;

  beforeAll(async () => {
    gitHome = mkdtempSync(join(tmpdir(), "vellum-parity-git-"));
    writeFileSync(join(gitHome, "gitconfig"), "");
    process.env.GIT_CONFIG_GLOBAL = join(gitHome, "gitconfig");
    await builder.init();
    repo = await builder.getTempDir();
    await createMinimalSpec(builder, parseSpecId("001")!, "IN_PROGRESS");
    await createMinimalSpec(builder, parseSpecId("002")!, "DRAFT");
    await builder.writeFile(
      ".agents/specs/003-legacy/requirements.md",
      "# Legacy\n",
    );
    await builder.commit("fixture");
  });

  afterAll(async () => {
    if (savedGlobal === undefined) delete process.env.GIT_CONFIG_GLOBAL;
    else process.env.GIT_CONFIG_GLOBAL = savedGlobal;
    rmSync(repo, { recursive: true, force: true });
    rmSync(gitHome, { recursive: true, force: true });
  });

  const cases: Array<[string, string[], string, object]> = [
    ["status, every spec", ["status", "--json"], "vellum_status", {}],
    [
      "status, one spec",
      ["status", "001", "--json"],
      "vellum_status",
      { spec: "001" },
    ],
    ["lint, every spec", ["lint", "--json"], "vellum_lint", {}],
    [
      "lint --type design",
      ["lint", "--type", "design", "--json"],
      "vellum_lint",
      { type: "design" },
    ],
    [
      "verify, specs IN_PROGRESS or later",
      ["verify", "--json"],
      "vellum_verify",
      {},
    ],
    [
      "verify, one spec",
      ["verify", "002", "--json"],
      "vellum_verify",
      { spec: "002" },
    ],
    ["check, every spec", ["check", "--json"], "vellum_check", {}],
    ["check, one spec", ["check", "001", "--json"], "vellum_check", { spec: "001" }],
  ];

  it.each(cases)("%s", async (_name, argv, name, args) => {
    const fromCli = await cli(repo, argv);
    const fromMcp = await tool(repo, name, args);
    expect(fromMcp.isError).toBe(false);
    expect(fromCli.stdout).not.toBe("");
    expect(fromMcp.value).toEqual(JSON.parse(fromCli.stdout));
  });

  it("refuses the same unmatched spec with the same message", async () => {
    const fromCli = await cli(repo, ["status", "999", "--json"]);
    const fromMcp = await tool(repo, "vellum_status", { spec: "999" });
    expect(fromCli.status).toBe(2);
    expect(fromMcp.isError).toBe(true);
    expect(fromCli.stderr).toBe(
      `vellum: ${(fromMcp.value as { message: string }).message}\n`,
    );
  });
});
