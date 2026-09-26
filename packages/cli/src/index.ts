/**
 * @vellum/cli — Vellum command-line interface
 *
 * Implemented: status, lint, verify, doctor, approve, task start,
 * task complete. check, adopt and sync exit 2 as not implemented.
 *
 * Commands read through @vellum/storage and decide through @vellum/engine.
 */

export { VERSION } from "./version.js";

export type { CliContext, OutputStream } from "./context.js";
export { createCliContext, detectAssistantSession } from "./context.js";
export { run, HELP } from "./run.js";
export { main } from "./main.js";

export { lint } from "./commands/lint.js";
export { status } from "./commands/status.js";
export { approve, APPROVE_HELP } from "./commands/approve.js";
export { verify } from "./commands/verify.js";
export { doctor } from "./commands/doctor.js";
export { task } from "./commands/task.js";
