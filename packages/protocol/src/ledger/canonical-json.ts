/**
 * Canonical JSON serialization for Ledger digest computation.
 *
 * Canonical JSON has sorted keys, no trailing newline, and no whitespace.
 * The digest is computed on the canonical serialization EXCLUDING the digest field itself.
 *
 * @see requirements.md Requirement 4.5
 */

import { createHash } from "crypto";

/**
 * Canonical JSON serialization - sorted keys, no trailing newline.
 *
 * @param obj - Object to serialize
 * @returns UTF-8 JSON string
 */
export function canonicalSerialize(obj: unknown): string {
  return JSON.stringify(obj, sortedReplacer);
}

/**
 * JSON replacer that sorts object keys recursively.
 */
function sortedReplacer(_key: string, value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    // Sort keys alphabetically
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(value).sort();
    for (const key of keys) {
      sorted[key] = (value as Record<string, unknown>)[key];
    }
    return sorted;
  }
  return value;
}

/**
 * Compute SHA-256 digest of a Ledger Entry.
 *
 * The digest is computed on the canonical JSON serialization of the entry,
 * EXCLUDING the `digest` field itself (since the digest is computed, not stored).
 *
 * @param entry - The Ledger Entry (may or may not have a digest field)
 * @returns SHA-256 hex string (64 characters)
 */
export function computeDigest(entry: Record<string, unknown>): string {
  // Remove the digest field if present (it's computed, not part of the content)
  const { digest: _omit, ...entryWithoutDigest } = entry;

  const canonical = canonicalSerialize(entryWithoutDigest);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/**
 * Compute the digest that should appear in the predecessor_digest field.
 *
 * For entry N, the predecessor_digest is the SHA-256 of entry N-1's canonical JSON.
 *
 * @param predecessorEntry - The preceding entry
 * @returns SHA-256 hex string (64 characters)
 */
export function computePredecessorDigest(predecessorEntry: Record<string, unknown>): string {
  return computeDigest(predecessorEntry);
}
