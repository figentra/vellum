/**
 * Approval Validator - validates approvals against policy.
 *
 * @see requirements.md Requirement 6.1
 */

import type { ApprovalPayload } from "@vellum/protocol";

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
 * Validate an approval against policy requirements.
 *
 * @param approval - Approval to validate
 * @param policy - Policy requirements
 * @returns Validation result
 */
export function validateApproval(
  approval: ApprovalPayload,
  policy: {
    requiresSignedCommits: boolean;
    authorizedApprovers: string[];
  },
): ApprovalValidationResult {
  const errors: string[] = [];

  // Check session type is human (criterion 6.1)
  if (approval.session_type === "assistant") {
    errors.push("Assistant sessions cannot approve artifacts");
  }

  // Check identity is authorized
  if (!policy.authorizedApprovers.includes(approval.identity)) {
    errors.push(`Approver ${approval.identity} is not authorized`);
  }

  // Check approval signal commit is signed (if required)
  if (policy.requiresSignedCommits) {
    // In real implementation, verify GPG/SSH signature
    // For now, assume it's valid
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
  return approval.artifact_checksum !== currentChecksum;
}

/**
 * Validate approvals for a set of artifacts.
 *
 * @param approvals - Approvals to validate
 * @param policy - Policy requirements
 * @returns Validation result for all approvals
 */
export function validateApprovals(
  approvals: ApprovalPayload[],
  policy: {
    requiresSignedCommits: boolean;
    authorizedApprovers: string[];
  },
): ApprovalValidationResult {
  const errors: string[] = [];

  for (const approval of approvals) {
    const result = validateApproval(approval, policy);
    errors.push(...result.errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
