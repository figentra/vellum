/**
 * Rollback Verifier - checks a critical release declares a rollback path.
 *
 * 004 criterion 7.5: WHERE the Spec's Risk Class is `critical`, IF the release
 * declares no rollback path, THEN the Release Gate refuses the release and
 * names the missing rollback path. The engine reads no files, so the caller
 * supplies what the release declares.
 *
 * @see requirements.md Requirement 7.5
 */

import type { CheckOutcome } from "./outcome.js";

/**
 * Verify a release declares a rollback path where its risk class requires one.
 *
 * @param riskClass - Risk class of the release
 * @param declaredRollbackPath - The rollback path the release declares; null or
 *   empty when it declares none; undefined when the caller did not read the declaration
 * @returns pass, fail naming the missing path, or not_checked
 */
export function verifyRollbackPath(
  riskClass: "low" | "standard" | "high" | "critical",
  declaredRollbackPath: string | null | undefined,
): CheckOutcome {
  if (!isRollbackVerificationRequired(riskClass)) return { status: "pass" };
  if (declaredRollbackPath === undefined) {
    return { status: "not_checked", reason: "the release's rollback declaration was not supplied" };
  }
  if (declaredRollbackPath === null || declaredRollbackPath.trim() === "") {
    return {
      status: "fail",
      errors: ["A critical release must declare a rollback path, and this release declares none"],
    };
  }
  return { status: "pass" };
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
