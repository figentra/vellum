/**
 * strictVerify checks approvals against the current artifacts, under the
 * spec's risk class, and computes coverage rather than assuming it.
 */

import { describe, expect, it } from "vitest";
import { strictVerify } from "../strict.js";
import {
  allArtifacts,
  approvals,
  artifact,
  commits,
  verifiedLedger,
  policyFor,
  REQUIREMENTS,
  DESIGN,
  TASKS,
} from "./fixtures.js";

const policy = policyFor("standard");

describe("strictVerify", () => {
  it("passes a complete, approved, covered, evidenced spec", () => {
    const result = strictVerify(allArtifacts(), verifiedLedger(), policy, commits, "standard");

    expect(result.findings).toEqual([]);
    expect(result.result).toBe("PASS");
    expect(result.approvals).toEqual({ satisfied: 3, total: 3 });
    expect(result.criteria).toEqual({ satisfied: 2, total: 2 });
    expect(result.properties).toEqual({ satisfied: 2, total: 2 });
  });

  it("counts an approval whose artifact was only reformatted", () => {
    const reformatted = REQUIREMENTS.replace("| Term | Meaning |", "|Term|Meaning|").replace(
      /\n/g,
      "\r\n",
    );
    const result = strictVerify(
      allArtifacts({ requirements: reformatted }),
      verifiedLedger(),
      policy,
      commits,
      "standard",
    );

    expect(result.approvals).toEqual({ satisfied: 3, total: 3 });
    expect(result.findings).toEqual([]);
  });

  it("rejects an approval whose artifact content changed since", () => {
    const edited = REQUIREMENTS.replace("A folder", "A file");
    const result = strictVerify(
      allArtifacts({ requirements: edited }),
      verifiedLedger(),
      policy,
      commits,
      "standard",
    );

    expect(result.result).toBe("FAIL");
    expect(result.approvals).toEqual({ satisfied: 2, total: 3 });
    expect(result.findings.map((f) => f.message)).toEqual(["Approval invalid: CHECKSUM_MISMATCH"]);
  });

  it("reports missing artifacts and approvals of them", () => {
    const result = strictVerify(
      [artifact("design", DESIGN), artifact("tasks", TASKS)],
      verifiedLedger(),
      policy,
      commits,
      "standard",
    );

    expect(result.result).toBe("FAIL");
    expect(result.findings.map((f) => f.message)).toEqual([
      "requirements.md is missing",
      "Approval invalid: approved artifact requirements.md is not present",
    ]);
  });

  it("fails when a criterion is covered by no task", () => {
    const uncovered = TASKS.replace(" <!-- criteria: 1.2 -->", "");
    const result = strictVerify(
      allArtifacts({ tasks: uncovered }),
      [],
      policy,
      commits,
      "standard",
    );

    expect(result.result).toBe("FAIL");
    expect(result.criteria).toEqual({ satisfied: 1, total: 2 });
    expect(result.findings.map((f) => f.message)).toContain("Criterion 1.2 is covered by no task");
  });

  it("fails when a property is cited by no task", () => {
    const uncited = TASKS.replace(" <!-- properties: P2 -->", "");
    const result = strictVerify(allArtifacts({ tasks: uncited }), [], policy, commits, "standard");

    expect(result.properties).toEqual({ satisfied: 1, total: 2 });
    expect(result.findings.map((f) => f.message)).toContain("Property P2 is cited by no task");
  });

  it("verifies approvals under the spec's risk class, not a fixed one", () => {
    const highOnly = policyFor("high");

    const high = strictVerify(allArtifacts(), approvals(), highOnly, commits, "high");
    const standard = strictVerify(allArtifacts(), approvals(), highOnly, commits, "standard");

    expect(high.approvals).toEqual({ satisfied: 3, total: 3 });
    expect(standard.approvals).toEqual({ satisfied: 0, total: 3 });
  });
});
