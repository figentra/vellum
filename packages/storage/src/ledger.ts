/**
 * Ledger Reader - reads and verifies Ledger hash chain.
 *
 * @see requirements.md Requirements 4.7, 4.8, 4.9, 4.10
 */

import { readFile } from "fs/promises";
import { existsSync } from "fs";
import type { LedgerEntry, LedgerIntegrityFailure, LedgerFork, LedgerMetadata } from "./types.js";
import { canonicalSerialize } from "./canonical-json.js";
import { createHash } from "crypto";

/**
 * Result of reading a ledger.
 */
export interface LedgerReadResult {
  /** All entries in the ledger */
  entries: LedgerEntry[];
  /** Ledger metadata */
  metadata: LedgerMetadata;
}

/**
 * Result of verifying a ledger chain.
 */
export interface LedgerVerifyResult {
  /** All integrity failures found */
  failures: LedgerIntegrityFailure[];
  /** Forks detected */
  forks: LedgerFork[];
}

/**
 * Read a Ledger from a JSON Lines file.
 *
 * @param ledgerPath - Path to ledger.jsonl
 * @returns Entries and metadata
 */
export async function readLedger(ledgerPath: string): Promise<LedgerReadResult> {
  if (!existsSync(ledgerPath)) {
    return {
      entries: [],
      metadata: {
        entry_count: 0,
        first_entry_id: 0,
        last_entry_id: 0,
        integrity_verified: false,
      },
    };
  }

  const content = await readFile(ledgerPath, "utf8");
  const lines = content.trim().split("\n").filter(Boolean);

  const entries: LedgerEntry[] = [];
  for (const line of lines) {
    const entry = JSON.parse(line) as LedgerEntry;
    entries.push(entry);
  }

  const metadata: LedgerMetadata = {
    entry_count: entries.length,
    first_entry_id: entries.length > 0 ? entries[0]!.id : 0,
    last_entry_id: entries.length > 0 ? entries[entries.length - 1]!.id : 0,
    integrity_verified: false,
  };

  return { entries, metadata };
}

/**
 * Verify the integrity of a Ledger chain.
 *
 * Checks:
 * - predecessor_digest matches SHA-256 of preceding entry (Property 1)
 * - entry ids are monotonic integers starting at 1 (Property 3)
 * - timestamps are monotonic (Property 4)
 * - no fork (two entries with same predecessor_digest) (Property 5)
 *
 * @param entries - All ledger entries
 * @returns Verification result
 */
export function verifyChain(entries: LedgerEntry[]): LedgerVerifyResult {
  const failures: LedgerIntegrityFailure[] = [];
  const forks: LedgerFork[] = [];

  if (entries.length === 0) {
    return { failures, forks };
  }

  const firstEntry = entries[0];
  if (!firstEntry) {
    return { failures, forks };
  }

  // Check first entry has null predecessor_digest
  if (firstEntry.predecessor_digest !== null) {
    failures.push({
      entry_id: firstEntry.id,
      kind: "predecessor_digest_mismatch",
      message: `First entry (${firstEntry.id}) must have null predecessor_digest, got: ${firstEntry.predecessor_digest}`,
    });
  }

  // Track predecessor_digest to detect forks
  const predecessorDigests = new Map<string, number[]>();

  // Verify chain
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry) continue;

    // Check entry id matches position (1-indexed)
    if (entry.id !== i + 1) {
      failures.push({
        entry_id: entry.id,
        kind: "ordering_violation",
        message: `Entry at position ${i + 1} has id ${entry.id}, expected ${i + 1}`,
      });
    }

    // Check predecessor_digest for non-first entries
    if (i > 0) {
      const predecessor = entries[i - 1];
      if (predecessor) {
        const expectedDigest = computeEntryDigest(
          predecessor as unknown as Record<string, unknown>,
        );

        if (entry.predecessor_digest !== expectedDigest) {
          failures.push({
            entry_id: entry.id,
            kind: "predecessor_digest_mismatch",
            message: `Entry ${entry.id} predecessor_digest does not match SHA-256 of entry ${predecessor.id}`,
          });
        }
      }
    }

    // Track predecessor_digest for fork detection
    if (entry.predecessor_digest !== null) {
      const existing = predecessorDigests.get(entry.predecessor_digest) || [];
      existing.push(entry.id);
      predecessorDigests.set(entry.predecessor_digest, existing);
    }

    // Check timestamps are monotonic
    if (i > 0) {
      const prevEntry = entries[i - 1];
      if (prevEntry) {
        const prevTimestamp = new Date(prevEntry.timestamp).getTime();
        const currTimestamp = new Date(entry.timestamp).getTime();

        if (currTimestamp < prevTimestamp) {
          failures.push({
            entry_id: entry.id,
            kind: "ordering_violation",
            message: `Entry ${entry.id} timestamp (${entry.timestamp}) is earlier than entry ${prevEntry.id} (${prevEntry.timestamp})`,
          });
        }
      }
    }
  }

  // Detect forks: two entries with same predecessor_digest
  for (const [digest, entryIds] of predecessorDigests) {
    if (entryIds.length > 1) {
      const firstId = entryIds[0];
      const secondId = entryIds[1];
      if (firstId !== undefined && secondId !== undefined) {
        forks.push({
          entry_id_1: firstId,
          entry_id_2: secondId,
          predecessor_digest: digest,
        });

        // Also add integrity failure for fork
        failures.push({
          entry_id: firstId,
          kind: "fork",
          message: `Fork detected: entries ${firstId} and ${secondId} share predecessor_digest ${digest}`,
          other_entry_id: secondId,
        });
      }
    }
  }

  return { failures, forks };
}

/**
 * Compute SHA-256 digest of a Ledger Entry.
 *
 * @param entry - Ledger entry
 * @returns SHA-256 hex string
 */
function computeEntryDigest(entry: Record<string, unknown>): string {
  // Remove digest field if present (it's computed, not stored)
  const { digest: _omit, ...entryWithoutDigest } = entry;
  const canonical = canonicalSerialize(entryWithoutDigest);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
