/**
 * Integrity Checker - detects gate integrity violations.
 *
 * Three things can make a recorded Gate Result untrustworthy:
 *
 * - the ledger holding it was edited, truncated, reordered or forked
 *   (checkLedgerIntegrity, with the Ledger Head so the tail is covered);
 * - it is bound to an artifact version or checksum other than the current one
 *   (a stale result, 004 requirement 5.2), or bound to none at all;
 * - a change modified the Gate Definition and, in the same change, turned the
 *   Gate from fail to pass (a Gate Integrity Violation, 003 requirement 4.5-4.6).
 *
 * @see requirements.md Requirement 5.5, design.md Gate Integrity
 */

import type { LedgerEntry, LedgerHead } from "@vellum/protocol";
import { checkLedgerIntegrity } from "../ledger/integrity.js";

/**
 * Gate integrity violation.
 */
export interface IntegrityViolation {
  /** Violation type */
  kind:
    | "edit_to_pass"
    | "result_modified"
    | "predecessor_changed"
    | "stale_result"
    | "unbound_result";
  /** Gate result ID: the ledger entry id, or the gate id when no entry is involved */
  gate_result_id: string;
  /** Description */
  message: string;
  /** Timestamp of the ledger entry involved; empty when there is none */
  timestamp: string;
}

/** The artifact a gate's result must be bound to now. */
export interface CurrentGateBinding {
  readonly artifact_version: number;
  /** The artifact's current Artifact Checksum (SHA-256 hex) */
  readonly artifact_checksum: string;
}

/** What gate integrity is checked against. */
export interface GateIntegrityInput {
  /** The spec's ledger, in file order */
  readonly ledger: readonly LedgerEntry[];
  /** The Ledger Head recorded beside the ledger; null when its file is absent */
  readonly ledgerHead: LedgerHead | null;
  /**
   * The current binding for each gate id. A gate named here whose latest
   * recorded result binds another version or checksum is stale; one whose
   * latest result binds nothing is unbound. Gates not named are not checked
   * for staleness.
   */
  readonly currentBindings?: ReadonlyMap<string, CurrentGateBinding>;
}

/** A gate_result ledger entry as recorded (protocol ledger/types GateResultPayload). */
interface RecordedGateResult {
  readonly id: number;
  readonly timestamp: string;
  readonly gate_id?: unknown;
  readonly gateName?: unknown;
  readonly artifact_version?: unknown;
  readonly artifact_checksum?: unknown;
}

/**
 * Check for gate integrity violations.
 *
 * @param input - Ledger, Ledger Head and the current binding of each gate
 * @returns Integrity violations found
 */
export function checkGateIntegrity(input: GateIntegrityInput): IntegrityViolation[] {
  const violations: IntegrityViolation[] = [];
  const byId = new Map(input.ledger.map((entry) => [entry.id, entry] as const));

  const integrity = checkLedgerIntegrity(input.ledger, input.ledgerHead);
  for (const failure of integrity.failures) {
    const edited =
      failure.kind === "predecessor_digest_mismatch" || failure.kind === "head_mismatch";
    violations.push({
      kind: edited ? "result_modified" : "predecessor_changed",
      gate_result_id: String(failure.entry_id),
      message: failure.message,
      timestamp: byId.get(failure.entry_id)?.timestamp ?? "",
    });
  }

  if (input.currentBindings) {
    const latest = new Map<string, RecordedGateResult>();
    for (const entry of input.ledger) {
      if (entry.kind !== "gate_result") continue;
      const recorded = entry as unknown as RecordedGateResult;
      const gate = gateIdOf(recorded);
      if (gate !== null) latest.set(gate, recorded);
    }

    for (const [gate, current] of input.currentBindings) {
      const recorded = latest.get(gate);
      if (!recorded) continue; // no result recorded: nothing to be stale
      const version = recorded.artifact_version;
      const checksum = recorded.artifact_checksum;
      if (typeof version !== "number" || typeof checksum !== "string") {
        violations.push({
          kind: "unbound_result",
          gate_result_id: String(recorded.id),
          message: `Gate ${gate}'s latest result (entry ${recorded.id}) binds no artifact version and checksum, so whether it applies to the current artifact cannot be established`,
          timestamp: recorded.timestamp,
        });
        continue;
      }
      if (version !== current.artifact_version || checksum !== current.artifact_checksum) {
        violations.push({
          kind: "stale_result",
          gate_result_id: String(recorded.id),
          message: `Gate ${gate}'s latest result (entry ${recorded.id}) is bound to v${version} ${checksum.slice(0, 12)}…, but the artifact is now v${current.artifact_version} ${current.artifact_checksum.slice(0, 12)}…`,
          timestamp: recorded.timestamp,
        });
      }
    }
  }

  return violations;
}

function gateIdOf(recorded: RecordedGateResult): string | null {
  if (typeof recorded.gate_id === "string") return recorded.gate_id;
  if (typeof recorded.gateName === "string") return recorded.gateName;
  return null;
}

/** One gate's result at a change's base and head commits, and what the change modified. */
export interface GateChange {
  /** Gate identifier */
  readonly gate: string;
  /** The gate's result at the change's base commit */
  readonly baseStatus: "pass" | "fail" | "warn";
  /** The gate's result at the change's head commit */
  readonly headStatus: "pass" | "fail" | "warn";
  /** Repository path of the Gate Definition */
  readonly definitionFile: string;
  /** Repository paths the change modifies */
  readonly modifiedFiles: readonly string[];
}

/**
 * Detect an edit-to-pass: the change modifies the Gate Definition and, in the
 * same change, turns the Gate's result from fail to pass (003 requirement
 * 4.5), compared between the change's base and head commits (4.6).
 *
 * @param change - The gate's base and head results and the change's files
 * @returns The violation, or null when there is none
 */
export function detectEditToPass(change: GateChange): IntegrityViolation | null {
  const turnedPass = change.baseStatus === "fail" && change.headStatus === "pass";
  if (!turnedPass || !change.modifiedFiles.includes(change.definitionFile)) return null;
  return {
    kind: "edit_to_pass",
    gate_result_id: change.gate,
    message: `Gate ${change.gate} went from fail to pass in the same change that modified its definition ${change.definitionFile}`,
    timestamp: "",
  };
}

/**
 * Report an integrity violation.
 *
 * @param violation - Violation to report
 * @returns Error message
 */
export function reportIntegrityViolation(violation: IntegrityViolation): string {
  return `Gate integrity violation detected: ${violation.kind}

Gate Result ID: ${violation.gate_result_id}
Message: ${violation.message}
Timestamp: ${violation.timestamp || "(none)"}

This is a serious violation. Gate results must not be modified after recording.`;
}
