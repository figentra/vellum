import type { MetricValue } from "./metrics.interface.js";
import type { LedgerEntry } from "@vellum/protocol";

/**
 * Compute cycle time from Ledger entries.
 *
 * For each spec with a tasks.md approval and a merge entry, computes duration
 * from approval timestamp to merge timestamp, averaged across all merged specs
 * with plan approval.
 *
 * Specs without both events are excluded.
 *
 * @param entries - Ledger entries in scope
 * @returns MetricValue with average cycle time across merged specs
 */
export function computeCycleTime(entries: readonly LedgerEntry[]): MetricValue {
  // Group by spec
  const specs = new Map<string, LedgerEntry[]>();
  for (const entry of entries) {
    const specId = extractSpecId(entry);
    if (!specId) continue;
    const specEntries = specs.get(specId) ?? [];
    specEntries.push(entry);
    specs.set(specId, specEntries);
  }

  const cycleTimes: number[] = [];

  for (const [, specEntries] of specs) {
    // Find plan approval (tasks.md approval)
    const planApproval = specEntries.find(
      (e) =>
        e.kind === "approval" &&
        "artifact_path" in e &&
        typeof e.artifact_path === "string" &&
        e.artifact_path.endsWith("tasks.md"),
    );
    if (!planApproval) continue;

    // Find merge entry
    const mergeEntry = specEntries.find((e) => e.kind === "merge");
    if (!mergeEntry) continue;

    const approvalTimestamp = new Date(planApproval.timestamp).getTime();
    const mergeTimestamp = new Date(mergeEntry.timestamp).getTime();

    cycleTimes.push(mergeTimestamp - approvalTimestamp);
  }

  if (cycleTimes.length === 0) {
    return { kind: "duration", value: 0 };
  }

  const avgCycleTime = cycleTimes.reduce((sum, t) => sum + t, 0) / cycleTimes.length;
  return { kind: "duration", value: avgCycleTime };
}

/**
 * Extract spec ID from a Ledger entry.
 */
function extractSpecId(entry: LedgerEntry): string | null {
  if ("artifact_path" in entry && typeof entry.artifact_path === "string") {
    const match = entry.artifact_path.match(/\.agents\/specs\/(\d+-[^/]+)/);
    if (match && match[1]) return match[1];
  }

  if ("spec_id" in entry && typeof entry.spec_id === "string") {
    return entry.spec_id;
  }

  return null;
}
