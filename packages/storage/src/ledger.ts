/**
 * @vellum/storage — Ledger Operations
 *
 * Append-only, hash-chained ledger operations.
 * Each entry contains SHA-256 of previous entry.
 */

import { readFile, appendFile, open, rename } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash, randomUUID } from "node:crypto";
import type { LedgerEntry, LedgerPayload, Checksum } from "@vellum/protocol";
import { brand } from "@vellum/protocol";
import { createFilesystem } from "./fs.js";

/** Initial hash for first entry (all zeros) */
const INITIAL_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Read all entries from ledger file.
 */
export async function readLedger(ledgerPath: string): Promise<readonly LedgerEntry[]> {
  const fs = createFilesystem(dirname(ledgerPath));

  if (!(await fs.exists(ledgerPath))) {
    return Object.freeze([]);
  }

  const content = await fs.readFile(ledgerPath);
  const lines = content.split("\n").filter((line) => line.trim());

  const entries: LedgerEntry[] = [];
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as LedgerEntry;
      entries.push(entry);
    } catch {
      throw new Error(`Invalid ledger entry: ${line.slice(0, 100)}`);
    }
  }

  return Object.freeze(entries);
}

/**
 * Get the last entry from ledger.
 * Returns null if ledger is empty.
 */
export async function getLastEntry(ledgerPath: string): Promise<LedgerEntry | null> {
  const entries = await readLedger(ledgerPath);
  return entries.length > 0 ? entries[entries.length - 1] : null;
}

/**
 * Append entry to ledger atomically.
 * Computes predecessor hash automatically.
 */
export async function appendLedgerEntry(
  ledgerPath: string,
  entry: Omit<LedgerEntry, "predecessorHash" | "hash">,
): Promise<LedgerEntry> {
  // Get predecessor hash
  const lastEntry = await getLastEntry(ledgerPath);
  const predecessorHash = lastEntry?.hash ?? brand<string, "Checksum">(INITIAL_HASH);

  // Compute new entry hash
  const newEntry: LedgerEntry = {
    ...entry,
    predecessorHash,
  };

  const hash = computeEntryHash(newEntry);
  const completeEntry: LedgerEntry = {
    ...newEntry,
    hash,
  };

  // Atomic append: write to temp, then append
  const tempPath = join(tmpdir(), `ledger-${randomUUID()}.tmp`);
  const line = JSON.stringify(completeEntry) + "\n";

  await appendFile(ledgerPath, line, "utf-8");

  return completeEntry;
}

/**
 * Compute SHA-256 hash of a ledger entry.
 */
export function computeEntryHash(entry: LedgerEntry): Checksum {
  // Hash over: seq, kind, timestamp, predecessorHash, payload (sorted keys)
  const { hash: _, ...rest } = entry;
  const payloadJson = JSON.stringify(rest.payload, Object.keys(rest.payload).sort());
  const data = `${rest.seq}:${rest.kind}:${rest.timestamp}:${rest.predecessorHash}:${payloadJson}`;

  const hash = createHash("sha256").update(data, "utf8").digest("hex");
  return brand<string, "Checksum">(hash);
}

/**
 * Verify ledger integrity.
 * Returns { valid: true } or { valid: false, errors: [...] }.
 */
export async function verifyLedgerIntegrity(ledgerPath: string): Promise<{
  valid: boolean;
  errors: Array<{ seq: number; message: string }>;
}> {
  const entries = await readLedger(ledgerPath);
  const errors: Array<{ seq: number; message: string }> = [];

  let expectedPredecessor = INITIAL_HASH;
  const seenHashes = new Map<string, number>();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // Check sequence number
    if (entry.seq !== i) {
      errors.push({
        seq: entry.seq,
        message: `Expected seq ${i}, got ${entry.seq}`,
      });
    }

    // Check predecessor hash
    if (entry.predecessorHash !== expectedPredecessor) {
      errors.push({
        seq: entry.seq,
        message: `Predecessor hash mismatch: expected ${expectedPredecessor.slice(0, 8)}..., got ${entry.predecessorHash.slice(0, 8)}...`,
      });
    }

    // Check for forks (two entries with same predecessor)
    if (seenHashes.has(entry.predecessorHash)) {
      const otherSeq = seenHashes.get(entry.predecessorHash)!;
      errors.push({
        seq: entry.seq,
        message: `Fork detected: entries ${otherSeq} and ${entry.seq} have same predecessor`,
      });
    }

    // Verify entry hash
    const computedHash = computeEntryHash(entry);
    if (entry.hash && entry.hash !== computedHash) {
      errors.push({
        seq: entry.seq,
        message: `Entry hash mismatch: expected ${computedHash.slice(0, 8)}..., got ${entry.hash.slice(0, 8)}...`,
      });
    }

    // Update state
    seenHashes.set(entry.predecessorHash, entry.seq);
    expectedPredecessor = entry.hash ?? computedHash;
  }

  return {
    valid: errors.length === 0,
    errors: Object.freeze(errors),
  };
}

import { dirname } from "node:path";

/**
 * Detect if ledger has a fork (two entries with same predecessor).
 */
export function detectFork(ledgerPath: string): Promise<{
  hasFork: boolean;
  fork?: { entry1: number; entry2: number };
}> {
  return readLedger(ledgerPath).then((entries) => {
    const predecessors = new Map<string, number>();

    for (const entry of entries) {
      const prev = predecessors.get(entry.predecessorHash);
      if (prev !== undefined) {
        return {
          hasFork: true,
          fork: { entry1: prev, entry2: entry.seq },
        };
      }
      predecessors.set(entry.predecessorHash, entry.seq);
    }

    return { hasFork: false };
  });
}
