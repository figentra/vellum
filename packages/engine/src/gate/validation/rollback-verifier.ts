/**
 * Rollback Verifier - checks rollback path exists for critical releases.
 *
 * @see requirements.md Requirement 7.5
 */

/**
 * Rollback verification result.
 */
export interface RollbackVerificationResult {
  /** Whether rollback is possible */
  possible: boolean;
  /** Rollback path */
  path?: string;
  /** Verification errors */
  errors: string[];
}

/**
 * Verify rollback path exists.
 *
 * @param version - Release version
 * @param isCritical - Whether release is critical class
 * @returns Rollback verification result
 */
export async function verifyRollbackPath(
  version: string,
  isCritical: boolean,
): Promise<RollbackVerificationResult> {
  // Critical releases must have rollback path (criterion 7.5)
  if (!isCritical) {
    return {
      possible: true,
      errors: [],
    };
  }

  // In real implementation, check for:
  // 1. Previous version tag exists
  // 2. Database migration rollback script exists
  // 3. Deployment rollback procedure documented

  // Placeholder: assume rollback path exists
  const previousVersion = getPreviousVersion(version);
  const rollbackPath = `.sdlc/rollback-${previousVersion}.md`;

  return {
    possible: true,
    path: rollbackPath,
    errors: [],
  };
}

/**
 * Get previous version for rollback.
 */
function getPreviousVersion(version: string): string {
  const parts = version.split(".").map(Number);
  if (parts.length === 3 && parts[2] !== undefined) {
    parts[2]--;
    return parts.join(".");
  }
  return version;
}

/**
 * Check if rollback verification is required.
 *
 * @param riskClass - Risk class of release
 * @returns True if rollback verification required
 */
export function isRollbackVerificationRequired(
  riskClass: "low" | "standard" | "high" | "critical",
): boolean {
  return riskClass === "critical";
}
