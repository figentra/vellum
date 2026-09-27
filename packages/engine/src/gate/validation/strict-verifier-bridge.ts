/**
 * Strict Verifier Bridge - runs the engine's Strict Verifier for a gate.
 *
 * The merge gate's "Strict Verifier PASS" (004 criterion 6.1) is the result
 * of `strictVerify` on the spec's artifacts, ledger and what storage read from
 * git — the same function `vellum verify` runs.
 *
 * @see requirements.md Requirement 6.1
 */

import type { ApprovalPolicy, Artifact, GitCommit, LedgerEntry, RiskClass } from "@vellum/protocol";
import { EXIT_STATUS } from "@vellum/protocol";
import { strictVerify, type StrictVerifyOptions } from "../../verify/strict.js";

/**
 * Strict verifier result.
 */
export interface StrictVerifierResult {
  /** Verification status */
  status: "PASS" | "FAIL" | "INCONCLUSIVE";
  /** Verification findings, as `file:line rule: message` */
  findings: string[];
  /** Exit status: 0 PASS, 1 FAIL, 2 INCONCLUSIVE */
  exit_status: number;
}

/** Everything strict verification of one spec reads. */
export interface StrictVerifierInput {
  readonly artifacts: readonly Artifact[];
  readonly ledger: readonly LedgerEntry[];
  readonly policy: ApprovalPolicy | null;
  readonly gitCommits: ReadonlyMap<string, GitCommit>;
  readonly riskClass: RiskClass;
  readonly options?: StrictVerifyOptions;
}

/**
 * Run the Strict Verifier for a spec.
 *
 * @param input - The spec's artifacts, ledger, policy and git context
 * @returns Strict verifier result
 */
export function runStrictVerifier(input: StrictVerifierInput): StrictVerifierResult {
  const result = strictVerify(
    input.artifacts,
    input.ledger,
    input.policy,
    input.gitCommits,
    input.riskClass,
    input.options,
  );
  return {
    status: result.result,
    findings: result.findings.map((f) => `${f.file}:${f.line} ${f.rule}: ${f.message}`),
    exit_status:
      result.result === "PASS"
        ? EXIT_STATUS.SUCCESS
        : result.result === "FAIL"
          ? EXIT_STATUS.FAILURE
          : EXIT_STATUS.INCONCLUSIVE,
  };
}

/**
 * Check if Strict Verifier result is passing.
 *
 * @param result - Strict verifier result
 * @returns True if passing
 */
export function isStrictVerifierPassing(result: StrictVerifierResult): boolean {
  return result.status === "PASS";
}

/**
 * Get Strict Verifier exit status.
 *
 * @param result - Strict verifier result
 * @returns Exit status (0 for pass, non-zero for fail)
 */
export function getStrictVerifierExitStatus(result: StrictVerifierResult): number {
  return result.exit_status;
}
