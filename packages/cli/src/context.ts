/**
 * CLI Context — Shared context for all command handlers
 */

import type { ExitStatus } from "@vellum/protocol";

/** Minimal writable stream the CLI writes to. */
export interface OutputStream {
  write(chunk: string): unknown;
}

/**
 * Context passed to every CLI command handler.
 */
export interface CliContext {
  /** Whether JSON output was requested */
  json: boolean;
  /** Working directory the command runs in */
  cwd: string;
  /** Whether running in a CI environment (CI=true|1) */
  ci: boolean;
  /** Whether stdin and stdout are both a terminal */
  interactive: boolean;
  /** The assistant session detected from the environment, if any */
  assistantSession: string | null;
  /** Stdout stream */
  stdout: OutputStream;
  /** Stderr stream */
  stderr: OutputStream;
}

/**
 * Environment variables an assistant runtime sets in the shells it runs.
 * Detection is a courtesy that stops an obvious mistake early; it is not the
 * guarantee. The guarantee is that an Approval Record counts only when the
 * commit adding it is signed by a key the Approval Policy lists for the
 * approver (see `vellum approve --help`).
 */
const ASSISTANT_MARKERS: ReadonlyArray<readonly [string, (value: string) => boolean]> = [
  ["ASSISTANT_SESSION", (v) => v === "true" || v === "1"],
  ["CLAUDECODE", (v) => v !== "" && v !== "0"],
  ["CLAUDE_CODE_ENTRYPOINT", (v) => v !== ""],
  ["OPENCODE", (v) => v !== "" && v !== "0"],
  ["KIRO_AGENT", (v) => v !== "" && v !== "0"],
];

/** The first assistant-session marker set in `env`, or null. */
export function detectAssistantSession(env: NodeJS.ProcessEnv): string | null {
  for (const [name, isSet] of ASSISTANT_MARKERS) {
    const value = env[name];
    if (value !== undefined && isSet(value)) return name;
  }
  return null;
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
  const ci = env.CI === "true" || env.CI === "1";
  return {
    json: args.json ?? false,
    cwd: process.cwd(),
    ci,
    interactive: Boolean(process.stdin.isTTY) && Boolean(process.stdout.isTTY) && !ci,
    assistantSession: detectAssistantSession(env),
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
