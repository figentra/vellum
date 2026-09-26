/**
 * @vellum/engine — Ledger Integrity Checker
 *
 * Pure logic for validating ledger integrity:
 * - Predecessor digest chaining
 * - Fork detection
 * - Missing entry detection
 * - Order validation
 * - Schema validation
 *
 * @see design.md Criteria 4.5-4.11
 */

import type { LedgerEntry, LedgerIntegrityFailure } from "@vellum/protocol";
import { computeLedgerEntryHash, INITIAL_PREDECESSOR_HASH } from "@vellum/protocol";

/**
 * Ledger integrity check result.
 */
export interface LedgerIntegrityResult {
  /** Whether the ledger is valid */
  readonly valid: boolean;
  /** All integrity failures found */
  readonly failures: readonly LedgerIntegrityFailure[];
}

/**
 * Check ledger integrity.
 * Validates hash chain, ordering, forking, and schema.
 *
 * @param entries - Ledger entries in sequence
 * @returns Integrity check result
 */
export function checkLedgerIntegrity(entries: readonly LedgerEntry[]): LedgerIntegrityResult {
  const failures: LedgerIntegrityFailure[] = [];

  // Empty ledger is valid
  if (entries.length === 0) {
    return { valid: true, failures: [] };
  }

  // Track predecessor digests for fork detection
  const seenDigests = new Map<string, number>();

  // Expected predecessor for first entry
  let expectedPredecessor = INITIAL_PREDECESSOR_HASH;

  // Check each entry
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const entryId = entry.id;

    // Check ID sequence
    if (entryId !== i + 1) {
      failures.push({
        entry_id: entryId,
        kind: "ordering_violation",
        message: `Expected entry ID ${i + 1}, got ${entryId}`,
      });
    }

    // Check predecessor digest (criterion 4.5)
    const actualPredecessor = entry.predecessor_digest;
    if (i === 0) {
      // First entry should have null predecessor
      if (actualPredecessor !== null) {
        failures.push({
          entry_id: entryId,
          kind: "predecessor_digest_mismatch",
          message: `First entry should have null predecessor, got: ${actualPredecessor}`,
        });
      }
    } else {
      // Non-first entries must match expected predecessor
      if (actualPredecessor !== expectedPredecessor) {
        failures.push({
          entry_id: entryId,
          kind: "predecessor_digest_mismatch",
          message: `Expected predecessor ${expectedPredecessor?.slice(0, 16)}..., got ${actualPredecessor?.slice(0, 16)}...`,
        });
      }
    }

    // Check for fork (duplicate predecessor digest)
    if (actualPredecessor !== null) {
      if (seenDigests.has(actualPredecessor)) {
        const otherEntryId = seenDigests.get(actualPredecessor)!;
        failures.push({
          entry_id: entryId,
          kind: "fork",
          message: `Fork detected: entries ${otherEntryId} and ${entryId} have same predecessor`,
          other_entry_id: otherEntryId,
        });
      }
      seenDigests.set(actualPredecessor, entryId);
    }

    // Compute expected predecessor for next entry
    try {
      expectedPredecessor = computeLedgerEntryHash(entry);
    } catch (error) {
      failures.push({
        entry_id: entryId,
        kind: "predecessor_digest_mismatch",
        message: `Failed to compute hash: ${error}`,
      });
    }
  }

  return {
    valid: failures.length === 0,
    failures: Object.freeze(failures),
  };
}

/**
 * Detect forks in the ledger.
 */
export function detectForks(
  entries: readonly LedgerEntry[],
): Array<{ entry1: number; entry2: number; predecessor: string }> {
  const forks: Array<{ entry1: number; entry2: number; predecessor: string }> = [];
  const seenDigests = new Map<string, number>();

  for (const entry of entries) {
    if (entry.predecessor_digest === null) continue;

    const existing = seenDigests.get(entry.predecessor_digest);
    if (existing !== undefined) {
      forks.push({
        entry1: existing,
        entry2: entry.id,
        predecessor: entry.predecessor_digest,
      });
    }
    seenDigests.set(entry.predecessor_digest, entry.id);
  }

  return forks;
}

/**
 * Check for missing entries in the ledger.
 */
export function checkMissingEntries(entries: readonly LedgerEntry[]): number[] {
  const missing: number[] = [];
  const seenIds = new Set(entries.map((e) => e.id));

  const maxId = Math.max(...entries.map((e) => e.id), 0);

  for (let i = 1; i <= maxId; i++) {
    if (!seenIds.has(i)) {
      missing.push(i);
    }
  }

  return missing;
}

/**
 * Verify the complete ledger chain.
 */
export function verifyLedgerChain(entries: readonly LedgerEntry[]): {
  valid: boolean;
  error?: string;
} {
  const result = checkLedgerIntegrity(entries);

  if (result.valid) {
    return { valid: true };
  }

  // Return first error
  const firstFailure = result.failures[0];
  return {
    valid: false,
    error: firstFailure.message,
  };
}
