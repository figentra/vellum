/**
 * Approval Validator - validates approvals against policy.
 *
 * @see requirements.md Requirement 6.1
 */

import type { ApprovalPayload, GitCommit } from "@vellum/protocol";

/**
 * Approval validation result.
 */
export interface ApprovalValidationResult {
  /** Whether the approval is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
}

/**
 * Policy requirements an approval is checked against.
 */
export interface ApprovalValidationPolicy {
  readonly requiresSignedCommits: boolean;
  readonly authorizedApprovers: readonly string[];
}

/**
 * Validate an approval against policy requirements.
 *
 * Whether the approval came from an assistant session is read from the
 * approval's signal commit (design: "If the signal commit's metadata indicates
 * an assistant session, reject"), so the caller supplies the commits.
 *
 * @param approval - Approval to validate
 * @param policy - Policy requirements
 * @param commits - Git commits keyed by SHA, containing the approval's signal commit
 * @returns Validation result
 */
export function validateApproval(
  approval: ApprovalPayload,
  policy: ApprovalValidationPolicy,
  commits: ReadonlyMap<string, GitCommit>,
): ApprovalValidationResult {
  const errors: string[] = [];
  const signal = commits.get(approval.signalCommit);

  if (!signal) {
    errors.push(`Approval signal commit ${approval.signalCommit} not found`);
  } else {
    // Check session type is human (criterion 6.1)
    if (signal.sessionMetadata?.isAssistant) {
      errors.push("Assistant sessions cannot approve artifacts");
    }

    // Check approval signal commit is signed (if required)
    if (policy.requiresSignedCommits && !signal.signature) {
      errors.push(`Approval signal commit ${approval.signalCommit} is not signed`);
    }
  }

  // Check identity is authorized
  if (!policy.authorizedApprovers.includes(approval.approver)) {
    errors.push(`Approver ${approval.approver} is not authorized`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if an approval is stale.
 *
 * @param approval - Approval to check
 * @param currentChecksum - Current artifact checksum
 * @returns True if stale
 */
export function isApprovalStale(approval: ApprovalPayload, currentChecksum: string): boolean {
  return approval.artifactChecksum !== currentChecksum;
}

/**
 * Validate approvals for a set of artifacts.
 *
 * @param approvals - Approvals to validate
 * @param policy - Policy requirements
 * @param commits - Git commits keyed by SHA, containing each approval's signal commit
 * @returns Validation result for all approvals
 */
export function validateApprovals(
  approvals: readonly ApprovalPayload[],
  policy: ApprovalValidationPolicy,
  commits: ReadonlyMap<string, GitCommit>,
): ApprovalValidationResult {
  const errors: string[] = [];

  for (const approval of approvals) {
    const result = validateApproval(approval, policy, commits);
    errors.push(...result.errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
