import type { IntermediateResult } from "./report-input.interface.js";

/**
 * Fields that identify an individual.
 *
 * Any field matching one of these patterns is stripped from intermediate results.
 * The list is fixed in code, not configurable.
 */
const IDENTITY_FIELDS = [
  "identity",
  "session",
  "author",
  "approver",
  "executor",
  "email",
  "approver_identity",
  "author_identity",
  "session_id",
  "executor_identity",
] as const;

/**
 * Check if a string looks like an email address.
 *
 * Strips any string containing @ to prevent email-like patterns.
 */
function isEmailLike(value: unknown): boolean {
  return typeof value === "string" && value.includes("@");
}

/**
 * Check if a field name indicates an identity field.
 */
function isIdentityField(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase();
  return IDENTITY_FIELDS.some((id) => normalized.includes(id.toLowerCase()));
}

/**
 * Strip identity fields from an object.
 *
 * Recursively removes any field that:
 * 1. Has a name matching an identity field pattern
 * 2. Has a value that looks like an email address
 */
export function stripIdentity<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(stripIdentity) as T;
  }

  if (typeof obj === "object" && obj !== null) {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Skip identity fields
      if (isIdentityField(key)) {
        continue;
      }

      // Skip email-like values
      if (isEmailLike(value)) {
        continue;
      }

      // Recursively strip nested objects
      result[key] = stripIdentity(value);
    }

    return result as T;
  }

  return obj;
}

/**
 * Anonymize an intermediate result.
 *
 * Strips all individual identity fields from intermediate computation results
 * before aggregation. Every field that identifies a person, session, or similar
 * is removed.
 *
 * The resulting value contains only aggregate metrics and spec-identifying
 * information (which is repository content, not personal data).
 *
 * @param result - intermediate result from metric computation
 * @returns the same result with identity fields removed
 */
export function anonymize(result: IntermediateResult): IntermediateResult {
  return stripIdentity(result);
}

/**
 * Check if a metrics result contains any identity fields.
 *
 * Used for verification in tests (Properties 1 and 4).
 */
export function containsIdentity(obj: unknown): boolean {
  if (obj === null || obj === undefined) {
    return false;
  }

  if (typeof obj !== "object") {
    return false;
  }

  if (Array.isArray(obj)) {
    return obj.some(containsIdentity);
  }

  const record = obj as Record<string, unknown>;

  for (const [key, value] of Object.entries(record)) {
    if (isIdentityField(key)) {
      return true;
    }

    if (isEmailLike(value)) {
      return true;
    }

    if (containsIdentity(value)) {
      return true;
    }
  }

  return false;
}
