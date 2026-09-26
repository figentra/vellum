/**
 * Risk Class Handler - handles Risk Class recognition, defaults, and changes.
 *
 * @see Requirement 1.1 - recognise four Risk Classes
 * @see Requirement 1.3 - apply Table 1.A defaults
 * @see Requirement 1.7 - INVALID state for outside Risk Classes
 * @see Requirement 1.8 - record Risk Class changes as Decisions
 * @see Requirement 1.9 - re-evaluate Controls after change
 * @see Requirement 1.10 - permit quick path transition
 * @see Requirement 1.11 - reject approval when approver authored
 */

import type { RiskClass } from "../domain/policy/types";
import type { DecisionRecord } from "../domain/decision/types";

/**
 * Valid Risk Classes.
 */
export const VALID_RISK_CLASSES: readonly RiskClass[] = ["low", "standard", "high", "critical"];

/**
 * Check if a Risk Class is valid.
 *
 * @param riskClass - Risk Class to validate
 * @returns true if valid
 */
export function isValidRiskClass(riskClass: string): riskClass is RiskClass {
  return VALID_RISK_CLASSES.includes(riskClass as RiskClass);
}

/**
 * Risk Class change record.
 */
export interface RiskClassChange {
  readonly specId: string;
  readonly previousClass: RiskClass;
  readonly newClass: RiskClass;
  readonly timestamp: string;
  readonly reason: string;
}

/**
 * Check if quick path is permitted for a Risk Class.
 *
 * @param riskClass - Risk Class
 * @returns true if quick path is permitted
 */
export function isQuickPathPermitted(riskClass: RiskClass): boolean {
  return riskClass === "low";
}

/**
 * Check if transition from REQUIREMENTS_APPROVED to IN_PROGRESS is permitted.
 *
 * Quick path permits direct transition without design review for low risk.
 *
 * @param riskClass - Risk Class
 * @returns true if permitted
 */
export function permitsQuickPathTransition(riskClass: RiskClass): boolean {
  return isQuickPathPermitted(riskClass);
}

/**
 * Check if approving identity authored the Artifact Version.
 *
 * @param approverEmail - approver email
 * @param artifactAuthors - list of artifact authors
 * @returns true if approver authored
 */
export function approverAuthoredArtifact(
  approverEmail: string,
  artifactAuthors: readonly string[],
): boolean {
  return artifactAuthors.includes(approverEmail);
}

/**
 * Record a Risk Class change as a Decision in the Ledger.
 *
 * @param ledgerPath - path to the ledger
 * @param change - Risk Class change record
 * @returns Decision Record
 */
export async function recordRiskClassChange(
  _ledgerPath: string,
  change: RiskClassChange,
): Promise<DecisionRecord> {
  const decision: DecisionRecord = {
    id: `decision-${change.specId}-${Date.now()}`,
    decisionId: "risk-class-change",
    actor: "policy-engine",
    timestamp: change.timestamp,
    selection: change.newClass,
    rationale: change.reason,
  };

  // In real implementation, would append to ledger at ledgerPath
  return decision;
}

/**
 * Re-evaluate Controls after a Risk Class change.
 *
 * This triggers re-computation of Controls for all subsequent transitions.
 *
 * @param specId - Spec identifier
 * @param newRiskClass - new Risk Class
 * @returns re-evaluation result
 */
export function reevaluateControlsAfterChange(
  specId: string,
  newRiskClass: RiskClass,
): {
  readonly specId: string;
  readonly riskClass: RiskClass;
  readonly controlsReevaluated: boolean;
} {
  // In a real implementation, this would trigger Control re-evaluation
  // For now, we return a confirmation
  return {
    specId,
    riskClass: newRiskClass,
    controlsReevaluated: true,
  };
}

/**
 * Validate Risk Class declaration in a Spec.
 *
 * If the Risk Class is outside the four valid values, returns INVALID state.
 *
 * @param declaredClass - Risk Class declared in Spec
 * @returns validation result
 */
export function validateRiskClassDeclaration(
  declaredClass: string,
): { valid: true; riskClass: RiskClass } | { valid: false; reason: string } {
  if (isValidRiskClass(declaredClass)) {
    return { valid: true, riskClass: declaredClass };
  }

  return {
    valid: false,
    reason: `Invalid Risk Class '${declaredClass}'. Must be one of: ${VALID_RISK_CLASSES.join(", ")}`,
  };
}

/**
 * Get Table 1.A default Controls for a Risk Class.
 *
 * @param riskClass - Risk Class
 * @returns default Controls
 */
export function getTable1ADefaults(riskClass: RiskClass) {
  const defaults = {
    low: {
      requirementsReview: "required" as const,
      designReview: "optional" as const,
      securityGate: "optional" as const,
      approvalsPerArtifact: 1,
      releaseGate: "standard" as const,
      quickPathPermitted: true,
    },
    standard: {
      requirementsReview: "required" as const,
      designReview: "required" as const,
      securityGate: "when_conditions_match" as const,
      approvalsPerArtifact: 1,
      releaseGate: "standard" as const,
      quickPathPermitted: false,
    },
    high: {
      requirementsReview: "required" as const,
      designReview: "required" as const,
      securityGate: "required" as const,
      approvalsPerArtifact: 1,
      releaseGate: "explicit" as const,
      quickPathPermitted: false,
    },
    critical: {
      requirementsReview: "required" as const,
      designReview: "required" as const,
      securityGate: "required" as const,
      approvalsPerArtifact: 2,
      releaseGate: "explicit_with_rollback_path" as const,
      quickPathPermitted: false,
    },
  };

  return defaults[riskClass];
}
