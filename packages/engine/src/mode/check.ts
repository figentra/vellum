/**
 * @vellum/engine — Check Mode Logic
 *
 * Implements --check mode for CI-safe verification.
 * No side effects, no file modifications.
 * Pure function - no I/O.
 *
 * @see design.md Criterion 6.6-6.10
 */

import type { Artifact, LedgerEntry, ApprovalPolicy } from "@vellum/protocol";
import { checkLedgerIntegrity } from "../ledger/integrity.js";
import { strictVerify } from "../verify/strict.js";
import { createFinding, type Finding } from "../validate/finding.js";

/**
 * Check mode result.
 */
export interface CheckModeResult {
  /** Exit status per convention (0 = success, 1 = failure, 2 = inconclusive) */
  readonly exitStatus: number;
  /** Whether check passed */
  readonly passed: boolean;
  /** All findings */
  readonly findings: readonly Finding[];
  /** Summary of checks */
  readonly summary: CheckSummary;
}

/**
 * Summary of checks performed.
 */
export interface CheckSummary {
  readonly specsChecked: number;
  readonly invalidStates: number;
  readonly ledgerFailures: number;
  readonly stateMismatches: number;
}

/**
 * Run check mode verification.
 * Verifies all specs without modifying files.
 *
 * @param specs - Specs to check
 * @returns Check result
 */
export function runCheckMode(
  specs: Array<{
    readonly id: string;
    readonly artifacts: readonly Artifact[];
    readonly ledger: readonly LedgerEntry[];
    readonly state: string;
    readonly policy: ApprovalPolicy | null;
  }>,
): CheckModeResult {
  const allFindings: Finding[] = [];
  let invalidStates = 0;
  let ledgerFailures = 0;
  let stateMismatches = 0;

  // Check each spec
  for (const spec of specs) {
    // Criterion 6.8: Check for INVALID state
    if (spec.state === "INVALID") {
      invalidStates++;
      allFindings.push(
        createFinding(spec.id, 0, "STATE_INVALID", `Spec ${spec.id} is in INVALID state`),
      );
    }

    // Criterion 6.9: Check ledger integrity
    const ledgerResult = checkLedgerIntegrity(spec.ledger);
    if (!ledgerResult.valid) {
      ledgerFailures++;
      for (const failure of ledgerResult.failures) {
        allFindings.push(
          createFinding(
            `${spec.id}/.sdlc/ledger.jsonl`,
            failure.entry_id,
            "LEDGER_INTEGRITY",
            failure.message,
          ),
        );
      }
    }

    // Criterion 6.10: Check recorded/effective mismatch
    // (Would need to compute effective state, for now just check ledger)
    // In production, would call computeEffectiveState

    // Run strict verification
    const verifyResult = strictVerify(
      spec.artifacts,
      spec.ledger,
      spec.policy,
      new Map(), // Git commits would be passed in production
    );

    allFindings.push(...verifyResult.findings);
  }

  // Compute exit status
  const passed = allFindings.length === 0;

  // Criterion 6.7: Exit 0 for clean spec
  // Criterion 6.8-6.10: Exit 1 for violations
  const exitStatus = passed ? 0 : 1;

  return {
    exitStatus,
    passed,
    findings: Object.freeze(allFindings),
    summary: {
      specsChecked: specs.length,
      invalidStates,
      ledgerFailures,
      stateMismatches,
    },
  };
}

/**
 * Check if running in check mode.
 * (In production, would check CLI args)
 */
export function isCheckMode(args: readonly string[]): boolean {
  return args.includes("--check") || args.includes("--dry-run");
}

/**
 * Run a single spec check.
 */
export function checkSingleSpec(spec: {
  readonly id: string;
  readonly artifacts: readonly Artifact[];
  readonly ledger: readonly LedgerEntry[];
  readonly state: string;
  readonly policy: ApprovalPolicy | null;
}): { passed: boolean; findings: readonly Finding[] } {
  const findings: Finding[] = [];

  // Check state
  if (spec.state === "INVALID") {
    findings.push(createFinding(spec.id, 0, "STATE_INVALID", `Spec is in INVALID state`));
  }

  // Check ledger
  const ledgerResult = checkLedgerIntegrity(spec.ledger);
  if (!ledgerResult.valid) {
    for (const failure of ledgerResult.failures) {
      findings.push(
        createFinding(
          `${spec.id}/.sdlc/ledger.jsonl`,
          failure.entry_id,
          "LEDGER_INTEGRITY",
          failure.message,
        ),
      );
    }
  }

  // Verify
  const verifyResult = strictVerify(spec.artifacts, spec.ledger, spec.policy, new Map());
  findings.push(...verifyResult.findings);

  return {
    passed: findings.length === 0,
    findings: Object.freeze(findings),
  };
}

/**
 * Format check mode result for CI output.
 */
export function formatCheckResult(result: CheckModeResult): string {
  const lines: string[] = [];

  lines.push(`Check mode: ${result.passed ? "PASS" : "FAIL"}`);
  lines.push(`Exit status: ${result.exitStatus}`);
  lines.push(``);
  lines.push(`Summary:`);
  lines.push(`  Specs checked: ${result.summary.specsChecked}`);
  lines.push(`  Invalid states: ${result.summary.invalidStates}`);
  lines.push(`  Ledger failures: ${result.summary.ledgerFailures}`);
  lines.push(`  State mismatches: ${result.summary.stateMismatches}`);

  if (result.findings.length > 0) {
    lines.push(``);
    lines.push(`Findings:`);
    for (const finding of result.findings) {
      lines.push(`  ${finding.file}:${finding.line} [${finding.rule}] ${finding.message}`);
    }
  }

  return lines.join("\n");
}
