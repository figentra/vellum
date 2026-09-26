/**
 * @vellum/protocol — Diagnostic Codes
 *
 * This module defines the diagnostic codes and severity levels for the Vellum platform.
 * Format: E<NNNN> for errors, W<NNNN> for warnings, I<NNNN> for info.
 */

/** Exit status convention */
export const EXIT_STATUS = {
  SUCCESS: 0,
  FAILURE: 1,
  INCONCLUSIVE: 2,
} as const;

/** Diagnostic severity levels */
export type DiagnosticSeverity = "error" | "warn" | "info";

/** Diagnostic code definitions */
export const DiagnosticCodes = {
  // Ledger errors (E0001-E0009)
  E0001: "LEDGER_INTEGRITY_FAILURE",
  E0002: "LEDGER_FORK",
  E0003: "LEDGER_ENTRY_SCHEMA_INVALID",
  E0004: "LEDGER_CHAIN_BROKEN",
  E0005: "LEDGER_ENTRY_REMOVED",
  E0006: "LEDGER_ORDER_MISMATCH",

  // Approval errors (E0010-E0019)
  E0010: "APPROVAL_POLICY_MISSING",
  E0011: "APPROVAL_NOT_AUTHORIZED",
  E0012: "APPROVAL_FROM_ASSISTANT",
  E0013: "APPROVAL_INVALID_SIGNAL",
  E0014: "APPROVAL_UNSIGNED_COMMIT",
  E0015: "APPROVAL_CHECKSUM_MISMATCH",

  // Evidence errors (E0020-E0029)
  E0020: "EVIDENCE_COMMIT_NOT_FOUND",
  E0021: "EVIDENCE_SECRET_PATTERN",
  E0022: "EVIDENCE_NO_TASK_BINDING",
  E0023: "EVIDENCE_CHECKSUM_MISMATCH",
  E0024: "EVIDENCE_NONZERO_EXIT",
  E0025: "EVIDENCE_TIMESTAMP_INVALID",

  // Lifecycle errors (E0030-E0039)
  E0030: "TRANSITION_PRECONDITION_FAILED",
  E0031: "TRANSITION_INVALID",
  E0032: "STATE_INVALID",
  E0033: "STATE_TERMINAL",
  E0034: "STATE_RECORD_MISMATCH",

  // Coverage errors (E0040-E0049)
  E0040: "CRITERIA_NOT_COVERED",
  E0041: "PROPERTY_NOT_CITED",
  E0042: "CRITERIA_SOURCE_UNREADABLE",
  E0043: "COVERAGE_INCOMPLETE",

  // Spec folder errors (E0050-E0059)
  E0050: "SPEC_INVALID_ENTRY",
  E0051: "PROGRAMME_SPEC_HAS_TASKS",
  E0052: "SPEC_MISSING_REQUIREMENTS",
  E0053: "SPEC_MACHINE_FOLDER_INVALID",
  E0054: "SPEC_EXTRA_FILE",
  E0055: "SPEC_ARTIFACT_MISSING_FRONTMATTER",

  // Task errors (E0060-E0069)
  E0060: "TASK_MARKER_INVALID",
  E0061: "TASK_DEPENDENCY_CYCLE",
  E0062: "TASK_DEPENDENCY_MISSING",
  E0063: "TASK_GRAPH_INVALID",
  E0064: "TASK_REFERENCE_INVALID",
} as const;

/** Diagnostic code type */
export type DiagnosticCode = keyof typeof DiagnosticCodes;

/** All diagnostic codes as array */
export const ALL_DIAGNOSTIC_CODES = Object.keys(DiagnosticCodes) as DiagnosticCode[];

/**
 * Get the rule identifier for a diagnostic code.
 * Rule identifiers follow: vellum/<category>/<RULE_NAME>
 */
export function getRuleIdentifier(code: DiagnosticCode): string {
  const name = DiagnosticCodes[code];
  const category = getDiagnosticCategory(code);
  return `vellum/${category}/${name}`;
}

/**
 * Get the severity level for a diagnostic code.
 */
export function getSeverity(code: DiagnosticCode): DiagnosticSeverity {
  if (code.startsWith("W")) return "warn";
  if (code.startsWith("I")) return "info";
  return "error";
}

/**
 * Get human-readable message for a diagnostic code.
 */
export function getDiagnosticMessage(code: DiagnosticCode): string {
  const messages: Record<DiagnosticCode, string> = {
    E0001: "Ledger integrity check failed",
    E0002: "Ledger fork detected: two entries have the same predecessor",
    E0003: "Ledger entry schema validation failed",
    E0004: "Ledger chain broken: predecessor hash does not match",
    E0005: "Ledger entry removed: missing entry in sequence",
    E0006: "Ledger order mismatch: entries not in sequence order",

    E0010: "Approval policy file missing or invalid",
    E0011: "Approver not authorized for this artifact",
    E0012: "Approval from assistant session not permitted",
    E0013: "Approval signal commit not found or invalid",
    E0014: "Approval commit must be signed",
    E0015: "Approval artifact checksum does not match current artifact",

    E0020: "Evidence commit not found in repository",
    E0021: "Evidence contains potential secret pattern",
    E0022: "No task binding found for task",
    E0023: "Task binding checksum mismatch",
    E0024: "Task execution failed with non-zero exit status",
    E0025: "Evidence timestamp is invalid or in the future",

    E0030: "Transition precondition not met",
    E0031: "Invalid state transition",
    E0032: "Invalid lifecycle state",
    E0033: "Cannot transition from terminal state",
    E0034: "Recorded state does not match effective state",

    E0040: "Criterion not covered by any task",
    E0041: "Property not cited by any task",
    E0042: "Cannot read criterion source",
    E0043: "Coverage incomplete: not all criteria covered",

    E0050: "Invalid entry in spec directory",
    E0051: "Programme spec cannot have tasks.md",
    E0052: "Spec missing requirements.md",
    E0053: "Machine folder contains invalid files",
    E0054: "Extra file in spec directory",
    E0055: "Artifact missing required frontmatter",

    E0060: "Invalid task marker",
    E0061: "Task dependency cycle detected",
    E0062: "Task depends on missing task",
    E0063: "Task graph validation failed",
    E0064: "Task reference does not exist",
  };

  return messages[code];
}

/**
 * Get the category for a diagnostic code.
 */
function getDiagnosticCategory(code: DiagnosticCode): string {
  if (code.startsWith("E00") && code >= "E0001" && code <= "E0009") return "ledger";
  if (code.startsWith("E00") && code >= "E0010" && code <= "E0019") return "approval";
  if (code.startsWith("E00") && code >= "E0020" && code <= "E0029") return "evidence";
  if (code.startsWith("E00") && code >= "E0030" && code <= "E0039") return "lifecycle";
  if (code.startsWith("E00") && code >= "E0040" && code <= "E0049") return "coverage";
  if (code.startsWith("E00") && code >= "E0050" && code <= "E0059") return "spec";
  if (code.startsWith("E00") && code >= "E0060" && code <= "E0069") return "task";
  return "general";
}
