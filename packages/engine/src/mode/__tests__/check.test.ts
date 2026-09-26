/**
 * Tests for Check Mode (criteria 6.6-6.12).
 */

import { describe, expect, it } from "vitest";
import type { LedgerEntry, LedgerHead } from "@vellum/protocol";
import { computeLedgerEntryDigest } from "@vellum/protocol";
import { runCheckMode, formatCheckResult, type CheckModeSpec } from "../check";
import {
  allArtifacts,
  approvals,
  commits,
  policyFor,
  verifiedLedger,
} from "../../verify/__tests__/fixtures";

function headOf(ledger: readonly LedgerEntry[]): LedgerHead | null {
  const last = ledger[ledger.length - 1];
  return last ? { last_id: last.id, last_digest: computeLedgerEntryDigest(last) } : null;
}

function spec(overrides: Partial<CheckModeSpec> = {}): CheckModeSpec {
  const ledger = overrides.ledger ?? verifiedLedger();
  return {
    id: "001-x",
    artifacts: allArtifacts(),
    ledger,
    ledgerHead: headOf(ledger),
    recordedState: "VERIFICATION",
    policy: policyFor("standard"),
    riskClass: "standard",
    gitCommits: commits,
    ...overrides,
  };
}

describe("runCheckMode", () => {
  it("passes a spec whose recorded state its content supports (criterion 6.7)", () => {
    const result = runCheckMode([spec()]);
    expect(result.exitStatus).toBe(0);
    expect(result.findings).toEqual([]);
  });

  it("passes a spec still in review, without asking it for evidence", () => {
    const result = runCheckMode([
      spec({ ledger: [], ledgerHead: null, recordedState: "IN_REVIEW" }),
    ]);
    expect(result.exitStatus).toBe(0);
  });

  it("fails a spec whose recorded state is ahead of its content, naming both states and the precondition (6.10)", () => {
    const result = runCheckMode([
      spec({ ledger: approvals(), ledgerHead: headOf(approvals()), recordedState: "IN_PROGRESS" }),
    ]);
    expect(result.exitStatus).toBe(1);
    expect(result.summary.stateMismatches).toBe(1);
    const message = result.findings.find((f) => f.rule === "STATE_MISMATCH")?.message ?? "";
    expect(message).toContain("records IN_PROGRESS");
    expect(message).toContain("effective state is PLAN_APPROVED");
    expect(message).toContain("no task has been dispatched");
  });

  it("fails an INVALID spec, naming it and the reason (6.8)", () => {
    const result = runCheckMode([spec({ recordedState: "SHIPPED" })]);
    expect(result.exitStatus).toBe(1);
    expect(result.summary.invalidStates).toBe(1);
    expect(result.findings[0]?.message).toContain("SHIPPED");
  });

  it("fails a ledger whose last entry was edited, naming the entry (6.9)", () => {
    const ledger = verifiedLedger();
    const head = headOf(ledger);
    const tampered = [
      ...ledger.slice(0, -1),
      { ...ledger[ledger.length - 1]!, exit_status: 0, command: "true" } as unknown as LedgerEntry,
    ];
    const result = runCheckMode([spec({ ledger: tampered, ledgerHead: head })]);
    expect(result.exitStatus).toBe(1);
    expect(result.summary.ledgerFailures).toBe(1);
    expect(result.findings.some((f) => f.rule === "LEDGER_INTEGRITY")).toBe(true);
  });

  it("fails a ledger with entries and no head", () => {
    expect(runCheckMode([spec({ ledgerHead: null })]).exitStatus).toBe(1);
  });

  it("is inconclusive (2), not passing, when the effective state cannot be decided", () => {
    const result = runCheckMode([spec({ recordedState: "VERIFIED" })]);
    expect(result.exitStatus).toBe(2);
    expect(result.passed).toBe(false);
    expect(result.summary.inconclusive).toBe(1);
  });

  it("counts a Legacy Spec as passing unless its stage is invalid (6.11-6.12)", () => {
    const legacy = (legacyStage: string) => ({ ...spec(), id: "002-old", legacyStage });
    expect(runCheckMode([legacy("design")]).exitStatus).toBe(0);
    const invalid = runCheckMode([legacy("invalid")]);
    expect(invalid.exitStatus).toBe(1);
    expect(invalid.findings[0]?.rule).toBe("LEGACY_STAGE_INVALID");
  });

  it("fails the run when any one spec fails", () => {
    const result = runCheckMode([spec(), spec({ id: "002-y", recordedState: "SHIPPED" })]);
    expect(result.exitStatus).toBe(1);
    expect(result.specs.map((s) => s.outcome)).toEqual(["pass", "fail"]);
    expect(formatCheckResult(result)).toContain("Check mode: FAIL");
  });
});
