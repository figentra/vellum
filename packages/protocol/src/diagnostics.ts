/**
 * @vellum/protocol — Diagnostic codes and severity levels
 *
 * Defines the diagnostic codes emitted by the engine and CLI.
 */

import type { RuleIdentifier } from "./types";

// ============================================================================
// Diagnostic Severity
// ============================================================================

/**
 * Diagnostic severity levels
 */
export type DiagnosticSeverity = "ERROR" | "WARNING" | "INFO";

/**
 * Exit statuses corresponding to severity
 */
export const EXIT_STATUS = {
  SUCCESS: 0,
  FAILURE: 1,
  UNKNOWN: 2,
} as const;

// ============================================================================
// Diagnostic Code Registry
// ============================================================================

/**
 * Diagnostic codes registry
 *
 * E**** codes are errors, W**** codes are warnings
 */
export const DiagnosticCodes = {
  // Ledger errors (E0001-E0009)
  E0001: "LEDGER_INTEGRITY_FAILURE",
  E0002: "LEDGER_FORK",
  E0003: "LEDGER_ENTRY_SCHEMA_INVALID",
  E0004: "LEDGER_CHAIN_BROKEN",
  E0005: "LEDGER_ENTRY_REMOVED",
  E0006: "LEDGER_ORDER_MISMATCH",
  E0007: "LEDGER_HASH_MISMATCH",
  E0008: "LEDGER_PREDECESSOR_MISMATCH",
  E0009: "LEDGER_MISSING_PREDECESSOR",

  // Approval errors (E0010-E0019)
  E0010: "APPROVAL_POLICY_MISSING",
  E0011: "APPROVAL_NOT_AUTHORIZED",
  E0012: "APPROVAL_FROM_ASSISTANT",
  E0013: "APPROVAL_UNSIGNED_COMMIT",
  E0014: "APPROVAL_SIGNATURE_INVALID",
  E0015: "APPROVAL_CHECKSUM_MISMATCH",
  E0016: "APPROVAL_VERSION_MISMATCH",
  E0017: "APPROVAL_INSUFFICIENT_COUNT",
  E0018: "APPROVAL_NOT_DISTINCT_APPROVERS",
  E0019: "APPROVAL_FROM_NON_INTERACTIVE_SESSION",

  // Evidence errors (E0020-E0029)
  E0020: "EVIDENCE_COMMIT_NOT_FOUND",
  E0021: "EVIDENCE_SECRET_PATTERN",
  E0022: "EVIDENCE_NO_TASK_BINDING",
  E0023: "EVIDENCE_EXIT_STATUS_NON_ZERO",
  E0024: "EVIDENCE_TIMESTAMP_INVALID",
  E0025: "EVIDENCE_UNCOMMITTED_CHANGES",
  E0026: "EVIDENCE_COMMAND_FAILED",
  E0027: "EVIDENCE_COMMAND_TIMEOUT",

  // Lifecycle errors (E0030-E0039)
  E0030: "TRANSITION_PRECONDITION_FAILED",
  E0031: "TRANSITION_INVALID",
  E0032: "STATE_INVALID",
  E0033: "STATE_RECORDING_FAILED",
  E0034: "STATE_TERMINAL_NO_TRANSITIONS",
  E0035: "STATE_UNKNOWN",

  // Coverage errors (E0040-E0049)
  E0040: "CRITERIA_NOT_COVERED",
  E0041: "PROPERTY_NOT_CITED",
  E0042: "CRITERIA_SOURCE_UNREADABLE",
  E0043: "PROPERTY_SOURCE_UNREADABLE",
  E0044: "CRITERIA_REFERENCE_INVALID",
  E0045: "PROPERTY_REFERENCE_INVALID",
  E0046: "CRITERIA_DUPLICATE",
  E0047: "PROPERTY_DUPLICATE",
  E0048: "TASK_NO_CRITERIA",
  E0049: "TASK_NO_PROPERTIES",

  // Folder contract errors (E0050-E0059)
  E0050: "SPEC_INVALID_ENTRY",
  E0051: "PROGRAMME_SPEC_HAS_TASKS",
  E0052: "SPEC_MISSING_REQUIREMENTS",
  E0053: "SPEC_MISSING_DESIGN",
  E0054: "SPEC_MISSING_TASKS",
  E0055: "SPEC_EXTRA_FILE",
  E0056: "SPEC_EXTRA_DIRECTORY",
  E0057: "MACHINE_FOLDER_INVALID_FILE",
  E0058: "MACHINE_FOLDER_MISSING_LEDGER",
  E0059: "SPEC_DIRECTORY_NOT_FOUND",

  // Task errors (E0060-E0069)
  E0060: "TASK_GRAPH_CYCLE",
  E0061: "TASK_DEPENDENCY_MISSING",
  E0062: "TASK_DEPENDENCY_INVALID",
  E0063: "TASK_IDENTIFIER_INVALID",
  E0064: "TASK_MARKER_INVALID",
  E0065: "TASK_LINE_PARSE_ERROR",
  E0066: "TASK_WAVE_ORDER_INVALID",
  E0067: "TASK_ORPHAN",
  E0068: "TASK_OPTIONAL_NOT_MARKED",
  E0069: "TASK_DEPENDENCY_CYCLE",

  // Frontmatter errors (E0070-E0079)
  E0070: "FRONTMATTER_MISSING",
  E0071: "FRONTMATTER_INVALID_YAML",
  E0072: "FRONTMATTER_FIELD_MISSING",
  E0073: "FRONTMATTER_FIELD_INVALID",
  E0074: "FRONTMATTER_VERSION_INVALID",
  E0075: "FRONTMATTER_CHECKSUM_INVALID",
  E0076: "FRONTMATTER_STATE_INVALID",
  E0077: "FRONTMATTER_TIMESTAMP_INVALID",
  E0078: "FRONTMATTER_EXTRA_FIELDS",
  E0079: "FRONTMATTER_CHECKSUM_MISMATCH",

  // Pre-execution errors (E0080-E0089)
  E0080: "PRECHECK_ARTIFACT_MISSING",
  E0081: "PRECHECK_APPROVAL_INVALID",
  E0082: "PRECHECK_CHECKSUM_MISMATCH",
  E0083: "PRECHECK_REFERENCE_INVALID",
  E0084: "PRECHECK_NOT_APPROVED",
  E0085: "PRECHECK_STATE_INVALID",
  E0086: "PRECHECK_LEGACY_SPEC",
  E0087: "PRECHECK_ALREADY_STARTED",
  E0088: "PRECHECK_ALREADY_COMPLETE",
  E0089: "PRECHECK_DEPENDENCY_NOT_COMPLETE",

  // Verification errors (E0090-E0099)
  E0090: "VERIFICATION_FAILED",
  E0091: "VERIFICATION_LEDGER_INTEGRITY",
  E0092: "VERIFICATION_APPROVAL_INVALID",
  E0093: "VERIFICATION_EVIDENCE_MISSING",
  E0094: "VERIFICATION_EVIDENCE_INVALID",
  E0095: "VERIFICATION_COVERAGE_INCOMPLETE",
  E0096: "VERIFICATION_NOT_IN_PROGRESS",
  E0097: "VERIFICATION_NOT_VERIFIED",
  E0098: "VERIFICATION_ARTIFACT_MISMATCH",
  E0099: "VERIFICATION_INCONCLUSIVE",

  // Warnings (W0001-W0099)
  W0001: "CHECKSUM_ALMOST_INVALID",
  W0002: "APPROVAL_ALMOST_INVALID",
  W0003: "TASK_NEARLY_ORPHAN",
  W0004: "CRITERIA_NEARLY_UNCOVERED",
  W0005: "PROPERTY_NEARLY_UNCITED",
  W0006: "SPEC_NEARLY_INVALID",
  W0007: "LEGACY_SPEC_DETECTED",
  W0008: "MARKER_CASE_INSENSITIVE",
  W0009: "FRONTMATTER_WHITESPACE",
  W0010: "IDENTIFIER_CASE_INSENSITIVE",
  W0011: "REFERENCE_NEARLY_VALID",
  W0012: "TRAILER_NEARLY_VALID",
  W0013: "SPEC_ADOPTION_RECOMMENDED",
  W0014: "APPROVAL_EXPIRING_SOON",
  W0015: "TASK_OLDER_THAN_APPROVAL",
} as const;

