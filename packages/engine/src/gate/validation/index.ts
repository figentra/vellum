/**
 * Gate validation component exports.
 */

export {
  validateApproval,
  isApprovalStale,
  validateApprovals,
  type ApprovalValidationResult,
  type ApprovalValidationPolicy,
} from "./approval-validator.js";
export {
  checkChangeset,
  validateChangesetContent,
  isChangesetRequired,
  type ChangesetValidationResult,
} from "./changeset-checker.js";
export {
  checkObservability,
  getDefaultObservabilityEndpoints,
  type ObservabilityCheckResult,
  type ObservabilityEndpoint,
} from "./observability-checker.js";
export {
  verifyRollbackPath,
  isRollbackVerificationRequired,
  type RollbackVerificationResult,
} from "./rollback-verifier.js";
export {
  runStrictVerifier,
  isStrictVerifierPassing,
  getStrictVerifierExitStatus,
  type StrictVerifierResult,
} from "./strict-verifier-bridge.js";
export {
  validateVersion,
  isVersionIncrementCorrect,
  usesCatalogReference,
  type VersionValidationResult,
} from "./version-correctness.js";
