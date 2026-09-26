/**
 * computeStatusReport counts only valid approvals and evidenced required
 * tasks, and does not claim an Effective Lifecycle State it did not compute.
 */

import { describe, expect, it } from "vitest";
import type { GitCommit } from "@vellum/protocol";
import { computeStatusReport, formatStatusHuman } from "../reporter.js";
import {
  allArtifacts,
  approvals,
  chain,
  commits,
  evidenceEntry,
  policyFor,
  REQUIREMENTS,
  verifiedLedger,
} from "../../verify/__tests__/fixtures.js";

const base = {
  specId: "001-x",
  recordedState: "IN_PROGRESS" as const,
  policy: policyFor("standard"),
  riskClass: "standard" as const,
  gitCommits: commits,
};

describe("computeStatusReport", () => {
  it("reports valid approvals, verified tasks and an intact ledger", () => {
    const report = computeStatusReport({
      ...base,
      artifacts: allArtifacts(),
      ledger: verifiedLedger(),
    });

    expect(report.effectiveState).toBeNull();
    expect(report.approvals.requirements).toEqual({ current: 1, required: 1, complete: true });
    expect(report.verification).toEqual({ required: 2, completed: 2, failed: 0, complete: true });
    expect(report.ledger).toEqual({ entries: 5, valid: true, failures: [] });
  });

  it("does not count an approval whose signal commit is unsigned by a policy key", () => {
    const unsigned = new Map<string, GitCommit>(
      [...commits].map(([sha, commit]) => {
        const { signer: _drop, ...rest } = commit;
        return [sha, rest];
      }),
    );
    const report = computeStatusReport({
      ...base,
      gitCommits: unsigned,
      artifacts: allArtifacts(),
      ledger: approvals(),
    });

    expect(report.approvals.requirements).toEqual({ current: 0, required: 1, complete: false });
  });

  it("does not count an approval of content that changed since", () => {
    const report = computeStatusReport({
      ...base,
      artifacts: allArtifacts({ requirements: REQUIREMENTS.replace("A folder", "A file") }),
      ledger: approvals(),
    });

    expect(report.approvals.requirements.current).toBe(0);
    expect(report.approvals.design.current).toBe(1);
  });

  it("counts failed attempts separately from verified tasks", () => {
    const report = computeStatusReport({
      ...base,
      artifacts: allArtifacts(),
      ledger: chain([...approvals(), evidenceEntry("1", 2)]),
    });

    expect(report.verification).toEqual({ required: 2, completed: 0, failed: 1, complete: false });
  });

  it("says in human output that the effective state is not computed", () => {
    const text = formatStatusHuman(
      computeStatusReport({ ...base, artifacts: allArtifacts(), ledger: [] }),
    );
    expect(text).toContain("Effective state: not computed");
    expect(text).toContain("Tasks verified: 0/2");
  });
});
