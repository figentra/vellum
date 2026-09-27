/**
 * @vellum/engine — Check Mode Logic
 *
 * Check Mode is the CI-safe status check (criteria 6.6-6.12). It fails a spec
 * whose Effective Lifecycle State is INVALID, whose ledger has an integrity
 * failure or fork, or whose Recorded Lifecycle State differs from its
 * Effective Lifecycle State; a Legacy Spec passes unless its Legacy Stage is
 * `invalid`. It does not run strict verification: a spec in review is not
 * expected to have evidence, and a spec that claims a later state than its
 * content supports is caught as a state mismatch.
 *
 * Pure function - no I/O, no side effects.
 *
 * @see requirements.md Criteria 6.6-6.12
 */

import type {
  ApprovalPolicy,
  Artifact,
  Finding,
  GitCommit,
  LedgerEntry,
  LedgerHead,
  RiskClass,
} from "@vellum/protocol";
import { EXIT_STATUS } from "@vellum/protocol";
import type { ApprovalCommitResolution } from "../approval/records.js";
import { checkLedgerIntegrity } from "../ledger/integrity.js";
import {
  computeEffectiveLifecycleState,
  type EffectiveState,
} from "../lifecycle/effective-state.js";

/** One spec as check mode verifies it: everything read from the repository. */
export interface CheckModeSpec {
  /** The spec's slug, e.g. "001-login" */
  readonly id: string;
  /**
   * Set for a Legacy Spec (not under Vellum management): its Legacy Stage.
   * The remaining fields are then not read.
   */
  readonly legacyStage?: string;
  readonly artifacts: readonly Artifact[];
  readonly ledger: readonly LedgerEntry[];
  /** The Ledger Head beside the ledger; null when its file is absent */
  readonly ledgerHead: LedgerHead | null;
  /** The Recorded Lifecycle State as written in requirements.md's frontmatter */
  readonly recordedState: string;
  readonly policy: ApprovalPolicy | null;
  /** The spec's risk class, which selects the policy's approvers. */
  readonly riskClass: RiskClass;
  /** The approval signal commits the spec's approvals reference. */
  readonly gitCommits: ReadonlyMap<string, GitCommit>;
  /** The commit that added each approval entry, keyed by entry id */
  readonly approvalCommits?: ReadonlyMap<number, ApprovalCommitResolution>;
  /** The verified commit and its ancestors */
  readonly verifiedHistory?: ReadonlySet<string>;
}

/** What check mode found for one spec. */
export interface CheckModeSpecResult {
  readonly id: string;
  readonly legacy: boolean;
  /** Recorded state; null for a Legacy Spec */
  readonly recordedState: string | null;
  /** Effective state and how it was reached; null for a Legacy Spec */
  readonly effective: EffectiveState | null;
  readonly outcome: "pass" | "fail" | "inconclusive";
}

/**
 * Check mode result.
 */
export interface CheckModeResult {
  /** Exit status per convention (0 = success, 1 = failure, 2 = inconclusive) */
  readonly exitStatus: number;
  /** Whether check passed */
  readonly passed: boolean;
  /** All findings, failures and undecidable specs alike */
  readonly findings: readonly Finding[];
  /** Per-spec results, in input order */
  readonly specs: readonly CheckModeSpecResult[];
  /** Summary of checks */
  readonly summary: CheckSummary;
}

/**
 * Summary of checks performed.
 */
export interface CheckSummary {
  readonly specsChecked: number;
  readonly legacySpecs: number;
  readonly invalidStates: number;
  readonly ledgerFailures: number;
  readonly stateMismatches: number;
  /** Specs whose Effective Lifecycle State could not be decided */
  readonly inconclusive: number;
}

function makeFinding(file: string, line: number, rule: string, message: string): Finding {
  return { file, line, rule, message };
}

/**
 * Run check mode over specs, modifying nothing.
 *
 * Exit status: 1 when any spec fails (criteria 6.8-6.10, 6.12); otherwise 2
 * when any spec's Effective Lifecycle State could not be decided; otherwise 0
 * (criterion 6.7).
 *
 * @param specs - Specs to check
 * @returns Check result
 */
