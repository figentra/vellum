/**
 * @vellum/cli — Vellum command-line interface
 *
 * Commands: status, lint, check, verify, approve, adopt, doctor, sync, task
 *
 * Each command is thin — it delegates to engine and uses renderers for output.
 * No rule logic lives here; a rule found in a command handler is a finding.
 */

export const VERSION = "0.1.0" as const;

// Re-export types for consumers
export type { CliContext } from "./context.js";

// Re-export command handlers for programmatic use
export { lint } from "./commands/lint.js";
export { status } from "./commands/status.js";
export { approve } from "./commands/approve.js";
export { verify } from "./commands/verify.js";
export { check } from "./commands/check.js";
export { adopt } from "./commands/adopt.js";
export { doctor } from "./commands/doctor.js";
export { sync } from "./commands/sync.js";
export { task } from "./commands/task.js";
