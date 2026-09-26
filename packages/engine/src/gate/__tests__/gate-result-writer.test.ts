/**
 * Tests for the gate result writer.
 * @see requirements.md Requirement 5.1
 */

import { describe, it, expect } from "vitest";
import { isGateResultPassing, writeGateResult } from "../gate-result-writer";

describe("writeGateResult", () => {
  it("builds a gate_result entry with the caller's timestamp", () => {
    const entry = writeGateResult({
      gateName: "merge",
      result: "PASS",
      findings: [],
      timestamp: "2026-09-26T00:00:00Z",
    });
    expect(entry).toMatchObject({
      kind: "gate_result",
      gateName: "merge",
      result: "PASS",
      timestamp: "2026-09-26T00:00:00Z",
    });
  });
});

describe("isGateResultPassing", () => {
  it("is true only for PASS", () => {
    expect(isGateResultPassing({ gateName: "g", result: "PASS", findings: [] })).toBe(true);
    expect(isGateResultPassing({ gateName: "g", result: "FAIL", findings: [] })).toBe(false);
    expect(isGateResultPassing({ gateName: "g", result: "INCONCLUSIVE", findings: [] })).toBe(false);
  });
});
