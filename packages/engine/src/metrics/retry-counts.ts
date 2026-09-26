import type { MetricValue } from "./metrics.interface.js";
import type { LedgerEntry } from "../../domain/ledger/types.js";

/**
 * Count retry attempts from Ledger entries.
 *
 * Per Assumption 1, retry counts include the retry and Escalated Attempts
 * of spec 037's Requirement 037:19, counted from Attempt Records.
 *
 * Counts attempt entries where outcome is "retry" or "escalated".
 * Success and failure outcomes are not counted.
 *
 * @param entries - Ledger entries in scope
 * @returns MetricValue with count of retries and escalations
 */
export function countRetries(entries: readonly LedgerEntry[]): MetricValue {
  const retries = entries.filter(
    (e) =>
      e.kind === "attempt" &&
      "outcome" in e &&
      (e.outcome === "retry" || e.outcome === "escalated"),
  );

  return { kind: "count", value: retries.length };
}
