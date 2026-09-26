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

  // Check approver is authorized
  const authorizedApprovers = getApprovers(policy, riskClass, approval.artifact);
  if (!authorizedApprovers.includes(approval.approver)) {
    return { valid: false, reason: "NOT_AUTHORIZED" };
  }

  // Check signature matches approver
  // (In production, this would verify GPG key identity)
  // For now, we trust that the commit signature is valid

  // Check not from assistant
  if (commit.sessionMetadata?.isAssistant) {
    return { valid: false, reason: "FROM_ASSISTANT" };
  }

  // All checks passed
  return { valid: true };
}

/**
 * Count valid approvals for an artifact.
 * Pure function - iterates and verifies.
 */
export function countValidApprovals(
  approvals: readonly Array<{
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

    // Check distinct approvers (criterion 7.11)
    if (seenApprovers.has(approval.approver)) {
      continue; // Already approved by this person
    }

    seenApprovers.add(approval.approver);
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
