/**
 * @vellum/storage — Ledger Operations
 *
 * Append-only, hash-chained ledger operations.
 * Each entry contains SHA-256 of previous entry.
 */

import { open, readFile, rename, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { basename, dirname, join } from "node:path";
import type {
  LedgerEntry,
  LedgerEntryFull,
  LedgerHead,
  LedgerIntegrityFailure,
} from "@vellum/protocol";
import { computeLedgerEntryDigest } from "@vellum/protocol";
import { checkLedgerIntegrity, detectForks } from "@vellum/engine";

/**
 * A ledger entry before the ledger assigns its predecessor digest.
 *
 * `Omit` over the LedgerEntry union keeps only the keys common to every
 * member (the header), which would forbid every payload field; distributing
 * over the union keeps each member's payload.
 */
export type NewLedgerEntry = WithoutChainFields<LedgerEntry> | WithoutChainFields<LedgerEntryFull>;

type WithoutChainFields<E> = E extends unknown ? Omit<E, "predecessor_digest"> : never;

/** File name of the Ledger Head, beside the ledger in the Machine Folder. */
export const LEDGER_HEAD_FILE = "ledger.head.json";

/** Path of the Ledger Head for the ledger at `ledgerPath`. */
export function getLedgerHeadPath(ledgerPath: string): string {
  return join(dirname(ledgerPath), LEDGER_HEAD_FILE);
}

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

/**
 * Parse Ledger Head content. Anything but `{"last_id": <int>, "last_digest":
 * <64 hex>}` is an integrity failure: a damaged head cannot vouch for a tail.
 */
export function parseLedgerHead(content: string, path = LEDGER_HEAD_FILE): LedgerHead {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = undefined;
  }
  const head = parsed as { last_id?: unknown; last_digest?: unknown } | undefined;
  if (
    typeof head !== "object" ||
    head === null ||
    typeof head.last_id !== "number" ||
    !Number.isInteger(head.last_id) ||
    head.last_id < 1 ||
    typeof head.last_digest !== "string" ||
    !/^[a-f0-9]{64}$/.test(head.last_digest)
  ) {
    throw new LedgerError("LEDGER_INTEGRITY_FAILURE", `${path} is not a valid Ledger Head`);
  }
  return { last_id: head.last_id, last_digest: head.last_digest };
}

/** Read the Ledger Head beside `ledgerPath`; null when the file does not exist. */
export async function readLedgerHead(
  ledgerPath: string,
  fs: LedgerFileSystem = nodeLedgerFileSystem,
): Promise<LedgerHead | null> {
  const headPath = getLedgerHeadPath(ledgerPath);
  const content = await fs.readFile(headPath);
  return content === null ? null : parseLedgerHead(content, headPath);
}

/** Options for appendLedgerEntry. */
export interface AppendLedgerEntryOptions {
  /** File operations; defaults to the real filesystem. */
  readonly fs?: LedgerFileSystem;
}

/**
 * Append an entry to the ledger.
 *
 * The chain format is the protocol's: ids from 1, a null predecessor for the
 * first entry, and `computeLedgerEntryDigest` of the preceding entry for every
 * later one. The chain is checked by the engine's `checkLedgerIntegrity`, the
 * same check `vellum verify` runs.
 *
 * - Takes an exclusive lock (`<ledger>.lock`, created with O_EXCL). If another
 *   append holds it, refuses with LEDGER_CONCURRENT_APPEND rather than waiting
 *   or overwriting; a lock left by a crashed process names itself in the
 *   message for a human to remove.
 * - Verifies the whole existing chain, and its tail against the Ledger Head,
 *   first and refuses on any failure, naming the first bad entry (a fork is
 *   reported as LEDGER_FORK, naming both entries). A damaged ledger is never
 *   extended.
 * - Writes the existing bytes plus the new line to a temp file in the same
 *   directory, fsyncs it, re-checks that the ledger did not change meanwhile,
 *   renames it over the ledger, then replaces the Ledger Head the same way
 *   and fsyncs the directory. A failure before the ledger rename leaves both
 *   files exactly as they were (requirement 4.12) and removes the temp files;
 *   a failure replacing the head restores the previous ledger bytes.
 */