/**
 * Diagnostic code type
 */
export type DiagnosticCode = keyof typeof DiagnosticCodes;

/**
 * Get the rule identifier for a diagnostic code
 */
export function getRuleIdentifier(code: DiagnosticCode): RuleIdentifier {
  const name = DiagnosticCodes[code];
  const category = code.startsWith("E00") ? "error" : "warning";
  const prefix = code.startsWith("E") ? "E" : "W";

  // Map code ranges to categories
  let categoryPath: string;
  const numCode = parseInt(code.slice(1), 10);

  if (numCode >= 1 && numCode <= 9) {
    categoryPath = "ledger";
  } else if (numCode >= 10 && numCode <= 19) {
    categoryPath = "approval";
  } else if (numCode >= 20 && numCode <= 29) {
    categoryPath = "evidence";
  } else if (numCode >= 30 && numCode <= 39) {
    categoryPath = "lifecycle";
  } else if (numCode >= 40 && numCode <= 49) {
    categoryPath = "coverage";
  } else if (numCode >= 50 && numCode <= 59) {
    categoryPath = "folder";
  } else if (numCode >= 60 && numCode <= 69) {
    categoryPath = "task";
  } else if (numCode >= 70 && numCode <= 79) {
    categoryPath = "frontmatter";
  } else if (numCode >= 80 && numCode <= 89) {
    categoryPath = "precheck";
  } else if (numCode >= 90 && numCode <= 99) {
    categoryPath = "verification";
  } else {
    categoryPath = "general";
  }

  return `vellum/${categoryPath}/${name}` as RuleIdentifier;
}

