import type { MetricValue } from "./metrics.interface.js";
import type { LedgerEntry } from "@vellum/protocol";
import { extractCriteria } from "../coverage/validate.js";

/**
 * Compute traceability coverage from Ledger entries.
 *
 * A criterion is covered when a task that references it (tasks.md's criteria
 * trailers) has an Evidence Entry that exited 0, or when an Evidence Entry
 * names the criterion directly. The ratio is covered criteria over all
 * criteria requirements.md defines.
 *
 * @param entries - Ledger entries in scope
 * @param criteria - the criterion references requirements.md defines (e.g. "1.2")
 * @param taskCriteria - task identifier to the criteria it references
 * @returns MetricValue with ratio of criteria with passing evidence to total
 */
export function computeTraceabilityCoverage(
  entries: readonly LedgerEntry[],
  criteria: readonly string[],
  taskCriteria: ReadonlyMap<string, readonly string[]>,
): MetricValue {
  const defined = new Set(criteria);
  if (defined.size === 0) {
    return { kind: "ratio", numerator: 0, denominator: 0 };
  }

  const covered = new Set<string>();
  for (const entry of entries) {
    if (entry.kind !== "evidence") continue;
    const evidence = entry as unknown as {
      readonly exit_status?: unknown;
      readonly task_id?: unknown;
      readonly criterion?: unknown;
    };
    if (evidence.exit_status !== 0) continue;
    if (typeof evidence.criterion === "string" && defined.has(evidence.criterion)) {
      covered.add(evidence.criterion);
    }
    if (typeof evidence.task_id === "string") {
      for (const criterion of taskCriteria.get(evidence.task_id) ?? []) {
        if (defined.has(criterion)) covered.add(criterion);
      }
    }
  }

  return {
    kind: "ratio",
    numerator: covered.size,
    denominator: defined.size,
  };
}

/**
 * Count the acceptance criteria a requirements document defines, with the
 * same parser strict verification's coverage uses.
 */
export function countCriteria(requirementsContent: string): number {
  return extractCriteria(requirementsContent).length;
}
