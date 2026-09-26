/**
 * The Quality Checker's overall status never passes a check it did not run.
 */

import { describe, expect, it } from "vitest";
import { checkDesign, checkPlan } from "../index";

describe("quality check status", () => {
  it("is inconclusive for a plan checked without requirements.md and design.md", () => {
    const result = checkPlan("- [ ] 1. Implement (spec-executor)\n", "tasks.md", 1);
    expect(result.status).toBe("inconclusive");
    expect(result.not_checked.map((n) => n.check)).toEqual(["plan coverage (criteria 3.1-3.8)"]);
  });

  it("is inconclusive for a design checked without requirements.md or ADR statuses", () => {
    const result = checkDesign("# Design\n", "design.md", 1);
    expect(result.status === "inconclusive" || result.status === "fail").toBe(true);
    expect(result.not_checked.map((n) => n.check)).toEqual([
      "coverage of requirements",
      "ADR citations",
    ]);
  });
});
