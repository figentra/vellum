/**
 * @vellum/testing — Integration Test Framework
 *
 * Provides test fixture builders, repository simulation, and assertion helpers
 * for comprehensive integration testing across all Vellum packages.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as crypto from "node:crypto";
import * as os from "node:os";
import type {
  SpecId,
  Checksum,
  CommitSha,
  LifecycleState,
  ArtifactKind,
  LedgerEntry,
  Finding,
  DiagnosticCode,
} from "@vellum/protocol";
import {
  computeChecksum,
  computeLedgerEntryDigest,
  parseChecksum,
  parseCommitSha,
  parseSpecId,
} from "@vellum/protocol";

// ============================================================================
// Fixture Repository Builder
// ============================================================================

/**
 * Builder for creating test fixture repositories in-memory.
 * Creates isolated temporary directories for each test.
 */
export class FixtureBuilder {
  private tempDir: string | null = null;

  constructor(private readonly seed?: string) {}

  /**
   * Get or create the temporary directory for this fixture.
   */
  async getTempDir(): Promise<string> {
    if (!this.tempDir) {
      const prefix = this.seed ? `vellum-test-${this.seed}` : "vellum-test";
      this.tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    }
    return this.tempDir;
  }

  /**
   * Initialize a git repository.
   */
  async init(): Promise<this> {
    const dir = await this.getTempDir();
    await this.git(dir, "init");
    await this.git(dir, "config", "user.name", "Test User");
    await this.git(dir, "config", "user.email", "test@example.com");
    return this;
  }

  /**
   * Write a file to the repository.
   */
  async writeFile(filename: string, content: string): Promise<this> {
    const dir = await this.getTempDir();
    const filepath = path.join(dir, filename);
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, content, "utf-8");
    return this;
  }

  /**
   * Read a file from the repository.
   */
  async readFile(filename: string): Promise<string> {
    const dir = await this.getTempDir();
    const filepath = path.join(dir, filename);
    return fs.readFile(filepath, "utf-8");
  }

  /**
   * Delete a file from the repository.
   */
  async deleteFile(filename: string): Promise<this> {
    const dir = await this.getTempDir();
    const filepath = path.join(dir, filename);
    await fs.unlink(filepath);
    return this;
  }

  /**
   * Create a git commit.
   */
  async commit(message: string): Promise<CommitSha> {
    const dir = await this.getTempDir();
    await this.git(dir, "add", "-A");
    await this.git(dir, "commit", "-m", message);
    const sha = await this.git(dir, "rev-parse", "HEAD");
    const parsed = parseCommitSha(sha.trim());
    if (!parsed) {
      throw new Error(`Invalid commit SHA: ${sha.trim()}`);
    }
    return parsed;
  }

  /**
   * Create a git branch.
   */
  async branch(name: string): Promise<this> {
    const dir = await this.getTempDir();
    await this.git(dir, "branch", name);
    return this;
  }

  /**
   * Checkout a git branch.
   */
  async checkout(name: string): Promise<this> {
    const dir = await this.getTempDir();
    await this.git(dir, "checkout", name);
    return this;
  }

  /**
   * Get the current HEAD commit SHA.
   */
  async getHeadSha(): Promise<CommitSha> {
    const dir = await this.getTempDir();
    const sha = await this.git(dir, "rev-parse", "HEAD");
    const parsed = parseCommitSha(sha.trim());
    if (!parsed) {
      throw new Error(`Invalid commit SHA: ${sha.trim()}`);
    }
    return parsed;
  }

  /**
   * Get the working directory path.
   */
  async getWorkingDir(): Promise<string> {
    return this.getTempDir();
  }

  /**
   * Clean up the temporary directory.
   */
  async cleanup(): Promise<void> {
    if (this.tempDir) {
      await fs.rm(this.tempDir, { recursive: true, force: true });
      this.tempDir = null;
    }
  }

  /**
   * Run a git command.
   */
  private async git(cwd: string, ...args: string[]): Promise<string> {
    const { spawn } = await import("node:child_process");
    return new Promise((resolve, reject) => {
      const child = spawn("git", args, {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      child.stdout?.on("data", (chunk) => (stdout += chunk));
      child.stderr?.on("data", (chunk) => (stderr += chunk));
      child.on("close", (code) => {
        if (code === 0) resolve(stdout);
        else reject(new Error(`git ${args.join(" ")} failed: ${stderr}`));
      });
    });
  }
}

// ============================================================================
// Spec Fixture Helpers
// ============================================================================

/**
 * Create a minimal spec directory structure.
 */
export async function createMinimalSpec(
  builder: FixtureBuilder,
  specId: SpecId,
  state: LifecycleState = "DRAFT",
): Promise<void> {
  const slug = `${specId}-test-spec`;
  const basePath = `.agents/specs/${slug}`;

  // Create spec directory
  await builder.writeFile(
    `${basePath}/requirements.md`,
    createArtifact("requirements", state, 1),
  );
  await builder.writeFile(
    `${basePath}/design.md`,
    createArtifact("design", state, 1),
  );
  await builder.writeFile(
    `${basePath}/tasks.md`,
    createArtifact("tasks", state, 1),
  );
  await builder.writeFile(`${basePath}/.sdlc/ledger.jsonl`, "");
}

/**
 * The protocol's Artifact Checksum of `content` (canonical body, SHA-256).
 */
export function testChecksum(content: string): Checksum {
  return computeChecksum(content);
}

/**
 * Create an artifact file with frontmatter. The checksum covers the body as
 * the protocol parses it: everything after the closing `---` line.
 */
export function createArtifact(
  _kind: ArtifactKind,
  state: LifecycleState,
  version: number,
  body: string = "# Test Artifact\n\nThis is a test artifact.",
): string {
  const parsedBody = `\n${body}`;
  return `---
version: ${version}
checksum: "${testChecksum(parsedBody)}"
state: ${state}
createdAt: "2024-01-01T00:00:00Z"
updatedAt: "2024-01-01T00:00:00Z"
---
${parsedBody}`;
}

// ============================================================================
// Ledger Test Helpers
// ============================================================================

/**
 * Create a test ledger with entries.
 */
export async function createTestLedger(
  builder: FixtureBuilder,
  entries: LedgerEntry[],
): Promise<void> {
  const content = entries.map((e) => JSON.stringify(e)).join("\n");
  await builder.writeFile(".agents/specs/001-test/.sdlc/ledger.jsonl", content);
}

/**
 * Compute the predecessor digest a successor of `entry` records: the
 * protocol's computeLedgerEntryDigest (SHA-256 of canonical JSON, keys sorted
 * at every depth), the one digest the ledger writer and verifier use.
 */
export function computePredecessorDigest(entry: LedgerEntry): string {
  return computeLedgerEntryDigest(entry);
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that a finding has a specific diagnostic code.
 */
export function assertFindingCode(
  finding: Finding,
  code: DiagnosticCode,
): void {
  const normalizedRule = finding.rule.endsWith(code) || finding.rule === code;
  if (!normalizedRule) {
    throw new Error(
      `Expected finding to have rule ${code}, but got ${finding.rule}`,
    );
  }
}

/**
 * Assert that findings are sorted by (file, line, rule).
 */
export function assertFindingsSorted(findings: Finding[]): void {
  for (let i = 1; i < findings.length; i++) {
    const prev = findings[i - 1];
    const curr = findings[i];
    if (!prev || !curr) continue;
    const cmp =
      prev.file.localeCompare(curr.file) ||
      prev.line - curr.line ||
      prev.rule.localeCompare(curr.rule);
    if (cmp > 0) {
      throw new Error(
        `Findings not sorted at index ${i}: ${JSON.stringify(prev)} should come before ${JSON.stringify(curr)}`,
      );
    }
  }
}

/**
 * Assert that an array is equal (deep equal).
 */
export function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      message ||
        `Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`,
    );
  }
}

