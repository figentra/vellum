/**
 * @vellum/protocol — Frontmatter parsing and validation
 *
 * Handles YAML frontmatter in artifacts with parsing, validation,
 * and checksum computation.
 */

import { createHash } from "node:crypto";
import type { LifecycleFrontmatter, LifecycleState, Checksum } from "./types";
import { parseChecksum } from "./types";
import { canonicalArtifactBody } from "./canonical-body.js";
import { canonicalSerialize } from "./ledger/canonical-json.js";

// ============================================================================
// Frontmatter Constants
// ============================================================================

/**
 * The initial hash for the first ledger entry
 */
export const INITIAL_PREDECESSOR_HASH =
  "0000000000000000000000000000000000000000000000000000000000000000" as const;

// ============================================================================
// Checksum Computation
// ============================================================================

/**
 * Compute the Artifact Checksum: SHA-256 of the canonical form of the body.
 *
 * The frontmatter is excluded and formatting-only differences are normalised
 * (see canonicalArtifactBody), so an approval survives a reformat and a
 * frontmatter update but not a content change.
 */
export function computeChecksum(body: string): Checksum {
  const content = canonicalArtifactBody(body);
  const hash = createHash("sha256").update(content, "utf8").digest("hex");
  return hash as Checksum;
}

/**
 * Hash a ledger entry for the chain
 */
export function computeLedgerEntryHash(entry: {
  seq: number;
  kind: string;
  timestamp: string;
  predecessorHash: string;
  payload: Record<string, unknown>;
}): Checksum {
  // Hash is computed over: seq, kind, timestamp, predecessorHash, payload in
  // canonical JSON (keys sorted at every depth). An array replacer would be an
  // allow-list applied at every depth, silently dropping nested fields.
  const payloadJson = canonicalSerialize(entry.payload);
  const data = `${entry.seq}:${entry.kind}:${entry.timestamp}:${entry.predecessorHash}:${payloadJson}`;
  const hash = createHash("sha256").update(data, "utf8").digest("hex");
  return hash as Checksum;
}

// ============================================================================
// Frontmatter Parsing
// ============================================================================

/**
 * Parse frontmatter from an artifact body
 */
export function parseFrontmatter(
  content: string,
): { frontmatter: LifecycleFrontmatter; body: string } | null {
  // Match YAML frontmatter between --- markers
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    return null;
  }

  const yamlContent = match[1];
  const body = match[2];

  // Validate required groups exist
  if (!yamlContent || body === undefined) {
    return null;
  }

  try {
    // Parse YAML content (simple parser for now)
    const parsed = parseYamlFrontmatter(yamlContent);

    if (!parsed) {
      return null;
    }

    // Validate required fields
    if (
      typeof parsed.version !== "number" ||
      typeof parsed.checksum !== "string" ||
      typeof parsed.state !== "string" ||
      typeof parsed.createdAt !== "string" ||
      typeof parsed.updatedAt !== "string"
    ) {
      return null;
    }

    // Validate checksum format
    const checksum = parseChecksum(parsed.checksum);
    if (!checksum) {
      return null;
    }

    // Validate state
    const validStates: LifecycleState[] = [
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

    if (!validStates.includes(parsed.state as LifecycleState)) {
      return null;
    }

    return {
      frontmatter: {
        version: parsed.version,
        checksum,
        state: parsed.state as LifecycleState,
        createdAt: parsed.createdAt,
        updatedAt: parsed.updatedAt,
      },
      body,
    };
  } catch {
    return null;
  }
}

/**
 * Simple YAML parser for frontmatter
 * (Note: For production, consider using a proper YAML library)
 */
function parseYamlFrontmatter(yaml: string): Record<string, unknown> | null {
  const result: Record<string, unknown> = {};

  for (const line of yaml.split("\n")) {
    // Skip empty lines
    if (!line.trim()) continue;

    // Match key: value
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (!match) {
      return null; // Invalid YAML
    }

    const key = match[1];
    const value = match[2];

    // Validate required groups exist
    if (!key || value === undefined) {
      return null;
    }

    // Parse value
    let parsedValue: unknown;

    // Try number
    const numValue = Number(value);
    if (!isNaN(numValue) && value.trim() !== "") {
      parsedValue = numValue;
    }
    // Try boolean
    else if (value === "true") {
      parsedValue = true;
    } else if (value === "false") {
      parsedValue = false;
    }
    // String (strip quotes if present)
    else {
      parsedValue = value.replace(/^["']|["']$/g, "");
    }

    result[key] = parsedValue;
  }

  return result;
}

// ============================================================================
// Frontmatter Serialization
// ============================================================================

/**
 * Serialize frontmatter and body back to string
 */
export function serializeFrontmatter(frontmatter: LifecycleFrontmatter, body: string): string {
  const yaml = [
    "---",
    `version: ${frontmatter.version}`,
    `checksum: ${frontmatter.checksum}`,
    `state: ${frontmatter.state}`,
    `createdAt: ${frontmatter.createdAt}`,
    `updatedAt: ${frontmatter.updatedAt}`,
    "---",
    "",
  ].join("\n");

  return yaml + body;
}

// ============================================================================
// Frontmatter Validation
// ============================================================================

/**
 * Validate that frontmatter checksum matches computed checksum
 */
export function validateFrontmatterChecksum(
  frontmatter: LifecycleFrontmatter,
  body: string,
): boolean {
  const computed = computeChecksum(body);
  return frontmatter.checksum === computed;
}

/**
 * Create initial frontmatter for a new artifact
 */
export function createInitialFrontmatter(state: LifecycleState = "DRAFT"): LifecycleFrontmatter {
  const now = new Date().toISOString();
  return {
    version: 1,
    checksum: computeChecksum(""),
    state,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update frontmatter for an amended artifact
 */
export function amendFrontmatter(
  frontmatter: LifecycleFrontmatter,
  newBody: string,
  newState?: LifecycleState,
): LifecycleFrontmatter {
  const now = new Date().toISOString();
  return {
    version: frontmatter.version + 1,
    checksum: computeChecksum(newBody),
    state: newState || frontmatter.state,
    createdAt: frontmatter.createdAt,
    updatedAt: now,
  };
}
