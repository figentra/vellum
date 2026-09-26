/**
 * @vellum/engine — Strict Verifier
 *
 * Verifies all gates pass and coverage is complete.
 * Pure function - no I/O.
 *
 * @see design.md Criterion 12
 */

import type {
  Artifact,
  LedgerEntry,
  ApprovalPolicy,
  Finding,
  CheckResult,
  GitCommit,
  RiskClass,
  TaskLine,
} from "@vellum/protocol";
import { canonicalArtifactBody, computeChecksum, parseTaskLine } from "@vellum/protocol";
import { approvalRecords } from "../approval/records.js";
import { computeCoverage } from "../coverage/validate.js";
import { checkLedgerIntegrity } from "../ledger/integrity.js";
import { verifyApproval } from "../approval/verify.js";
import { createFinding } from "../validate/finding.js";

/**
 * Strict verification result.
 */
export interface StrictVerificationResult {
  /** Overall result */
  readonly result: CheckResult;
  /** Criteria coverage */
  readonly criteria: { readonly satisfied: number; readonly total: number };
  /** Properties cited */
  readonly properties: { readonly satisfied: number; readonly total: number };
  /** Tasks verified */
  readonly tasks: { readonly satisfied: number; readonly total: number };
  /** Evidence entries */
  readonly evidence: { readonly satisfied: number; readonly total: number };
  /** Approvals valid */
  readonly approvals: { readonly satisfied: number; readonly total: number };
  /** All findings */
  readonly findings: readonly Finding[];
}

/**
 * Run strict verification on a spec.
 * Pure function - all data passed in.
 *
 * @param artifacts - The spec's artifacts
 * @param ledger - The spec's ledger
 * @param policy - Approval policy
 * @param gitCommits - Git commits referenced in approvals
 * @param riskClass - The spec's risk class, which selects the policy's approvers
 * @returns Verification result
 */
export function strictVerify(
  artifacts: readonly Artifact[],
  ledger: readonly LedgerEntry[],
  policy: ApprovalPolicy | null,
  gitCommits: ReadonlyMap<string, GitCommit>,
  riskClass: RiskClass,
): StrictVerificationResult {
  const findings: Finding[] = [];

  // Check ledger integrity (criterion 12.6)
  const ledgerResult = checkLedgerIntegrity(ledger);
  if (!ledgerResult.valid) {
    for (const failure of ledgerResult.failures) {
      findings.push(
        createFinding(".sdlc/ledger.jsonl", failure.entry_id, "LEDGER_INTEGRITY", failure.message),
      );
    }
  }

  // Each artifact must be present to be verified at all
  const byKind = new Map(artifacts.map((artifact) => [artifact.kind, artifact] as const));
  for (const kind of ["requirements", "design", "tasks"] as const) {
    if (!byKind.has(kind)) {
      findings.push(createFinding(`${kind}.md`, 0, "ARTIFACT_MISSING", `${kind}.md is missing`));
    }
  }

  // Verify each approval against the current artifact checksum (criterion 12.5)
  const records = approvalRecords(ledger);
  let validApprovals = 0;
  for (const record of records) {
    const current = byKind.get(record.artifact);
    if (!current) {
      findings.push(
        createFinding(
          ".sdlc/ledger.jsonl",
          record.entryId,
          "APPROVAL_INVALID",
          `Approval invalid: approved artifact ${record.artifact}.md is not present`,
        ),
      );
      continue;
    }

    const result = verifyApproval(
      record,
      policy,
      riskClass,
      gitCommits,
      computeChecksum(current.body),
    );
    if (result.valid) {
      validApprovals++;
    } else {
      findings.push(
        createFinding(
          ".sdlc/ledger.jsonl",
          record.entryId,
          "APPROVAL_INVALID",
          `Approval invalid: ${result.reason}`,
        ),
      );
    }
  }

  // Count evidence entries (criterion 12.4)
  let validEvidence = 0;
  let totalEvidence = 0;

  for (const entry of ledger) {
    if (entry.kind === "evidence") {
      totalEvidence++;
      const exitStatus = (entry as unknown as { readonly exit_status?: unknown }).exit_status;
      if (exitStatus === 0) {
        validEvidence++;
      } else {
        findings.push(
          createFinding(
            ".sdlc/ledger.jsonl",
            entry.id,
            "EVIDENCE_FAILED",
            `Evidence entry has non-zero exit status: ${String(exitStatus)}`,
          ),
        );
      }
    }
  }

  // Criteria coverage and property citation (criteria 12.2, 12.3), computed
  // from the artifacts rather than assumed
  const requirements = byKind.get("requirements");
  const design = byKind.get("design");
  const tasksArtifact = byKind.get("tasks");
  let criteria = { satisfied: 0, total: 0 };
  let properties = { satisfied: 0, total: 0 };
  if (requirements && design && tasksArtifact) {
    // Parsed in canonical form, so CRLF or re-padded tables read as the
    // approved text does.
    const coverage = computeCoverage(
      canonicalArtifactBody(requirements.body),
      canonicalArtifactBody(design.body),
      taskLines(canonicalArtifactBody(tasksArtifact.body)),
    );
    criteria = {
      satisfied: coverage.examined.criteria - coverage.uncoveredCriteria.length,
      total: coverage.examined.criteria,
    };
    properties = {
      satisfied: coverage.examined.properties - coverage.uncitedProperties.length,
      total: coverage.examined.properties,
    };
    if (coverage.examined.criteria === 0) {
      findings.push(
        createFinding("requirements.md", 0, "CRITERIA_NOT_COVERED", "requirements.md defines no criteria"),
      );
    }
    for (const id of coverage.uncoveredCriteria) {
      findings.push(
        createFinding("tasks.md", 0, "CRITERIA_NOT_COVERED", `Criterion ${id} is covered by no task`),
      );
    }
    for (const id of coverage.uncitedProperties) {
      findings.push(
        createFinding("tasks.md", 0, "PROPERTY_NOT_CITED", `Property ${id} is cited by no task`),
      );
    }
  }

  const tasks = { satisfied: validEvidence, total: totalEvidence };
  const evidence = { satisfied: validEvidence, total: totalEvidence };
  const approvals = { satisfied: validApprovals, total: records.length };

  // Overall PASS if all checks pass (criterion 12.1)
  const result: CheckResult = findings.length === 0 ? "PASS" : "FAIL";

  return {
    result,
    criteria,
    properties,
    tasks,
    evidence,
    approvals,
    findings: Object.freeze(findings),
  };
}

