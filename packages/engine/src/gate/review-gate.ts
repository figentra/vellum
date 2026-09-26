/**
 * Review Gate - evaluates review gates for requirements, design, and plan artifacts.
 *
 * @see requirements.md Requirements 5.1-5.4
 */

import type { QualityFinding, FindingSeverity } from "@vellum/protocol";
import type { GateEvaluationResult, GateRunnerOptions } from "./index";

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
 * Review gate for a single artifact.
 */
export class ReviewGate {
  private kind: "requirements" | "design" | "plan";
  private options: GateRunnerOptions;

  constructor(kind: "requirements" | "design" | "plan", options: GateRunnerOptions) {
    this.kind = kind;
    this.options = options;
  }

  /**
   * Evaluate the review gate.
   *
   * @returns Gate evaluation result
   */
  async evaluate(): Promise<GateEvaluationResult> {
    const gateId = `${this.kind}-review`;
    const findings: QualityFinding[] = [];

    // Run quality checks (criterion 5.1)
    // In a real implementation, this would read the artifact from disk
    const artifactPath = `.agents/specs/${this.options.spec_slug}/${this.kind}.md`;
    const artifactVersion = 1; // Read from artifact frontmatter
    const artifactChecksum = "sha256:..."; // Compute from artifact content

    // Quality check results (placeholder)
    const qualityResult = {
      artifact_path: artifactPath,
      artifact_version: artifactVersion,
      status: "pass" as const,
      findings: [] as QualityFinding[],
      check_results: [],
    };

    // Collect blocking findings
    findings.push(...qualityResult.findings);

    // Check for required approvals (criterion 5.3)
    // In real implementation, check ledger for approval entries
    const hasApproval = true; // Placeholder

    if (!hasApproval) {
      findings.push(
        createFinding(
          "MISSING_APPROVAL",
          `No approval found for ${this.kind} artifact`,
          "error",
          artifactPath,
        ),
      );
    }

    // Determine gate status
    const status = findings.some((f) => f.severity === "error")
      ? "fail"
      : findings.some((f) => f.severity === "warn")
        ? "warn"
        : "pass";

    return {
      gate_id: gateId,
      status,
      findings,
      artifact_version: artifactVersion,
      artifact_checksum: artifactChecksum,
    };
  }
}
