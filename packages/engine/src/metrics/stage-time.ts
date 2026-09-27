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

export type { LifecycleStage };
