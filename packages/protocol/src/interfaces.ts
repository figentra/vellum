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
  Checksum,
  CommitSha,

  LedgerEntry,
  SpecDirectory,
} from "./types.js";
  GitCommit,

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

  /** Delete a file */
  delete(path: string): Promise<void>;

  /** Get file stats */
  stat(path: string): Promise<{ readonly mtime: Date; readonly size: number }>;

  /**
   * Create directory (including parents) if it doesn't exist.
   * Idempotent - does not error if directory exists.
   */
  mkdirp(path: string): Promise<void>;

  /**
   * Update a specific section of a file.
   * Used for design.md section updates.
   * Atomic (temp file + rename).
   */
  updateSection(
    path: string,
    options: {
      readonly startMarker: string;
      readonly endMarker: string;
      readonly content: string;
    },
  ): Promise<void>;
}

// ============================================================================
// Spec Discovery Interface
// ============================================================================

/**
 * Spec directory discovery and management.
 */
export interface SpecDiscovery {
  /** Discover all spec directories under .agents/specs/ */
  discoverSpecDirs(): Promise<readonly SpecDirectory[]>;

  /** Get a single spec directory by slug or number */
  getSpecDir(spec: string): Promise<SpecDirectory | null>;

  /** Check if a path is inside a spec directory */
  isSpecPath(path: string): boolean;

  /** Check if a spec directory exists */
  specDirExists(slug: string): Promise<boolean>;
}

// ============================================================================
// Ledger Operations Interface
// ============================================================================

/**
 * Ledger read/append operations.
 * Ledger is append-only and hash-chained.
 */
export interface LedgerReader {
  /** Read all entries from ledger */
  readLedger(ledgerPath: string): Promise<readonly LedgerEntry[]>;

  /**
   * Get the last entry in the ledger.
   * Returns null if ledger is empty.
   */
  getLastEntry(ledgerPath: string): Promise<LedgerEntry | null>;

  /** Get entry by sequence number */
  getEntry(ledgerPath: string, seq: number): Promise<LedgerEntry | null>;
}

/** Ledger write operations */
export interface LedgerWriter {
  /**
   * Append an entry to the ledger.
   * Computes predecessor hash automatically.
   * Atomic (temp file + append + rename).
   */
  appendEntry(
    ledgerPath: string,
    entry: Omit<LedgerEntry, "predecessorHash" | "hash">,
  ): Promise<LedgerEntry>;
}

// ============================================================================
// Artifact Operations Interface
// ============================================================================

/**
 * Artifact read/write operations.
 */
export interface ArtifactReader {
  /** Read an artifact from a spec directory */
  readArtifact(specPath: string, kind: ArtifactKind): Promise<Artifact>;

  /** Read all three artifacts from a spec directory */
  readAllArtifacts(specPath: string): Promise<readonly Artifact[]>;

  /** Check if an artifact exists */
  artifactExists(specPath: string, kind: ArtifactKind): Promise<boolean>;
}

/** Artifact write operations */
export interface ArtifactWriter {
  /**
   * Write an artifact (with frontmatter).
   * Computes checksum automatically.
   * Atomic (temp file + rename).
   */
  writeArtifact(artifact: Artifact): Promise<void>;

  /**
   * Update artifact frontmatter without changing body.
   * Used for state transitions.
   */
  updateFrontmatter(
    path: string,
    updates: Partial<{
      readonly state: Artifact["frontmatter"]["state"];
      readonly version: number;
      readonly updatedAt: string;
    }>,
  ): Promise<void>;

  /**
   * Update task marker in tasks.md.
   * Preserves rest of line byte-for-byte.
   */
  updateTaskMarker(path: string, taskId: string, marker: " " | "~" | "-" | "x"): Promise<void>;
}

// ============================================================================
// State File Operations Interface
// ============================================================================

/**
 * Machine folder state file operations.
 */
export interface StateFileOps {
  /** Read spec state from machine folder */
  readState(machineFolder: string): Promise<SpecState>;

  /** Write state update to machine folder */
  writeState(machineFolder: string, state: Partial<SpecState>): Promise<void>;

  /** Initialize machine folder for a spec */
  initMachineFolder(specPath: string): Promise<string>;
}

/** Spec state stored in machine folder */
export interface SpecState {
  readonly effectiveState: import("./types.js").LifecycleState;
  readonly recordedState: import("./types.js").LifecycleState;
  readonly lastTransition?: {
    readonly from: import("./types.js").LifecycleState;
    readonly to: import("./types.js").LifecycleState;
    readonly timestamp: string;
    readonly commit: CommitSha;
  };
}

// ============================================================================
// Cache Operations Interface
// ============================================================================

/**
 * Disposable cache for computed results.
 * Stored outside version control.
 */
export interface DisposedCache {
  /** Get cached result */
  get<T = unknown>(key: string): Promise<T | null>;

  /** Set cached result */
  set<T>(key: string, value: T): Promise<void>;

  /** Clear all cache entries */
  clear(): Promise<void>;

  /** Check if cache is outside VCS */
  isOutsideVcs(): Promise<boolean>;
}

// ============================================================================
// Composition Interface (Storage Layer)
// ============================================================================

/**
 * Complete storage layer.
 * Composes all storage interfaces.
 */
export interface StorageLayer {
  readonly git: GitReader & GitWriter;
  readonly fs: FileSystem;
  readonly specs: SpecDiscovery;
  readonly ledger: LedgerReader & LedgerWriter;
  readonly artifacts: ArtifactReader & ArtifactWriter;
  readonly state: StateFileOps;
  readonly cache: DisposedCache;
}
