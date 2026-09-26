import type { MetricValue } from "./metrics.interface.js";
import type { LedgerEntry } from "../../domain/ledger/types.js";

/**
 * Valid failure classes from spec 037.
 */
const VALID_FAILURE_CLASSES = [
  "environment",
  "dependency",
  "test_failure",
  "protocol_violation",
  "spec_ambiguous",
  "external_service",
  "timeout",
  "unknown",
] as const;

type FailureClass = (typeof VALID_FAILURE_CLASSES)[number];

/**
 * Count failures by failure class from Ledger entries.
 *
 * For each failure class, counts failure entries with that failure_class value.
 * Unknown failure classes are logged with warning and ignored.
 *
 * @param entries - Ledger entries in scope
 * @returns Record of failure class to count
 */
export function countFailureClasses(entries: readonly LedgerEntry[]): Record<string, MetricValue> {
  const counts = new Map<FailureClass, number>();

  // Initialize all classes to 0
  for (const fc of VALID_FAILURE_CLASSES) {
    counts.set(fc, 0);
  }

  // Count failures by class
  for (const entry of entries) {
    if (entry.kind !== "failure") continue;
    if (!("failure_class" in entry)) continue;

    const failureClass = entry.failure_class as string;

    // Check if it's a valid failure class
    if (VALID_FAILURE_CLASSES.includes(failureClass as FailureClass)) {
      const current = counts.get(failureClass as FailureClass) ?? 0;
      counts.set(failureClass as FailureClass, current + 1);
    }
    // Unknown classes are ignored (per design spec)
  }

  // Convert to Record, alphabetically sorted
  const result: Record<string, MetricValue> = {};
  const sortedClasses = [...VALID_FAILURE_CLASSES].sort();

  for (const fc of sortedClasses) {
    const count = counts.get(fc) ?? 0;
    result[fc] = { kind: "count", value: count };
  }

  return result;
}

export type { FailureClass };
