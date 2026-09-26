/**
 * Policy Engine - public entry point.
 *
 * The Policy Engine reads the Policy from the Consumer Repository and provides
 * Controls (Risk Class rules, Model Tier assignments, Egress Policy).
 */

export {
  readPolicy,
  validatePolicySchema,
  mergeWithDefaults,
  DEFAULT_RISK_CLASS_CONTROLS,
  POLICY_SCHEMA,
  type PolicyReadResult,
  type PolicyValidationError,
} from "./policy-reader";

export {
  resolveControl,
  calculateSpecificity,
  ruleMatches,
  matchPattern,
  getDefaultControl,
  type ControlContext,
  type PolicyRule,
  type ControlResolutionError,
} from "./control-resolver";

export {
  isValidRiskClass,
  isQuickPathPermitted,
  permitsQuickPathTransition,
  approverAuthoredArtifact,
  buildRiskClassChangeDecision,
  reevaluateControlsAfterChange,
  validateRiskClassDeclaration,
  getTable1ADefaults,
  VALID_RISK_CLASSES,
  type RiskClassChange,
} from "./risk-class-handler";

export {
  isValidModelTier,
  isFrontierOnlyRole,
  validateModelTierAssignment,
  resolveModelTier,
  resolveAllModelTiers,
  getFrontierOnlyReason,
  FRONTIER_ONLY_ROLES,
  type ModelTierError,
} from "./model-tier-resolver";

export {
  validateSpecSizeLimit,
  checkSpecSizeLimit,
  generateSplitProposal,
  permitsTransitionWithSizeFinding,
  assignRequirementsByDeliverySlice,
  DEFAULT_SPEC_SIZE_LIMIT,
  type SpecSizeLimitFinding,
  type SplitProposal,
  type ProposedChildSpec,
  type SlicedRequirement,
} from "./spec-size-limiter";

export {
  readSectionWriteThreshold,
  requiresSectionWrite,
  checkWholeArtifactWrite,
  formatByteSize,
  DEFAULT_SECTION_WRITE_THRESHOLD,
  type SectionWriteThresholdFinding,
} from "./section-write-threshold";
