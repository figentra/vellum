/**
 * @vellum/cli — Vellum command-line interface
 *
 * Commands: spec, task, approve, verify, trace, context, sync, doctor, lint, report
 *
 * Each command is thin — it delegates to engine and uses renderers for output.
 * No rule logic lives here; a rule found in a command handler is a finding.
 */

// Placeholder — will be populated during Slice 1 implementation
export const VERSION = "0.0.0" as const;
