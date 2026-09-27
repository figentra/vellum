import type { MetricValue } from "./metrics.interface.js";
import type { LedgerEntry } from "@vellum/protocol";

/**
 * Compute lead time from Ledger entries and git history.
 *
 * For each spec with a release entry, finds the first commit timestamp
 * touching that spec directory, computes duration from first commit to
 * release timestamp, and averages across all released specs.
 *
 * Specs without releases are excluded. If no specs are released, returns zero-valued metric.
 *
 * @param entries - Ledger entries in scope
 * @param gitHistory - Map of spec ID to first commit timestamp (milliseconds since epoch)
 * @returns MetricValue with average lead time across released specs
 */
export function computeLeadTime(
  entries: readonly LedgerEntry[],
  gitHistory: ReadonlyMap<string, number>,
): MetricValue {
  // Group by spec
  const specs = new Map<string, LedgerEntry[]>();
  for (const entry of entries) {
    // Ledger entries should have a spec_id field for scope grouping
    // Using artifact_path as proxy for spec identification if spec_id not available
    const specId = extractSpecId(entry);
    if (!specId) continue;
    const specEntries = specs.get(specId) ?? [];
    specEntries.push(entry);
    specs.set(specId, specEntries);
  }

  const leadTimes: number[] = [];

  for (const [specId, specEntries] of specs) {
    // Find release entry
    const releaseEntry = specEntries.find((e) => e.kind === "release");
    if (!releaseEntry) continue;

    const releaseTimestamp = new Date(releaseEntry.timestamp).getTime();

    // Find first commit timestamp for this spec
    const firstCommitTimestamp = gitHistory.get(specId);
    if (firstCommitTimestamp === undefined) continue;

    leadTimes.push(releaseTimestamp - firstCommitTimestamp);
  }

  if (leadTimes.length === 0) {
    return { kind: "duration", value: 0 };
  }

  const avgLeadTime = leadTimes.reduce((sum, t) => sum + t, 0) / leadTimes.length;
  return { kind: "duration", value: avgLeadTime };
}

/**
 * Extract spec ID from a Ledger entry.
 *
 * Uses artifact_path (e.g., ".agents/specs/039-sdlc-insight/requirements.md")
 * or other fields to determine which spec an entry belongs to.
 */
function extractSpecId(entry: LedgerEntry): string | null {
  // For entries with artifact_path, extract spec directory
  if ("artifact_path" in entry && typeof entry.artifact_path === "string") {
    const match = entry.artifact_path.match(/\.agents\/specs\/(\d+-[^/]+)/);
    if (match && match[1]) return match[1];
  }

  // For entries without artifact_path, check other fields
  // This is a fallback for entries like 'merge' or 'release'
  if ("spec_id" in entry && typeof entry.spec_id === "string") {
    return entry.spec_id;
  }

  return null;
}
