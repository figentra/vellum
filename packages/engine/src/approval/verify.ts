/**
 * @vellum/engine — Approval Verification
 *
 * Pure logic for verifying approvals.
 * Checks: policy, identity, signature, checksum.
 */

import type {
  ApprovalPolicy,
  GitCommit,
  ArtifactKind,
  RiskClass,
  Checksum,
} from "@vellum/protocol";

/** Approval verification result */
export type ApprovalVerificationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly reason: ApprovalRejectionReason };

/** Reasons an approval can be rejected */
export type ApprovalRejectionReason =
  | "NOT_AUTHORIZED"
  | "INVALID_SIGNAL"
  | "FROM_ASSISTANT"
  | "CHECKSUM_MISMATCH"
  | "UNSIGNED_COMMIT"
  | "POLICY_MISSING"
  | "ARTIFACT_MISMATCH";

/**
 * Verify an approval is valid.
 * Pure function - all data passed in.
 */
export function verifyApproval(
  approval: {
    readonly approver: string;
    readonly artifact: ArtifactKind;
    readonly artifactChecksum: Checksum;
    readonly signalCommit: string;
  },
  policy: ApprovalPolicy | null,
  riskClass: RiskClass,
  gitCommits: ReadonlyMap<string, GitCommit>,
): ApprovalVerificationResult {
  // Check policy exists
  if (!policy) {
    return { valid: false, reason: "POLICY_MISSING" };
  }

  // Check signal commit exists
  const commit = gitCommits.get(approval.signalCommit);
  if (!commit) {
    return { valid: false, reason: "INVALID_SIGNAL" };
  }

  // Check commit has signature
  if (!commit.signature) {
    return { valid: false, reason: "UNSIGNED_COMMIT" };
  }

  // Check not from assistant (criterion 7.8). This precedes the authorisation
  // check: an assistant-originated signal is rejected as such whatever identity
  // it names, so the reason reported is the one that actually disqualifies it.
  if (commit.sessionMetadata?.isAssistant) {
    return { valid: false, reason: "FROM_ASSISTANT" };
  }

  // Check approver is authorized (criterion 7.1)
  const authorizedApprovers = getApprovers(policy, riskClass, approval.artifact);
  if (!authorizedApprovers.some((listed) => matchesApprover(approval.approver, listed))) {
    return { valid: false, reason: "NOT_AUTHORIZED" };
  }

  // NOTE: the engine does not verify the signature against a key the policy
  // lists for the approver (criterion 7.3) — ApprovalPolicy carries no keys yet.

  // All checks passed
  return { valid: true };
}

/**
 * Count valid approvals for an artifact.
 * Pure function - iterates and verifies.
 */
export function countValidApprovals(
  approvals: ReadonlyArray<{
    approver: string;
    artifact: ArtifactKind;
    artifactChecksum: Checksum;
    signalCommit: string;
  }>,
  policy: ApprovalPolicy | null,
  riskClass: RiskClass,
  artifactKind: ArtifactKind,
  currentChecksum: Checksum,
  gitCommits: ReadonlyMap<string, GitCommit>,
): number {
  let count = 0;
  const seenApprovers = new Set<string>();

  for (const approval of approvals) {
    // Check artifact matches
    if (approval.artifact !== artifactKind) {
      continue;
    }

    // Check checksum matches (criterion 8.2)
    if (approval.artifactChecksum !== currentChecksum) {
      continue; // Invalidated approval, don't count
    }

    // Verify approval
    const result = verifyApproval(approval, policy, riskClass, gitCommits);
    if (!result.valid) {
      continue;
    }

    // Check distinct approvers (criterion 7.11), compared as matchesApprover does
    const approverKey = normaliseApprover(approval.approver);
    if (seenApprovers.has(approverKey)) {
      continue; // Already approved by this person
    }

    seenApprovers.add(approverKey);
    count++;
  }

  return count;
}

/**
 * Get the required number of approvals for an artifact.
 */
