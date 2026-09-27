/**
 * Control Resolver - resolves most specific Control for a context.
 *
 * @see Requirement 1.4 - apply most specific matching rule
 * @see Requirement 1.5 - exit 2 when two rules of equal specificity conflict
 */

import type { Control, RiskClass } from "../domain/policy/types";

/**
 * Context for resolving Controls.
 */
export interface ControlContext {
  readonly riskClass: RiskClass;
  readonly artifactPath?: string;
  readonly changeType?: string;
  readonly environment?: string;
}

/**
 * Policy rule with specificity.
 */
export interface PolicyRule {
  readonly riskClass?: RiskClass;
  readonly artifactPattern?: string;
  readonly changeType?: string;
  readonly environment?: string;
  readonly control: Control;
}

/**
 * Control resolution error.
 */
export interface ControlResolutionError {
  readonly code: "CONFLICTING_RULES";
  readonly message: string;
  readonly rule1: PolicyRule;
  readonly rule2: PolicyRule;
  readonly exitStatus: 2;
}

/**
 * Calculate specificity score for a rule.
 *
 * Higher score = more specific.
 * Each scoped property adds 1 to the score.
 *
 * @param rule - Policy rule
 * @returns specificity score
 */
export function calculateSpecificity(rule: PolicyRule): number {
  let score = 0;
  if (rule.riskClass !== undefined) score += 1;
  if (rule.artifactPattern !== undefined) score += 1;
  if (rule.changeType !== undefined) score += 1;
  if (rule.environment !== undefined) score += 1;
  return score;
}

/**
 * Check if a rule matches a context.
 *
 * @param rule - Policy rule
 * @param context - Control context
 * @returns true if rule matches
 */
export function ruleMatches(rule: PolicyRule, context: ControlContext): boolean {
  if (rule.riskClass !== undefined && rule.riskClass !== context.riskClass) {
    return false;
  }
  if (rule.artifactPattern !== undefined && context.artifactPath !== undefined) {
    if (!matchPattern(rule.artifactPattern, context.artifactPath)) {
      return false;
    }
  }
  if (rule.changeType !== undefined && context.changeType !== undefined) {
    if (rule.changeType !== context.changeType) {
      return false;
    }
  }
  if (rule.environment !== undefined && context.environment !== undefined) {
    if (rule.environment !== context.environment) {
      return false;
    }
  }
  return true;
}

/**
 * Match a glob pattern against a path.
 *
 * @param pattern - glob pattern (supports * and **)
 * @param path - path to match
 * @returns true if pattern matches
 */
export function matchPattern(pattern: string, path: string): boolean {
  // Simple glob matching
  // Convert pattern to regex
  // ** matches zero or more path segments (including /)
  // * matches anything except /

  // Build regex character by character to avoid replacement conflicts
  let regexPattern = "";
  let i = 0;
  while (i < pattern.length) {
    // Check for ** before *
    if (pattern[i] === "*" && pattern[i + 1] === "*") {
      regexPattern += ".*";
      i += 2;
    } else if (pattern[i] === "*") {
      regexPattern += "[^/]*";
      i++;
    } else if (pattern[i] === ".") {
      regexPattern += "\\.";
      i++;
    } else if (pattern[i] === "/") {
      regexPattern += "/";
      i++;
    } else {
      regexPattern += pattern[i];
      i++;
    }
  }

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

/**
 * Resolve the most specific Control for a context.
 *
 * @param rules - Policy rules
 * @param context - Control context
 * @returns most specific Control
 * @throws {ControlResolutionError} when two rules of equal specificity conflict
 */
export function resolveControl(rules: readonly PolicyRule[], context: ControlContext): Control {
  // Filter rules that match the context
  const matchingRules = rules.filter((rule) => ruleMatches(rule, context));

  if (matchingRules.length === 0) {
    // Return default control for the risk class
    return getDefaultControl(context.riskClass);
  }

  // Sort by specificity (highest first)
  const sorted = [...matchingRules].sort(
    (a, b) => calculateSpecificity(b) - calculateSpecificity(a),
  );

  // Check for conflicts at highest specificity
  const highestSpecificity = calculateSpecificity(sorted[0]!);
  const highestRules = sorted.filter((rule) => calculateSpecificity(rule) === highestSpecificity);

  if (highestRules.length > 1) {
    // Multiple rules at same specificity - check if controls are identical
    const controls = highestRules.map((r) => JSON.stringify(r.control));
    const uniqueControls = new Set(controls);

    if (uniqueControls.size > 1) {
      // Conflicting controls at same specificity
      const firstRule = highestRules[0]!;
      const secondRule = highestRules[1]!;
      const error: ControlResolutionError = {
        code: "CONFLICTING_RULES",
        message:
          `Two rules of equal specificity assign different values:\n` +
          `  Rule 1: ${JSON.stringify(firstRule)}\n` +
          `  Rule 2: ${JSON.stringify(secondRule)}`,
        rule1: firstRule,
        rule2: secondRule,
        exitStatus: 2,
      };
      throw error;
    }
  }

  return sorted[0]!.control;
}

/**
 * Get default Control for a Risk Class.
 *
 * @param riskClass - Risk Class
 * @returns default Control
 */
export function getDefaultControl(riskClass: RiskClass): Control {
  const defaults: Record<RiskClass, Control> = {
    low: {
      requirementsReview: "required",
      designReview: "optional",
      securityGate: "optional",
      approvalsPerArtifact: 1,
      releaseGate: "standard",
      quickPathPermitted: true,
    },
    standard: {
      requirementsReview: "required",
      designReview: "required",
      securityGate: "when_conditions_match",
      approvalsPerArtifact: 1,
      releaseGate: "standard",
      quickPathPermitted: false,
    },
    high: {
      requirementsReview: "required",
      designReview: "required",
      securityGate: "required",
      approvalsPerArtifact: 1,
      releaseGate: "explicit",
      quickPathPermitted: false,
    },
    critical: {
      requirementsReview: "required",
      designReview: "required",
      securityGate: "required",
      approvalsPerArtifact: 2,
      releaseGate: "explicit_with_rollback_path",
      quickPathPermitted: false,
    },
  };

  return defaults[riskClass];
}
