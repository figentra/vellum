/**
 * Tests for gate integrity checking.
 * @see requirements.md Requirement 5.5; 003 requirements 4.5-4.6
 */

import { describe, expect, it } from "vitest";
import type { LedgerEntry, LedgerHead } from "@vellum/protocol";
import { computeLedgerEntryDigest } from "@vellum/protocol";
import { checkGateIntegrity, detectEditToPass } from "../integrity-checker";
import { chain } from "../../verify/__tests__/fixtures";

function gateResult(gate: string, status: string, version?: number, checksum?: string): LedgerEntry {
  return {
    kind: "gate_result",
    id: 0,
    predecessor_digest: null,
    timestamp: "2026-09-26T12:00:00Z",
    gate_id: gate,
    status,
    findings: [],
    evidence_references: [],
    ...(version !== undefined ? { artifact_version: version } : {}),
    ...(checksum !== undefined ? { artifact_checksum: checksum } : {}),
  } as unknown as LedgerEntry;
}

function headOf(ledger: readonly LedgerEntry[]): LedgerHead {
  const last = ledger[ledger.length - 1]!;
  return { last_id: last.id, last_digest: computeLedgerEntryDigest(last) };
}

const V1 = "1".repeat(64);
const V2 = "2".repeat(64);

describe("checkGateIntegrity", () => {
  it("finds nothing in an intact ledger whose results bind the current artifact", () => {
    const ledger = chain([gateResult("requirements-review", "pass", 1, V1)]);
    const violations = checkGateIntegrity({
      ledger,
      ledgerHead: headOf(ledger),
      currentBindings: new Map([["requirements-review", { artifact_version: 1, artifact_checksum: V1 }]]),
    });
    expect(violations).toEqual([]);
  });

  it("reports a gate result edited after it was recorded", () => {
    const ledger = chain([gateResult("merge-gate", "fail", 1, V1), gateResult("x", "pass", 1, V1)]);
    const tampered = [{ ...ledger[0]!, status: "pass" } as unknown as LedgerEntry, ledger[1]!];
    const violations = checkGateIntegrity({ ledger: tampered, ledgerHead: headOf(ledger) });
    expect(violations.some((v) => v.kind === "result_modified")).toBe(true);
  });

  it("reports an edit of the last gate result, which only the Ledger Head covers", () => {
    const ledger = chain([gateResult("merge-gate", "fail", 1, V1)]);
    const tampered = [{ ...ledger[0]!, status: "pass" } as unknown as LedgerEntry];
    const violations = checkGateIntegrity({ ledger: tampered, ledgerHead: headOf(ledger) });
    expect(violations.map((v) => v.kind)).toContain("result_modified");
  });

  it("reports a ledger with entries and no head", () => {
    const ledger = chain([gateResult("merge-gate", "pass", 1, V1)]);
    expect(checkGateIntegrity({ ledger, ledgerHead: null })).not.toEqual([]);
  });

  it("reports a result bound to an older artifact checksum as stale", () => {
    const ledger = chain([gateResult("design-review", "pass", 1, V1)]);
    const violations = checkGateIntegrity({
      ledger,
      ledgerHead: headOf(ledger),
      currentBindings: new Map([["design-review", { artifact_version: 2, artifact_checksum: V2 }]]),
    });
    expect(violations).toHaveLength(1);
    expect(violations[0]?.kind).toBe("stale_result");
  });

  it("reports a result that binds no artifact at all", () => {
    const ledger = chain([gateResult("design-review", "pass")]);
    const violations = checkGateIntegrity({
      ledger,
      ledgerHead: headOf(ledger),
      currentBindings: new Map([["design-review", { artifact_version: 1, artifact_checksum: V1 }]]),
    });
    expect(violations[0]?.kind).toBe("unbound_result");
  });
});

describe("detectEditToPass", () => {
  const change = {
    gate: "merge-gate",
    baseStatus: "fail" as const,
    headStatus: "pass" as const,
    definitionFile: ".sdlc/gates/merge.json",
    modifiedFiles: [".sdlc/gates/merge.json", "src/a.ts"],
  };

  it("reports fail→pass in the change that edited the gate definition", () => {
    expect(detectEditToPass(change)?.kind).toBe("edit_to_pass");
  });

  it("does not report fail→pass when the definition was not modified", () => {
    expect(detectEditToPass({ ...change, modifiedFiles: ["src/a.ts"] })).toBeNull();
  });

  it("does not report a definition edit that did not flip fail to pass", () => {
    expect(detectEditToPass({ ...change, baseStatus: "pass" })).toBeNull();
  });
});
