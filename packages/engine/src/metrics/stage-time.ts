import type { MetricValue } from "./metrics.interface.js";

/**
 * Lifecycle stages in order.
 */
const LIFECYCLE_STAGES = [
  "draft",
  "in_progress",
  "in_review",
  "approved",
  "merged",
  "released",
] as const;

type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

/**
 * Compute time per stage from state transitions.
 *
 * For each spec and each lifecycle stage entered, computes duration from stage
 * entry timestamp to exit timestamp, sums time across re-entries to the same stage,
 * and outputs a map keyed by stage name in lifecycle order.
 *
 * Skipped stages are absent from the output.
 *
 * @param stateTransitions - array of state transition events per spec
 * @returns Record of stage name to MetricValue
 */
export function computeTimePerStage(
  stateTransitions: ReadonlyArray<{
    readonly specId: string;
    readonly stage: LifecycleStage;
    readonly entered: number;
    readonly exited?: number;
  }>,
): Record<string, MetricValue> {
  // Accumulate durations per stage
  const stageDurations = new Map<LifecycleStage, number[]>();

  for (const transition of stateTransitions) {
    if (!transition.exited) continue; // Stage not exited yet

    const duration = transition.exited - transition.entered;
    const durations = stageDurations.get(transition.stage) ?? [];
    durations.push(duration);
    stageDurations.set(transition.stage, durations);
  }

  // Aggregate: average per stage
  const result: Record<string, MetricValue> = {};

  // Output in lifecycle order
  for (const stage of LIFECYCLE_STAGES) {
    const durations = stageDurations.get(stage);
    if (!durations || durations.length === 0) continue; // Skipped stage

    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    result[stage] = { kind: "duration", value: avgDuration };
  }

  return result;
}

/**
 * Derive state transitions from Ledger entries.
 *
 * This is a simplified derivation. Real implementation uses the Status Reporter's
 * state machine to determine transitions from Ledger events (approval, merge, release, etc.).
 *
 * @param entries - Ledger entries for one spec
 * @returns State transitions based on entry kinds
 */
export function deriveStateTransitions(
  entries: ReadonlyArray<{ readonly kind: string; readonly timestamp: string }>,
): Array<{ readonly stage: LifecycleStage; readonly entered: number; readonly exited?: number }> {
  const transitions: Array<{ stage: LifecycleStage; entered: number; exited?: number }> = [];

  // Simplified: assume stages progress linearly based on entry kinds
  // Real implementation would track actual state machine transitions

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  let currentStage: LifecycleStage | null = null;
  let stageEnteredAt: number | null = null;

  for (let i = 0; i < sortedEntries.length; i++) {
    const entry = sortedEntries[i];
    if (!entry) continue;
    const timestamp = new Date(entry.timestamp).getTime();
    const nextStage = inferStage(entry.kind);

    if (!nextStage) continue;

    // Close current stage if exists
    if (currentStage && stageEnteredAt !== null) {
      transitions.push({
        stage: currentStage,
        entered: stageEnteredAt,
        exited: timestamp,
      });
    }

    // Start new stage
    currentStage = nextStage;
    stageEnteredAt = timestamp;
  }

  // Don't close the last stage (it's still active)

  return transitions;
}

/**
 * Infer lifecycle stage from Ledger entry kind.
 *
 * This is a simplified mapping. Real implementation uses the Status Reporter.
 */
function inferStage(kind: string): LifecycleStage | null {
  switch (kind) {
    case "artifact_created":
    case "decision":
      return "draft";
    case "claim":
    case "task":
      return "in_progress";
    case "approval":
    case "rejection":
      return "in_review";
    case "gate_result":
      return "approved";
    case "merge":
      return "merged";
    case "release":
      return "released";
    default:
      return null;
  }
}

export type { LifecycleStage };
