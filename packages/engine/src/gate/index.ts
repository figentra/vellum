/**
 * Gate Runner - main entry point for running gates.
 *
 * The engine reads nothing itself: each gate evaluates the inputs its caller
 * read from the repository. A check whose input was not supplied, or that this
 * engine version does not implement, is listed in `not_checked` with the
 * reason, and makes the gate `inconclusive` — never `pass`.
 *
 * @see requirements.md Requirements 5, 6, 7
 */

import type { QualityFinding } from "@vellum/protocol";
import { ReviewGate, type ReviewGateInputs } from "./review-gate";
import { MergeGate, type MergeGateInputs } from "./merge-gate";
import { ReleaseGate, type ReleaseGateInputs } from "./release-gate";

/**
 * Gate result status. `inconclusive`: nothing failed, but at least one check
 * could not be run (see `not_checked`).
 */
export type GateStatus = "pass" | "fail" | "warn" | "inconclusive";

/** A gate check that did not run, and why. */
export interface NotChecked {
  /** The check, e.g. "strict verification" */
  readonly check: string;
  /** Why it did not run */
  readonly reason: string;
}

/**
 * Gate evaluation result.
 */
export interface GateEvaluationResult {
  /** Gate identifier */
  gate_id: string;
  /** Result status */
  status: GateStatus;
  /** Findings from gate evaluation */
  findings: QualityFinding[];
  /** Checks that did not run; non-empty makes a non-failing gate inconclusive */
  not_checked: NotChecked[];
  /** Artifact version bound to this result; null when no artifact was evaluated */
  artifact_version: number | null;
  /** Artifact checksum bound to this result; null when no artifact was evaluated */
  artifact_checksum: string | null;
}

/**
 * Gate runner options.
 */
export interface GateRunnerOptions {
  /** Spec slug */
  spec_slug: string;
  /** Risk class */
  risk_class: "low" | "standard" | "high" | "critical";
}

// Re-export gate components
export * from "./review-gate";
export * from "./merge-gate";
export * from "./release-gate";
export * from "./gate-result-writer";
export * from "./integrity-checker";
export * from "./validation";
export * from "./confirmation";

/**
 * Run a review gate.
 *
 * @param kind - Review kind (requirements, design, plan)
 * @param options - Gate runner options
 * @param inputs - What the caller read from the repository
 * @returns Gate evaluation result
 */
export function runReviewGate(
  kind: "requirements" | "design" | "plan",
  options: GateRunnerOptions,
  inputs: ReviewGateInputs = {},
): GateEvaluationResult {
  return new ReviewGate(kind, options, inputs).evaluate();
}

/**
 * Run the merge gate.
 *
 * @param options - Gate runner options
 * @param inputs - What the caller read from the repository
 * @returns Gate evaluation result
 */
export function runMergeGate(
  options: GateRunnerOptions,
  inputs: MergeGateInputs = {},
): GateEvaluationResult {
  return new MergeGate(options, inputs).evaluate();
}

/**
 * Run the release gate.
 *
 * @param options - Gate runner options
 * @param inputs - What the caller read from the repository and the release
 * @returns Gate evaluation result
 */
export function runReleaseGate(
  options: GateRunnerOptions,
  inputs: ReleaseGateInputs = {},
): GateEvaluationResult {
  return new ReleaseGate(options, inputs).evaluate();
}
