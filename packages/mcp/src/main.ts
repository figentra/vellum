/**
 * Process wiring for the stdio server: serve the repository containing the
 * working directory on stdin/stdout. Diagnostics go to stderr only, since
 * stdout carries the protocol.
 */

import { serveStdio } from "./stdio.js";

export async function main(): Promise<void> {
  await serveStdio({
    cwd: process.cwd(),
    input: process.stdin,
    output: process.stdout,
  });
}
