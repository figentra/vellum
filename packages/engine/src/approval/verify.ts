/**
 * @vellum/engine — Approval Verification
 *
 * Pure logic for verifying approvals.
 * Checks: policy, identity, signature, checksum.
 */

import type {
  ApprovalPolicy,
  ArtifactKind,
  Checksum,
  CommitSigner,
  GitCommit,
  RiskClass,
  SigningKey,
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
  | "SIGNER_NOT_AUTHORIZED"
  | "POLICY_MISSING"
  | "ARTIFACT_MISMATCH";

/**
 * Verify an approval is valid.
 * Pure function - all data passed in.
 *
 * `currentChecksum` is the Artifact Checksum of the artifact as it is now
 * (computeChecksum from @vellum/protocol: SHA-256 of the canonical body). An
 * approval is valid only for the checksum it bound (criterion 8.2), so a
 * content edit invalidates it and a formatting-only edit does not.
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
  currentChecksum: Checksum,
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

  // Check commit has a signature at all
  if (!commit.signature && !commit.signer) {
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

  // Check the signature verified against a key the policy lists for this
  // approver (criterion 7.3). `signer` is set by the storage layer only when
  // the signature verified against the policy's keys; a signature by any
  // other key — however trusted on the verifying host — is not the
  // approver's.
  if (!commit.signer || !signerIsApprovers(policy, approval.approver, commit.signer)) {
    return { valid: false, reason: "SIGNER_NOT_AUTHORIZED" };
  }

  // Check the approval binds the artifact's current checksum (criterion 8.2)
  if (approval.artifactChecksum !== currentChecksum) {
    return { valid: false, reason: "CHECKSUM_MISMATCH" };
  }

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

    // Verify approval, including the checksum binding (criterion 8.2): an
    // invalidated approval is not counted
    const result = verifyApproval(approval, policy, riskClass, gitCommits, currentChecksum);
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

/** The signing keys the policy lists for `identity` (compared as matchesApprover does). */
export function approverKeys(policy: ApprovalPolicy | null, identity: string): readonly SigningKey[] {
  if (!policy) return [];
  return policy.identities
    .filter((entry) => matchesApprover(identity, entry.identity))
    .flatMap((entry) => entry.keys);
}

/**
 * Whether `signer` is one of the keys the policy lists for `identity`.
 * GPG fingerprints compare case-insensitively with spaces removed, and match
 * either the signing (sub)key or its primary key; SSH fingerprints compare
 * exactly.
 */
export function signerIsApprovers(
  policy: ApprovalPolicy | null,
  identity: string,
  signer: CommitSigner,
): boolean {
  return approverKeys(policy, identity).some((key) => {
    if (key.type !== signer.type) return false;
    if (key.type === "ssh") return key.fingerprint === signer.fingerprint;
    const listed = normaliseGpgFingerprint(key.fingerprint);
    return (
      listed === normaliseGpgFingerprint(signer.fingerprint) ||
      (signer.primaryFingerprint !== undefined &&
        listed === normaliseGpgFingerprint(signer.primaryFingerprint))
    );
  });
}

function normaliseGpgFingerprint(fingerprint: string): string {
  return fingerprint.replace(/\s+/g, "").toUpperCase();
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

    case "SIGNER_NOT_AUTHORIZED":
      return `Approval commit is not signed by a key the policy lists for '${approval.approver}'`;

    case "POLICY_MISSING":
      return `Approval policy file missing or invalid`;

    case "ARTIFACT_MISMATCH":
      return `Approval is for '${approval.artifact}', not current artifact`;

    default:
      return `Approval invalid: ${result.reason}`;
  }
}
