/**
 * @stellum/engine — Pure logic implementation (no I/O)
 *
 * This package contains the stateless engine functions that compute
 * lifecycle state, approvals, evidence, and verification.
 *
 * ## Design Principles
 *
 * - No filesystem access
 * - No git operations
 * - No network calls
 * - No clock dependency
 * - Pure functions only
 * - Deterministic output
 *
 * All decisions are computed from repository content and the pinned version alone.
 */

// ============================================================================
// Lifecycle
// ============================================================================

export {
  isTerminalState,
  isValidTransition,
  getValidNextStates,
  getTransitionPreconditions,
  checkPreconditions,
  computeEffectiveState,
  InvalidTransitionError,
} from "./lifecycle/state-machine.js";

// ============================================================================
// Validation
// ============================================================================

export { validateProtocol, validateRequiredArtifacts } from "./validate/protocol-validator.js";

export { validateTaskGraph, buildTaskGraph, validateWaveOrdering } from "./validate/task-graph.js";

export {
  validateSpecFolder,
  validateMachineFolder,
  isLegacySpec,
  detectLegacyStage,
} from "./validate/spec-folder.js";

// ============================================================================
// Approval
// ============================================================================

export {
  verifyApproval,
  countValidApprovals,
  getRequiredApprovalCount,
  hasRequiredApprovals,
  matchesApprover,
  approverKeys,
  signerIsApprovers,
  getApprovers,
  isApprovalInvalidated,
  diagnoseInvalidApproval,
} from "./approval/verify.js";

export {
  cascadeInvalidation,
  wouldCascadeToDesign,
  wouldCascadeToPlan,
  countInvalidatedApprovals,
} from "./approval/cascade.js";

// ============================================================================
// Ledger
// ============================================================================

export {
  checkLedgerIntegrity,
  detectForks,
  checkMissingEntries,
  verifyLedgerChain,
} from "./ledger/integrity.js";

// ============================================================================
// Status
// ============================================================================

export { computeStatusReport, formatStatusJson, formatStatusHuman } from "./status/reporter.js";

// ============================================================================
// Verification
// ============================================================================

export {
  strictVerify,
  getVerificationExitStatus,
  formatVerificationJson,
  formatVerificationHuman,
} from "./verify/strict.js";

export { preExecutionCheck, checkTaskBinding, validateTaskBinding } from "./verify/precheck.js";

export {
  verifyDeterminism,
  sortFindings,
  verifyFindingsSorted,
  computeOutputHash,
} from "./verify/determinism.js";

// ============================================================================
// Evidence
// ============================================================================

export {
  validateEvidence,
  containsSecretPattern,
  hasVerifiedEvidence,
  findUnverifiedTasks,
  countEvidence,
  checkEvidenceCompleteness,
} from "./evidence/validate.js";

// ============================================================================
// Coverage
// ============================================================================

export {
  computeCoverage,
  hasCompleteCoverage,
  getCoveragePercentage,
  extractCriteria,
  extractProperties,
  validateCriteriaCoverage,
  validatePropertiesCitation,
} from "./coverage/validate.js";

// ============================================================================
// Check Mode
// ============================================================================

export { runCheckMode, isCheckMode, checkSingleSpec, formatCheckResult } from "./mode/check.js";

