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
 * Compute the Ledger Entry Digest: SHA-256 (hex) of the entry's canonical JSON.
 *
 * This is the one hashing function of the ledger chain. For entry N (N > 1),
 * `predecessor_digest` is `computeLedgerEntryDigest(entry N-1)`; the first
 * entry's `predecessor_digest` is null. The digest covers every field of the
 * entry, nested ones included, and does not depend on key order. Entries carry
 * no self-hash field: the chain is anchored by each successor's predecessor
 * digest and, for the last entry, by the Ledger Head (see LedgerHead).
 *
 * @param entry - The complete Ledger Entry as written to the ledger
 * @returns SHA-256 hex string (64 characters)
 */
export function computeLedgerEntryDigest(entry: object): string {
  return createHash("sha256").update(canonicalSerialize(entry), "utf8").digest("hex");
}
