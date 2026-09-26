/**
 * Gate Runner - main entry point for running gates.
 *
 * @see requirements.md Requirements 5, 6, 7
 */

import type { QualityFinding } from "../../domain/ledger/types";
import { ReviewGate } from "./review-gate";
import { MergeGate } from "./merge-gate";
import { ReleaseGate } from "./release-gate";

/**
 * Gate result status.
 */
export type GateStatus = "pass" | "fail" | "warn";

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
  /** Artifact version bound to this result */
  artifact_version: number;
  /** Artifact checksum */
  artifact_checksum: string;
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
 * @returns Gate evaluation result
 */
export async function runReviewGate(
  kind: "requirements" | "design" | "plan",
  options: GateRunnerOptions,
): Promise<GateEvaluationResult> {
  const gate = new ReviewGate(kind, options);
  return gate.evaluate();
}

/**
 * Run the merge gate.
 *
 * @param options - Gate runner options
 * @returns Gate evaluation result
 */
export async function runMergeGate(options: GateRunnerOptions): Promise<GateEvaluationResult> {
  const gate = new MergeGate(options);
  return gate.evaluate();
}

/**
 * Run the release gate.
 *
 * @param options - Gate runner options
 * @returns Gate evaluation result
 */
export async function runReleaseGate(options: GateRunnerOptions): Promise<GateEvaluationResult> {
  const gate = new ReleaseGate(options);
  return gate.evaluate();
}
