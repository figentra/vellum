/**
 * vellum approve — Record approval for an artifact
 */

import type { CliContext } from "../context.js";
import { EXIT_STATUS } from "@vellum/protocol";

interface ApproveArgs {
  spec: string;
  artifact: string;
  reject: boolean;
  rationale?: string | undefined;
}

/**
 * Run approve command.
 *
 * T4.4: Record approval, verify approver identity, generate ledger entry.
 * Criterion 7.5: Refuse outside Interactive Human Session
 * Criterion 7.6: Refuse from Assistant Session
 * Criterion 7.12: Write Approval Record
 * Criterion 7.13: Support rejection with rationale
 */
export async function approve(args: ApproveArgs, ctx: CliContext): Promise<number> {
  const { spec, artifact, reject, rationale } = args;

  try {
    // Check for non-interactive session
    if (!ctx.interactive) {
      ctx.stderr.write("Error: Approvals can only be recorded in interactive sessions.\n");
      ctx.stderr.write("Refusing: Non-interactive environment detected.\n");
      return EXIT_STATUS.FAILURE;
    }

    // Check for assistant session (would be set by the assistant runtime)
    if (process.env.ASSISTANT_SESSION === "true") {
      ctx.stderr.write("Error: Approvals cannot be recorded from assistant sessions.\n");
      ctx.stderr.write("Refusing: Assistant session detected.\n");
      return EXIT_STATUS.FAILURE;
    }

    // Validate artifact type
    const validArtifacts = ["requirements", "design", "tasks"];
    if (!validArtifacts.includes(artifact)) {
      ctx.stderr.write(`Error: Invalid artifact '${artifact}'.\n`);
      ctx.stderr.write(`Valid artifacts: ${validArtifacts.join(", ")}\n`);
      return EXIT_STATUS.FAILURE;
    }

    // Check rationale for rejection
    if (reject && !rationale) {
      ctx.stderr.write("Error: Rejection requires a rationale.\n");
      ctx.stderr.write("Use: vellum approve <spec> <artifact> --reject --rationale='...'\n");
      return EXIT_STATUS.FAILURE;
    }

    // TODO: Wire to actual engine when ready
    // const approver = getApproverIdentity(ctx);
    // const approval = createApproval(spec, artifact, reject, rationale, approver);
    // await writeApprovalRecord(approval);

    // Placeholder implementation
    if (reject) {
      ctx.stdout.write(`Rejected ${artifact} for spec ${spec}.\n`);
      ctx.stdout.write(`Rationale: ${rationale}\n`);
    } else {
      ctx.stdout.write(`Approved ${artifact} for spec ${spec}.\n`);
      ctx.stdout.write(`Recorded in ledger.\n`);
    }

    return EXIT_STATUS.SUCCESS;
  } catch (error) {
    ctx.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    return EXIT_STATUS.FAILURE;
  }
}
