/**
 * Tests for merge gate.
 * @see requirements.md Requirements 6.1-6.5
 */

import { describe, it, expect } from "vitest";
import type { GitCommit } from "@vellum/protocol";
import { MergeGate, type MergeGateInputs } from "../merge-gate";
import {
  allArtifacts,
  commits,
  policyFor,
  verifiedLedger,
  SIGNAL,
} from "../../verify/__tests__/fixtures";

const standard = { spec_slug: "001-x", risk_class: "standard" as const };
const critical = { spec_slug: "001-x", risk_class: "critical" as const };

function inputs(
  riskClass: "standard" | "critical",
  overrides: Partial<MergeGateInputs> = {},
): MergeGateInputs {
  return {
    spec: {
      artifacts: allArtifacts(),
      ledger: verifiedLedger(),
      policy: policyFor(riskClass),
      gitCommits: commits,
    },
    requiredGates: [],
    changesets: { required: false },
    automatedMergePermitted: true,
    ...overrides,
  };
}

describe("merge gate", () => {
  it("is inconclusive, not passing, when given nothing to check", async () => {
    const result = await new MergeGate(standard).evaluate();

    expect(result.gate_id).toBe("merge-gate");
    expect(result.status).toBe("inconclusive");
    expect(result.findings).toEqual([]);
    expect(result.not_checked.length).toBeGreaterThan(0);
  });

  it("finds nothing wrong with a verified, approved spec — and still does not claim the unimplemented documentation check", async () => {
    const result = await new MergeGate(standard, inputs("standard")).evaluate();

    expect(result.findings).toEqual([]);
    expect(result.not_checked.map((n) => n.check)).toEqual(["documentation check (criterion 6.1)"]);
    expect(result.status).toBe("inconclusive");
  });

  it("requires approvals", async () => {
    const ledger = verifiedLedger().filter((e) => e.kind !== "approval");
    const result = await new MergeGate(
      standard,
      inputs("standard", {
        spec: {
          artifacts: allArtifacts(),
          ledger,
          policy: policyFor("standard"),
          gitCommits: commits,
        },
      }),
    ).evaluate();

    expect(result.status).toBe("fail");
    expect(result.findings.map((f) => f.rule_id)).toContain("MERGE_GATE_INVALID_APPROVAL");
  });

  it("requires each required task to have succeeded", async () => {
    const ledger = verifiedLedger().filter((e) => e.kind !== "evidence");
    const result = await new MergeGate(
      standard,
      inputs("standard", {
        spec: {
          artifacts: allArtifacts(),
          ledger,
          policy: policyFor("standard"),
          gitCommits: commits,
        },
      }),
    ).evaluate();

    expect(result.findings.map((f) => f.rule_id)).toContain("MERGE_GATE_TASK_NOT_SUCCEEDED");
    expect(result.findings.map((f) => f.rule_id)).toContain("MERGE_GATE_STRICT_VERIFIER_FAIL");
  });

  it("requires each Policy-required gate to have a passing result", async () => {
    const result = await new MergeGate(
      standard,
      inputs("standard", { requiredGates: ["security"] }),
    ).evaluate();

    expect(result.findings.map((f) => f.rule_id)).toContain("MERGE_GATE_REQUIRED_GATE_MISSING");
  });

  it("requires merge authorisation for a risk class without automated merge", async () => {
    const result = await new MergeGate(
      critical,
      inputs("critical", { automatedMergePermitted: false, authorisation: null }),
    ).evaluate();

    expect(result.status).toBe("fail");
    expect(result.findings.map((f) => f.rule_id)).toContain("MERGE_GATE_NO_AUTHORISATION");
  });

  it("accepts a merge authorisation signed by the approver's policy key", async () => {
    const result = await new MergeGate(
      critical,
      inputs("critical", {
        automatedMergePermitted: false,
        authorisation: { approver: "alice@example.com", signalCommit: SIGNAL },
      }),
    ).evaluate();

    expect(result.findings.map((f) => f.rule_id)).not.toContain("MERGE_GATE_NO_AUTHORISATION");
  });

  it("rejects a merge authorisation whose commit no policy key signed", async () => {
    const unsigned = new Map<string, GitCommit>([
      [SIGNAL, { ...commits.get(SIGNAL)!, signer: undefined } as unknown as GitCommit],
    ]);
    const base = inputs("critical");
    const result = await new MergeGate(critical, {
      ...base,
      spec: { ...base.spec!, gitCommits: unsigned },
      automatedMergePermitted: false,
      authorisation: { approver: "alice@example.com", signalCommit: SIGNAL },
    }).evaluate();

    expect(result.findings.map((f) => f.rule_id)).toContain("MERGE_GATE_NO_AUTHORISATION");
  });
});
