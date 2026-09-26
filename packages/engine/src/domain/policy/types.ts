/**
 * Policy domain types for the Vellum Platform.
 *
 * @see requirements.md Requirement 7.4, 7.11
 */

// ============================================================================
// Risk Classes
// ============================================================================

/**
 * Risk class levels for artifacts.
 */
export type RiskClass = "low" | "standard" | "high" | "critical";

// ============================================================================
// Approval Policy
// ============================================================================

/**
 * Key type for signing.
 */
export type KeyType = "gpg" | "ssh";

/**
 * Authorised Approver - an identity permitted to approve artifacts.
 */
export interface AuthorisedApprover {
  /** Email address identifying the approver */
  email: string;
  /** Type of signing key */
  key_type: KeyType;
  /** Fingerprint of the signing key */
  key_fingerprint: string;
  /** Public key material (base64 encoded) */
  public_key?: string | undefined;
  /** Risk classes this approver is authorised for */
  authorised_for: RiskClass[];
}

/**
 * Approval requirements per risk class.
 */
export interface ApprovalRequirements {
  /** Number of approvals required */
  count: number;
  /** Which approvers are authorised (by email) */
  approvers: string[];
}

/**
 * Approval Policy - governance of approvals.
 */
export interface ApprovalPolicy {
  /** Schema version */
  schema_version: string;
  /** List of authorised approvers */
  approvers: AuthorisedApprover[];
  /** Approval requirements per risk class */
  requirements: {
    [K in RiskClass]?: ApprovalRequirements;
  };
}

// ============================================================================
// Model Policy (Slice 2 placeholder)
// ============================================================================

/**
 * Model Tier - capability level of models for Slice 2.
 * @see Requirement 12 - Model Tiers are reader or frontier
 */
export type ModelTier = "reader" | "frontier";

/**
 * Agent Role - type of agent.
 */
export type AgentRole = "executing" | "orchestrating" | "reviewing";

/**
 * Model Policy - assigns model tiers to agent roles.
 * Slice 2 placeholder.
 */
export interface ModelPolicy {
  /** Schema version */
  schema_version: string;
  /** Model tier assignments */
  assignments: {
    [K in AgentRole]?: ModelTier;
  };
}

// ============================================================================
// Egress Policy (Slice 2 placeholder)
// ============================================================================

/**
 * Content Classification level.
 */
export type ContentClassification = "public" | "internal" | "confidential" | "restricted";

/**
 * External Model Provider.
 */
export type ExternalProvider = "openai" | "anthropic" | "google" | "aws";

/**
 * Egress Policy - governs external model provider access.
 * Slice 2 placeholder.
 */
export interface EgressPolicy {
  /** Schema version */
  schema_version: string;
  /** Permitted providers and content classifications */
  providers: {
    provider: ExternalProvider;
    permitted_classifications: ContentClassification[];
  }[];
}

// ============================================================================
// Consumer Configuration
// ============================================================================

/**
 * Consumer Configuration - complete policy set for a repository.
 */
export interface ConsumerConfiguration {
  /** Schema version */
  schema_version: string;
  /** Repository name */
  repository: string;
  /** Approval policy */
  approval: ApprovalPolicy;
  /** Model policy (optional, Slice 2) */
  model?: ModelPolicy | undefined;
  /** Egress policy (optional, Slice 2) */
  egress?: EgressPolicy | undefined;
}

// ============================================================================
// Control Types (Slice 2)
// ============================================================================

/**
 * Review requirement level.
 */
export type ReviewRequirement = "required" | "optional";

/**
 * Security gate requirement.
 */
export type SecurityGateRequirement = "required" | "optional" | "when_conditions_match";

/**
 * Release gate requirement.
 */
export type ReleaseGateRequirement = "standard" | "explicit" | "explicit_with_rollback_path";

/**
 * Control - policy rules for a Risk Class.
 * @see requirements.md Table 1.A
 */
export interface Control {
  /** Requirements review requirement */
  requirementsReview: ReviewRequirement;
  /** Design review requirement */
  designReview: ReviewRequirement;
  /** Security gate requirement */
  securityGate: SecurityGateRequirement;
  /** Number of approvals per artifact */
  approvalsPerArtifact: number;
  /** Release gate requirement */
  releaseGate: ReleaseGateRequirement;
  /** Whether quick path is permitted */
  quickPathPermitted: boolean;
}

/**
 * Policy Schema definition.
 */
export interface PolicySchema {
  /** Schema version */
  version: string;
  /** Schema properties */
  properties: Record<string, unknown>;
}

/**
 * Policy - complete policy with all controls and settings.
 * @see Requirement 1.2
 */
export interface Policy {
  /** Schema version */
  schema_version?: string;
  /** Risk classes in use */
  risk_classes?: RiskClass[];
  /** Controls per risk class */
  controls?: Partial<Record<RiskClass, Control>>;
  /** Model tier assignments per agent role */
  model_tiers?: Record<string, ModelTier>;
  /** Spec size limit (default 80) */
  spec_size_limit?: number;
  /** Section write threshold in bytes (default 65536) */
  section_write_threshold?: number;
}

// ============================================================================
// Policy Errors
// ============================================================================

/**
 * Policy loading error.
 */
export interface PolicyError {
  /** Error code */
  code: "POLICY_MISSING" | "POLICY_INVALID" | "POLICY_UNSUPPORTED_VERSION";
  /** Human-readable error message */
  message: string;
  /** Path to the policy file */
  path?: string | undefined;
  /** Additional context */
  context?: Record<string, unknown> | undefined;
}
