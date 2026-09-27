/**
 * @vellum/engine — Approval standing: the one rule every reader applies
 *
 * An artifact is amended after it was approved (a plan converged, a
 * requirement clarified), and the human approves the new text. The ledger
 * then holds two approvals of the artifact: the old one, bound to a checksum
 * the artifact no longer has, and the new one, bound to its current checksum.
 *
 * The old approval is history, not a finding. Only approvals bound to the
 * current checksum count toward the required number (criterion 7.11; the
 * design's glossary: an Invalidated Approval is "not counted toward approval
 * requirements"), and an approval bound to an older checksum is reported as
 * an Invalidated Approval (criterion 8.2) only while it still matters — while
 * the artifact lacks the approvals the policy requires and the approver has
 * not approved the current text. Every other rejection (unsigned, forged,
 * wrong key, assistant session, unauthorised) is always reported: an old
 * record that could never have been valid is a finding however old it is.
 *
 * Strict verification, status, check (through the effective state) and the
 * pre-execution check all decide from this.
 *
 * Pure function - no I/O.
 *
 * @see requirements.md Criteria 7.11, 8.1, 8.2
 */

import type {
  ApprovalPolicy,
  ArtifactKind,
  Checksum,
  GitCommit,
  RiskClass,
} from "@vellum/protocol";
import {
  countValidApprovals,
  getRequiredApprovalCount,
  matchesApprover,
  verifyApproval,
  type ApprovalRejectionReason,
  type RequiredApprovalsResult,
} from "./verify.js";

/** The fields of an approval record the verifier reads. */
export interface EvaluatedApprovalInput {
  readonly approver: string;
  readonly artifact: ArtifactKind;
  readonly artifactChecksum: Checksum;
  readonly signalCommit: string;
}

/** Where one approval record stands against the artifacts as they are now. */
export type ApprovalStanding =
  /** Bound to the current checksum and valid: counts. */
  | { readonly kind: "valid" }
  /**
   * Valid when given, but bound to an older checksum, and the artifact's
   * current text is approved (by the policy's count, or by this approver
   * again). History: neither counted nor reported.
   */
  | {
      readonly kind: "superseded";
      readonly approvedChecksum: Checksum;
      readonly currentChecksum: Checksum;
    }
  /**
   * Bound to an older checksum and not replaced: an Invalidated Approval
   * (criterion 8.2). Reported, naming the artifact and both checksums.
   */
  | {
      readonly kind: "invalidated";
      readonly approvedChecksum: Checksum;
      readonly currentChecksum: Checksum;
    }
  /** Rejected for a reason other than the checksum: always reported. */
  | { readonly kind: "rejected"; readonly reason: ApprovalRejectionReason }
  /** The approved artifact is not present: always reported. */
  | { readonly kind: "artifact-missing" };

/** One record with its standing. */
export interface EvaluatedApproval<R extends EvaluatedApprovalInput> {
  readonly record: R;
  readonly standing: ApprovalStanding;
}

/** Every record's standing and each present artifact's requirement. */
export interface ApprovalEvaluation<R extends EvaluatedApprovalInput> {
  /** The records in the order given. */
  readonly records: readonly EvaluatedApproval<R>[];
  /** For each artifact present, whether its current text holds the required approvals. */
  readonly artifacts: ReadonlyMap<ArtifactKind, RequiredApprovalsResult>;
}

/**
 * Decide each approval record's standing and each present artifact's
 * approval requirement, from the records, the policy, the signal commits and
 * the artifacts' current checksums.
 *
 * `currentChecksums` holds an entry for each artifact that is present.
 */
export function evaluateApprovals<R extends EvaluatedApprovalInput>(
  records: readonly R[],
  policy: ApprovalPolicy | null,
  riskClass: RiskClass,
  gitCommits: ReadonlyMap<string, GitCommit>,
  currentChecksums: ReadonlyMap<ArtifactKind, Checksum>,
): ApprovalEvaluation<R> {
  const artifacts = new Map<ArtifactKind, RequiredApprovalsResult>();
  for (const [kind, checksum] of currentChecksums) {
    const required = getRequiredApprovalCount(policy, riskClass, kind);
    const count = countValidApprovals(records, policy, riskClass, kind, checksum, gitCommits);
    artifacts.set(kind, { met: required > 0 && count >= required, count, required });
  }

  const verdicts = records.map((record) => {
    const current = currentChecksums.get(record.artifact);
    return current === undefined
      ? { record, current, result: null }
      : { record, current, result: verifyApproval(record, policy, riskClass, gitCommits, current) };
  });

  // Approvers who hold a valid approval of each artifact's current text.
  const renewed = new Map<ArtifactKind, string[]>();
  for (const { record, result } of verdicts) {
    if (result?.valid !== true) continue;
    renewed.set(record.artifact, [...(renewed.get(record.artifact) ?? []), record.approver]);
  }

  const evaluated = verdicts.map(({ record, current, result }): EvaluatedApproval<R> => {
    if (current === undefined || result === null) {
      return { record, standing: { kind: "artifact-missing" } };
    }
    if (result.valid) return { record, standing: { kind: "valid" } };
    if (result.reason !== "CHECKSUM_MISMATCH") {
      return { record, standing: { kind: "rejected", reason: result.reason } };
    }
    const replaced =
      artifacts.get(record.artifact)?.met === true ||
      (renewed.get(record.artifact) ?? []).some((approver) =>
        matchesApprover(approver, record.approver),
      );
    const checksums = { approvedChecksum: record.artifactChecksum, currentChecksum: current };
    return {
      record,
      standing: replaced
        ? { kind: "superseded", ...checksums }
        : { kind: "invalidated", ...checksums },
    };
  });

  return { records: Object.freeze(evaluated), artifacts };
}