export function runCheckMode(specs: readonly CheckModeSpec[]): CheckModeResult {
  const findings: Finding[] = [];
  const results: CheckModeSpecResult[] = [];
  let legacySpecs = 0;
  let invalidStates = 0;
  let ledgerFailures = 0;
  let stateMismatches = 0;
  let inconclusive = 0;

  for (const spec of specs) {
    const specDir = `.agents/specs/${spec.id}`;

    // Criteria 6.11-6.12: a Legacy Spec passes unless its stage is invalid
    if (spec.legacyStage !== undefined) {
      legacySpecs++;
      const invalid = spec.legacyStage === "invalid";
      if (invalid) {
        findings.push(
          makeFinding(
            specDir,
            0,
            "LEGACY_STAGE_INVALID",
            `Legacy spec ${spec.id} has an invalid Legacy Stage (a later artifact without an earlier one)`,
          ),
        );
      }
      results.push({
        id: spec.id,
        legacy: true,
        recordedState: null,
        effective: null,
        outcome: invalid ? "fail" : "pass",
      });
      continue;
    }

    let failed = false;

    // Criterion 6.9: ledger integrity failures and forks, with the tail
    const integrity = checkLedgerIntegrity(spec.ledger, spec.ledgerHead);
    if (!integrity.valid) {
      ledgerFailures++;
      failed = true;
      for (const failure of integrity.failures) {
        const ids =
          failure.other_entry_id !== undefined
            ? `entries ${failure.other_entry_id} and ${failure.entry_id}`
            : `entry ${failure.entry_id}`;
        findings.push(
          makeFinding(
            `${specDir}/.sdlc/ledger.jsonl`,
            failure.entry_id,
            "LEDGER_INTEGRITY",
            `Spec ${spec.id}, ${ids}: ${failure.message}`,
          ),
        );
      }
    }

    const effective = computeEffectiveLifecycleState({
      artifacts: spec.artifacts,
      ledger: spec.ledger,
      recordedState: spec.recordedState,
      policy: spec.policy,
      riskClass: spec.riskClass,
      gitCommits: spec.gitCommits,
      ledgerHead: spec.ledgerHead,
      ...(spec.approvalCommits ? { approvalCommits: spec.approvalCommits } : {}),
      ...(spec.verifiedHistory ? { verifiedHistory: spec.verifiedHistory } : {}),
    });

    let undecided = false;
    if (effective.kind === "inconclusive") {
      undecided = true;
      findings.push(
        makeFinding(
          `${specDir}/requirements.md`,
          0,
          "STATE_INCONCLUSIVE",
          `Spec ${spec.id} records ${spec.recordedState}; its effective state holds through ${effective.holdsThrough} and cannot be decided further: ${effective.reason}`,
        ),
      );
    } else if (effective.state === "INVALID") {
      // Criterion 6.8
      invalidStates++;
      failed = true;
      findings.push(
        makeFinding(
          `${specDir}/requirements.md`,
          0,
          "STATE_INVALID",
          `Spec ${spec.id} is INVALID: ${effective.failedPrecondition ?? `recorded as ${spec.recordedState}`}`,
        ),
      );
    } else if (effective.state !== spec.recordedState) {
      // Criterion 6.10
      stateMismatches++;
      failed = true;
      findings.push(
        makeFinding(
          `${specDir}/requirements.md`,
          0,
          "STATE_MISMATCH",
          `Spec ${spec.id} records ${spec.recordedState} but its effective state is ${effective.state}; failed precondition: ${effective.failedPrecondition ?? "none named"}`,
        ),
      );
    }

    if (undecided && !failed) inconclusive++;
    results.push({
      id: spec.id,
      legacy: false,
      recordedState: spec.recordedState,
      effective,
      outcome: failed ? "fail" : undecided ? "inconclusive" : "pass",
    });
  }

  const anyFailed = results.some((r) => r.outcome === "fail");
  const anyInconclusive = results.some((r) => r.outcome === "inconclusive");
  const exitStatus = anyFailed
    ? EXIT_STATUS.FAILURE
    : anyInconclusive
      ? EXIT_STATUS.INCONCLUSIVE
      : EXIT_STATUS.SUCCESS;

  return {
    exitStatus,
    passed: exitStatus === EXIT_STATUS.SUCCESS,
    findings: Object.freeze(findings),
    specs: Object.freeze(results),
    summary: {
      specsChecked: specs.length,
      legacySpecs,
      invalidStates,
      ledgerFailures,
      stateMismatches,
      inconclusive,
    },
  };
}

/**
 * Run check mode on a single spec.
 */
export function checkSingleSpec(spec: CheckModeSpec): {
  passed: boolean;
  findings: readonly Finding[];
} {
  const result = runCheckMode([spec]);
  return { passed: result.passed, findings: result.findings };
}

/**
 * Format check mode result for CI output.
 */
export function formatCheckResult(result: CheckModeResult): string {
  const lines: string[] = [];

  const verdict = result.passed ? "PASS" : result.exitStatus === 2 ? "INCONCLUSIVE" : "FAIL";
  lines.push(`Check mode: ${verdict}`);
  lines.push(`Exit status: ${result.exitStatus}`);
  lines.push(``);
  lines.push(`Summary:`);
  lines.push(`  Specs checked: ${result.summary.specsChecked}`);
  lines.push(`  Legacy specs: ${result.summary.legacySpecs}`);
  lines.push(`  Invalid states: ${result.summary.invalidStates}`);
  lines.push(`  Ledger failures: ${result.summary.ledgerFailures}`);
  lines.push(`  State mismatches: ${result.summary.stateMismatches}`);
  lines.push(`  Undecided: ${result.summary.inconclusive}`);

  if (result.findings.length > 0) {
    lines.push(``);
    lines.push(`Findings:`);
    for (const finding of result.findings) {
      lines.push(`  ${finding.file}:${finding.line} [${finding.rule}] ${finding.message}`);
    }
  }

  return lines.join("\n");
}
