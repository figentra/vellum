/**
 * @vellum/protocol — The Vellum protocol contract
 *
 * This package defines the types and schemas for the Vellum specification lifecycle.
 * It is the single source of truth for all data structures used across Vellum.
 *
 * ## Features
 *
 * - Core domain types (Spec, Artifact, Task, Ledger, etc.)
 * - Branded types for domain identifiers (SpecId, TaskId, Checksum, etc.)
 * - Lifecycle state machine types
 * - Ledger entry types and hash computation
 * - Diagnostic codes and severity levels
 * - Frontmatter parsing and validation
 * - Task marker grammar and parsing
 * - JSON Schema generation support
 *
 * ## Zero Dependencies
 *
 * This package has zero runtime dependencies. It uses only TypeScript
 * type annotations and Node.js built-in modules (crypto for hashing).
 */

// ============================================================================
// Core Types
// ============================================================================

export {
  // Branded types
  type SpecId,
  type ArtifactPath,
  type Checksum,
  type CommitSha,
  type TaskId,
  type CriterionId,
  type PropertyId,
  type EntryId,
  type RuleIdentifier,

  // Spec types
  type SpecDirectory,

  // Artifact types
  type Artifact,
  type ArtifactKind,
  type LifecycleFrontmatter,

  // Lifecycle types
  type LifecycleState,
  type TerminalState,
  isTerminalState,

  // Task types
  type TaskMarker,
  type TaskLine,

  // Ledger types
  type LedgerEntry,
  type LedgerEntryKind,
  type LedgerPayload,
  type CreatedPayload,
  type AmendedPayload,
  type ApprovalPayload,
  type RejectionPayload,
  type DecisionPayload,
  type EvidencePayload,
  type ClaimPayload,
  type FailurePayload,
  type TaskBindingPayload,
  type GateResultPayload,
  type MergePayload,
  type ReleasePayload,
  type BlockPayload,
  type UnblockPayload,
  type AdoptionPayload,

  // Finding types
  type Finding,
  type CheckResult,
  type ExaminationSummary,

  // Type guards and validators
  parseSpecId,
  formatSpecId,
  parseChecksum,
  formatChecksum,
  parseCommitSha,
  formatCommitSha,
  parseTaskId,
  formatTaskId,
  parseCriterionId,
  formatCriterionId,
  parsePropertyId,
  formatPropertyId,
  createEntryId,
  getEntryIdValue,
  parseRuleIdentifier,
  formatRuleIdentifier,
} from "./types";

// ============================================================================
// Diagnostics
// ============================================================================

export {
  // Severity
  type DiagnosticSeverity,
  EXIT_STATUS,

  // Diagnostic codes
  DiagnosticCodes,
  type DiagnosticCode,
  getRuleIdentifier,
  getSeverity,
  getDiagnosticMessage,
  ALL_DIAGNOSTIC_CODES,
} from "./diagnostics";

// ============================================================================
// Frontmatter
// ============================================================================

export {
  // Constants
  INITIAL_PREDECESSOR_HASH,

  // Checksum
  computeChecksum,
  computeLedgerEntryHash,

  // Parsing
  parseFrontmatter,

  // Serialization
  serializeFrontmatter,

  // Validation
  validateFrontmatterChecksum,
  createInitialFrontmatter,
  amendFrontmatter,
} from "./frontmatter";

// ============================================================================
// Markers and Grammar
// ============================================================================

export {
  // Marker constants
  MARKER_DISPLAY,
  MARKER_DESCRIPTIONS,

  // Marker operations
  parseMarker,
  formatMarker,

  // Task line grammar
  parseTaskLine,
  serializeTaskLine,
  updateTaskMarker,
  isTaskLine,
  extractTaskIdentifiers,
} from "./markers";

// ============================================================================
// Version
// ============================================================================

export const VERSION = "0.0.0" as const;
