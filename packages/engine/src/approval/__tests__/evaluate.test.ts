/**
 * @vellum/engine — evaluateApprovals: an approval bound to an older checksum
 * is history once the current text is approved again, and a finding until it is.
 */

import { describe, expect, it } from "vitest";
import type { ApprovalPolicy, ArtifactKind, Checksum, GitCommit } from "@vellum/protocol";
import { brand } from "@vellum/protocol";
import { evaluateApprovals } from "../evaluate.js";

const OLD = brand<string, "Checksum">("0".repeat(64));
const NEW = brand<string, "Checksum">("1".repeat(64));

function policy(required: number): ApprovalPolicy {
  return {
    approvers: new Map([
      ["standard", new Map([["requirements", ["alice@example.com", "bob@example.com"]]])],
    ]),
    requiredCount: new Map([["standard", new Map([["requirements", required]])]]),
    identities: [
      {
        identity: "alice@example.com",
        keys: [{ type: "ssh", fingerprint: "SHA256:alice", publicKey: "k" }],
      },
      {
        identity: "bob@example.com",
        keys: [{ type: "ssh", fingerprint: "SHA256:bob", publicKey: "k" }],
      },
    ],
  };
}

function signal(sha: string, who: "alice" | "bob"): [string, GitCommit] {
  return [
    sha,
    {
      sha: brand<string, "CommitSha">(sha),
      author: { name: who, email: `${who}@example.com` },
      committer: { name: who, email: `${who}@example.com` },
      message: "approve:",
      timestamp: "2026-09-26T10:00:00Z",
      signature: "sig",
      signer: { type: "ssh", fingerprint: `SHA256:${who}` },
    },
  ];
}

const commits = new Map<string, GitCommit>([
  signal("a1", "alice"),
  signal("a2", "alice"),
  signal("b1", "bob"),
]);

function record(approver: string, checksum: Checksum, signalCommit: string) {
  return {
    approver,
    artifact: "requirements" as ArtifactKind,
    artifactChecksum: checksum,
    signalCommit,
  };
}

const current = new Map<ArtifactKind, Checksum>([["requirements", NEW]]);

describe("evaluateApprovals", () => {
  it("supersedes the old approval once the current text holds the required approvals", () => {
    const result = evaluateApprovals(
      [record("alice@example.com", OLD, "a1"), record("alice@example.com", NEW, "a2")],
      policy(1),
      "standard",
      commits,
      current,
    );
    expect(result.records.map((r) => r.standing.kind)).toEqual(["superseded", "valid"]);
    expect(result.artifacts.get("requirements")).toEqual({ met: true, count: 1, required: 1 });
  });

  it("reports an old approval as invalidated, with both checksums, while nothing replaces it", () => {
    const result = evaluateApprovals(
      [record("alice@example.com", OLD, "a1")],
      policy(1),
      "standard",
      commits,
      current,
    );
    expect(result.records[0]!.standing).toEqual({
      kind: "invalidated",
      approvedChecksum: OLD,
      currentChecksum: NEW,
    });
    expect(result.artifacts.get("requirements")).toEqual({ met: false, count: 0, required: 1 });
  });

  it("with two required: the approver who re-approved is history, the one who did not is a finding", () => {
    const result = evaluateApprovals(
      [
        record("alice@example.com", OLD, "a1"),
        record("bob@example.com", OLD, "b1"),
        record("Alice@Example.com", NEW, "a2"),
      ],
      policy(2),
      "standard",
      commits,
      current,
    );
    expect(result.records.map((r) => r.standing.kind)).toEqual([
      "superseded",
      "invalidated",
      "valid",
    ]);
    expect(result.artifacts.get("requirements")).toEqual({ met: false, count: 1, required: 2 });
  });

  it("never supersedes an approval rejected for anything but its checksum", () => {
    const result = evaluateApprovals(
      [record("alice@example.com", OLD, "missing"), record("alice@example.com", NEW, "a2")],
      policy(1),
      "standard",
      commits,
      current,
    );
    expect(result.records[0]!.standing).toEqual({ kind: "rejected", reason: "INVALID_SIGNAL" });
  });

  it("reports an approval of an artifact that is not present", () => {
    const result = evaluateApprovals(
      [record("alice@example.com", NEW, "a2")],
      policy(1),
      "standard",
      commits,
      new Map(),
    );
    expect(result.records[0]!.standing).toEqual({ kind: "artifact-missing" });
    expect(result.artifacts.size).toBe(0);
  });
});
