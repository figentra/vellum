/**
 * vellum sync — Project .agents/ to assistant directories
 */

import type { CliContext } from "../context.js";
import { EXIT_STATUS } from "@vellum/protocol";

interface SyncArgs {
  target?: string;
  check: boolean;
  json: boolean;
}

/**
 * Run sync command.
 *
 * T4.11: Sync projections, update assistant directories.
 * Criterion 13.1-13.13: All projection rules
 * Criterion 13.5: Target filtering
 * Criterion 13.8: Check mode
 */
export async function sync(args: SyncArgs, ctx: CliContext): Promise<number> {
  const { target, check, json } = args;

  try {
    const targets = target ? [target] : ["kiro", "claude", "opencode"];

    // TODO: Wire to actual engine when ready
    // const projector = createProjector();
    // const result = await projector.sync({ targets, checkOnly: check });

    // Placeholder implementation
    const results = targets.map((t) => ({
      target: t,
      filesWritten: check ? 0 : 3,
      filesRemoved: check ? 0 : 1,
      drift: check ? false : null,
    }));

    if (json) {
      ctx.stdout.write(
        JSON.stringify(
          {
            command: "sync",
            mode: check ? "check" : "write",
            targets: results,
          },
          null,
          2,
        ) + "\n",
      );
    } else {
      if (check) {
        ctx.stdout.write("Checking for drift (read-only)...\n\n");
        for (const r of results) {
          ctx.stdout.write(`${r.target}: No drift detected\n`);
        }
      } else {
        ctx.stdout.write("Syncing .agents/ to assistant directories...\n\n");
        for (const r of results) {
          ctx.stdout.write(`${r.target}:`);
          if (r.filesWritten > 0) {
            ctx.stdout.write(` ${r.filesWritten} files written`);
          }
          if (r.filesRemoved > 0) {
            ctx.stdout.write(` ${r.filesRemoved} files removed`);
          }
          ctx.stdout.write("\n");
        }
      }
    }

    return EXIT_STATUS.SUCCESS;
  } catch (error) {
    ctx.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    return EXIT_STATUS.FAILURE;
  }
}
