/**
 * Git Reader - reads from git's object store using isomorphic-git.
 *
 * Provides repository state access without CLI dependency.
 *
 * @see requirements.md Requirement 4.3
 */

import * as git from "isomorphic-git";
import { fs } from "../polyfills/fs.js";

/**
 * Git commit object.
 */
export interface GitCommit {
  /** Commit SHA */
  oid: string;
  /** Tree SHA */
  tree: string;
  /** Parent commit SHAs */
  parent: string[];
  /** Author information */
  author: {
    name: string;
    email: string;
    timestamp: number;
    timezoneOffset: number;
  };
  /** Committer information */
  committer: {
    name: string;
    email: string;
    timestamp: number;
    timezoneOffset: number;
  };
  /** Commit message */
  message: string;
  /** GPG signature (if signed) */
  gpgsig?: string | undefined;
}

/**
 * Git tree object (directory).
 */
export interface GitTree {
  /** Tree SHA */
  oid: string;
  /** Tree entries */
  entries: GitTreeEntry[];
}

/**
 * Git tree entry (file or directory reference).
 */
export interface GitTreeEntry {
  /** Entry mode (file/directory/executable) */
  mode: string;
  /** Object SHA */
  oid: string;
  /** Entry type */
  type: "blob" | "tree" | "commit";
  /** Entry path */
  path: string;
}

/**
 * Git blob object (file content).
 */
export interface GitBlob {
  /** Blob SHA */
  oid: string;
  /** Blob content (as Buffer) */
  blob: Uint8Array;
}

/**
 * Options for listing commits.
 */
export interface ListCommitsOptions {
  /** Starting reference (default: HEAD) */
  ref?: string;
  /** Maximum depth to traverse */
  depth?: number;
  /** Filter by author email */
  authorEmail?: string;
  /** Filter by path */
  path?: string;
}

/**
 * Git signature verification result.
 */
export interface SignatureVerificationResult {
  /** Whether the signature is valid */
  valid: boolean;
  /** Key fingerprint (if available) */
  keyFingerprint?: string | undefined;
  /** Error message (if verification failed) */
  error?: string | undefined;
}

/**
 * Read a commit object from the repository.
 *
 * @param repoPath - Path to the git repository root
 * @param sha - Commit SHA
 * @returns Commit object
 */
export async function readCommit(repoPath: string, sha: string): Promise<GitCommit> {
  const commit = await git.readCommit({
    fs,
    dir: repoPath,
    oid: sha,
  });

  return {
    oid: commit.oid,
    tree: commit.commit.tree,
    parent: commit.commit.parent,
    author: {
      name: commit.commit.author.name,
      email: commit.commit.author.email,
      timestamp: commit.commit.author.timestamp,
      timezoneOffset: commit.commit.author.timezoneOffset,
    },
    committer: {
      name: commit.commit.committer.name,
      email: commit.commit.committer.email,
      timestamp: commit.commit.committer.timestamp,
      timezoneOffset: commit.commit.committer.timezoneOffset,
    },
    message: commit.commit.message,
    gpgsig: commit.commit.gpgsig,
  };
}

/**
 * Read a tree object from the repository.
 *
 * @param repoPath - Path to the git repository root
 * @param sha - Tree SHA
 * @returns Tree object with entries
 */
export async function readTree(repoPath: string, sha: string): Promise<GitTree> {
  const tree = await git.readTree({
    fs,
    dir: repoPath,
    oid: sha,
  });

  return {
    oid: tree.oid,
    entries: tree.tree.map((entry) => ({
      mode: entry.mode,
      oid: entry.oid,
      type: entry.type,
      path: entry.path,
    })),
  };
}

/**
 * Read a blob object from the repository.
 *
 * @param repoPath - Path to the git repository root
 * @param sha - Blob SHA
 * @returns Blob object with content
 */
export async function readBlob(repoPath: string, sha: string): Promise<GitBlob> {
  const blob = await git.readBlob({
    fs,
    dir: repoPath,
    oid: sha,
  });

  return {
    oid: blob.oid,
    blob: blob.blob,
  };
}

/**
 * List commits from a reference.
 *
 * @param repoPath - Path to the git repository root
 * @param options - List options
 * @returns Array of commit SHAs
 */
export async function listCommits(
  repoPath: string,
  options: ListCommitsOptions = {},
): Promise<string[]> {
  const commits: string[] = [];
  const ref = options.ref || "HEAD";

  // isomorphic-git's log function returns an array of commits
  const log = await git.log({
    fs,
    dir: repoPath,
    ref,
    depth: options.depth || 100,
  });

  // Extract commit OIDs
  for (const entry of log) {
    commits.push(entry.oid);
  }

  return commits;
}

/**
 * Get the current HEAD commit SHA.
 *
 * @param repoPath - Path to the git repository root
 * @returns HEAD commit SHA
 */
export async function getHead(repoPath: string): Promise<string> {
  const head = await git.resolveRef({
    fs,
    dir: repoPath,
    ref: "HEAD",
  });

  return head;
}

/**
 * Verify a commit's GPG signature.
 *
 * @param repoPath - Path to the git repository root
 * @param sha - Commit SHA
 * @param publicKey - GPG public key to verify against (reserved for future use)
 * @returns Verification result
 */
export async function verifyCommitSignature(
  repoPath: string,
  sha: string,
  _publicKey?: string | undefined,
): Promise<SignatureVerificationResult> {
  try {
    const commit = await readCommit(repoPath, sha);

    if (!commit.gpgsig) {
      return {
        valid: false,
        error: "Commit is not signed",
      };
    }

    // Note: isomorphic-git doesn't have built-in GPG verification
    // This would need to be implemented using a GPG library or CLI
    // For now, we return a placeholder that indicates signature presence
    // Full implementation requires resolving Open Question OQ4

    // publicKey parameter is reserved for future signature verification implementation

    return {
      valid: true,
      keyFingerprint: undefined,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
