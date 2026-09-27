/**
 * Gate Result Writer - builds Gate Result Ledger Entries.
 *
 * @see requirements.md Requirement 5.1
 */

import type { CheckResult, GateResultPayload, LedgerEntry } from "@vellum/protocol";

/**
 * Gate result writer options.
 */
export interface GateResultWriterOptions {
  /** Gate name (e.g. "review", "merge", "release") */
  readonly gateName: string;
  /** Check result of the gate */
  readonly result: CheckResult;
  /** Findings */
  readonly findings: GateResultPayload["findings"];
  /** UTC ISO 8601 timestamp, supplied by the caller (the engine reads no clock) */
  readonly timestamp: string;
}

/**
 * Build a gate result ledger entry.
 *
 * `id` and `predecessor_digest` are placeholders; the ledger assigns them on append.
 *
 * @param options - Gate result options
 * @returns Ledger entry for the gate result
 */
export function writeGateResult(options: GateResultWriterOptions): LedgerEntry {
  const payload: GateResultPayload = {
    gateName: options.gateName,
    result: options.result,
    findings: options.findings,
  };

  return {
    kind: "gate_result",
    id: 0, // Assigned by ledger
    predecessor_digest: null, // Assigned by ledger
    timestamp: options.timestamp,
    ...payload,
  };
}

/**
 * Check if a gate result is passing.
 *
 * @param gateResult - Gate result to check
 * @returns True if the gate passed
 */
export function isGateResultPassing(gateResult: GateResultPayload): boolean {
  return gateResult.result === "PASS";
}
