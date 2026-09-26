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

import type { LedgerEntry, LedgerHead, LedgerIntegrityFailure } from "@vellum/protocol";
import { computeLedgerEntryDigest } from "@vellum/protocol";

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
 * Check ledger integrity (criteria 4.5, 4.7-4.10).
 *
 * The chain format is the protocol's (`@vellum/protocol` ledger/types): ids
 * run 1, 2, 3…; the first entry's `predecessor_digest` is null; every later
 * entry's is `computeLedgerEntryDigest` of the entry before it.
 *
 * - An entry whose recorded predecessor matches no entry in the ledger while
 *   its id follows its predecessor's is an edit of that predecessor (4.7): the
 *   failure names the edited entry.
 * - An id gap is a removed entry (4.8): the failure names the entry after the
 *   gap.
 * - An entry chaining to an entry other than the one before it is a
 *   reordering (4.9): the failure names both.
 * - Two entries recording the same predecessor are a fork (4.10), naming both.
 *
 * `head` is the Ledger Head recorded beside the ledger. Pass it (or `null`
 * when the head file is absent) to detect removal of trailing entries and
 * edits of the last entry, which no successor digest covers. Omit it only
 * where no head is available to check; the result then says nothing about
 * the ledger's tail.
 *
 * @param entries - Ledger entries in file order
 * @param head - The recorded Ledger Head, null when absent, undefined to skip
 * @returns Integrity check result
 */
export function checkLedgerIntegrity(
  entries: readonly LedgerEntry[],
  head?: LedgerHead | null,
): LedgerIntegrityResult {
  const failures: LedgerIntegrityFailure[] = [];

  const digests = entries.map((entry) => computeLedgerEntryDigest(entry));
  const byDigest = new Map<string, LedgerEntry>();
  entries.forEach((entry, index) => byDigest.set(digests[index]!, entry));

  const seenPredecessors = new Map<string, number>();

  entries.forEach((entry, index) => {
    const entryId = entry.id;
    const actual = entry.predecessor_digest;

    // Fork: two entries claiming the same predecessor (criterion 4.10)
    if (actual !== null) {
      const rival = seenPredecessors.get(actual);
      if (rival !== undefined) {
        failures.push({
          entry_id: entryId,
          kind: "fork",
          message: `Ledger fork: entry ${rival} and entry ${entryId} record the same predecessor ${actual.slice(0, 12)}…`,
          other_entry_id: rival,
        });
        return;
      }
      seenPredecessors.set(actual, entryId);
    }

    if (index === 0) {
      if (entryId !== 1) {
        failures.push({
          entry_id: entryId,
          kind: "missing_entry",
          message: `Ledger starts at entry ${entryId}, not 1: entries before it were removed`,
        });
      } else if (actual !== null) {
        failures.push({
          entry_id: entryId,
          kind: "predecessor_digest_mismatch",
          message: `Entry 1 records predecessor ${actual.slice(0, 12)}…; the first entry's predecessor must be null`,
        });
      }
      return;
    }

    const previous = entries[index - 1]!;
    const expected = digests[index - 1]!;
    if (actual === expected) {
      if (entryId !== previous.id + 1) {
        failures.push({
          entry_id: entryId,
          kind: "ordering_violation",
          message: `Entry ${entryId} follows entry ${previous.id}; expected id ${previous.id + 1}`,
          other_entry_id: previous.id,
        });
      }
      return;
    }

    const chainsTo = actual === null ? undefined : byDigest.get(actual);
    if (chainsTo !== undefined) {
      failures.push({
        entry_id: entryId,
        kind: "ordering_violation",
        message: `Entries out of order: entry ${entryId} chains to entry ${chainsTo.id} but follows entry ${previous.id}`,
        other_entry_id: chainsTo.id,
      });
    } else if (entryId !== previous.id + 1) {
      failures.push({
        entry_id: entryId,
        kind: "missing_entry",
        message: `Entry ${entryId}'s predecessor digest matches no entry: entry ${previous.id + 1} was removed`,
      });
    } else {
      failures.push({
        entry_id: previous.id,
        kind: "predecessor_digest_mismatch",
        message: `Entry ${previous.id}'s content differs from what entry ${entryId}'s predecessor digest covers: entry ${previous.id} was edited`,
        other_entry_id: entryId,
      });
    }
  });

  if (head !== undefined) {
    failures.push(...headFailures(entries, digests, head));
  }

  return {
    valid: failures.length === 0,
    failures: Object.freeze(failures),
  };
}

/** Compare the ledger's tail with the recorded Ledger Head. */
function headFailures(
  entries: readonly LedgerEntry[],
  digests: readonly string[],
  head: LedgerHead | null,
): LedgerIntegrityFailure[] {
  const last = entries[entries.length - 1];
  const lastDigest = digests[digests.length - 1];

  if (head === null) {
    return last === undefined
      ? []
      : [
          {
            entry_id: last.id,
            kind: "head_mismatch",
            message: `Ledger has ${entries.length} entries but no Ledger Head (ledger.head.json); the tail cannot be verified`,
          },
        ];
  }

  if (last === undefined) {
    return [
      {
        entry_id: head.last_id,
        kind: "head_mismatch",
        message: `Ledger Head records entry ${head.last_id} but the ledger is empty: entries were removed`,
      },
    ];
  }

  if (head.last_id > last.id) {
    return [
      {
        entry_id: head.last_id,
        kind: "head_mismatch",
        message: `Ledger Head records entry ${head.last_id} but the ledger's last entry is ${last.id}: trailing entries were removed or reordered`,
      },
    ];
  }

  if (head.last_id < last.id) {
    return [
      {
        entry_id: last.id,
        kind: "head_mismatch",
        message: `Ledger ends at entry ${last.id} but the Ledger Head records entry ${head.last_id}: entries were added without the ledger writer, or an append was interrupted`,
      },
    ];
  }

  if (head.last_digest !== lastDigest) {
    return [
      {
        entry_id: last.id,
        kind: "head_mismatch",
        message: `Entry ${last.id}'s content differs from the digest the Ledger Head records: the last entry was edited`,
      },
    ];
  }

  return [];
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
    error: firstFailure?.message ?? "Unknown ledger integrity failure",
  };
}
