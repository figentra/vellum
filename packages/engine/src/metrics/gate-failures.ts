import type { MetricValue } from "./metrics.interface.js";
import type { LedgerEntry } from "@vellum/protocol";

/**
 * Count gate failures from Ledger entries.
 *
 * Counts gate_result entries with status "fail" within scope.
 * Exact count: pass and warn are not counted.
 *
 * @param entries - Ledger entries in scope
 * @returns MetricValue with count of failed gates
 */
export function countGateFailures(entries: readonly LedgerEntry[]): MetricValue {
  const failedGates = entries.filter(
    (e) => e.kind === "gate_result" && "status" in e && e.status === "fail",
  );

  return { kind: "count", value: failedGates.length };
}
