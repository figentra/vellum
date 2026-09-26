/**
 * strictVerify checks approvals against the current artifacts, under the
 * spec's risk class, and computes coverage rather than assuming it.
 */

import { describe, expect, it } from "vitest";
import type { LedgerEntry } from "@vellum/protocol";
import { strictVerify } from "../strict.js";
import {
  allArtifacts,
  approvals,
  artifact,
  chain,
  commits,
  evidenceEntry,
  SIGNAL,
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
    expect(result.findings.map((f) => f.message)).toEqual([
      "Approval invalid: CHECKSUM_MISMATCH",
      "requirements.md has 0 of the 1 valid approvals the policy requires",
    ]);
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

describe("strictVerify — required tasks and evidence (criteria 12.4, 9.9)", () => {
  it("fails a required task with no passing evidence, naming it", () => {
    const ledger = chain([...approvals(), evidenceEntry("1")]);
    const result = strictVerify(allArtifacts(), ledger, policy, commits, "standard");

    expect(result.result).toBe("FAIL");
    expect(result.tasks).toEqual({ satisfied: 1, total: 2 });
    expect(result.findings.map((f) => f.message)).toEqual([
      "Task 2 has no Evidence Entry with exit status 0",
    ]);
  });

  it("does not fail on a failed attempt that a later passing attempt follows", () => {
    const ledger = chain([
      ...approvals(),
      evidenceEntry("1", 1),
      evidenceEntry("1"),
      evidenceEntry("2"),
    ]);
    const result = strictVerify(allArtifacts(), ledger, policy, commits, "standard");

    expect(result.findings).toEqual([]);
    expect(result.evidence).toEqual({ satisfied: 2, total: 3 });
  });

  it("does not count evidence at a commit outside the verified history", () => {
    const result = strictVerify(allArtifacts(), verifiedLedger(), policy, commits, "standard", {
      verifiedHistory: new Set(["d".repeat(40)]),
    });

    expect(result.result).toBe("FAIL");
    expect(result.tasks).toEqual({ satisfied: 0, total: 2 });
    expect(result.findings.map((f) => f.rule)).toContain("EVIDENCE_COMMIT_UNKNOWN");
  });
});

describe("strictVerify — the Approval Signal is the commit that added the entry", () => {
  const signalless = (): LedgerEntry[] =>
    chain(
      approvals().map(
        (entry) =>
          ({
            ...entry,
            approval_signal: { commit: null, message_prefix: "approve:" },
          }) as unknown as LedgerEntry,
      ),
    );

  it("counts an approval whose adding commit is signed by the approver", () => {
    const ledger = chain([...signalless(), evidenceEntry("1"), evidenceEntry("2")]);
    const addedBy = new Map([1, 2, 3].map((id) => [id, { commit: SIGNAL }] as const));
    const result = strictVerify(allArtifacts(), ledger, policy, commits, "standard", {
      approvalCommits: addedBy,
    });

    expect(result.findings).toEqual([]);
    expect(result.approvals).toEqual({ satisfied: 3, total: 3 });
  });

  it("rejects an approval that is not committed yet", () => {
    const result = strictVerify(allArtifacts(), signalless(), policy, commits, "standard", {
      approvalCommits: new Map(),
    });

    expect(result.approvals).toEqual({ satisfied: 0, total: 3 });
    expect(result.findings.filter((f) => f.rule === "APPROVAL_INVALID")).toHaveLength(3);
    expect(result.findings[0]?.message).toMatch(/not committed/);
  });

  it("rejects an entry that names a signal commit other than the one that added it", () => {
    const addedBy = new Map([1, 2, 3].map((id) => [id, { commit: "e".repeat(40) }] as const));
    const result = strictVerify(allArtifacts(), approvals(), policy, commits, "standard", {
      approvalCommits: addedBy,
    });

    expect(result.approvals.satisfied).toBe(0);
    expect(result.findings[0]?.message).toMatch(/names signal commit/);
  });

  it("reports the storage layer's reason when the adding commit is unsuitable", () => {
    const addedBy = new Map([
      [1, { problem: "commit x changed files other than the ledger" }],
    ] as const);
    const result = strictVerify(allArtifacts(), signalless(), policy, commits, "standard", {
      approvalCommits: addedBy,
    });

    expect(result.findings[0]?.message).toBe(
      "Approval invalid: commit x changed files other than the ledger",
    );
  });
});

describe("strictVerify — ledger tail", () => {
  it("fails when the Ledger Head records entries the ledger no longer has", () => {
    const ledger = verifiedLedger();
    const head = { last_id: ledger.length + 1, last_digest: "0".repeat(64) };
    const result = strictVerify(allArtifacts(), ledger, policy, commits, "standard", {
      ledgerHead: head,
    });

    expect(result.result).toBe("FAIL");
    expect(result.findings.map((f) => f.rule)).toEqual(["LEDGER_INTEGRITY"]);
  });
});

describe("strictVerify — approvals the policy requires (criterion 12.5)", () => {
  it("fails a spec that holds none of the approvals the policy requires", () => {
    const ledger = chain([evidenceEntry("1"), evidenceEntry("2")]);
    const result = strictVerify(allArtifacts(), ledger, policyFor("standard"), commits, "standard");

    expect(result.result).toBe("FAIL");
    expect(
      result.findings.filter((f) => f.rule === "APPROVAL_REQUIRED").map((f) => f.file),
    ).toEqual(["requirements.md", "design.md", "tasks.md"]);
  });

  it("fails every artifact when the policy is missing", () => {
    const result = strictVerify(allArtifacts(), verifiedLedger(), null, commits, "standard");

    expect(result.result).toBe("FAIL");
    expect(result.findings.some((f) => f.rule === "APPROVAL_REQUIRED")).toBe(true);
  });
});
