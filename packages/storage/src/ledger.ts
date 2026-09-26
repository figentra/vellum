/**
 * @vellum/storage — Ledger Operations
 *
 * Append-only, hash-chained ledger operations.
 * Each entry contains SHA-256 of previous entry.
 */

import { open, readFile, rename, rm } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { basename, dirname, join } from "node:path";
import type { LedgerEntry, Checksum } from "@vellum/protocol";
import { brand, canonicalSerialize } from "@vellum/protocol";

/**
 * A ledger entry before the ledger assigns its predecessor digest and hash.
 *
 * `Omit` over the LedgerEntry union keeps only the keys common to every
 * member (the header), which would forbid every payload field; distributing
 * over the union keeps each member's payload.
 */
export type NewLedgerEntry = WithoutChainFields<LedgerEntry>;

type WithoutChainFields<E> = E extends unknown ? Omit<E, "predecessor_digest" | "hash"> : never;

/** Initial hash for first entry (all zeros) */
const INITIAL_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

/** Why the ledger refused an operation. */
export type LedgerErrorCode =
  /** An existing entry is malformed, edited, removed or out of order (E0001). */
  | "LEDGER_INTEGRITY_FAILURE"
  /** Two entries record the same predecessor digest (E0002). */
  | "LEDGER_FORK"
  /** Another append holds the lock, or the file changed during this append. */
  | "LEDGER_CONCURRENT_APPEND"
  /** The entry offered for appending does not extend the chain. */
  | "LEDGER_ENTRY_INVALID";

/** A refusal by the ledger. The ledger file is unmodified when one is thrown. */
export class LedgerError extends Error {
  readonly code: LedgerErrorCode;
  /** The first entry at fault, when one can be named. */
  readonly entryId: number | undefined;
  /** For a fork: the other entry claiming the same predecessor. */
  readonly otherEntryId: number | undefined;

  constructor(
    code: LedgerErrorCode,
    message: string,
    ids: { readonly entryId?: number; readonly otherEntryId?: number } = {},
  ) {
    super(message);
    this.name = "LedgerError";
    this.code = code;
    this.entryId = ids.entryId;
    this.otherEntryId = ids.otherEntryId;
  }
}

/**
 * The file operations an append needs. Injectable so a failure at any step
 * can be simulated; nodeLedgerFileSystem is the real one.
 */
export interface LedgerFileSystem {
  /** The file's content, or null when it does not exist. */
  readFile(path: string): Promise<string | null>;
  /** Create or replace `path` with `data`, fsync it, and close it. */
  writeFileDurably(path: string, data: string): Promise<void>;
  /** Atomically replace `to` with `from`. */
  rename(from: string, to: string): Promise<void>;
  /** Remove `path`; no error when it is already gone. */
  remove(path: string): Promise<void>;
  /** Create `path` holding `data` only if it does not exist; false if it does. */
  createExclusive(path: string, data: string): Promise<boolean>;
  /** fsync a directory so a rename inside it is durable. */
  syncDirectory(path: string): Promise<void>;
}

export const nodeLedgerFileSystem: LedgerFileSystem = {
  async readFile(path) {
    try {
      return await readFile(path, "utf8");
    } catch (error) {
      if (isErrno(error, "ENOENT")) return null;
      throw error;
    }
  },
  async writeFileDurably(path, data) {
    const handle = await open(path, "w");
    try {
      await handle.writeFile(data, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
  },
  async rename(from, to) {
    await rename(from, to);
  },
  async remove(path) {
    await rm(path, { force: true });
  },
  async createExclusive(path, data) {
    try {
      const handle = await open(path, "wx");
      try {
        await handle.writeFile(data, "utf8");
      } finally {
        await handle.close();
      }
      return true;
    } catch (error) {
      if (isErrno(error, "EEXIST")) return false;
      throw error;
    }
  },
  async syncDirectory(path) {
    const handle = await open(path, "r");
    try {
      await handle.sync();
    } catch (error) {
      // Some platforms cannot fsync a directory; the rename is still atomic.
      if (!isErrno(error, "EISDIR") && !isErrno(error, "EINVAL") && !isErrno(error, "EPERM")) {
        throw error;
      }
    } finally {
      await handle.close();
    }
  },
};

function isErrno(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === code;
}

/**
 * Parse ledger file content into entries. A line that is not a complete JSON
 * object — a truncated write, a hand edit — is an integrity failure naming
 * its line number.
 */
export function parseLedger(content: string): readonly LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  const lines = content.split("\n");
  lines.forEach((line, index) => {
    if (line.trim() === "") return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      parsed = undefined;
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new LedgerError(
        "LEDGER_INTEGRITY_FAILURE",
        `Ledger line ${index + 1} is not a complete entry (truncated or edited): ${line.slice(0, 100)}`,
      );
    }
    entries.push(parsed as LedgerEntry);
  });
  return Object.freeze(entries);
}

