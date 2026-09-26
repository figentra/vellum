import type { MetricValue } from "./metrics.interface.js";
import type { LedgerEntry } from "@vellum/protocol";

/**
 * Compute rework rate from Ledger entries.
 *
 * Count distinct artifact paths with at least one amendment entry,
 * divide by total artifact count (actual count, not assumed three).
 *
 * Produces ratio-of-sums across specs in scope.
 * Handles Legacy Specs by counting actual artifacts.
 *
 * @param entries - Ledger entries in scope
 * @returns MetricValue with ratio of amended to total artifacts
 */
export function computeReworkRate(entries: readonly LedgerEntry[]): MetricValue {
  // Find all amendment entries
  const amendmentEntries = entries.filter((e) => e.kind === "amendment");

  // Collect distinct artifact paths with amendments
  const amendedArtifacts = new Set<string>();
  for (const entry of amendmentEntries) {
    if ("artifact_path" in entry && typeof entry.artifact_path === "string") {
      amendedArtifacts.add(entry.artifact_path);
    }
  }

  // Count total artifacts from approvals
  const approvalEntries = entries.filter((e) => e.kind === "approval");
  const allArtifacts = new Set<string>();
  for (const entry of approvalEntries) {
    if ("artifact_path" in entry && typeof entry.artifact_path === "string") {
      allArtifacts.add(entry.artifact_path);
    }
  }

  // Also count artifacts from other entries if no approvals
  // (handles specs without approvals yet)
  if (allArtifacts.size === 0) {
    for (const entry of entries) {
      if ("artifact_path" in entry && typeof entry.artifact_path === "string") {
        allArtifacts.add(entry.artifact_path);
      }
    }
  }

  return {
    kind: "ratio",
    numerator: amendedArtifacts.size,
    denominator: allArtifacts.size,
  };
}