export function getRequiredApprovalCount(
  policy: ApprovalPolicy | null,
  riskClass: RiskClass,
  artifactKind: ArtifactKind,
): number {
  if (!policy) {
    return 0;
  }

  const riskMap = policy.requiredCount.get(riskClass);
  if (!riskMap) {
    return 0;
  }

  return riskMap.get(artifactKind) ?? 0;
}

/** Result of checking an artifact's approvals against the policy's requirement. */
export interface RequiredApprovalsResult {
  /** True when `count` reaches `required` and `required` is at least 1. */
  readonly met: boolean;
  /** Valid approvals from distinct authorised approvers. */
  readonly count: number;
  /** Approvals the policy requires for the artifact at the risk class. */
  readonly required: number;
}

/**
 * Decide whether an artifact holds the approvals the policy requires
 * (criterion 7.11: N valid approvals from N distinct authorised approvers).
 *
 * A policy that requires zero approvals — or names no requirement for the
 * artifact at this risk class — is never "met": criterion 7.5 makes a missing
 * approver list a refusal, not a free pass.
 */
export function hasRequiredApprovals(
  approvals: Parameters<typeof countValidApprovals>[0],
  policy: ApprovalPolicy | null,
  riskClass: RiskClass,
  artifactKind: ArtifactKind,
  currentChecksum: Checksum,
  gitCommits: ReadonlyMap<string, GitCommit>,
): RequiredApprovalsResult {
  const required = getRequiredApprovalCount(policy, riskClass, artifactKind);
  const count = countValidApprovals(
    approvals,
    policy,
    riskClass,
    artifactKind,
    currentChecksum,
    gitCommits,
  );
  return { met: required > 0 && count >= required, count, required };
}

/**
 * Compare an approving identity with a policy entry. Identities are email
 * addresses; they compare case-insensitively after trimming, so a policy
 * listing `Alice@Example.com` authorises `alice@example.com`.
 */
export function matchesApprover(identity: string, listed: string): boolean {
  return normaliseApprover(identity) === normaliseApprover(listed);
}

function normaliseApprover(identity: string): string {
  return identity.trim().toLowerCase();
}

/**
 * Get authorized approvers for an artifact.
 */
export function getApprovers(
  policy: ApprovalPolicy | null,
  riskClass: RiskClass,
  artifactKind: ArtifactKind,
): readonly string[] {
  if (!policy) {
    return [];
  }

  const riskMap = policy.approvers.get(riskClass);
  if (!riskMap) {
    return [];
  }

  return riskMap.get(artifactKind) ?? [];
}

/**
 * Check if a checksum has changed (approval invalidation).
 */
export function isApprovalInvalidated(
  approvalChecksum: Checksum,
  currentChecksum: Checksum,
): boolean {
  return approvalChecksum !== currentChecksum;
}

/**
 * Diagnose why an approval failed verification.
 * Returns a human-readable explanation.
 */
export function diagnoseInvalidApproval(
  approval: {
    readonly approver: string;
    readonly artifact: ArtifactKind;
    readonly artifactChecksum: Checksum;
    readonly signalCommit: string;
  },
  result: { valid: false; reason: ApprovalRejectionReason },
): string {
  switch (result.reason) {
    case "NOT_AUTHORIZED":
      return `Approver '${approval.approver}' is not authorized for ${approval.artifact}`;

    case "INVALID_SIGNAL":
      return `Approval signal commit '${approval.signalCommit.slice(0, 8)}' not found`;

    case "FROM_ASSISTANT":
      return `Approval from assistant session not permitted`;

    case "CHECKSUM_MISMATCH":
      return `Approval checksum '${approval.artifactChecksum.slice(0, 8)}' does not match current artifact`;

    case "UNSIGNED_COMMIT":
      return `Approval commit must be signed`;

    case "POLICY_MISSING":
      return `Approval policy file missing or invalid`;

    case "ARTIFACT_MISMATCH":
      return `Approval is for '${approval.artifact}', not current artifact`;

    default:
      return `Approval invalid: ${result.reason}`;
  }
}
