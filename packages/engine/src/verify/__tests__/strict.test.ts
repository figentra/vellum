/**
 * strictVerify checks each approval against the current artifact's checksum.
 */

import { describe, expect, it } from "vitest";
import type { ApprovalPolicy, Artifact, GitCommit, LedgerEntry } from "@vellum/protocol";
import { brand, computeChecksum } from "@vellum/protocol";
import { strictVerify } from "../strict.js";

const APPROVED_BODY = "# Requirements\n\n| Term | Meaning |\n| --- | --- |\n| Spec | A folder |\n";
const SIGNAL = "a".repeat(40);

const policy: ApprovalPolicy = {
  approvers: new Map([["standard", new Map([["requirements", ["alice@example.com"]]])]]),
  requiredCount: new Map([["standard", new Map([["requirements", 1]])]]),
};
const commits = new Map<string, GitCommit>([
  [
    SIGNAL,
    {
      sha: brand<string, "CommitSha">(SIGNAL),
      author: { name: "Alice", email: "alice@example.com" },
      committer: { name: "Alice", email: "alice@example.com" },
      message: "approve: requirements",
      timestamp: "2026-09-26T10:00:00Z",
      signature: "-----BEGIN SSH SIGNATURE-----",
    },
  ],
]);

const approval = {
  kind: "approval",
  id: 1,
  predecessor_digest: null,
  timestamp: "2026-09-26T10:00:00Z",
  artifact: "requirements.md",
  artifact_version: 1,
  artifact_checksum: computeChecksum(APPROVED_BODY),
  identity: "alice@example.com",
  identity_key: "SHA256:alice",
  session_type: "human",
  approval_signal: { commit: SIGNAL, message_prefix: "approve:" },
} as unknown as LedgerEntry;

const artifact = (body: string): Artifact => ({
  kind: "requirements",
  path: "/repo/.agents/specs/001-x/requirements.md",
  body,
  frontmatter: {
    version: 1,
    checksum: computeChecksum(body),
    state: "IN_REVIEW",
    createdAt: "2026-09-26T09:00:00Z",
    updatedAt: "2026-09-26T09:00:00Z",
  },
});

describe("strictVerify approvals", () => {
  it("counts an approval whose artifact was only reformatted", () => {
    const reformatted = APPROVED_BODY.replace("| Term | Meaning |", "|Term|Meaning|").replace(
      /\n/g,
      "\r\n",
    );
    const result = strictVerify([artifact(reformatted)], [approval], policy, commits);

    expect(result.approvals).toEqual({ satisfied: 1, total: 1 });
    expect(result.findings).toEqual([]);
  });

  it("rejects an approval whose artifact content changed since", () => {
    const edited = APPROVED_BODY.replace("A folder", "A file");
    const result = strictVerify([artifact(edited)], [approval], policy, commits);

    expect(result.result).toBe("FAIL");
    expect(result.approvals).toEqual({ satisfied: 0, total: 1 });
    expect(result.findings.map((f) => f.message)).toEqual(["Approval invalid: CHECKSUM_MISMATCH"]);
  });

  it("rejects an approval whose artifact is not supplied", () => {
    const result = strictVerify([], [approval], policy, commits);

    expect(result.approvals).toEqual({ satisfied: 0, total: 1 });
    expect(result.findings.map((f) => f.message)).toEqual([
      "Approval invalid: approved artifact requirements.md is not present",
    ]);
  });
});
