/**
 * Artifact Reader - parses Markdown artifacts with YAML frontmatter.
 *
 * @see requirements.md Requirements 4.2, 11.1
 */

import { createHash } from "crypto";
import { readFile } from "fs/promises";

/**
 * Parsed artifact result.
 */
export interface ParsedArtifact {
  /** YAML frontmatter (may be null if no frontmatter) */
  frontmatter: Record<string, unknown> | null;
  /** Artifact body (after frontmatter) */
  body: string;
  /** Raw file content */
  raw: string;
}

/**
 * Extract frontmatter from artifact content.
 *
 * Frontmatter is a YAML block bounded by `---` delimiters at the start of the file.
 *
 * @param content - Raw file content
 * @returns Parsed frontmatter and remaining body
 */
export function extractFrontmatter(content: string): {
  frontmatter: Record<string, unknown> | null;
  body: string;
} {
  const FRONTMATTER_DELIMITER = "---";

  // Check if file starts with frontmatter delimiter
  if (!content.startsWith(FRONTMATTER_DELIMITER)) {
    return { frontmatter: null, body: content };
  }

  // Find the closing delimiter
  const lines = content.split("\n");
  const closingIndex = lines.findIndex((line, index) => {
    return index > 0 && line.trim() === FRONTMATTER_DELIMITER;
  });

  if (closingIndex === -1) {
    // No closing delimiter found
    return { frontmatter: null, body: content };
  }

  const frontmatterLines = lines.slice(1, closingIndex).join("\n");
  const bodyLines = lines.slice(closingIndex + 1).join("\n");

  // Parse YAML (simple key-value parser)
  // Note: Full YAML parsing would require a YAML library, which is disallowed by ADR-0009
  // For Slice 1, we use a simple parser that handles the known frontmatter format
  const frontmatter = parseSimpleYaml(frontmatterLines);

  return { frontmatter, body: bodyLines };
}

/**
 * Parse simple YAML (key: value format only).
 *
 * This is a minimal parser for the known frontmatter schema.
 * Does not handle complex YAML features (lists, nested objects, etc.).
 */
function parseSimpleYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const line of yaml.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, colonIndex).trim();
    let value: unknown = trimmed.slice(colonIndex + 1).trim();

    // Remove quotes if present
    if (typeof value === "string") {
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
    }

    // Convert numeric strings
    if (typeof value === "string" && /^\d+$/.test(value)) {
      value = parseInt(value, 10);
    }

    result[key] = value;
  }

  return result;
}

/**
 * Parse an artifact file.
 *
 * @param filePath - Path to the artifact file
 * @returns Parsed artifact
 */
export async function parseArtifact(filePath: string): Promise<ParsedArtifact> {
  const raw = await readFile(filePath, "utf8");
  const { frontmatter, body } = extractFrontmatter(raw);

  return {
    frontmatter,
    body,
    raw,
  };
}

/**
 * Validate frontmatter against the Lifecycle Frontmatter Schema.
 *
 * @param frontmatter - Parsed frontmatter
 * @param artifactType - Type of artifact (requirements, design, tasks)
 * @returns Validation errors (empty if valid)
 */
export function validateFrontmatterSchema(
  frontmatter: Record<string, unknown> | null,
  artifactType: "requirements" | "design" | "tasks",
): string[] {
  const errors: string[] = [];

  if (!frontmatter) {
    errors.push("Missing frontmatter");
    return errors;
  }

  // schema_version is required
  if (typeof frontmatter.schema_version !== "string") {
    errors.push("Missing or invalid schema_version");
  } else if (frontmatter.schema_version !== "1.0") {
    errors.push(`Unsupported schema_version: ${frontmatter.schema_version}`);
  }

  // artifact_version is required and must be positive
  if (typeof frontmatter.artifact_version !== "number" || frontmatter.artifact_version < 1) {
    errors.push("Missing or invalid artifact_version (must be positive integer)");
  }

  // artifact_status is required and must be a valid state
  const validStatuses = [
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

  if (typeof frontmatter.artifact_status !== "string") {
    errors.push("Missing artifact_status");
  } else if (!validStatuses.includes(frontmatter.artifact_status)) {
    errors.push(`Invalid artifact_status: ${frontmatter.artifact_status}`);
  }

  // risk_class is required only for requirements.md
  if (artifactType === "requirements") {
    const validRiskClasses = ["critical", "standard", "low"];
    if (typeof frontmatter.risk_class !== "string") {
      errors.push("Missing risk_class for requirements.md");
    } else if (!validRiskClasses.includes(frontmatter.risk_class as string)) {
      errors.push(`Invalid risk_class: ${frontmatter.risk_class}`);
    }
  } else if (frontmatter.risk_class !== undefined) {
    errors.push(`risk_class must only appear in requirements.md, found in ${artifactType}.md`);
  }

  return errors;
}

/**
 * Compute SHA-256 checksum of the artifact body.
 *
 * The checksum covers only the body (excluding frontmatter).
 *
 * @param body - Artifact body
 * @returns SHA-256 hex string (64 characters)
 */
export function checksumBody(body: string): string {
  return createHash("sha256").update(body, "utf8").digest("hex");
}
