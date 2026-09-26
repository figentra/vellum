/**
 * Tests for the gate approval validator.
 * @see requirements.md Requirement 6.1
 */

import { describe, it, expect } from "vitest";
import { parseChecksum, parseCommitSha } from "@vellum/protocol";
import type { ApprovalPayload, Checksum, CommitSha, GitCommit } from "@vellum/protocol";
import { isApprovalStale, validateApproval, validateApprovals } from "../validation/approval-validator";

const sha = parseCommitSha("a".repeat(40)) as CommitSha;
const checksum = parseChecksum("b".repeat(64)) as Checksum;

const approval: ApprovalPayload = {
  approver: "alice@example.com",
  artifact: "requirements",
  artifactChecksum: checksum,
  signalCommit: sha,
};

function commit(overrides: Partial<GitCommit> = {}): ReadonlyMap<string, GitCommit> {
  const base: GitCommit = {
    sha,
    author: { name: "Alice", email: "alice@example.com" },
    committer: { name: "Alice", email: "alice@example.com" },
    message: "approve: requirements",
    timestamp: "2026-09-26T00:00:00Z",
    signature: "sig",
  };
  return new Map([[sha, { ...base, ...overrides }]]);
}

const policy = { requiresSignedCommits: true, authorizedApprovers: ["alice@example.com"] };

describe("validateApproval", () => {
  it("accepts an authorized, signed, human approval", () => {
    expect(validateApproval(approval, policy, commit())).toEqual({ valid: true, errors: [] });
  });

  it("rejects an approval whose signal commit is from an assistant session", () => {
    const result = validateApproval(approval, policy, commit({ sessionMetadata: { isAssistant: true } }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Assistant sessions cannot approve artifacts");
  });

  it("rejects an unauthorized approver", () => {
    const result = validateApproval(approval, { ...policy, authorizedApprovers: [] }, commit());
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Approver alice@example.com is not authorized");
  });

  it("rejects an unsigned signal commit when the policy requires signing", () => {
    const { signature: _omit, ...unsigned } = [...commit().values()][0] as GitCommit;
    const result = validateApproval(approval, policy, new Map([[sha, unsigned]]));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/is not signed/);
  });

  it("rejects an approval whose signal commit is missing", () => {
    const result = validateApproval(approval, policy, new Map());
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/not found/);
  });

  it("aggregates errors across approvals", () => {
    const result = validateApprovals([approval, approval], { ...policy, authorizedApprovers: [] }, commit());
    expect(result.errors).toHaveLength(2);
  });
});

describe("isApprovalStale", () => {
  it("is stale only when the checksum differs", () => {
    expect(isApprovalStale(approval, checksum)).toBe(false);
    expect(isApprovalStale(approval, "c".repeat(64))).toBe(true);
  });
});
