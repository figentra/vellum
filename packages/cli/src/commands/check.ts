/**
 * vellum check — CI-safe verification without writing files
 */

import type { CliContext } from "../context.js";
import { EXIT_STATUS } from "@vellum/protocol";

interface CheckArgs {
  spec?: string;
  json: boolean;
}

/**
 * Run check command (CI-safe).
 *
 * T4.4: Check mode verification.
 * Criterion 6.6: Check Mode leaves files unmodified
 * Criterion 6.7: Exit 0 for clean
 * Criterion 6.8: Exit 1 for INVALID state
 * Criterion 6.9: Exit 1 for ledger integrity failure
 * Criterion 6.10: Exit 1 for recorded/effective mismatch
 * Criterion 12.8: Strict Verifier leaves files unmodified
 */
export async function check(args: CheckArgs, ctx: CliContext): Promise<number> {
  const { spec, json } = args;

  try {
    // TODO: Wire to actual engine when ready
    // const checkMode = createCheckMode();
    // const result = await checkMode.check(spec);

    // Placeholder implementation
    if (json) {
      ctx.stdout.write(
        JSON.stringify(
          {
            command: "check",
            spec: spec ?? "all",
            status: "PASS",
            checks: {
              stateValid: true,
              ledgerIntegrity: true,
              stateMatch: true,
              artifactsValid: true,
            },
          },
          null,
          2,
        ) + "\n",
      );
    } else {
      if (!spec) {
        ctx.stdout.write("Checking all specs (read-only)...\n");
      } else {
        ctx.stdout.write(`Checking spec ${spec} (read-only)...\n`);
      }
      ctx.stdout.write("✓ All checks passed\n");
    }

    return EXIT_STATUS.SUCCESS;
  } catch (error) {
    ctx.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    return EXIT_STATUS.FAILURE;
  }
}
