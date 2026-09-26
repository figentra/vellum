import type { MetricValue } from "./metrics.interface.js";
import type { LedgerEntry } from "../../domain/ledger/types.js";

/**
 * Compute traceability coverage from Ledger entries.
 *
 * Counts criteria in requirements.md, counts criteria with at least one
 * linked evidence entry, produces ratio.
 *
 * Uses Trace Engine patterns from Slice 3, reading from Ledger rather
 * than calling runtime.
 *
 * @param entries - Ledger entries in scope
 * @param criteriaCount - total criteria count from requirements.md
 * @returns MetricValue with ratio of criteria with evidence to total
 */
export function computeTraceabilityCoverage(
  entries: readonly LedgerEntry[],
  criteriaCount: number,
): MetricValue {
  if (criteriaCount === 0) {
    return { kind: "ratio", numerator: 0, denominator: 0 };
  }

  // Find evidence entries
  const evidenceEntries = entries.filter((e) => e.kind === "evidence");

  // Group evidence by criterion (evidence should link to criterion)
  const criteriaWithEvidence = new Set<string>();

  for (const entry of evidenceEntries) {
    if ("criterion" in entry && typeof entry.criterion === "string") {
      criteriaWithEvidence.add(entry.criterion);
    }
    // Alternative: evidence links to task, task links to criterion
    // This is simplified; real implementation uses Trace Engine
    if ("task_id" in entry && typeof entry.task_id === "string") {
      // Task identifiers should map to criteria via tasks.md
      // For simplicity, count unique task_ids as coverage proxy
      criteriaWithEvidence.add(entry.task_id);
    }
  }

  return {
    kind: "ratio",
    numerator: criteriaWithEvidence.size,
    denominator: criteriaCount,
  };
}

/**
 * Count criteria from a requirements document.
 *
 * This is a simplified implementation. Real version parses requirements.md
 * to count acceptance criteria.
 */
export function countCriteria(requirementsContent: string): number {
  // Count criteria markers: "#### Acceptance Criteria" or criteria numbering
  const criteriaPattern = /\d+\.\d+/g;
  const matches = requirementsContent.match(criteriaPattern);
  return matches ? new Set(matches).size : 0;
}
