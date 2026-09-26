/**
 * vellum status — Show combined state for one or all specs
 */

import type { CliContext } from "../context.js";
import { EXIT_STATUS } from "@vellum/protocol";

interface StatusArgs {
  spec?: string;
  json: boolean;
}

/**
 * Run status command.
 *
 * T4.3: Show spec status, display state, list requirements.
 * Criterion 6.1: Combined state reported
 * Criterion 6.2: JSON output with --json
 * Criterion 6.3: Spec filtering by number/slug
 * Criterion 6.4: Error on ambiguous/no match
 * Criterion 6.5: Next permitted transition shown
 */
export async function status(args: StatusArgs, ctx: CliContext): Promise<number> {
  const { spec, json } = args;

  try {
    // TODO: Wire to actual engine when ready
    // const statusReporter = createStatusReporter();
    // const statusResult = await statusReporter.report(spec);

    // Placeholder implementation
    if (json) {
      ctx.stdout.write(
        JSON.stringify(
          {
            command: "status",
            specs: spec
              ? [
                  {
                    id: spec,
                    state: "DRAFT",
                    recordedState: "DRAFT",
                    effectiveState: "DRAFT",
                    artifacts: {
                      requirements: { version: 1, checksum: "abcd1234" },
                      design: { version: 1, checksum: "efgh5678" },
                      tasks: { version: 1, checksum: "ijkl9012" },
                    },
                    approvals: { requirements: 0, design: 0, tasks: 0 },
                    nextTransition: null,
                    unmetPreconditions: ["ARTIFACT_EXISTS"],
                  },
                ]
              : [],
          },
          null,
          2,
        ) + "\n",
      );
    } else {
      if (!spec) {
        ctx.stdout.write("No specs found.\n");
      } else {
        ctx.stdout.write(`Spec: ${spec}\n`);
        ctx.stdout.write(`State: DRAFT\n`);
        ctx.stdout.write(
          `Next: Write requirements and run 'vellum approve ${spec} requirements'\n`,
        );
      }
    }

    return EXIT_STATUS.SUCCESS;
  } catch (error) {
    ctx.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    return EXIT_STATUS.FAILURE;
  }
}
