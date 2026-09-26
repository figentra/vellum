/**
 * @vellum/engine — Status Reporter Logic
 *
 * Generates status reports for specs.
 * Pure function - no I/O.
 *
 * @see design.md Criterion 6
 */

import type { Artifact, LedgerEntry, LifecycleState, ApprovalPolicy } from "@vellum/protocol";

/**
 * Status report for a spec.
 */
export interface StatusReport {
  /** Spec ID */
  readonly specId: string;
  /** Recorded lifecycle state */
  readonly recordedState: LifecycleState;
  /** Effective lifecycle state (may differ if preconditions fail) */
  readonly effectiveState: LifecycleState;
  /** Whether recorded and effective match */
  readonly stateMismatch: boolean;
  /** Artifact versions */
  readonly artifacts: {
    readonly requirements?: ArtifactStatus;
    readonly design?: ArtifactStatus;
    readonly tasks?: ArtifactStatus;
  };
  /** Approval status */
  readonly approvals: ApprovalStatusReport;
  /** Verification status */
  readonly verification: VerificationStatus;
  /** Next permitted transition */
  readonly nextTransition?: {
    readonly target: LifecycleState;
    readonly unmetPreconditions: readonly string[];
  };
}

/**
 * Artifact status in report.
 */
export interface ArtifactStatus {
  readonly version: number;
  readonly state: LifecycleState;
  readonly checksum: string;
}

/**
 * Approval status in report.
 */
export interface ApprovalStatusReport {
  readonly requirements: ApprovalCount;
  readonly design: ApprovalCount;
  readonly tasks: ApprovalCount;
}

/**
 * Approval count.
 */
export interface ApprovalCount {
  readonly current: number;
  readonly required: number;
  readonly complete: boolean;
}

/**
 * Verification status.
 */
export interface VerificationStatus {
  readonly required: number;
  readonly completed: number;
  readonly failed: number;
  readonly complete: boolean;
}

/**
 * Compute status report for a spec.
 * Pure function consuming artifacts and ledger.
 */
export function computeStatusReport(
  specId: string,
  artifacts: readonly Artifact[],
  ledger: readonly LedgerEntry[],
  state: LifecycleState,
  policy: ApprovalPolicy | null,
): StatusReport {
  // Get artifact status
  const requirements = artifacts.find((a) => a.kind === "requirements");
  const design = artifacts.find((a) => a.kind === "design");
  const tasks = artifacts.find((a) => a.kind === "tasks");

  // Compute approval status
  const approvals = computeApprovalStatus(ledger, policy);

  // Compute verification status
  const verification = computeVerificationStatus(ledger);

  // For now, recorded and effective are the same
  // (effective state computation requires complex precondition checking)
  const effectiveState = state;
  const stateMismatch = false;

  const artfs: { requirements?: ArtifactStatus; design?: ArtifactStatus; tasks?: ArtifactStatus } =
    {};
  if (requirements) artfs.requirements = getArtifactStatus(requirements);
  if (design) artfs.design = getArtifactStatus(design);
  if (tasks) artfs.tasks = getArtifactStatus(tasks);

  return {
    specId,
    recordedState: state,
    effectiveState,
    stateMismatch,
    artifacts: artfs,
    approvals,
    verification,
  };
}

/**
 * Get artifact status.
 */
function getArtifactStatus(artifact: Artifact): ArtifactStatus {
  return {
    version: artifact.frontmatter.version,
    state: artifact.frontmatter.state,
    checksum: artifact.frontmatter.checksum,
  };
}

/**
 * Compute approval status from ledger.
 */
function computeApprovalStatus(
  ledger: readonly LedgerEntry[],
  policy: ApprovalPolicy | null,
): ApprovalStatusReport {
  // Count approvals for each artifact
  const requirementsApprovals = countApprovals(ledger, "requirements");
  const designApprovals = countApprovals(ledger, "design");
  const tasksApprovals = countApprovals(ledger, "tasks");

  // Get required counts from policy
  const requirementsRequired = policy?.requiredCount.get("standard")?.get("requirements") ?? 1;
  const designRequired = policy?.requiredCount.get("standard")?.get("design") ?? 1;
  const tasksRequired = policy?.requiredCount.get("standard")?.get("tasks") ?? 1;

  return {
    requirements: {
      current: requirementsApprovals,
      required: requirementsRequired,
      complete: requirementsApprovals >= requirementsRequired,
    },
    design: {
      current: designApprovals,
      required: designRequired,
      complete: designApprovals >= designRequired,
    },
    tasks: {
      current: tasksApprovals,
      required: tasksRequired,
      complete: tasksApprovals >= tasksRequired,
    },
  };
}

/**
 * Count approvals for an artifact.
 */
function countApprovals(ledger: readonly LedgerEntry[], artifact: string): number {
  let count = 0;
  for (const entry of ledger) {
    if (entry.kind === "approval") {
      const payload = entry as { artifact?: string };
      if (payload.artifact?.includes(artifact)) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Compute verification status from ledger.
 */
function computeVerificationStatus(ledger: readonly LedgerEntry[]): VerificationStatus {
  let completed = 0;
  let failed = 0;

  for (const entry of ledger) {
    if (entry.kind === "evidence") {
      const payload = entry as { exit_status?: number };
      if (payload.exit_status === 0) {
        completed++;
      } else {
        failed++;
      }
    }
  }

  // Total required would come from tasks.md parsing
  const required = completed + failed;

  return {
    required,
    completed,
    failed,
    complete: failed === 0 && required > 0,
  };
}

/**
 * Format status report as JSON.
 */
export function formatStatusJson(report: StatusReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Format status report for CLI.
 */
export function formatStatusHuman(report: StatusReport): string {
  const lines: string[] = [];

  lines.push(`Spec: ${report.specId}`);
  lines.push(`State: ${report.recordedState}`);

  if (report.stateMismatch) {
    lines.push(`  ⚠️  Recorded state does not match effective state (${report.effectiveState})`);
  }

  lines.push(``);
  lines.push(`Artifacts:`);

  for (const [kind, status] of Object.entries(report.artifacts)) {
    if (status) {
      lines.push(
        `  ${kind}: v${(status as ArtifactStatus).version} (${(status as ArtifactStatus).state})`,
      );
    }
  }

  lines.push(``);
  lines.push(`Approvals:`);
  lines.push(
    `  Requirements: ${report.approvals.requirements.current}/${report.approvals.requirements.required}`,
  );
  lines.push(`  Design: ${report.approvals.design.current}/${report.approvals.design.required}`);
  lines.push(`  Tasks: ${report.approvals.tasks.current}/${report.approvals.tasks.required}`);

  if (report.nextTransition) {
    lines.push(``);
    lines.push(`Next: ${report.nextTransition.target}`);
    if (report.nextTransition.unmetPreconditions.length > 0) {
      lines.push(`  Unmet preconditions:`);
      for (const pre of report.nextTransition.unmetPreconditions) {
        lines.push(`    - ${pre}`);
      }
    }
  }

  return lines.join("\n");
}
