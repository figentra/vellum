/**
 * @vellum/storage — Storage Layer Interfaces
 *
 * This module defines the interfaces for the storage layer.
 * These are pure contracts that the storage package implements.
 * No implementation details here - just the types.
 */

import type {
  Artifact,
  ArtifactKind,
  CommitSha,
  GitCommit,
  LedgerEntry,
  SpecDirectory,
} from "./types.js";

// ============================================================================
// Git Operations Interface
// ============================================================================

/**
 * Git repository operations.
 * Implemented using child_process.execFileSync('git', [...])
 * Not isomorphic-git - we require git CLI on the system.
 */
export interface GitReader {
  /** Get the HEAD commit SHA */
  getHead(): Promise<CommitSha>;

  /** Get a commit by SHA */
  getCommit(sha: CommitSha): Promise<GitCommit | null>;

  /**
   * Check if a commit is an ancestor of another.
   * Returns false if either commit doesn't exist.
   */
  isAncestor(ancestor: CommitSha, descendant: CommitSha): Promise<boolean>;

  /** Get commit log */
  log(options?: { file?: string; limit?: number }): Promise<readonly GitCommit[]>;

  /** Get file content at a specific ref */
  show(ref: string, path: string): Promise<string>;

  /** Get current working tree status */
  status(): Promise<GitStatus>;

  /** Get all commits up to a given SHA (inclusive) */
  getCommitsUpTo(sha: CommitSha): Promise<readonly GitCommit[]>;
}

/** Git working tree status */
export interface GitStatus {
  /** Current branch name */
  readonly branch: string;
  /** HEAD commit SHA */
  readonly head: CommitSha;
  /** Modified files (not staged) */
  readonly modified: readonly string[];
  /** Staged files (will be committed) */
  readonly staged: readonly string[];
  /** Untracked files */
  readonly untracked: readonly string[];
  /** Whether working tree is clean */
  readonly isClean: boolean;
}

/** Git operations that mutate (only for approval signals) */
export interface GitWriter {
  /**
   * Create an empty commit (for approval signal).
   * Returns the new commit SHA.
   */
  createEmptyCommit(message: string, options?: { gpgSign?: boolean }): Promise<CommitSha>;
}

// ============================================================================
// Filesystem Interface
// ============================================================================

/**
 * Filesystem operations.
 * All writes are atomic (temp file + rename) to prevent corruption.
 */
export interface FileSystem {
  /** Read a file as UTF-8 string */
  readFile(path: string): Promise<string>;

  /**
   * Write a file atomically.
   * Uses temp file + rename to prevent partial writes.
   */
  writeFile(path: string, content: string): Promise<void>;

  /** Check if a file exists */
  exists(path: string): Promise<boolean>;

  /** List files in a directory (non-recursive) */
  readdir(path: string): Promise<readonly string[]>;

  /**
   * Create a directory (recursive).
   * No-op if directory already exists.
   */
  mkdir(path: string): Promise<void>;

  /**
   * Delete a file.
   * No-op if file doesn't exist.
   */
  unlink(path: string): Promise<void>;
}

// ============================================================================
// Ledger Storage Interface
// ============================================================================

/**
 * Ledger read operations.
 * The ledger is an append-only JSONL file.
 */
export interface LedgerReader {
  /** Read the ledger from disk */
  read(path: string): Promise<LedgerReadResult>;

  /**
   * Verify the hash chain.
   * Returns true if valid, throws on corruption.
   */
  verify(path: string): Promise<boolean>;
}

/** Result of reading a ledger */
export interface LedgerReadResult {
  /** Array of parsed entries */
  readonly entries: readonly LedgerEntry[];
  /** Number of entries */
  readonly count: number;
  /** File size in bytes */
  readonly size: number;
  /** Whether the hash chain validates */
  readonly isValid: boolean;
}

// ============================================================================
// Artifact Storage Interface
// ============================================================================

/**
 * Artifact storage operations.
 * Reads and writes spec artifacts with frontmatter.
 */
export interface ArtifactStorage {
  /** Read an artifact from disk */
  read(path: string): Promise<Artifact>;

  /**
   * Write an artifact to disk.
   * Atomic write with temp file + rename.
   */
  write(path: string, artifact: Artifact): Promise<void>;

  /**
   * Compute the checksum of an artifact body.
   * Excludes frontmatter from the hash.
   */
  computeChecksum(body: string): Promise<string>;

  /**
   * Discover all spec directories in the repository.
   * Walks up from cwd to find .agents/specs/
   */
  discoverSpecs(startPath?: string): Promise<readonly SpecDirectory[]>;
}

// ============================================================================
// Concurrency Interface
// ============================================================================

/**
 * Concurrency control for ledger writes.
 * Prevents forks when multiple processes write simultaneously.
 */
export interface ConcurrencyControl {
  /**
   * Acquire a lock for the ledger.
   * Returns a release function.
   * Throws if lock cannot be acquired within timeout.
   */
  acquireLock(path: string, timeout?: number): Promise<() => void>;

  /**
   * Check if a lock exists.
   * Returns true if locked, false otherwise.
   */
  isLocked(path: string): Promise<boolean>;
}
