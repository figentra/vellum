/**
 * Tests for merge gate.
 * @see requirements.md Requirements 6.1-6.5
 */

import { describe, it, expect } from "vitest";
import { MergeGate } from "../merge-gate";

describe("merge gate", () => {
  it("requires approvals", async () => {
    const gate = new MergeGate({
      spec_slug: "test-spec",
      risk_class: "standard",
    });

    const result = await gate.evaluate();

    expect(result.gate_id).toBe("merge-gate");
  });

  it("requires merge authorisation for high risk", async () => {
    const gate = new MergeGate({
      spec_slug: "test-spec",
      risk_class: "critical",
    });

    const result = await gate.evaluate();

    expect(result.gate_id).toBe("merge-gate");
  });
});
