#!/usr/bin/env node
/**
 * Vellum CLI entry point: process wiring around run().
 */

import { createCliContext } from "./context.js";
import { run } from "./run.js";

run(process.argv.slice(2), createCliContext({})).then(
  (status) => {
    process.exitCode = status;
  },
  (error: unknown) => {
    process.stderr.write(`vellum: internal error: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
    process.exitCode = 2;
  },
);