/**
 * Get the severity for a diagnostic code
 */
export function getSeverity(code: DiagnosticCode): DiagnosticSeverity {
  return code.startsWith("E") ? "ERROR" : "WARNING";
}

/**
 * Get a human-readable message for a diagnostic code
 */
export function getDiagnosticMessage(code: DiagnosticCode): string {
  const messages: Record<DiagnosticCode, string> = {
    E0001: "Ledger integrity failure",
    E0002: "Ledger fork detected",
    E0003: "Ledger entry schema invalid",
    E0004: "Ledger chain broken",
    E0005: "Ledger entry removed",
    E0006: "Ledger order mismatch",
    E0007: "Ledger hash mismatch",
    E0008: "Ledger predecessor mismatch",
    E0009: "Ledger missing predecessor",
    E0010: "Approval policy missing",
    E0011: "Approval not authorized",
    E0012: "Approval from assistant",
    E0013: "Approval unsigned commit",
    E0014: "Approval signature invalid",
    E0015: "Approval checksum mismatch",
    E0016: "Approval version mismatch",
    E0017: "Approval insufficient count",
    E0018: "Approval not from distinct approvers",
    E0019: "Approval from non-interactive session",
    E0020: "Evidence commit not found",
    E0021: "Evidence secret pattern detected",
    E0022: "Evidence no task binding",
    E0023: "Evidence exit status non-zero",
    E0024: "Evidence timestamp invalid",
    E0025: "Evidence uncommitted changes",
    E0026: "Evidence command failed",
    E0027: "Evidence command timeout",
    E0030: "Transition precondition failed",
    E0031: "Transition invalid",
    E0032: "State invalid",
    E0033: "State recording failed",
    E0034: "State terminal no transitions",
    E0035: "State unknown",
    E0040: "Criteria not covered",
    E0041: "Property not cited",
    E0042: "Criteria source unreadable",
    E0043: "Property source unreadable",
    E0044: "Criteria reference invalid",
    E0045: "Property reference invalid",
    E0046: "Criteria duplicate",
    E0047: "Property duplicate",
    E0048: "Task no criteria",
    E0049: "Task no properties",
    E0050: "Spec invalid entry",
    E0051: "Programme spec has tasks",
    E0052: "Spec missing requirements",
    E0053: "Spec missing design",
    E0054: "Spec missing tasks",
    E0055: "Spec extra file",
    E0056: "Spec extra directory",
    E0057: "Machine folder invalid file",
    E0058: "Machine folder missing ledger",
    E0059: "Spec directory not found",
    E0060: "Task graph cycle",
    E0061: "Task dependency missing",
    E0062: "Task dependency invalid",
    E0063: "Task identifier invalid",
    E0064: "Task marker invalid",
    E0065: "Task line parse error",
    E0066: "Task wave order invalid",
    E0067: "Task orphan",
    E0068: "Task optional not marked",
    E0069: "Task dependency cycle",
    E0070: "Frontmatter missing",
    E0071: "Frontmatter invalid YAML",
    E0072: "Frontmatter field missing",
    E0073: "Frontmatter field invalid",
    E0074: "Frontmatter version invalid",
    E0075: "Frontmatter checksum invalid",
    E0076: "Frontmatter state invalid",
    E0077: "Frontmatter timestamp invalid",
    E0078: "Frontmatter extra fields",
    E0079: "Frontmatter checksum mismatch",
    E0080: "Precheck artifact missing",
    E0081: "Precheck approval invalid",
    E0082: "Precheck checksum mismatch",
    E0083: "Precheck reference invalid",
    E0084: "Precheck not approved",
    E0085: "Precheck state invalid",
    E0086: "Precheck legacy spec",
    E0087: "Precheck already started",
    E0088: "Precheck already complete",
    E0089: "Precheck dependency not complete",
    E0090: "Verification failed",
    E0091: "Verification ledger integrity",
    E0092: "Verification approval invalid",
    E0093: "Verification evidence missing",
    E0094: "Verification evidence invalid",
    E0095: "Verification coverage incomplete",
    E0096: "Verification not in progress",
    E0097: "Verification not verified",
    E0098: "Verification artifact mismatch",
    E0099: "Verification inconclusive",
    W0001: "Checksum almost invalid",
    W0002: "Approval almost invalid",
    W0003: "Task nearly orphan",
    W0004: "Criteria nearly uncovered",
    W0005: "Property nearly uncited",
    W0006: "Spec nearly invalid",
    W0007: "Legacy spec detected",
    W0008: "Marker case insensitive",
    W0009: "Frontmatter whitespace",
    W0010: "Identifier case insensitive",
    W0011: "Reference nearly valid",
    W0012: "Trailer nearly valid",
    W0013: "Spec adoption recommended",
    W0014: "Approval expiring soon",
    W0015: "Task older than approval",
  };

  return messages[code];
}

/**
 * All diagnostic codes as a const array for iteration
 */
export const ALL_DIAGNOSTIC_CODES = Object.keys(DiagnosticCodes) as DiagnosticCode[];
