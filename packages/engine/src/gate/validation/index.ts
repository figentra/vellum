/**
 * Gate validation component exports.
 */

export {
  validateApproval,
  isApprovalStale,
  validateApprovals,
  type ApprovalValidationResult,
  type ApprovalValidationContext,
} from "./approval-validator.js";
export {
  checkChangeset,
  validateChangesetContent,
  isChangesetRequired,
  type ChangesetValidationResult,
  type ChangesetFile,
  type ChangesetRelease,
} from "./changeset-checker.js";
export {
  checkObservability,
  getDefaultObservabilityEndpoints,
  type ObservabilityCheckResult,
  type ObservabilityEndpoint,
  type ObservabilityProbe,
} from "./observability-checker.js";
export { verifyRollbackPath, isRollbackVerificationRequired } from "./rollback-verifier.js";
export {
  runStrictVerifier,
  isStrictVerifierPassing,
  getStrictVerifierExitStatus,
  type StrictVerifierResult,
  type StrictVerifierInput,
} from "./strict-verifier-bridge.js";
export {
  validateVersion,
  isVersionIncrementCorrect,
  usesCatalogReference,
  type VersionValidationResult,
} from "./version-correctness.js";
export type { CheckOutcome } from "./outcome.js";
