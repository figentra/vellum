/**
 * @vellum/engine — Approval records from the ledger
 *
 * Ledger approval entries come in two spellings: the engine-facing
 * ApprovalPayload (`approver`, `artifact: "requirements"`, `artifactChecksum`,
 * `signalCommit`) and the on-disk ledger/types ApprovalPayload (`identity`,
 * `artifact: "requirements.md"`, `artifact_checksum`, `approval_signal.commit`).
 * This reads either into the shape verifyApproval takes.
 */

import type { ArtifactKind, Checksum, LedgerEntry } from "@vellum/protocol";

/** One approval as verifyApproval reads it, with the ledger entry it came from. */
export interface ApprovalRecordView {
  readonly entryId: number;
  readonly approver: string;
  readonly artifact: ArtifactKind;
  readonly artifactChecksum: Checksum;
  readonly signalCommit: string;
}

interface LooseApproval {
  readonly identity?: unknown;
  readonly approver?: unknown;
  readonly artifact?: unknown;
  readonly artifact_checksum?: unknown;
  readonly artifactChecksum?: unknown;
  readonly approval_signal?: { readonly commit?: unknown };
  readonly signalCommit?: unknown;
}

const KINDS: readonly ArtifactKind[] = ["requirements", "design", "tasks"];

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Every approval entry in the ledger, in ledger order. An entry naming no
 * recognisable artifact is skipped; missing string fields read as "", which
 * no policy authorises and no commit map holds, so such an entry never
 * verifies.
 */
export function approvalRecords(ledger: readonly LedgerEntry[]): ApprovalRecordView[] {
  const records: ApprovalRecordView[] = [];
  for (const entry of ledger) {
    if (entry.kind !== "approval") continue;
    const loose = entry as unknown as LooseApproval;
    const artifact = text(loose.artifact).replace(/\.md$/, "");
    const kind = KINDS.find((k) => k === artifact);
    if (kind === undefined) continue;
    records.push({
      entryId: entry.id,
      approver: text(loose.identity) || text(loose.approver),
      artifact: kind,
      artifactChecksum: (text(loose.artifact_checksum) || text(loose.artifactChecksum)) as Checksum,
      signalCommit: text(loose.approval_signal?.commit) || text(loose.signalCommit),
    });
  }
  return records;
}

/**
 * How the commit that added an approval entry to the ledger was resolved
 * from git history: that commit, or why none qualifies (the line is not
 * committed yet, or the commit changed more than the ledger).
 */
export type ApprovalCommitResolution =
  | { readonly commit: string }
  | { readonly problem: string };

/** An approval record with its Approval Signal settled, or the reason it has none. */
export type ResolvedApproval =
  | { readonly record: ApprovalRecordView; readonly problem?: undefined }
  | { readonly record: ApprovalRecordView; readonly problem: string };

/**
 * Settle each approval's Approval Signal.
 *
 * Without `addedBy`, the signal is the commit the entry records. With it —
 * the commit that added each entry to the ledger, resolved by the storage
 * layer — the signal IS that adding commit: an approval counts only when the
 * commit that put it in the ledger is signed by the approver. An entry that
 * records a different commit, or whose adding commit could not be resolved,
 * has no signal. This stops an entry written by anyone from borrowing some
 * other commit the approver once signed.
 */
export function resolveApprovalSignals(
  records: readonly ApprovalRecordView[],
  addedBy?: ReadonlyMap<number, ApprovalCommitResolution>,
): ResolvedApproval[] {
  if (addedBy === undefined) return records.map((record) => ({ record }));
  return records.map((record) => {
    const resolution = addedBy.get(record.entryId);
    if (resolution === undefined) {
      return {
        record: { ...record, signalCommit: "" },
        problem: `approval entry ${record.entryId} is not committed; it counts only once a commit signed by the approver adds it`,
      };
    }
    if ("problem" in resolution) {
      return { record: { ...record, signalCommit: "" }, problem: resolution.problem };
    }
    if (record.signalCommit !== "" && record.signalCommit !== resolution.commit) {
      return {
        record: { ...record, signalCommit: "" },
        problem: `approval entry ${record.entryId} names signal commit ${record.signalCommit.slice(0, 12)} but was added by commit ${resolution.commit.slice(0, 12)}`,
      };
    }
    return { record: { ...record, signalCommit: resolution.commit } };
  });
}
