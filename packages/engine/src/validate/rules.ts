/**
 * Protocol Validator Rule Identifiers
 *
 * Stable codes for Protocol Validator findings. Each rule identifier corresponds
 * to a specific validation rule in the Markdown Protocol.
 *
 * @module vellum/protocol-validator/rules
 */

/**
 * Rule identifiers for protocol validation findings.
 *
 * Each rule identifier is a stable code used to:
 * - Map fixtures to rules (Requirement 21)
 * - Report findings in output
 * - Track validation coverage
 */
export enum RuleIdentifier {
  // Lifecycle Frontmatter Rules
  SCHEMA_VERSION_INVALID = "SCHEMA_VERSION_INVALID",
  ARTIFACT_VERSION_INVALID = "ARTIFACT_VERSION_INVALID",
  ARTIFACT_STATUS_INVALID = "ARTIFACT_STATUS_INVALID",
  RISK_CLASS_INVALID = "RISK_CLASS_INVALID",
  FRONTMATTER_MISSING = "FRONTMATTER_MISSING",
  FRONTMATTER_PARSE_ERROR = "FRONTMATTER_PARSE_ERROR",

  // Artifact Body Rules
  ARTIFACT_MISSING = "ARTIFACT_MISSING",
  ARTIFACT_BODY_PARSE_ERROR = "ARTIFACT_BODY_PARSE_ERROR",
  ARTIFACT_EMPTY = "ARTIFACT_EMPTY",

  // Task Line Rules
  TASK_LINE_INVALID = "TASK_LINE_INVALID",
  TASK_NUMBERING_INVALID = "TASK_NUMBERING_INVALID",
  TASK_MARKER_INVALID = "TASK_MARKER_INVALID",
  CHECKPOINT_FORMAT_INVALID = "CHECKPOINT_FORMAT_INVALID",

  // Criterion Reference Rules
  CRITERION_REFERENCE_UNDEFINED = "CRITERION_REFERENCE_UNDEFINED",
  CRITERION_REFERENCE_MALFORMED = "CRITERION_REFERENCE_MALFORMED",

  // Wave Graph Rules
  WAVE_GRAPH_INVALID = "WAVE_GRAPH_INVALID",
  WAVE_TASK_UNDEFINED = "WAVE_TASK_UNDEFINED",
  WAVE_DEPENDENCY_CYCLE = "WAVE_DEPENDENCY_CYCLE",

  // Execution Log Rules
  EXECUTION_LOG_FORMAT_INVALID = "EXECUTION_LOG_FORMAT_INVALID",
  EXECUTION_LOG_ENTRY_INVALID = "EXECUTION_LOG_ENTRY_INVALID",

  // Dependency Notation Rules
  DEPENDENCY_NOTATION_INVALID = "DEPENDENCY_NOTATION_INVALID",
  DEPENDENCY_CYCLE = "DEPENDENCY_CYCLE",

  // File Structure Rules
  SPEC_FOLDER_INVALID = "SPEC_FOLDER_INVALID",
  UNTRACKED_SPEC_DOCUMENT = "UNTRACKED_SPEC_DOCUMENT",
}

/**
 * Message templates for each rule identifier.
 *
 * Templates may contain placeholders like {file}, {line}, {marker}, etc.
 */
export const RULE_MESSAGES: Record<RuleIdentifier, string> = {
  [RuleIdentifier.SCHEMA_VERSION_INVALID]: 'Invalid schema_version: expected "1.0"',
  [RuleIdentifier.ARTIFACT_VERSION_INVALID]: "Invalid artifact_version: must be a positive integer",
  [RuleIdentifier.ARTIFACT_STATUS_INVALID]:
    "Invalid artifact_status: must be one of draft, in_review, approved, rejected",
  [RuleIdentifier.RISK_CLASS_INVALID]:
    "Invalid risk_class: must be one of low, medium, high, critical",
  [RuleIdentifier.FRONTMATTER_MISSING]: "Missing lifecycle frontmatter",
  [RuleIdentifier.FRONTMATTER_PARSE_ERROR]: "Failed to parse frontmatter YAML",
  [RuleIdentifier.ARTIFACT_MISSING]: "Artifact file missing: {path}",
  [RuleIdentifier.ARTIFACT_BODY_PARSE_ERROR]: "Failed to parse artifact body at line {line}",
  [RuleIdentifier.ARTIFACT_EMPTY]: "Artifact body is empty",
  [RuleIdentifier.TASK_LINE_INVALID]: 'Task line does not match Kiro grammar: "{line}"',
  [RuleIdentifier.TASK_NUMBERING_INVALID]: "Task numbering invalid: expected N.N format",
  [RuleIdentifier.TASK_MARKER_INVALID]: "Invalid task marker: must be one of [ ], [~], [-], [x]",
  [RuleIdentifier.CHECKPOINT_FORMAT_INVALID]: "Checkpoint format invalid: {line}",
  [RuleIdentifier.CRITERION_REFERENCE_UNDEFINED]:
    "Criterion reference {reference} is not defined in requirements.md",
  [RuleIdentifier.CRITERION_REFERENCE_MALFORMED]: "Malformed criterion reference: {reference}",
  [RuleIdentifier.WAVE_GRAPH_INVALID]: "Wave graph format invalid",
  [RuleIdentifier.WAVE_TASK_UNDEFINED]: "Wave graph references undefined task: {taskId}",
  [RuleIdentifier.WAVE_DEPENDENCY_CYCLE]: "Wave graph contains dependency cycle",
  [RuleIdentifier.EXECUTION_LOG_FORMAT_INVALID]: "Execution log format invalid at line {line}",
  [RuleIdentifier.EXECUTION_LOG_ENTRY_INVALID]: "Execution log entry invalid: {entry}",
  [RuleIdentifier.DEPENDENCY_NOTATION_INVALID]: "Dependency notation invalid: {notation}",
  [RuleIdentifier.DEPENDENCY_CYCLE]: "Task dependencies contain a cycle",
  [RuleIdentifier.SPEC_FOLDER_INVALID]: "Spec folder structure invalid: {reason}",
  [RuleIdentifier.UNTRACKED_SPEC_DOCUMENT]: "Untracked file in spec directory: {file}",
};