/**
 * Read all entries from ledger file.
 */
export async function readLedger(ledgerPath: string): Promise<readonly LedgerEntry[]> {
  const content = await nodeLedgerFileSystem.readFile(ledgerPath);
  return content === null ? Object.freeze([]) : parseLedger(content);
}

/**
 * Get the last entry from ledger.
 * Returns null if ledger is empty.
 */
export async function getLastEntry(ledgerPath: string): Promise<LedgerEntry | null> {
  const entries = await readLedger(ledgerPath);
  return entries.length > 0 ? entries[entries.length - 1]! : null;
}

/** Options for appendLedgerEntry. */
export interface AppendLedgerEntryOptions {
  /** File operations; defaults to the real filesystem. */
  readonly fs?: LedgerFileSystem;
}

/**
 * Append an entry to the ledger.
 *
 * - Takes an exclusive lock (`<ledger>.lock`, created with O_EXCL). If another
 *   append holds it, refuses with LEDGER_CONCURRENT_APPEND rather than waiting
 *   or overwriting; a lock left by a crashed process names itself in the
 *   message for a human to remove.
 * - Verifies the whole existing chain first and refuses on any failure,
 *   naming the first bad entry (a fork is reported as LEDGER_FORK, naming both
 *   entries). A damaged ledger is never extended.
 * - Writes the existing bytes plus the new line to a temp file in the same
 *   directory, fsyncs it, re-checks that the ledger did not change meanwhile,
 *   renames it over the ledger and fsyncs the directory. A failure at any step
 *   leaves the ledger file exactly as it was (requirement 4.12) and removes
 *   the temp file.
 */
export async function appendLedgerEntry(
  ledgerPath: string,
  entry: NewLedgerEntry,
  options: AppendLedgerEntryOptions = {},
): Promise<LedgerEntry> {
  const fs = options.fs ?? nodeLedgerFileSystem;
  const dir = dirname(ledgerPath);
  const lockPath = `${ledgerPath}.lock`;

  if (!(await fs.createExclusive(lockPath, `${process.pid}\n`))) {
    throw new LedgerError(
      "LEDGER_CONCURRENT_APPEND",
      `Another append to ${ledgerPath} is in progress (lock ${lockPath} exists). ` +
        `If no append is running, a crashed process left it: remove ${lockPath} and retry.`,
    );
  }

  const tempPath = join(dir, `.${basename(ledgerPath)}.${randomUUID()}.tmp`);
  try {
    const original = (await fs.readFile(ledgerPath)) ?? "";
    const entries = parseLedger(original);
    assertChainIntact(entries, ledgerPath);

    const last = entries[entries.length - 1];
    if (entry.id !== entries.length) {
      throw new LedgerError(
        "LEDGER_ENTRY_INVALID",
        `Cannot append entry ${entry.id} to ${ledgerPath}: expected id ${entries.length}`,
        { entryId: entry.id },
      );
    }

    const predecessor_digest = last?.hash ?? brand<string, "Checksum">(INITIAL_HASH);
    const unhashed = { ...entry, predecessor_digest } as LedgerEntry;
    const completeEntry: LedgerEntry = { ...unhashed, hash: computeEntryHash(unhashed) };

    const separator = original === "" || original.endsWith("\n") ? "" : "\n";
    await fs.writeFileDurably(tempPath, `${original}${separator}${JSON.stringify(completeEntry)}\n`);

    // A writer that bypassed the lock (another tool, a git checkout) must not
    // be overwritten by the rename.
    if (((await fs.readFile(ledgerPath)) ?? "") !== original) {
      throw new LedgerError(
        "LEDGER_CONCURRENT_APPEND",
        `${ledgerPath} changed while entry ${entry.id} was being appended; nothing was written`,
        { entryId: entry.id },
      );
    }

    await fs.rename(tempPath, ledgerPath);
    await fs.syncDirectory(dir);
    return completeEntry;
  } catch (error) {
    await fs.remove(tempPath).catch(() => undefined);
    throw error;
  } finally {
    await fs.remove(lockPath);
  }
}

/** One problem found in a ledger chain. */
interface ChainFailure {
  readonly kind: "fork" | "integrity";
  readonly id: number;
  readonly otherId?: number;
  readonly message: string;
}

