import type { MetricValue } from "./metrics.interface.js";
import type { LedgerEntry } from "@vellum/protocol";

/**
 * Compute amendment rate from Ledger entries.
 *
 * Counts amendment entries, divides by count of distinct artifacts with
 * at least one approval (approved artifacts, not total artifacts).
 *
 * An amendment can only occur on approved artifacts.
 *
 * @param entries - Ledger entries in scope
 * @returns MetricValue with ratio of amendments to approved artifacts
 */
export function computeAmendmentRate(entries: readonly LedgerEntry[]): MetricValue {
  // Count amendment entries
  const amendmentEntries = entries.filter((e) => e.kind === "amendment");

  // Count approved artifacts: distinct artifact_paths with at least one approval
  const approvalEntries = entries.filter((e) => e.kind === "approval");
  const approvedArtifacts = new Set<string>();

  for (const entry of approvalEntries) {
    if ("artifact_path" in entry && typeof entry.artifact_path === "string") {
      approvedArtifacts.add(entry.artifact_path);
    }
  }

  return {
    kind: "ratio",
    numerator: amendmentEntries.length,
    denominator: approvedArtifacts.size,
  };
}
