/**
 * CLI Context — Shared context for all command handlers
 */

import type { ExitStatus } from "@vellum/protocol";

/**
 * Context passed to every CLI command handler.
 */
export interface CliContext {
  /** Whether JSON output was requested */
  json: boolean;
  /** Current working directory */
  cwd: string;
  /** Whether running in CI environment */
  ci: boolean;
  /** Whether running in interactive terminal */
  interactive: boolean;
  /** Stdout stream */
  stdout: NodeJS.WritableStream;
  /** Stderr stream */
  stderr: NodeJS.WritableStream;
}

/**
 * Create a CLI context from command arguments and environment.
 */
export function createCliContext(
  args: {
    json?: boolean;
  },
  env: NodeJS.ProcessEnv = process.env,
): CliContext {
  return {
    json: args.json ?? false,
    cwd: process.cwd(),
    ci: env.CI === "true" || env.CI === "1",
    interactive: process.stdout.isTTY && !env.CI,
    stdout: process.stdout,
    stderr: process.stderr,
  };
}

/**
 * Exit the process with the appropriate exit status.
 */
export function exitWithStatus(status: ExitStatus): never {
  process.exit(status);
}
