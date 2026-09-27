/**
 * @vellum/engine — Protocol Validator
 *
 * Validates spec structure, frontmatter, and checksums.
 * Pure function - no I/O.
 *
 * @see design.md Criterion 11
 */

import type { Artifact, Finding } from "@vellum/protocol";
import { validateFrontmatterChecksum } from "@vellum/protocol";
import { createFinding } from "./finding.js";

/**
 * Protocol validation result.
 */
export interface ProtocolValidationResult {
  /** Whether validation passed */
  readonly valid: boolean;
  /** All findings from validation */
  readonly findings: readonly Finding[];
}

/**
 * Validate a spec's protocol compliance.
 * Checks frontmatter, artifact structure, and checksum integrity.
 *
 * @param artifacts - The spec's artifacts (requirements, design, tasks)
 * @returns Validation result with findings
 */
export function validateProtocol(artifacts: readonly Artifact[]): ProtocolValidationResult {
  const findings: Finding[] = [];

  // Validate each artifact
  for (const artifact of artifacts) {
    const artifactFindings = validateArtifact(artifact);
    findings.push(...artifactFindings);
  }

  return {
    valid: findings.length === 0,
    findings: Object.freeze(findings),
  };
}

/**
 * Validate a single artifact.
 */
function validateArtifact(artifact: Artifact): Finding[] {
  const findings: Finding[] = [];

  // Check frontmatter structure
  const frontmatterFindings = validateFrontmatter(artifact);
  findings.push(...frontmatterFindings);

  // Check checksum
  const checksumFindings = validateChecksum(artifact);
  findings.push(...checksumFindings);

  return findings;
}

/**
 * Validate artifact frontmatter.
 */
function validateFrontmatter(artifact: Artifact): Finding[] {
  const findings: Finding[] = [];
  const fm = artifact.frontmatter;

  // Check version
  if (!Number.isInteger(fm.version) || fm.version < 1) {
    findings.push(
      createFinding(
        artifact.path,
        1,
        "FRONTMATTER_INVALID_VERSION",
        `Artifact version must be a positive integer, got: ${fm.version}`,
      ),
    );
  }

  // Check state
  const validStates = [
    "DRAFT",
    "IN_REVIEW",
    "REQUIREMENTS_APPROVED",
    "DESIGN_IN_REVIEW",
    "DESIGN_APPROVED",
    "PLAN_IN_REVIEW",
    "PLAN_APPROVED",
    "IN_PROGRESS",
    "VERIFICATION",
    "VERIFIED",
    "MERGED",
    "RELEASED",
    "DONE",
    "BLOCKED",
    "REJECTED",
    "SUPERSEDED",
    "ABANDONED",
    "INVALID",
  ];

  if (!validStates.includes(fm.state)) {
    findings.push(
      createFinding(
        artifact.path,
        1,
        "FRONTMATTER_INVALID_STATE",
        `Invalid lifecycle state: ${fm.state}`,
      ),
    );
  }

  // Check timestamps
  try {
    const createdAt = new Date(fm.createdAt);
    const updatedAt = new Date(fm.updatedAt);

    if (isNaN(createdAt.getTime())) {
      findings.push(
        createFinding(
          artifact.path,
          1,
          "FRONTMATTER_INVALID_TIMESTAMP",
          `Invalid createdAt timestamp: ${fm.createdAt}`,
        ),
      );
    }

    if (isNaN(updatedAt.getTime())) {
      findings.push(
        createFinding(
          artifact.path,
          1,
          "FRONTMATTER_INVALID_TIMESTAMP",
          `Invalid updatedAt timestamp: ${fm.updatedAt}`,
        ),
      );
    }

    // UpdatedAt should be >= createdAt
    if (!isNaN(createdAt.getTime()) && !isNaN(updatedAt.getTime())) {
      if (updatedAt < createdAt) {
        findings.push(
          createFinding(
            artifact.path,
            1,
            "FRONTMATTER_TIMESTAMP_ORDER",
            `updatedAt (${fm.updatedAt}) is before createdAt (${fm.createdAt})`,
          ),
        );
      }
    }
  } catch (error) {
    findings.push(
      createFinding(
        artifact.path,
        1,
        "FRONTMATTER_TIMESTAMP_PARSE",
        `Failed to parse timestamps: ${error}`,
      ),
    );
  }

  return findings;
}

/**
 * Validate artifact checksum matches the actual body.
 */
function validateChecksum(artifact: Artifact): Finding[] {
  const findings: Finding[] = [];

  // Use protocol's checksum validation
  const isValid = validateFrontmatterChecksum(artifact.frontmatter, artifact.body);

  if (!isValid) {
    findings.push(
      createFinding(
        artifact.path,
        1,
        "CHECKSUM_MISMATCH",
        `Artifact checksum does not match body content`,
      ),
    );
  }

  return findings;
}

/**
 * Validate that a spec has all required artifacts.
 */
export function validateRequiredArtifacts(artifacts: readonly Artifact[]): Finding[] {
  const findings: Finding[] = [];
  const kinds = new Set(artifacts.map((a) => a.kind));

  const required: Array<{ kind: "requirements" | "design" | "tasks"; name: string }> = [
    { kind: "requirements", name: "requirements.md" },
    { kind: "design", name: "design.md" },
    { kind: "tasks", name: "tasks.md" },
  ];

  for (const { kind, name } of required) {
    if (!kinds.has(kind)) {
      findings.push(
        createFinding(name, 0, "REQUIRED_ARTIFACT_MISSING", `Missing required artifact: ${name}`),
      );
    }
  }

  return findings;
}
