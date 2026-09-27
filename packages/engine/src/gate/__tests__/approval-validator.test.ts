/**
 * Tests for the gate approval validator.
 * @see requirements.md Requirement 6.1
 */

import { describe, it, expect } from "vitest";
import { parseChecksum, parseCommitSha } from "@vellum/protocol";
import type {
  ApprovalPayload,
  ApprovalPolicy,
  ArtifactKind,
  Checksum,
  CommitSha,
  GitCommit,
} from "@vellum/protocol";
import {
  isApprovalStale,
  validateApproval,
  validateApprovals,
  type ApprovalValidationContext,
} from "../validation/approval-validator";

const sha = parseCommitSha("a".repeat(40)) as CommitSha;
const checksum = parseChecksum("b".repeat(64)) as Checksum;
const ALICE_KEY = "AAAA".repeat(10);
const MALLORY_KEY = "CCCC".repeat(10);

const approval: ApprovalPayload = {
  approver: "alice@example.com",
  artifact: "requirements",
  artifactChecksum: checksum,
  signalCommit: sha,
};

const policy: ApprovalPolicy = {
  approvers: new Map([["standard", new Map([["requirements", ["alice@example.com"]]])]]),
  requiredCount: new Map([["standard", new Map([["requirements", 1]])]]),
  identities: [
    {
      identity: "alice@example.com",
      keys: [{ type: "gpg", fingerprint: ALICE_KEY, publicKey: "-----BEGIN PGP-----" }],
    },
  ],
};

function commit(overrides: Partial<GitCommit> = {}): ReadonlyMap<string, GitCommit> {
  const base: GitCommit = {
    sha,
    author: { name: "Alice", email: "alice@example.com" },
    committer: { name: "Alice", email: "alice@example.com" },
    message: "approve: requirements",
    timestamp: "2026-09-26T00:00:00Z",
    signature: "sig",
    signer: { type: "gpg", fingerprint: ALICE_KEY },
  };
  return new Map([[sha, { ...base, ...overrides }]]);
}

function context(overrides: Partial<ApprovalValidationContext> = {}): ApprovalValidationContext {
  return {
    policy,
    riskClass: "standard",
    commits: commit(),
    currentChecksums: new Map<ArtifactKind, Checksum>([["requirements", checksum]]),
    ...overrides,
  };
}

describe("validateApproval", () => {
  it("accepts an authorised human approval signed by the approver's policy key", () => {
    expect(validateApproval(approval, context())).toEqual({ valid: true, errors: [] });
  });

  it("rejects a signature that verified against no policy key (criterion 7.3)", () => {
    // A signature string alone — no `signer` — is a signature nobody in the policy made
    const { signer: _omit, ...signatureOnly } = [...commit().values()][0] as GitCommit;
    const result = validateApproval(
      approval,
      context({ commits: new Map([[sha, signatureOnly]]) }),
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("SIGNER_NOT_AUTHORIZED");
  });

  it("rejects a signature by a key the policy does not list for the approver", () => {
    const result = validateApproval(
      approval,
      context({ commits: commit({ signer: { type: "gpg", fingerprint: MALLORY_KEY } }) }),
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("SIGNER_NOT_AUTHORIZED");
  });

  it("rejects an approval whose signal commit is from an assistant session", () => {
    const result = validateApproval(
      approval,
      context({ commits: commit({ sessionMetadata: { isAssistant: true } }) }),
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("FROM_ASSISTANT");
  });

  it("rejects an unauthorized approver", () => {
    const nobody: ApprovalPolicy = {
      ...policy,
      approvers: new Map([["standard", new Map([["requirements", []]])]]),
    };
    const result = validateApproval(approval, context({ policy: nobody }));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/not authorized/);
  });

  it("rejects an unsigned signal commit", () => {
    const { signature: _s, signer: _k, ...unsigned } = [...commit().values()][0] as GitCommit;
    const result = validateApproval(approval, context({ commits: new Map([[sha, unsigned]]) }));
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("UNSIGNED_COMMIT");
  });

  it("rejects an approval whose signal commit is missing", () => {
    const result = validateApproval(approval, context({ commits: new Map() }));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/not found/);
  });

  it("rejects an approval that binds an old checksum", () => {
    const edited = parseChecksum("d".repeat(64)) as Checksum;
    const result = validateApproval(
      approval,
      context({ currentChecksums: new Map<ArtifactKind, Checksum>([["requirements", edited]]) }),
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("CHECKSUM_MISMATCH");
  });

  it("rejects every approval when the policy is missing", () => {
    const result = validateApproval(approval, context({ policy: null }));
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("POLICY_MISSING");
  });

  it("does not accept an approval of an artifact that is not present", () => {
    const result = validateApproval(approval, context({ currentChecksums: new Map() }));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/not present/);
  });

  it("does not count an approval of an older checksum as an error once the current text is re-approved", () => {
    const older = { ...approval, artifactChecksum: parseChecksum("c".repeat(64)) as Checksum };
    expect(validateApprovals([older, approval], context())).toEqual({ valid: true, errors: [] });
    const alone = validateApprovals([older], context());
    expect(alone.valid).toBe(false);
    expect(alone.errors).toHaveLength(1);
  });

  it("aggregates errors across approvals", () => {
    const result = validateApprovals([approval, approval], context({ policy: null }));
    expect(result.errors).toHaveLength(2);
  });
});

describe("isApprovalStale", () => {
  it("is stale only when the checksum differs", () => {
    expect(isApprovalStale(approval, checksum)).toBe(false);
    expect(isApprovalStale(approval, "c".repeat(64))).toBe(true);
  });
});
