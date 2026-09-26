/**
 * @vellum/storage — Policy Domain Types
 *
 * Type definitions for policy configuration.
 */

/** Consumer configuration for approval policy */
export interface ConsumerConfiguration {
  readonly schema_version: string;
  readonly repository?: string;
  readonly approval: ApprovalConfiguration;
}

/** Approval configuration */
export interface ApprovalConfiguration {
  readonly schema_version?: string;
  readonly approvers: readonly ApproverConfig[];
  /** Per risk class: how many approvals, and which identities may give them. */
  readonly requirements?: Readonly<Record<string, RiskClassRequirement | undefined>>;
  /** Risk class of a spec by directory name; specs not listed are `standard`. */
  readonly spec_risk_classes?: Readonly<Record<string, string>>;
}

/** Approval requirement for one risk class. */
export interface RiskClassRequirement {
  readonly count: number;
  /** Identities that may approve; empty or absent: every approver authorised for the class. */
  readonly approvers?: readonly string[];
}

/** A signing key in the policy file. */
export interface SigningKeyConfig {
  readonly type: "gpg" | "ssh";
  readonly fingerprint: string;
  /** OpenSSH public key line (ssh) or ASCII-armored public key (gpg). */
  readonly public_key: string;
}

/** Approval requirements */
export interface ApprovalRequirements {
  readonly standard?: StandardRequirements;
}

/** Standard requirements */
export interface StandardRequirements {
  readonly default?: DefaultApproval;
}

/** Default approval configuration */
export interface DefaultApproval {
  readonly count: number;
}

/** Approver configuration */
export interface ApproverConfig {
  readonly email: string;
  readonly name?: string;
  readonly risk_classes?: readonly string[];
  readonly artifacts?: readonly string[];
  readonly authorised_for?: readonly string[];
  readonly requirements?: readonly string[];
  /** The keys whose signatures count as this approver's. */
  readonly keys?: readonly SigningKeyConfig[];
  /** Single-key form: equivalent to one entry in `keys`. */
  readonly key_type?: "gpg" | "ssh";
  readonly key_fingerprint?: string;
  readonly public_key?: string;
}

/** Policy validation error */
export interface PolicyError {
  readonly path: string;
  readonly message: string;
  readonly code: string;
  readonly context?: Record<string, unknown>;
}
