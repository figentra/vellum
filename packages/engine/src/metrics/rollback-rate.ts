import type { MetricValue } from "./metrics.interface.js";
import type { LedgerEntry } from "../../domain/ledger/types.js";

/**
 * Rollback window in milliseconds (24 hours).
 *
 * A release followed by a rollback within this window counts as a rollback.
 * This can be made configurable via Policy in a future slice.
 */
const ROLLBACK_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Compute release rollback rate from Ledger entries.
 *
 * Counts release entries, counts rollback releases (release_type "rollback"
 * or release followed by rollback within 24-hour window), produces ratio.
 *
 * @param entries - Ledger entries in scope
 * @returns MetricValue with ratio of rollbacks to releases
 */
export function computeRollbackRate(entries: readonly LedgerEntry[]): MetricValue {
  const releaseEntries = entries.filter((e) => e.kind === "release");

  if (releaseEntries.length === 0) {
    return { kind: "ratio", numerator: 0, denominator: 0 };
  }

  // Find explicit rollback releases
  const rollbackEntries = releaseEntries.filter(
    (e) => "release_type" in e && e.release_type === "rollback",
  );

  // Find releases followed by rollback within window
  const rollbackTimestamps = rollbackEntries.map((e) => new Date(e.timestamp).getTime());

  const releasesFollowedByRollback: LedgerEntry[] = [];

  for (const release of releaseEntries) {
    // Skip if it's already counted as a rollback
    if ("release_type" in release && release.release_type === "rollback") {
      continue;
    }

    const releaseTimestamp = new Date(release.timestamp).getTime();

    // Check if any rollback is within window after this release
    const hasRollbackWithinWindow = rollbackTimestamps.some(
      (rollbackTime) =>
        rollbackTime > releaseTimestamp && rollbackTime <= releaseTimestamp + ROLLBACK_WINDOW_MS,
    );

    if (hasRollbackWithinWindow) {
      releasesFollowedByRollback.push(release);
    }
  }

  // Total rollbacks = explicit rollbacks + releases followed by rollback
  const totalRollbacks = rollbackEntries.length + releasesFollowedByRollback.length;

  return {
    kind: "ratio",
    numerator: totalRollbacks,
    denominator: releaseEntries.length,
  };
}
