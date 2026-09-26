/**
 * Shared bookkeeping for the review, merge and release gates: findings for
 * what failed, `not_checked` entries for what could not be checked, and the
 * status that follows from both.
 */

import type { FindingSeverity, QualityFinding } from "@vellum/protocol";
import type { GateStatus, NotChecked } from "./index.js";
import type { CheckOutcome } from "./validation/outcome.js";

/** Accumulates one gate evaluation's findings and unchecked items. */
export class GateOutcome {
  readonly findings: QualityFinding[] = [];
  readonly notChecked: NotChecked[] = [];

  constructor(private readonly filePath: string) {}

  /** Record a finding. */
  finding(rule_id: string, message: string, severity: FindingSeverity = "error"): void {
    this.findings.push({
      code: rule_id,
      level: severity,
      message,
      file_path: this.filePath,
      line_number: 1,
      rule_id,
      severity,
    });
  }

  /** Record a check that did not run, and why. */
  skip(check: string, reason: string): void {
    this.notChecked.push({ check, reason });
  }

  /** Record a validator's outcome: a finding per error, or a skip. */
  record(check: string, rule_id: string, outcome: CheckOutcome): void {
    if (outcome.status === "fail") {
      for (const error of outcome.errors) this.finding(rule_id, error);
    } else if (outcome.status === "not_checked") {
      this.skip(check, outcome.reason);
    }
  }

  /**
   * fail when any error finding exists; otherwise inconclusive when any check
   * did not run; otherwise warn or pass.
   */
  status(): GateStatus {
    if (this.findings.some((f) => f.severity === "error")) return "fail";
    if (this.notChecked.length > 0) return "inconclusive";
    if (this.findings.some((f) => f.severity === "warn")) return "warn";
    return "pass";
  }
}
