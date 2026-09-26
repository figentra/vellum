/**
 * @vellum/engine — Tests for Approval Verification
 */

import { describe, it, expect } from "vitest";
import {
  verifyApproval,
  countValidApprovals,
  hasRequiredApprovals,
  getApprovers,
  getRequiredApprovalCount,
  matchesApprover,
  diagnoseInvalidApproval,
} from "../verify.js";
import type {
  ApprovalPolicy,
  ApprovalPayload,
  GitCommit,
  RiskClass,
} from "@vellum/protocol";
import { brand } from "@vellum/protocol";

describe("Approval Verification", () => {
  // Mock policy
  const mockPolicy: ApprovalPolicy = {
    approvers: new Map([
      [
        "standard",
        new Map([
          ["requirements", ["alice@example.com", "bob@example.com"]],
          ["design", ["alice@example.com", "carol@example.com"]],
          ["tasks", ["alice@example.com"]],
        ]),
      ],
    ]),
    requiredCount: new Map([
      [
        "standard",
        new Map([
          ["requirements", 2],
          ["design", 1],
          ["tasks", 1],
        ]),
      ],
    ]),
  };

  // Mock Git commits
  const mockCommits = new Map<string, GitCommit>();

  mockCommits.set("a".repeat(40), {
    sha: brand<string, "CommitSha">("a".repeat(40)),
    author: { name: "Alice", email: "alice@example.com" },
    committer: { name: "Alice", email: "alice@example.com" },
    message: "Approve requirements",
    timestamp: "2026-09-26T10:00:00Z",
    signature: "-----BEGIN PGP SIGNATURE-----\n...\n-----END PGP SIGNATURE-----",
  });

  mockCommits.set("b".repeat(40), {
    sha: brand<string, "CommitSha">("b".repeat(40)),
    author: { name: "Bob", email: "bob@example.com" },
    committer: { name: "Bob", email: "bob@example.com" },
    message: "Approve requirements",
    timestamp: "2026-09-26T11:00:00Z",
    signature: "-----BEGIN PGP SIGNATURE-----\n...\n-----END PGP SIGNATURE-----",
  });

  mockCommits.set("c".repeat(40), {
    sha: brand<string, "CommitSha">("c".repeat(40)),
    author: { name: "Assistant", email: "assistant@ai.com" },
    committer: { name: "Assistant", email: "assistant@ai.com" },
    message: "Approve from assistant",
    timestamp: "2026-09-26T12:00:00Z",
    signature: "-----BEGIN PGP SIGNATURE-----\n...\n-----END PGP SIGNATURE-----",
    sessionMetadata: { isAssistant: true, assistantName: "Claude" },
  });

  mockCommits.set("d".repeat(40), {
    sha: brand<string, "CommitSha">("d".repeat(40)),
    author: { name: "Eve", email: "eve@example.com" },
    committer: { name: "Eve", email: "eve@example.com" },
    message: "Unsigned commit",
    timestamp: "2026-09-26T13:00:00Z",
  });

  describe("verifyApproval", () => {
    it("should accept valid approval", () => {
      const approval: ApprovalPayload = {
        approver: "alice@example.com",
        artifact: "requirements",
        artifactChecksum: brand<string, "Checksum">("a".repeat(64)),
        signalCommit: brand<string, "CommitSha">("a".repeat(40)),
      };

      const result = verifyApproval(approval, mockPolicy, "standard", mockCommits);
      expect(result.valid).toBe(true);
    });

    it("should reject unsigned commit", () => {
      const approval: ApprovalPayload = {
        approver: "eve@example.com",
        artifact: "requirements",
        artifactChecksum: brand<string, "Checksum">("a".repeat(64)),
        signalCommit: brand<string, "CommitSha">("d".repeat(40)),
      };

      const result = verifyApproval(approval, mockPolicy, "standard", mockCommits);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe("UNSIGNED_COMMIT");
      }
    });

    it("should reject approval from assistant", () => {
      const approval: ApprovalPayload = {
        approver: "assistant@ai.com",
        artifact: "requirements",
        artifactChecksum: brand<string, "Checksum">("a".repeat(64)),
        signalCommit: brand<string, "CommitSha">("c".repeat(40)),
      };

      const result = verifyApproval(approval, mockPolicy, "standard", mockCommits);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe("FROM_ASSISTANT");
      }
    });

    it("should reject unauthorized approver", () => {
      const approval: ApprovalPayload = {
        approver: "eve@example.com",
        artifact: "requirements",
        artifactChecksum: brand<string, "Checksum">("a".repeat(64)),
        signalCommit: brand<string, "CommitSha">("a".repeat(40)),
      };

      const result = verifyApproval(approval, mockPolicy, "standard", mockCommits);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe("NOT_AUTHORIZED");
      }
    });

    it("should reject with missing policy", () => {
      const approval: ApprovalPayload = {
        approver: "alice@example.com",
        artifact: "requirements",
        artifactChecksum: brand<string, "Checksum">("a".repeat(64)),
        signalCommit: brand<string, "CommitSha">("a".repeat(40)),
      };

      const result = verifyApproval(approval, null, "standard", mockCommits);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe("POLICY_MISSING");
      }
    });

    it("should reject with invalid signal commit", () => {
      const approval: ApprovalPayload = {
        approver: "alice@example.com",
        artifact: "requirements",
        artifactChecksum: brand<string, "Checksum">("a".repeat(64)),
        signalCommit: brand<string, "CommitSha">("z".repeat(40)),
      };

      const result = verifyApproval(approval, mockPolicy, "standard", mockCommits);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe("INVALID_SIGNAL");
      }
    });
  });

  describe("countValidApprovals", () => {
    it("should count valid approvals", () => {
      const approvals: ApprovalPayload[] = [
        {
          approver: "alice@example.com",
          artifact: "requirements",
          artifactChecksum: brand<string, "Checksum">("a".repeat(64)),
          signalCommit: brand<string, "CommitSha">("a".repeat(40)),
        },
        {
          approver: "bob@example.com",
          artifact: "requirements",
          artifactChecksum: brand<string, "Checksum">("a".repeat(64)),
          signalCommit: brand<string, "CommitSha">("b".repeat(40)),
        },
      ];

      const count = countValidApprovals(
        approvals,
        mockPolicy,
        "standard",
        "requirements",
        brand<string, "Checksum">("a".repeat(64)),
        mockCommits,
      );

      expect(count).toBe(2);
    });

    it("should not count invalidated approvals (checksum mismatch)", () => {
      const approvals: ApprovalPayload[] = [
        {
          approver: "alice@example.com",
          artifact: "requirements",
          artifactChecksum: brand<string, "Checksum">("old".padEnd(64, "0")),
          signalCommit: brand<string, "CommitSha">("a".repeat(40)),
        },
      ];

      const count = countValidApprovals(
        approvals,
        mockPolicy,
        "standard",
        "requirements",
        brand<string, "Checksum">("new".padEnd(64, "0")),
        mockCommits,
      );

      expect(count).toBe(0);
    });

    it("should not count duplicate approvers", () => {
      const approvals: ApprovalPayload[] = [
        {
          approver: "alice@example.com",
          artifact: "requirements",
          artifactChecksum: brand<string, "Checksum">("a".repeat(64)),
          signalCommit: brand<string, "CommitSha">("a".repeat(40)),
        },
        {
          approver: "alice@example.com",
          artifact: "requirements",
          artifactChecksum: brand<string, "Checksum">("a".repeat(64)),
          signalCommit: brand<string, "CommitSha">("a".repeat(40)),
        },
      ];

      const count = countValidApprovals(
        approvals,
        mockPolicy,
        "standard",
        "requirements",
        brand<string, "Checksum">("a".repeat(64)),
        mockCommits,
      );

      expect(count).toBe(1);
    });
  });

  describe("hasRequiredApprovals", () => {
    it("should return true when requirements met", () => {
      const approvals: ApprovalPayload[] = [
        {
          approver: "alice@example.com",
          artifact: "requirements",
          artifactChecksum: brand<string, "Checksum">("a".repeat(64)),
          signalCommit: brand<string, "CommitSha">("a".repeat(40)),
        },
        {
          approver: "bob@example.com",
          artifact: "requirements",
          artifactChecksum: brand<string, "Checksum">("a".repeat(64)),
          signalCommit: brand<string, "CommitSha">("b".repeat(40)),
        },
      ];

      const result = hasRequiredApprovals(
        approvals,
        mockPolicy,
        "standard",
        "requirements",
        brand<string, "Checksum">("a".repeat(64)),
        mockCommits,
      );

      expect(result.met).toBe(true);
      expect(result.count).toBe(2);
      expect(result.required).toBe(2);
    });

    it("should return false when requirements not met", () => {
      const approvals: ApprovalPayload[] = [
        {
          approver: "alice@example.com",
          artifact: "requirements",
          artifactChecksum: brand<string, "Checksum">("a".repeat(64)),
          signalCommit: brand<string, "CommitSha">("a".repeat(40)),
        },
      ];

      const result = hasRequiredApprovals(
        approvals,
        mockPolicy,
        "standard",
        "requirements",
        brand<string, "Checksum">("a".repeat(64)),
        mockCommits,
      );

      expect(result.met).toBe(false);
      expect(result.count).toBe(1);
      expect(result.required).toBe(2);
    });
  });

  describe("getApprovers", () => {
    it("should return approvers for risk class and artifact", () => {
      const approvers = getApprovers(mockPolicy, "standard", "requirements");
      expect(approvers).toContain("alice@example.com");
      expect(approvers).toContain("bob@example.com");
    });

    it("should return empty array for unknown risk class", () => {
      const approvers = getApprovers(mockPolicy, "critical" as RiskClass, "requirements");
      expect(approvers).toEqual([]);
    });
  });

  describe("getRequiredApprovalCount", () => {
    it("should return required count for risk class and artifact", () => {
      expect(getRequiredApprovalCount(mockPolicy, "standard", "requirements")).toBe(2);
      expect(getRequiredApprovalCount(mockPolicy, "standard", "design")).toBe(1);
    });
  });

  describe("matchesApprover", () => {
    it("should match exact strings", () => {
      expect(matchesApprover("alice@example.com", "alice@example.com")).toBe(true);
    });

    it("should match case-insensitively", () => {
      expect(matchesApprover("Alice@Example.com", "alice@example.com")).toBe(true);
    });
  });

  describe("diagnoseInvalidApproval", () => {
    it("should generate diagnostic for NOT_AUTHORIZED", () => {
      const approval: ApprovalPayload = {
        approver: "eve@example.com",
        artifact: "requirements",
        artifactChecksum: brand<string, "Checksum">("a".repeat(64)),
        signalCommit: brand<string, "CommitSha">("a".repeat(40)),
      };

      const diagnostic = diagnoseInvalidApproval(approval, {
        valid: false,
        reason: "NOT_AUTHORIZED",
      });
      expect(diagnostic).toContain("not authorized");
    });
  });
});