export async function appendLedgerEntry(
  ledgerPath: string,
  entry: NewLedgerEntry,
  options: AppendLedgerEntryOptions = {},
): Promise<LedgerEntry> {
  const fs = options.fs ?? nodeLedgerFileSystem;
  const dir = dirname(ledgerPath);
  const lockPath = `${ledgerPath}.lock`;
  const headPath = getLedgerHeadPath(ledgerPath);

  if (!(await fs.createExclusive(lockPath, `${process.pid}\n`))) {
    throw new LedgerError(
      "LEDGER_CONCURRENT_APPEND",
      `Another append to ${ledgerPath} is in progress (lock ${lockPath} exists). ` +
        `If no append is running, a crashed process left it: remove ${lockPath} and retry.`,
    );
  }

  const tempPath = join(dir, `.${basename(ledgerPath)}.${randomUUID()}.tmp`);
  const headTempPath = join(dir, `.${LEDGER_HEAD_FILE}.${randomUUID()}.tmp`);
  try {
    const original = (await fs.readFile(ledgerPath)) ?? "";
    const entries = parseLedger(original);
    const head = await readLedgerHead(ledgerPath, fs);
    assertChainIntact(entries, head, ledgerPath);

    const last = entries[entries.length - 1];
    const expectedId = (last?.id ?? 0) + 1;
    if (entry.id !== expectedId) {
      throw new LedgerError(
        "LEDGER_ENTRY_INVALID",
        `Cannot append entry ${entry.id} to ${ledgerPath}: expected id ${expectedId}`,
        { entryId: entry.id },
      );
    }

    const predecessor_digest = last === undefined ? null : computeLedgerEntryDigest(last);
    const completeEntry = { ...entry, predecessor_digest } as LedgerEntry;
    const line = JSON.stringify(completeEntry);
    // The digest is of the entry as it will be read back, so a field that does
    // not survive JSON (undefined, a function) cannot make the head disagree.
    const written = JSON.parse(line) as LedgerEntry;
    const newHead: LedgerHead = { last_id: written.id, last_digest: computeLedgerEntryDigest(written) };

    const separator = original === "" || original.endsWith("\n") ? "" : "\n";
    await fs.writeFileDurably(tempPath, `${original}${separator}${line}\n`);
    await fs.writeFileDurably(headTempPath, `${JSON.stringify(newHead)}\n`);

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
    try {
      await fs.rename(headTempPath, headPath);
    } catch (error) {
      await restoreLedger(fs, ledgerPath, original, dir);
      throw error;
    }
    await fs.syncDirectory(dir);
    return written;
  } catch (error) {
    await fs.remove(tempPath).catch(() => undefined);
    await fs.remove(headTempPath).catch(() => undefined);
    throw error;
  } finally {
    await fs.remove(lockPath);
  }
}

/** Put the ledger back to `original` after the head could not be replaced. */
async function restoreLedger(
  fs: LedgerFileSystem,
  ledgerPath: string,
  original: string,
  dir: string,
): Promise<void> {
  const restorePath = join(dir, `.${basename(ledgerPath)}.${randomUUID()}.restore.tmp`);
  try {
    if (original === "") {
      await fs.remove(ledgerPath);
    } else {
      await fs.writeFileDurably(restorePath, original);
      await fs.rename(restorePath, ledgerPath);
    }
  } catch {
    await fs.remove(restorePath).catch(() => undefined);
  }
}

/** Throw the ledger's refusal for a damaged chain: a fork first, else the first failure. */
function assertChainIntact(
  entries: readonly LedgerEntry[],
  head: LedgerHead | null,
  ledgerPath: string,
): void {
  const { failures } = checkLedgerIntegrity(entries, head);
  const fork = failures.find((f) => f.kind === "fork");
  if (fork) {
    throw new LedgerError("LEDGER_FORK", `${ledgerPath}: ${fork.message}; resolve it by a human Decision`, {
      entryId: fork.other_entry_id ?? fork.entry_id,
      otherEntryId: fork.entry_id,
    });
  }
  const first = failures[0];
  if (first) {
    throw new LedgerError(
      "LEDGER_INTEGRITY_FAILURE",
      `${ledgerPath}: ledger integrity failure at entry ${first.entry_id}: ${first.message}; refusing to append`,
      { entryId: first.entry_id },
    );
  }
}

/**
 * Verify ledger integrity: the chain (engine `checkLedgerIntegrity`) and its
 * tail against the Ledger Head. Returns { valid: true } or { valid: false,
 * errors: [...] }, one error per problem (an unreadable line or head is
 * reported as entry -1).
 */
export async function verifyLedgerIntegrity(ledgerPath: string): Promise<{
  valid: boolean;
  errors: { seq: number; message: string }[];
}> {
  let entries: readonly LedgerEntry[];
  let head: LedgerHead | null;
  try {
    entries = await readLedger(ledgerPath);
    head = await readLedgerHead(ledgerPath);
  } catch (error) {
    if (error instanceof LedgerError) {
      return { valid: false, errors: [{ seq: -1, message: error.message }] };
    }
    throw error;
  }
  const errors = checkLedgerIntegrity(entries, head).failures.map((f: LedgerIntegrityFailure) => ({
    seq: f.entry_id,
    message: f.message,
  }));
  return { valid: errors.length === 0, errors };
}

/**
 * Detect if ledger has a fork (two entries with same predecessor).
 */
export async function detectFork(ledgerPath: string): Promise<{
  hasFork: boolean;
  fork?: { entry1: number; entry2: number };
}> {
  const [first] = detectForks(await readLedger(ledgerPath));
  return first === undefined
    ? { hasFork: false }
    : { hasFork: true, fork: { entry1: first.entry1, entry2: first.entry2 } };
}
