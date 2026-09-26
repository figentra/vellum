import type { MetricValue } from "./metrics.interface.js";
import type { LedgerEntry } from "@vellum/protocol";

/**
 * Compute task completion rate from Ledger entries.
 *
 * Counts task_ids with at least one evidence entry where exit_status is 0,
 * divides by count of required tasks from requirements.md.
 *
 * A task with evidence exit 1 then evidence exit 0 counts as completed.
 *
 * @param entries - Ledger entries in scope
 * @param requiredTasks - List of required task IDs
 * @returns MetricValue with ratio of completed tasks to required
 */
export function computeTaskCompletionRate(
  entries: readonly LedgerEntry[],
  requiredTasks: readonly string[],
): MetricValue {
  if (requiredTasks.length === 0) {
    return { kind: "ratio", numerator: 0, denominator: 0 };
  }

  // Find evidence entries with exit_status 0
  const evidenceEntries = entries.filter(
    (e) => e.kind === "evidence" && "exit_status" in e && e.exit_status === 0,
  );

  // Collect unique task_ids with successful evidence
  const tasksWithEvidence = new Set<string>();
  for (const entry of evidenceEntries) {
    if ("task_id" in entry && typeof entry.task_id === "string") {
      tasksWithEvidence.add(entry.task_id);
    }
  }

  return {
    kind: "ratio",
    numerator: tasksWithEvidence.size,
    denominator: requiredTasks.length,
  };
}
