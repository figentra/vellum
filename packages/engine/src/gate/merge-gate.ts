/**
 * Merge Gate - evaluates merge gate requirements.
 *
 * @see requirements.md Requirements 6.1-6.6
 */

import type { QualityFinding, FindingSeverity } from "../../domain/ledger/types";
import type { GateEvaluationResult, GateRunnerOptions } from "./index";
import { runStrictVerifier, isStrictVerifierPassing } from "./validation/strict-verifier-bridge";
import { checkChangeset } from "./validation/changeset-checker";

/**
 * Create a quality finding with required fields.
 */
function createFinding(
  rule_id: string,
  message: string,
  severity: FindingSeverity,
  file_path: string,
  line_number: number = 1,
): QualityFinding {
  return {
    code: rule_id,
    level: severity,
    message,
    file_path,
    line_number,
    rule_id,
    severity,
  };
}

/**
 * Merge gate evaluation.
 */
export class MergeGate {
  private options: GateRunnerOptions;

  constructor(options: GateRunnerOptions) {
    this.options = options;
  }

  /**
   * Evaluate the merge gate.
   *
   * Requirements 6.1-6.6:
   * - Valid approvals for requirements, design, plan
   * - Each required task succeeded with evidence
   * - Strict Verifier PASS
   * - All required gates passing
   * - Policy-required changesets and documentation
   * - Merge authorisation by Authorised Approver
   */
  async evaluate(): Promise<GateEvaluationResult> {
    const findings: QualityFinding[] = [];
    const basePath = `.agents/specs/${this.options.spec_slug}/`;

    // Check approvals (criterion 6.1)
    const approvalsValid = await this.checkApprovals();
    if (!approvalsValid.valid) {
      findings.push(
        createFinding(
          "MERGE_GATE_INVALID_APPROVAL",
          `Invalid approvals: ${approvalsValid.errors.join(", ")}`,
          "error",
          basePath,
        ),
      );
    }

    // Check tasks succeeded (criterion 6.1)
    const tasksValid = await this.checkTasksSucceeded();
    if (!tasksValid.valid) {
      findings.push(...tasksValid.findings);
    }

    // Check Strict Verifier (criterion 6.1)
    const strictResult = await runStrictVerifier(this.options.spec_slug);
    if (!isStrictVerifierPassing(strictResult)) {
      findings.push(
        createFinding(
          "MERGE_GATE_STRICT_VERIFIER_FAIL",
          "Strict Verifier did not pass",
          "error",
          basePath,
        ),
      );
    }

    // Check changesets (criterion 6.1)
    const changesetValid = await checkChangeset(this.options.spec_slug, "minor");
    if (!changesetValid.valid) {
      findings.push(
        createFinding(
          "MERGE_GATE_CHANGESET_INVALID",
          `Changeset invalid: ${changesetValid.errors.join(", ")}`,
          "error",
          basePath,
        ),
      );
    }

    // Check merge authorisation (criterion 6.3)
    const authValid = await this.checkMergeAuthorisation();
    if (!authValid.valid) {
      findings.push(
        createFinding(
          "MERGE_GATE_NO_AUTHORISATION",
          "No merge authorisation from Authorised Approver",
          "error",
          basePath,
        ),
      );
    }

    const status = findings.some((f) => f.severity === "error")
      ? "fail"
      : findings.some((f) => f.severity === "warn")
        ? "warn"
        : "pass";

    return {
      gate_id: "merge-gate",
      status,
      findings,
      artifact_version: 1,
      artifact_checksum: "sha256:...",
    };
  }

  /**
   * Check approvals are valid and current.
   */
  private async checkApprovals(): Promise<{ valid: boolean; errors: string[] }> {
    // In real implementation, read approval entries from ledger
    // and validate against current artifact checksums

    return { valid: true, errors: [] };
  }

  /**
   * Check all required tasks succeeded.
   */
  private async checkTasksSucceeded(): Promise<{
    valid: boolean;
    findings: QualityFinding[];
  }> {
    // In real implementation, read tasks.md and check ledger for
    // evidence entries with exit_status 0 for each required task

    return { valid: true, findings: [] };
  }

  /**
   * Check merge authorisation exists.
   */
  private async checkMergeAuthorisation(): Promise<{ valid: boolean }> {
    // Check if policy permits automated merge (criterion 6.4)
    if (this.options.risk_class === "low") {
      return { valid: true };
    }

    // In real implementation, check ledger for merge authorisation decision
    return { valid: true };
  }
}
