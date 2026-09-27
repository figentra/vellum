/**
 * Model Tier Resolver - assigns Model Tiers to Agent Roles.
 *
 * @see Requirement 12.1 - assign Model Tier from Policy
 * @see Requirement 12.2 - default undeclared roles to frontier
 * @see Requirement 12.3 - exit 2 if reader assigned to Frontier-Only Role
 * @see Requirement 12.4 - exit 2 if Model Tier outside reader/frontier
 */

import type { ModelTier } from "../domain/policy/types";

/**
 * Agent Roles that are Frontier-Only (may write, review, design or decide gates).
 *
 * Per Requirement 12, these roles must not be assigned reader tier.
 */
export const FRONTIER_ONLY_ROLES: readonly string[] = [
  "spec-author",
  "spec-planner",
  "spec-executor",
  "e2e-test-engineer",
  "code-standards-steward",
  "docs-adr-steward",
  "docs-changesets-steward",
  "architecture-guardian",
  "security-reviewer",
  "test-engineer",
];

/**
 * Model Tier assignment error.
 */
export interface ModelTierError {
  readonly code: "INVALID_MODEL_TIER" | "FRONTIER_ONLY_RESTRICTION";
  readonly message: string;
  readonly agentRole: string;
  readonly exitStatus: 2;
}

/**
 * Check if a Model Tier is valid.
 *
 * @param tier - Model Tier to validate
 * @returns true if valid
 */
export function isValidModelTier(tier: string): tier is ModelTier {
  return tier === "reader" || tier === "frontier";
}

/**
 * Check if an Agent Role is Frontier-Only.
 *
 * @param agentRole - Agent Role to check
 * @returns true if Frontier-Only
 */
export function isFrontierOnlyRole(agentRole: string): boolean {
  return FRONTIER_ONLY_ROLES.includes(agentRole);
}

/**
 * Validate Model Tier assignment for an Agent Role.
 *
 * @param agentRole - Agent Role
 * @param modelTier - assigned Model Tier
 * @throws {ModelTierError} when validation fails
 */
export function validateModelTierAssignment(agentRole: string, modelTier: ModelTier): void {
  // Check if Model Tier is valid
  if (!isValidModelTier(modelTier)) {
    const error: ModelTierError = {
      code: "INVALID_MODEL_TIER",
      message: `Invalid Model Tier '${modelTier}' for role '${agentRole}'. Must be 'reader' or 'frontier'.`,
      agentRole,
      exitStatus: 2,
    };
    throw error;
  }

  // Check if Frontier-Only role assigned reader
  if (isFrontierOnlyRole(agentRole) && modelTier === "reader") {
    const error: ModelTierError = {
      code: "FRONTIER_ONLY_RESTRICTION",
      message: `Agent Role '${agentRole}' is Frontier-Only and may not be assigned 'reader' Model Tier.`,
      agentRole,
      exitStatus: 2,
    };
    throw error;
  }
}

/**
 * Resolve Model Tier for an Agent Role.
 *
 * If no assignment exists in Policy, defaults to 'frontier'.
 *
 * @param assignments - Model Tier assignments from Policy
 * @param agentRole - Agent Role to resolve
 * @returns Model Tier for the role
 */
export function resolveModelTier(
  assignments: Record<string, ModelTier>,
  agentRole: string,
): ModelTier {
  const assigned = assignments[agentRole];

  if (!assigned) {
    // Default to frontier for undeclared roles
    return "frontier";
  }

  // Validate the assignment
  validateModelTierAssignment(agentRole, assigned);

  return assigned;
}

/**
 * Resolve Model Tiers for all Agent Roles.
 *
 * @param assignments - Model Tier assignments from Policy
 * @param allRoles - all known Agent Roles
 * @returns complete Model Tier mapping
 */
export function resolveAllModelTiers(
  assignments: Record<string, ModelTier>,
  allRoles: readonly string[],
): Record<string, ModelTier> {
  const result: Record<string, ModelTier> = {};

  for (const role of allRoles) {
    result[role] = resolveModelTier(assignments, role);
  }

  return result;
}

/**
 * Get reason why a role is Frontier-Only.
 *
 * @param agentRole - Agent Role
 * @returns reason string
 */
export function getFrontierOnlyReason(agentRole: string): string {
  const reasons: Record<string, string> = {
    "spec-author": "writes requirements and design documents",
    "spec-planner": "creates task plans",
    "spec-executor": "writes source code and tests",
    "e2e-test-engineer": "writes end-to-end tests",
    "code-standards-steward": "writes linting and formatting rules",
    "docs-adr-steward": "writes architecture decision records",
    "docs-changesets-steward": "writes changelog entries",
    "architecture-guardian": "reviews and decides on architecture",
    "security-reviewer": "reviews and decides on security",
    "test-engineer": "writes test code",
  };

  return reasons[agentRole] ?? "writes or decides critical content";
}
