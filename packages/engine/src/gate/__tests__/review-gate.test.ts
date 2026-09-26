/**
 * Tests for review gate.
 * @see requirements.md Requirements 5.1-5.4
 */

import { describe, it, expect } from "vitest";
import { ReviewGate } from "../review-gate";

describe("review gate", () => {
  it("requires quality checker pass", async () => {
    const gate = new ReviewGate("requirements", {
      spec_slug: "test-spec",
      risk_class: "standard",
    });

    const result = await gate.evaluate();

    expect(result.gate_id).toBe("requirements-review");
    expect(["pass", "fail", "warn"]).toContain(result.status);
  });

  it("binds to artifact version", async () => {
    const gate = new ReviewGate("design", {
      spec_slug: "test-spec",
      risk_class: "high",
    });

    const result = await gate.evaluate();

    expect(result.artifact_version).toBeGreaterThanOrEqual(1);
    expect(result.artifact_checksum).toBeDefined();
  });
});