/**
 * Check a chain: ids run 0, 1, 2…; each entry carries a hash matching its
 * content; each predecessor digest is the previous entry's hash (all zeros
 * for the first); no two entries share a predecessor.
 */
function chainFailures(entries: readonly LedgerEntry[]): ChainFailure[] {
  const failures: ChainFailure[] = [];
  const seenPredecessors = new Map<string, { readonly id: number; readonly line: number }>();
  let expectedPredecessor: string = INITIAL_HASH;

  entries.forEach((entry, index) => {
    const line = index + 1;
    if (entry.id !== index) {
      failures.push({
        kind: "integrity",
        id: entry.id,
        message: `entry ${entry.id} (line ${line}): expected id ${index}, got ${entry.id} — an entry is missing or out of order`,
      });
    }

    const predecessor = entry.predecessor_digest ?? INITIAL_HASH;
    const rival = seenPredecessors.get(predecessor);
    if (rival !== undefined) {
      failures.push({
        kind: "fork",
        id: rival.id,
        otherId: entry.id,
        message: `Ledger fork: entry ${rival.id} (line ${rival.line}) and entry ${entry.id} (line ${line}) record the same predecessor ${predecessor.slice(0, 12)}…; resolve it by a human Decision`,
      });
    } else if (predecessor !== expectedPredecessor) {
      failures.push({
        kind: "integrity",
        id: entry.id,
        message: `entry ${entry.id} (line ${line}): Predecessor digest ${predecessor.slice(0, 12)}… does not match the preceding entry's hash ${expectedPredecessor.slice(0, 12)}…`,
      });
    }
    seenPredecessors.set(predecessor, { id: entry.id, line });

    const computedHash = computeEntryHash(entry);
    if (entry.hash !== computedHash) {
      failures.push({
        kind: "integrity",
        id: entry.id,
        message: entry.hash
          ? `entry ${entry.id} (line ${line}): content does not match its hash — the entry was edited`
          : `entry ${entry.id} (line ${line}): has no hash`,
      });
    }

    expectedPredecessor = entry.hash ?? computedHash;
  });

  return failures;
}

/** Throw the ledger's refusal for a damaged chain: a fork first, else the first failure. */
function assertChainIntact(entries: readonly LedgerEntry[], ledgerPath: string): void {
  const failures = chainFailures(entries);
  const fork = failures.find((f) => f.kind === "fork");
  if (fork) {
    throw new LedgerError("LEDGER_FORK", `${ledgerPath}: ${fork.message}`, {
      entryId: fork.id,
      ...(fork.otherId === undefined ? {} : { otherEntryId: fork.otherId }),
    });
  }
  const first = failures[0];
  if (first) {
    throw new LedgerError(
      "LEDGER_INTEGRITY_FAILURE",
      `${ledgerPath}: ledger integrity failure at ${first.message}; refusing to append`,
      { entryId: first.id },
    );
  }
}

/**
 * Compute SHA-256 hash of a ledger entry: every field except `hash`, in
 * canonical JSON (keys sorted at every depth), so a change to any field —
 * nested ones included — changes the hash.
 */
export function computeEntryHash(entry: LedgerEntry): Checksum {
  const { hash: _, ...rest } = entry;
  const hash = createHash("sha256").update(canonicalSerialize(rest), "utf8").digest("hex");
  return brand<string, "Checksum">(hash);
}

/**
 * Verify ledger integrity.
 * Returns { valid: true } or { valid: false, errors: [...] }, one error per
 * problem, in file order (a truncated line is reported as entry -1).
 */
export async function verifyLedgerIntegrity(ledgerPath: string): Promise<{
  valid: boolean;
  errors: { seq: number; message: string }[];
}> {
  let entries: readonly LedgerEntry[];
  try {
    entries = await readLedger(ledgerPath);
  } catch (error) {
    if (error instanceof LedgerError) {
      return { valid: false, errors: [{ seq: -1, message: error.message }] };
    }
    throw error;
  }
  const errors = chainFailures(entries).map((f) => ({ seq: f.otherId ?? f.id, message: f.message }));
  return { valid: errors.length === 0, errors };
}

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
      const predecessor = entry.predecessor_digest ?? INITIAL_HASH;
      const prev = predecessors.get(predecessor);
      if (prev !== undefined) {
        return {
          hasFork: true,
          fork: { entry1: prev, entry2: entry.id },
        };
      }
      predecessors.set(predecessor, entry.id);
    }

    return { hasFork: false };
  });
}
