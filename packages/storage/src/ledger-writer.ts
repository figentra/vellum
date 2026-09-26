/**
 * Ledger Writer - appends entries to the Ledger with hash chain verification.
 *
 * On any failure, leaves the ledger file unmodified (Requirement 4.12).
 *
 * @see requirements.md Requirements 4.5, 4.6, 4.12
 */

import { appendFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { dirname } from "path";
import type { LedgerEntry, LedgerIntegrityFailure, LedgerFork } from "./types.js";
import { readLedger, verifyChain } from "./ledger-reader.js";
import { computeDigest } from "./canonical-json.js";

/**
 * Ledger Writer interface for type safety.
 */
export interface LedgerWriter {
  /** Append an entry to the ledger */
  append(payload: unknown): Promise<{ success: boolean }>;
  /** Path to the ledger file */
  readonly path: string;
}

/**
 * Result of appending an entry.
 */
export interface AppendResult {
  success: boolean;
  entry_id?: number | undefined;
  digest?: string | undefined;
  failures?: LedgerIntegrityFailure[];
  forks?: LedgerFork[];
  error?: string;
}

/**
 * Append an entry to the Ledger.
 *
 * This function:
 * 1. Reads existing ledger
 * 2. Verifies chain integrity
 * 3. Computes predecessor_digest (SHA-256 of last entry)
 * 4. Assigns entry id
 * 5. Computes entry digest
 * 6. Appends entry line
 * 7. Verifies chain again
 *
 * On any failure, leaves the ledger file unmodified (Requirement 4.12).
 *
 * @param ledgerPath - Path to ledger.jsonl
 * @param entryPayload - Entry payload (without header fields)
 * @returns Append result
 */
export async function appendEntry(
  ledgerPath: string,
  entryPayload: Omit<LedgerEntry, "id" | "predecessor_digest" | "timestamp" | "digest">,
): Promise<AppendResult> {
  // Ensure directory exists
  const ledgerDir = dirname(ledgerPath);
  if (!existsSync(ledgerDir)) {
    await mkdir(ledgerDir, { recursive: true });
  }

  // Read existing ledger
  const { entries } = await readLedger(ledgerPath);

  // Verify existing chain integrity
  if (entries.length > 0) {
    const verifyResult = verifyChain(entries);
    if (verifyResult.failures.length > 0 || verifyResult.forks.length > 0) {
      return {
        success: false,
        failures: verifyResult.failures,
        forks: verifyResult.forks,
        error: "Existing ledger has integrity failures",
      };
    }
  }

  // Compute new entry id
  const newId = entries.length + 1;

  // Compute predecessor_digest
  let predecessorDigest: string | null = null;
  if (entries.length > 0) {
    const lastEntry = entries[entries.length - 1];
    if (lastEntry) {
      predecessorDigest = computeDigest(lastEntry as unknown as Record<string, unknown>);
    }
  }

  // Create new entry with header fields
  const newEntry: LedgerEntry = {
    ...entryPayload,
    id: newId,
    predecessor_digest: predecessorDigest,
    timestamp: new Date().toISOString(),
  } as LedgerEntry;

  // Compute entry digest (stored separately, not in the entry itself)
  const entryDigest = computeDigest(newEntry as unknown as Record<string, unknown>);

  // Serialize entry to JSON Lines format
  const entryLine = JSON.stringify(newEntry) + "\n";

  // Write to file (append)
  try {
    await appendFile(ledgerPath, entryLine, "utf8");
  } catch (error) {
    return {
      success: false,
      error: `Failed to write entry: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }

  // Verify chain after write
  const { entries: newEntries } = await readLedger(ledgerPath);
  const verifyResult = verifyChain(newEntries);

  if (verifyResult.failures.length > 0 || verifyResult.forks.length > 0) {
    // Rollback: restore original file
    await rollbackLedger(ledgerPath, entries);
    return {
      success: false,
      failures: verifyResult.failures,
      forks: verifyResult.forks,
      error: "Ledger integrity verification failed after append",
    };
  }

  return {
    success: true,
    entry_id: newId,
    digest: entryDigest,
  };
}

/**
 * Rollback ledger to previous state.
 *
 * @param ledgerPath - Path to ledger.jsonl
 * @param entries - Previous entries to restore
 */
async function rollbackLedger(ledgerPath: string, entries: LedgerEntry[]): Promise<void> {
  if (entries.length === 0) {
    // Write empty file
    await writeFile(ledgerPath, "", "utf8");
    return;
  }

  // Serialize all entries
  const content = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
  await writeFile(ledgerPath, content, "utf8");
}

/**
 * Write a new ledger (for migration/initialization).
 *
 * @param ledgerPath - Path to ledger.jsonl
 * @returns Success or error
 */
export async function initializeLedger(
  ledgerPath: string,
): Promise<{ success: boolean; error?: string }> {
  // Ensure directory exists
  const ledgerDir = dirname(ledgerPath);
  if (!existsSync(ledgerDir)) {
    await mkdir(ledgerDir, { recursive: true });
  }

  // Check if ledger already exists
  if (existsSync(ledgerPath)) {
    const { entries } = await readLedger(ledgerPath);
    if (entries.length > 0) {
      return {
        success: false,
        error: "Ledger already exists and is not empty",
      };
    }
  }

  // Write empty ledger
  await writeFile(ledgerPath, "", "utf8");

  return { success: true };
}

/**
 * Append an approval entry to the ledger.
 */
export async function appendApprovalEntry(
  ledgerPath: string,
  payload: {
    artifact: "requirements.md" | "design.md" | "tasks.md";
    artifact_version: number;
    artifact_checksum: string;
    identity: string;
    identity_key: string;
    session_type: "human" | "assistant" | "ci";
    approval_signal: { commit: string; message_prefix: string };
  },
): Promise<AppendResult> {
  return appendEntry(ledgerPath, {
    kind: "approval",
    ...payload,
  });
}

/**
 * Append an evidence entry to the ledger.
 */
export async function appendEvidenceEntry(
  ledgerPath: string,
  payload: {
    task_id: string;
    command: string;
    exit_status: number;
    start_timestamp: string;
    finish_timestamp: string;
    commit: string;
    affected_paths: string[];
    environment_versions: { platform: string; schema: string; node: string };
    uncommitted: boolean;
  },
): Promise<AppendResult> {
  return appendEntry(ledgerPath, {
    kind: "evidence",
    ...payload,
  });
}

/**
 * Append a decision entry to the ledger.
 */
export async function appendDecisionEntry(
  ledgerPath: string,
  payload: {
    decision: string;
    rationale: string;
    blocking: boolean;
  },
): Promise<AppendResult> {
  return appendEntry(ledgerPath, {
    kind: "decision",
    ...payload,
  });
}
