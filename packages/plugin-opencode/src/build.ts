/**
 * Assemble the OpenCode package from @vellum/method. Pure: method data in, file tree out.
 *
 *   agents/<name>.md             OpenCode V2 dialect (mode, model, permissions list)
 *   commands/vellum.md           `/vellum`: the router, loads the `spec` skill
 *   commands/<stage>.md          one command per spec stage skill
 *   skills/<name>/SKILL.md       verbatim from the method
 *   templates/*.md, ROSTER.md    verbatim; skills fall back to ../../templates/
 *
 * No plugin module: see this package's README for why.
 */

import {
  parseNeutralAgent,
  renderAgent,
  renderOpenCodeCommand,
} from "@vellum/renderers";
import type { Method } from "./method.ts";

export const GENERATOR = "@vellum/plugin-opencode";

export interface StageCommand {
  /** Command name, also the file stem under commands/. */
  name: string;
  /** Skill the command loads. */
  skill: string;
  description: string;
  /** Agent the command runs as, when a method agent is the skill's persona. */
  agent?: string;
}

export const COMMANDS: readonly StageCommand[] = [
  {
    name: "vellum",
    skill: "spec",
    description:
      "Vellum entry point: read every spec's stage and ask which step to run next",
  },
  {
    name: "spec-new",
    skill: "spec-new",
    agent: "spec-author",
    description: "Start a new spec: requirements.md with EARS criteria",
  },
  {
    name: "spec-clarify",
    skill: "spec-clarify",
    agent: "spec-author",
    description:
      "Ask up to five questions that resolve a drafted spec's ambiguities",
  },
  {
    name: "spec-design",
    skill: "spec-design",
    agent: "spec-author",
    description: "Write design.md from approved requirements",
  },
  {
    name: "spec-tasks",
    skill: "spec-tasks",
    agent: "spec-planner",
    description: "Write tasks.md and its Task Dependency Graph",
  },
  {
    name: "spec-implement",
    skill: "spec-implement",
    agent: "spec-executor",
    description: "Implement exactly one task and record its evidence",
  },
  {
    name: "spec-run",
    skill: "spec-run",
    description:
      "Run a spec's task waves in order, one executor per ready task",
  },
  {
    name: "spec-verify",
    skill: "spec-verify",
    description: "Audit a spec's traceability: requirements, design and tasks",
  },
  {
    name: "spec-converge",
    skill: "spec-converge",
    agent: "spec-planner",
    description:
      "Compare the code with the spec and append a task for every gap",
  },
];

export interface BuildOptions {
  version: string;
}

function commandTemplate(command: StageCommand): string {
  return `Load the \`${command.skill}\` skill with the skill tool and follow its contract exactly.
Task state is recorded only through the \`vellum\` CLI (\`vellum task start\`, \`vellum task complete\`).

Arguments: $ARGUMENTS
`;
}

export function buildOpenCodePackage(
  method: Method,
  _options: BuildOptions,
): Map<string, string> {
  const files = new Map<string, string>();
  for (const file of method.verbatim) files.set(file.path, file.content);
  for (const file of method.agents) {
    const fileName = file.path.slice("agents/".length);
    const { agent, body } = parseNeutralAgent(file.content, fileName, {
      models: method.models,
      skills: method.skills,
    });
    files.set(
      file.path,
      renderAgent("opencode", agent, body, {
        models: method.models,
        source: `@vellum/method/${file.path}`,
        generator: GENERATOR,
      }),
    );
  }
  for (const command of COMMANDS) {
    if (!method.skills.includes(command.skill)) {
      throw new Error(
        `command '${command.name}' loads skill '${command.skill}', which the method does not ship`,
      );
    }
    files.set(
      `commands/${command.name}.md`,
      renderOpenCodeCommand(
        command.agent
          ? { description: command.description, agent: command.agent }
          : { description: command.description },
        commandTemplate(command),
        {
          source: `@vellum/method/skills/${command.skill}/SKILL.md`,
          generator: GENERATOR,
        },
      ),
    );
  }
  return new Map(
    [...files.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
}
