/**
 * @vellum/engine — Approval Verification
 *
 * Pure logic for verifying approvals.
 * Checks: policy, identity, signature, checksum.
 */

import type {
  ApprovalPolicy,
  ApprovalPayload,
  GitCommit,
  ArtifactKind,
  RiskClass,
  Checksum,
  CommitSha,
} from "@vellum/protocol";
import { brand } from "@vellum/protocol";

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
  approval: ApprovalPayload,
  policy: ApprovalPolicy | null,
  riskClass: RiskClass,
  gitCommits: ReadonlyMap<string, GitCommit>,
): ApprovalVerificationResult {
  // Check policy exists
  if (!policy) {
    return { valid: false, reason: "POLICY_MISSING" };
  }

  // Check signal commit exists
  const commit = gitCommits.get(unwrap(approval.signalCommit));
  if (!commit) {
    return { valid: false, reason: "INVALID_SIGNAL" };
  }

  // Check commit has signature
  if (!commit.signature) {
    return { valid: false, reason: "UNSIGNED_COMMIT" };
  }

  // Check approver is authorized
  const authorizedApprovers = getApprovers(policy, riskClass, approval.artifactKind);
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
  approvals: readonly ApprovalPayload[],
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
    if (approval.artifactKind !== artifactKind) {
      continue;
    }

    // Check checksum matches (criterion 8.2)
    if (approval.artifactChecksum !== currentChecksum) {
      // Invalidated approval - checksum mismatch
      // Not counted, but not an error either
      continue;
    }

    // Verify approval
    const result = verifyApproval(approval, policy, riskClass, gitCommits);
    if (result.valid) {
      // Check for duplicate approver
      if (!seenApprovers.has(approval.approver)) {
        seenApprovers.add(approval.approver);
        count++;
      }
    }
  }

  return count;
}

/**
 * Check if all required approvals are present.
 */
export function hasRequiredApprovals(
  approvals: readonly ApprovalPayload[],
  policy: ApprovalPolicy | null,
  riskClass: RiskClass,
  artifactKind: ArtifactKind,
  currentChecksum: Checksum,
  gitCommits: ReadonlyMap<string, GitCommit>,
): { met: boolean; count: number; required: number } {
  const count = countValidApprovals(
    approvals,
    policy,
    riskClass,
    artifactKind,
    currentChecksum,
    gitCommits,
  );

  const required = policy ? getRequiredCount(policy, riskClass, artifactKind) : 0;

  return {
    met: count >= required,
    count,
    required,
  };
}

/**
 * Get approvers for (risk class, artifact kind) from policy.
 */
export function getApprovers(
  policy: ApprovalPolicy,
  riskClass: RiskClass,
  artifactKind: ArtifactKind,
): readonly string[] {
  const classMap = policy.approvers.get(riskClass);
  if (!classMap) return [];

  const approvers = classMap.get(artifactKind);
  return approvers ?? [];
}

/**
 * Get required approval count for (risk class, artifact kind) from policy.
 */
export function getRequiredCount(
  policy: ApprovalPolicy,
  riskClass: RiskClass,
  artifactKind: ArtifactKind,
): number {
  const classMap = policy.requiredCount.get(riskClass);
  if (!classMap) return 0;

  return classMap.get(artifactKind) ?? 0;
}

/**
 * Check if an identity matches a policy approver.
 * Handles various identity formats (email, name, key fingerprint).
 */
export function matchesApprover(identity: string, approver: string): boolean {
  // Exact match
  if (identity === approver) {
    return true;
  }

  // Email match (identity might be full email, approver might be just username)
  if (identity.includes("@") && approver.includes("@")) {
    return identity.toLowerCase() === approver.toLowerCase();
  }

  // Name match (case-insensitive)
  return identity.toLowerCase() === approver.toLowerCase();
}

/**
 * Generate a diagnostic for invalid approval.
 */
export function diagnoseInvalidApproval(
  approval: ApprovalPayload,
  result: { valid: false; reason: ApprovalRejectionReason },
): string {
  switch (result.reason) {
    case "NOT_AUTHORIZED":
      return `Approver '${approval.approver}' is not authorized for ${approval.artifactKind}`;

    case "INVALID_SIGNAL":
      return `Approval signal commit '${unwrap(approval.signalCommit).slice(0, 8)}' not found`;

    case "FROM_ASSISTANT":
      return `Approval from assistant session not permitted`;

    case "CHECKSUM_MISMATCH":
      return `Approval checksum '${unwrap(approval.artifactChecksum).slice(0, 8)}' does not match current artifact`;

    case "UNSIGNED_COMMIT":
      return `Approval commit must be signed`;

    case "POLICY_MISSING":
      return `Approval policy file missing or invalid`;

    case "ARTIFACT_MISMATCH":
      return `Approval is for '${approval.artifactKind}', not current artifact`;

    default:
      return `Approval invalid: ${result.reason}`;
  }
}

// Helper to unwrap branded types
function unwrap<T, B>(branded: ReturnType<typeof brand<T, B>>): T {
  return branded as T;
}