/** Parse the task lines of a tasks.md body, keeping their 1-based line numbers. */
function taskLines(body: string): TaskLine[] {
  return body.split("\n").flatMap((line, index) => {
    const parsed = parseTaskLine(line);
    return parsed ? [{ ...parsed, lineNumber: index + 1 }] : [];
  });
}

/**
 * Compute exit status for strict verification.
 * Criterion 12.7: FAIL → exit status 1
 */
export function getVerificationExitStatus(result: StrictVerificationResult): number {
  return result.result === "PASS" ? 0 : 1;
}

/**
 * Format verification result as JSON.
 */
export function formatVerificationJson(result: StrictVerificationResult): string {
  return JSON.stringify(
    {
      result: result.result,
      criteria: result.criteria,
      properties: result.properties,
      tasks: result.tasks,
      evidence: result.evidence,
      approvals: result.approvals,
      findings: result.findings,
    },
    null,
    2,
  );
}

/**
 * Format verification result for CLI.
 */
export function formatVerificationHuman(result: StrictVerificationResult): string {
  const lines: string[] = [];

  lines.push(`Result: ${result.result}`);

  lines.push(``);
  lines.push(`Coverage:`);
  lines.push(`  Criteria: ${result.criteria.satisfied}/${result.criteria.total}`);
  lines.push(`  Properties: ${result.properties.satisfied}/${result.properties.total}`);
  lines.push(`  Tasks: ${result.tasks.satisfied}/${result.tasks.total}`);
  lines.push(`  Evidence: ${result.evidence.satisfied}/${result.evidence.total}`);
  lines.push(`  Approvals: ${result.approvals.satisfied}/${result.approvals.total}`);

  if (result.findings.length > 0) {
    lines.push(``);
    lines.push(`Findings:`);
    for (const finding of result.findings) {
      lines.push(`  ${finding.file}:${finding.line} ${finding.rule}: ${finding.message}`);
    }
  }

  return lines.join("\n");
}
