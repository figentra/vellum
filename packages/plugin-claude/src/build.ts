/**
 * Assemble the Claude Code plugin from @vellum/method. Pure: method data in, file tree out.
 *
 *   .claude-plugin/plugin.json   manifest, name `vellum`
 *   .mcp.json                    the Vellum MCP server
 *   skills/<name>/SKILL.md       verbatim from the method
 *   agents/<name>.md             Claude Code dialect, rendered by @vellum/renderers
 *   templates/*.md, ROSTER.md    verbatim; skills fall back to ../../templates/
 */

import { parseNeutralAgent, renderAgent } from "@vellum/renderers";
import type { Method } from "./method.ts";

export const GENERATOR = "@vellum/plugin-claude";

/**
 * How the plugin starts the Vellum MCP server. `vellum-mcp` must be a bin of the published
 * package; see this package's README for the open item.
 */
export const MCP_SERVER = {
  command: "npx",
  args: ["-y", "--package=@figentra/vellum", "vellum-mcp"],
} as const;

export interface BuildOptions {
  version: string;
}

const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

export function buildClaudePlugin(
  method: Method,
  options: BuildOptions,
): Map<string, string> {
  const files = new Map<string, string>();
  files.set(
    ".claude-plugin/plugin.json",
    json({
      name: "vellum",
      version: options.version,
      description:
        "Vellum spec lifecycle: EARS requirements, design, task plans and one-task execution, with the vellum CLI and MCP server as the source of truth.",
      author: { name: "Vellum" },
      license: "MIT",
      keywords: ["spec", "requirements", "design", "tasks"],
    }),
  );
  files.set(".mcp.json", json({ mcpServers: { vellum: MCP_SERVER } }));
  for (const file of method.verbatim) files.set(file.path, file.content);
  for (const file of method.agents) {
    const fileName = file.path.slice("agents/".length);
    const { agent, body } = parseNeutralAgent(file.content, fileName, {
      models: method.models,
      skills: method.skills,
    });
    files.set(
      file.path,
      renderAgent("claude", agent, body, {
        models: method.models,
        source: `@vellum/method/${file.path}`,
        generator: GENERATOR,
        claudeSkillNamespace: "vellum",
      }),
    );
  }
  return new Map(
    [...files.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
}
