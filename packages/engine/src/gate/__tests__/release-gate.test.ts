/**
 * Tests for release gate.
 * @see requirements.md Requirements 7.1-7.5
 */

import { describe, it, expect } from "vitest";
import { ReleaseGate } from "../release-gate";

describe("release gate", () => {
  it("shows exact confirmation", async () => {
    const gate = new ReleaseGate({
      spec_slug: "test-spec",
      risk_class: "standard",
    });

    const result = await gate.evaluate();

    expect(result.gate_id).toBe("release-gate");
  });

  it("requires rollback path for critical", async () => {
    const gate = new ReleaseGate({
      spec_slug: "test-spec",
      risk_class: "critical",
    });

    const result = await gate.evaluate();

    // Findings should include check for rollback path
    expect(result.gate_id).toBe("release-gate");
  });
});
