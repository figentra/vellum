/**
 * Tests for review gate.
 * @see requirements.md Requirements 5.1-5.4
 */

import { describe, it, expect } from "vitest";
import { computeChecksum } from "@vellum/protocol";
import { ReviewGate } from "../review-gate";
import {
  allArtifacts,
  approvals,
  artifact,
  commits,
  policyFor,
  DESIGN,
} from "../../verify/__tests__/fixtures";

const options = { spec_slug: "001-x", risk_class: "standard" as const };
const approvalInputs = { ledger: approvals(), policy: policyFor("standard"), gitCommits: commits };

describe("review gate", () => {
  it("is inconclusive, not passing, when given nothing to review", async () => {
    const result = await new ReviewGate("requirements", options).evaluate();

    expect(result.gate_id).toBe("requirements-review");
    expect(result.status).toBe("inconclusive");
    expect(result.not_checked.map((n) => n.check)).toEqual([
      "quality checks (criterion 5.1)",
      "required approvals (criterion 5.3)",
    ]);
    expect(result.artifact_version).toBeNull();
    expect(result.artifact_checksum).toBeNull();
  });

  it("binds to the artifact's version and current checksum", async () => {
    const result = await new ReviewGate("design", options, {
      artifacts: allArtifacts(),
      approvals: approvalInputs,
    }).evaluate();

    expect(result.artifact_version).toBe(1);
    expect(result.artifact_checksum).toBe(computeChecksum(DESIGN));
  });

  it("fails when the artifact lacks its required approvals", async () => {
    const result = await new ReviewGate("design", options, {
      artifacts: allArtifacts(),
      approvals: { ...approvalInputs, ledger: [] },
    }).evaluate();

    expect(result.status).toBe("fail");
    expect(result.findings.map((f) => f.rule_id)).toContain("MISSING_APPROVAL");
  });

  it("fails when the artifact changed after its approval", async () => {
    const edited = [
      ...allArtifacts().filter((a) => a.kind !== "design"),
      artifact("design", `${DESIGN}\nAn edit after approval.\n`),
    ];
    const result = await new ReviewGate("design", options, {
      artifacts: edited,
      approvals: approvalInputs,
    }).evaluate();

    expect(result.findings.map((f) => f.rule_id)).toContain("MISSING_APPROVAL");
  });

  it("does not report a missing approval for an approved, current artifact", async () => {
    const result = await new ReviewGate("design", options, {
      artifacts: allArtifacts(),
      approvals: approvalInputs,
    }).evaluate();

    expect(result.findings.map((f) => f.rule_id)).not.toContain("MISSING_APPROVAL");
  });

  it("is inconclusive when the approvals were not supplied", async () => {
    const result = await new ReviewGate("design", options, {
      artifacts: allArtifacts(),
    }).evaluate();

    expect(result.status === "inconclusive" || result.status === "fail").toBe(true);
    expect(result.not_checked.map((n) => n.check)).toContain("required approvals (criterion 5.3)");
  });
});