/**
 * Assert that a condition is true.
 */
export function assertTrue(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Assert that an array contains an item matching a predicate.
 */
export function assertContains<T>(
  arr: T[],
  predicate: (item: T) => boolean,
  message: string,
): void {
  if (!arr.some(predicate)) {
    throw new Error(message);
  }
}

// ============================================================================
// Repository Simulation
// ============================================================================

/**
 * Simulated repository for testing without git.
 */
export class SimulatedRepo {
  private files: Map<string, string> = new Map();
  private commits: Array<{ sha: CommitSha; files: Map<string, string> }> = [];

  /**
   * Set a file's content.
   */
  setFile(path: string, content: string): this {
    this.files.set(path, content);
    return this;
  }

  /**
   * Get a file's content.
   */
  getFile(path: string): string | undefined {
    return this.files.get(path);
  }

  /**
   * Delete a file.
   */
  deleteFile(path: string): this {
    this.files.delete(path);
    return this;
  }

  /**
   * Check if a file exists.
   */
  hasFile(path: string): boolean {
    return this.files.has(path);
  }

  /**
   * List all files.
   */
  listFiles(): string[] {
    return Array.from(this.files.keys());
  }

  /**
   * Create a commit snapshot.
   */
  commit(sha?: CommitSha): CommitSha {
    const commitSha = sha || randomCommitSha();
    this.commits.push({
      sha: commitSha,
      files: new Map(this.files),
    });
    return commitSha;
  }

  /**
   * Get a commit snapshot.
   */
  getCommit(sha: CommitSha): Map<string, string> | undefined {
    return this.commits.find((c) => c.sha === sha)?.files;
  }
}

// ============================================================================
// Test Data Generators
// ============================================================================

/**
 * Generate a random spec ID.
 */
export function randomSpecId(): SpecId {
  const num = Math.floor(Math.random() * 999) + 1;
  const value = String(num).padStart(3, "0");
  const parsed = parseSpecId(value);
  if (!parsed) {
    throw new Error(`Invalid spec ID: ${value}`);
  }
  return parsed;
}

/**
 * Generate a random checksum.
 */
export function randomChecksum(): Checksum {
  const hex = crypto.randomBytes(32).toString("hex");
  const parsed = parseChecksum(hex);
  if (!parsed) {
    throw new Error(`Invalid checksum: ${hex}`);
  }
  return parsed;
}

/**
 * Generate a random commit SHA.
 */
export function randomCommitSha(): CommitSha {
  const hex = crypto.randomBytes(20).toString("hex");
  const parsed = parseCommitSha(hex);
  if (!parsed) {
    throw new Error(`Invalid commit SHA: ${hex}`);
  }
  return parsed;
}

/**
 * Generate test directories for parallel test execution.
 */
export async function withTestDir<T>(
  fn: (dir: string) => Promise<T>,
  prefix = "vellum-test",
): Promise<T> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    return await fn(tempDir);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
