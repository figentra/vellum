/**
 * Assemble the Kiro Power from @vellum/method. Pure: method data in, file tree out.
 *
 *   plugin.json                    manifest with activation keywords (fields unverified; README)
 *   mcp.json                       the Vellum MCP server
 *   skills/<name>/SKILL.md         verbatim from the method
 *   templates/*.md, ROSTER.md      verbatim; skills fall back to ../../templates/
 *   dev.kiro/steering/vellum.md    always-on steering: record task state through `vellum task`
 *   dev.kiro/agents/<name>.md      Kiro dialect, rendered by @vellum/renderers
 */

import {
  parseNeutralAgent,
  provenanceLine,
  renderAgent,
} from "@vellum/renderers";
import type { Method } from "./method.ts";

export const GENERATOR = "@vellum/plugin-kiro";

/**
 * How the power starts the Vellum MCP server: the `vellum-mcp` bin of the project's own
 * @figentra/vellum dev dependency. `npx --no` runs only an already-installed bin and never
 * downloads, so starting the server needs no registry access or token; the skills call the
 * same local `vellum` CLI. Without the dev dependency, npx fails naming the missing package.
 */
export const MCP_SERVER = {
  command: "npx",
  args: ["--no", "vellum-mcp"],
} as const;

/** Words that activate the power. */
export const ACTIVATION_KEYWORDS = [
  "spec",
  "requirements",
  "design",
  "tasks",
  "acceptance criteria",
  "EARS",
  "vellum",
] as const;

export interface BuildOptions {
  version: string;
}

const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

/** Kiro steering: `inclusion: always` loads it in every session. */
export function steering(): string {
  return `---
inclusion: always
---

${provenanceLine("@vellum/method (steering)", GENERATOR)}

# Vellum

This workspace manages specs with Vellum. Specs live in \`.agents/specs/<NNN>-<slug>/\` as
\`requirements.md\`, \`design.md\` and \`tasks.md\`; the \`spec\` skill is the entry point.

- Read a spec's stage with \`vellum status --json\`; never infer it from a directory listing.
- Validate with \`vellum lint <NNN> --json\` after editing any spec document.
- Before implementing a task, run \`vellum task start <NNN> <task-id>\`. If it refuses, stop and
  report its output.
- Record task completion only through \`vellum task complete <NNN> <task-id>
  --command="<the verification command>"\`. Vellum runs the command itself and records its real
  exit status; it sets \`[x]\` only on exit 0. Do not mark a task done any other way: a checkbox
  edited by hand is not evidence.
- A document is approved by a human with \`vellum approve <NNN> <artifact>\`; never approve on the
  user's behalf.
`;
}

export function buildKiroPower(
  method: Method,
  options: BuildOptions,
): Map<string, string> {
  const files = new Map<string, string>();
  files.set(
    "plugin.json",
    json({
      name: "vellum",
      version: options.version,
      description:
        "Vellum spec lifecycle: EARS requirements, design, task plans and one-task execution, recorded through the vellum CLI.",
      keywords: [...ACTIVATION_KEYWORDS],
    }),
  );
  files.set("mcp.json", json({ mcpServers: { vellum: MCP_SERVER } }));
  files.set("dev.kiro/steering/vellum.md", steering());
  for (const file of method.verbatim) files.set(file.path, file.content);
  for (const file of method.agents) {
    const fileName = file.path.slice("agents/".length);
    const { agent, body } = parseNeutralAgent(file.content, fileName, {
      models: method.models,
      skills: method.skills,
    });
    files.set(
      `dev.kiro/${file.path}`,
      renderAgent("kiro", agent, body, {
        models: method.models,
        source: `@vellum/method/${file.path}`,
        generator: GENERATOR,
      }),
    );
  }
  return new Map(
    [...files.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
}
