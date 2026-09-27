/**
 * Process wiring around run(): arguments from argv, context from the
 * environment, the exit status onto process.exitCode. The `vellum` bin of
 * this package and of @figentra/vellum both call it.
 */

import { createCliContext } from "./context.js";
import { run } from "./run.js";

export function main(
  argv: readonly string[] = process.argv.slice(2),
): Promise<void> {
  return run(argv, createCliContext({})).then(
    (status) => {
      process.exitCode = status;
    },
    (error: unknown) => {
      process.stderr.write(
        `vellum: internal error: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
      );
      process.exitCode = 2;
    },
  );
}
