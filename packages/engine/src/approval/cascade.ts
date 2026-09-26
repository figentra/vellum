/**
 * @vellum/engine — Approval Invalidation Cascade
 *
 * Tracks dependent approvals and propagates invalidation.
 * Pure function - no I/O.
 *
 * @see design.md Criteria 8.6, 8.7
 */

import type { ArtifactKind, LedgerEntry } from "@vellum/protocol";

/**
 * Approval invalidation cascade result.
 */
export interface InvalidationCascade {
  /** Which approvals are invalidated */
  readonly invalidatedApprovals: readonly InvalidationRecord[];
  /** The new effective state for each artifact */
  readonly effectiveStates: ReadonlyMap<ArtifactKind, string>;
}

/**
 * Record of an invalidated approval.
 */
export interface InvalidationRecord {
  /** Which artifact was approved */
  readonly artifact: ArtifactKind;
  /** Entry ID of the approval */
  readonly entryId: number;
  /** Reason for invalidation */
  readonly reason: string;
}

/**
 * Cascade approval invalidation when an artifact is amended.
 *
 * Requirements invalidation → cascades to design and plan approvals
 * Design invalidation → cascades to plan approvals
 * Plan invalidation → affects only plan approvals
 *
 * @param invalidatedArtifact - Which artifact was amended
 * @param ledger - The ledger entries
 * @returns Cascade result
 */
export function cascadeInvalidation(
  invalidatedArtifact: ArtifactKind,
  ledger: readonly LedgerEntry[],
): InvalidationCascade {
  const invalidatedApprovals: InvalidationRecord[] = [];
  const effectiveStates = new Map<ArtifactKind, string>();

  // Determine which approvals to invalidate based on artifact type
  const artifactsToInvalidate = getArtifactCascade(invalidatedArtifact);

  // Find all approval entries for those artifacts
  for (const artifact of artifactsToInvalidate) {
    const approvals = findApprovalEntries(ledger, artifact);

    for (const approval of approvals) {
      invalidatedApprovals.push({
        artifact,
        entryId: approval.id,
        reason: `${invalidatedArtifact} amended; cascade to ${artifact}`,
      });
    }

    // Set effective state back to in-review for that artifact's stage
    const newState = getInReviewState(artifact);
    effectiveStates.set(artifact, newState);
  }

  return {
    invalidatedApprovals: Object.freeze(invalidatedApprovals),
    effectiveStates: Object.freeze(effectiveStates),
  };
}

/**
 * Get which artifacts' approvals should be invalidated.
 */
function getArtifactCascade(artifact: ArtifactKind): readonly ArtifactKind[] {
  switch (artifact) {
    case "requirements":
      // Requirements invalidation cascades to design and plan
      return ["requirements", "design", "tasks"];
    case "design":
      // Design invalidation cascades to plan
      return ["design", "tasks"];
    case "tasks":
      // Plan invalidation affects only plan
      return ["tasks"];
    default:
      return [artifact];
  }
}

/**
 * Find all approval entries for an artifact.
 */
function findApprovalEntries(
  ledger: readonly LedgerEntry[],
  artifact: ArtifactKind,
): Array<{ id: number }> {
  const entries: Array<{ id: number }> = [];

  for (const entry of ledger) {
    if (entry.kind === "approval") {
      const payload = entry as { artifact: string };
      const artifactName = payload.artifact.replace(".md", "") as ArtifactKind;
      if (artifactName === artifact) {
        entries.push({ id: entry.id });
      }
    }
  }

  return entries;
}

/**
 * Get the "in-review" state for an artifact's stage.
 */
function getInReviewState(artifact: ArtifactKind): string {
  switch (artifact) {
    case "requirements":
      return "IN_REVIEW";
    case "design":
      return "DESIGN_IN_REVIEW";
    case "tasks":
      return "PLAN_IN_REVIEW";
    default:
      return "IN_REVIEW";
  }
}

/**
 * Check if invalidating requirements would cascade to design approvals.
 */
export function wouldCascadeToDesign(artifact: ArtifactKind): boolean {
  return artifact === "requirements";
}

/**
 * Check if invalidating an artifact would cascade to plan approvals.
 */
export function wouldCascadeToPlan(artifact: ArtifactKind): boolean {
  return artifact === "requirements" || artifact === "design";
}

/**
 * Count how many approvals would be invalidated by a change.
 */
export function countInvalidatedApprovals(
  artifact: ArtifactKind,
  ledger: readonly LedgerEntry[],
): number {
  const cascade = cascadeInvalidation(artifact, ledger);
  return cascade.invalidatedApprovals.length;
}
