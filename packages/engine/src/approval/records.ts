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
