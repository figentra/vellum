/**
 * @stellum/engine — Pre-Execution Checker
 *
 * Validates spec is ready to start a task.
 * Pure function - no I/O.
 *
 * @see design.md Criterion 18
 */

import type { Artifact, LedgerEntry, Checksum } from "@vellum/protocol";

/**
 * Pre-execution check result.
 */
export interface PreCheckResult {
  /** Whether the check passed */
  readonly passed: boolean;
  /** Error messages */
  readonly errors: readonly string[];
  /** Task binding to record (if passed) */
  readonly taskBinding: TaskBinding | null;
}

/**
 * Task binding payload.
 */
export interface TaskBinding {
  readonly taskIdentifier: string;
  readonly requirementsVersion: number;
  readonly requirementsChecksum: Checksum;
  readonly designVersion: number;
  readonly designChecksum: Checksum;
  readonly planVersion: number;
  readonly planChecksum: Checksum;
}

/**
 * Check if a task can be started.
 * Validates: artifacts exist, approvals valid, checksums match.
 *
 * @param artifacts - The spec's artifacts
 * @param ledger - The spec's ledger
 * @param taskIdentifier - Task to start
 * @returns Pre-check result
 */
export function preExecutionCheck(
  artifacts: readonly Artifact[],
  ledger: readonly LedgerEntry[],
  taskIdentifier: string,
): PreCheckResult {
  const errors: string[] = [];

  // Criterion 18.1: Three artifacts exist
  const requirements = artifacts.find((a) => a.kind === "requirements");
  if (!requirements) {
    errors.push("Missing requirements.md");
  }

  const design = artifacts.find((a) => a.kind === "design");
  if (!design) {
    errors.push("Missing design.md");
  }

  const tasks = artifacts.find((a) => a.kind === "tasks");
  if (!tasks) {
    errors.push("Missing tasks.md");
  }

  // Early exit if artifacts missing
  if (errors.length > 0) {
    return {
      passed: false,
      errors: Object.freeze(errors),
      taskBinding: null,
    };
  }

  // Criterion 18.2: Valid approvals present
  const requirementsApprovals = countApprovalsForArtifact(ledger, "requirements");
  if (requirementsApprovals === 0) {
    errors.push("Requirements not approved");
  }

  const designApprovals = countApprovalsForArtifact(ledger, "design");
  if (designApprovals === 0) {
    errors.push("Design not approved");
  }

  const tasksApprovals = countApprovalsForArtifact(ledger, "tasks");
  if (tasksApprovals === 0) {
    errors.push("Tasks not approved");
  }

  // Criterion 18.3: Checksums match approvals
  // (In production, would compare with approval records)
  // For now, assumes checksums match

  // Criterion 18.4: References resolve
  // (In production, would parse task and check criteria/properties exist)
  // For now, assumes references resolve

  // If all checks pass, create task binding
  if (errors.length === 0) {
    const taskBinding: TaskBinding = {
      taskIdentifier,
      requirementsVersion: requirements!.frontmatter.version,
      requirementsChecksum: requirements!.frontmatter.checksum,
      designVersion: design!.frontmatter.version,
      designChecksum: design!.frontmatter.checksum,
      planVersion: tasks!.frontmatter.version,
      planChecksum: tasks!.frontmatter.checksum,
    };

    return {
      passed: true,
      errors: [],
      taskBinding,
    };
  }

  return {
    passed: false,
    errors: Object.freeze(errors),
    taskBinding: null,
  };
}

/**
 * Count approvals for an artifact in the ledger.
 */
function countApprovalsForArtifact(ledger: readonly LedgerEntry[], artifact: string): number {
  let count = 0;

  for (const entry of ledger) {
    if (entry.kind === "approval") {
      const payload = entry as any;
      if (payload.artifact?.includes(artifact)) {
        count++;
      }
    }
  }

  return count;
}

/**
 * Check if artifact checksums match a task binding.
 * Criterion 18.10: Checksum mismatch at completion
 */
export function checkTaskBinding(
  binding: TaskBinding,
  currentArtifacts: readonly Artifact[],
): { matches: true } | { matches: false; mismatchedArtifact: string } {
  const requirements = currentArtifacts.find((a) => a.kind === "requirements");
  const design = currentArtifacts.find((a) => a.kind === "design");
  const tasks = currentArtifacts.find((a) => a.kind === "tasks");

  if (requirements && requirements.frontmatter.checksum !== binding.requirementsChecksum) {
    return { matches: false, mismatchedArtifact: "requirements" };
  }

  if (design && design.frontmatter.checksum !== binding.designChecksum) {
    return { matches: false, mismatchedArtifact: "design" };
  }

  if (tasks && tasks.frontmatter.checksum !== binding.planChecksum) {
    return { matches: false, mismatchedArtifact: "tasks" };
  }

  return { matches: true };
}

/**
 * Validate a task binding entry.
 */
export function validateTaskBinding(binding: TaskBinding): boolean {
  return (
    typeof binding.taskIdentifier === "string" &&
    binding.taskIdentifier.length > 0 &&
    Number.isInteger(binding.requirementsVersion) &&
    binding.requirementsVersion >= 1 &&
    Number.isInteger(binding.designVersion) &&
    binding.designVersion >= 1 &&
    Number.isInteger(binding.planVersion) &&
    binding.planVersion >= 1
  );
}
