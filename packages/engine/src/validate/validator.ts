/**
 * Protocol Validator
 *
 * Validates artifacts against the Markdown Protocol, Lifecycle Frontmatter Schema,
 * and Task Line Grammar.
 *
 * @module vellum/protocol-validator/validator
 */

import type { Finding } from "./finding";
import { RuleIdentifier, RULE_MESSAGES } from "./rules";

/**
 * Artifact types that can be validated.
 */
export type ArtifactType = "requirements" | "design" | "tasks";

/**
 * Result of validating a single artifact.
 */
export interface ValidationResult {
  /** The artifact that was validated */
  readonly artifact: string;

  /** True if validation passed with no findings */
  readonly valid: boolean;

  /** Findings discovered during validation */
  readonly findings: Finding[];
}

/**
 * Validate a single artifact against the Markdown Protocol.
 *
 * @param path - Path to the artifact file
 * @param _type - Type of artifact (requirements, design, or tasks)
 * @returns Validation result with findings
 */
export function validateArtifact(path: string, _type: ArtifactType): ValidationResult {
  const findings: Finding[] = [];

  // Placeholder implementation - actual validation logic would go here
  // This is a stub that will be expanded in subsequent tasks

  return {
    artifact: path,
    valid: findings.length === 0,
    findings,
  };
}

/**
 * Validate a tasks.md file.
 *
 * Checks:
 * - Task line grammar (Kiro Task Line Grammar)
 * - Task numbering format
 * - Optional task markers
 * - Checkpoint format
 * - Wave graph validity
 *
 * @param path - Path to the tasks.md file
 * @returns Validation result with findings
 */
export function validateTasksMd(path: string): ValidationResult {
  const findings: Finding[] = [];

  // Placeholder implementation - actual validation logic would go here

  return {
    artifact: path,
    valid: findings.length === 0,
    findings,
  };
}

/**
 * Validate all specs in a repository.
 *
 * @param _repoPath - Path to the repository root
 * @returns Map of spec paths to validation results
 */
export function validateAll(_repoPath: string): Map<string, ValidationResult> {
  const results = new Map<string, ValidationResult>();

  // Placeholder implementation - actual logic would discover specs and validate each

  return results;
}

/**
 * Create a finding with a formatted message.
 *
 * @param file - File path
 * @param line - Line number
 * @param rule - Rule identifier
 * @param substitutions - Optional substitutions for message template
 */
export function createFinding(
  file: string,
  line: number,
  rule: RuleIdentifier,
  substitutions?: Record<string, string>,
): Finding {
  let message = RULE_MESSAGES[rule];

  if (substitutions) {
    for (const [key, value] of Object.entries(substitutions)) {
      message = message.replace(`{${key}}`, value);
    }
  }

  return { file, line, rule, message };
}
