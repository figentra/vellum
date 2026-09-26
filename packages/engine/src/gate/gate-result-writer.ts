/**
 * Gate Result Writer - writes Gate Result Ledger Entries.
 *
 * @see requirements.md Requirement 5.1
 */

import type { GateResultPayload, LedgerEntry } from "@vellum/protocol";

/**
 * Gate result writer options.
 */
export interface GateResultWriterOptions {
  /** Gate identifier */
  gate_id: string;
  /** Result status */
  status: "pass" | "fail" | "warn";
  /** Findings */
  findings: GateResultPayload["findings"];
  /** Evidence references */
  evidence_references: string[];
  /** Artifact version */
  artifact_version: number;
  /** Artifact checksum */
  artifact_checksum: string;
}

/**
 * Write a gate result to the ledger.
 *
 * @param options - Gate result options
 * @returns Ledger entry for the gate result
 */
export function writeGateResult(options: GateResultWriterOptions): LedgerEntry {
  const payload: GateResultPayload = {
    gate_id: options.gate_id,
    status: options.status,
    findings: options.findings,
    evidence_references: options.evidence_references,
    artifact_version: options.artifact_version,
    artifact_checksum: options.artifact_checksum,
  };

  return {
    kind: "gate_result",
    id: 0, // Assigned by ledger
    predecessor_digest: null, // Assigned by ledger
    timestamp: new Date().toISOString(),
    ...payload,
  };
}

/**
 * Check if a gate result is stale.
 *
 * @param gateResult - Gate result to check
 * @param currentChecksum - Current artifact checksum
 * @returns True if stale
 */
export function isGateResultStale(gateResult: GateResultPayload, currentChecksum: string): boolean {
  return gateResult.artifact_checksum !== currentChecksum;
}

/**
 * Check if a gate result is passing.
 *
 * @param gateResult - Gate result to check
 * @returns True if passing
 */
export function isGateResultPassing(gateResult: GateResultPayload): boolean {
  return gateResult.status === "pass";
}
