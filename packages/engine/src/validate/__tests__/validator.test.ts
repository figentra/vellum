/**
 * Tests for Finding ordering and the rule catalogue.
 */

import { describe, it, expect } from "vitest";
import { Finding } from "../finding";
import { RuleIdentifier } from "../rules";
import { compareFindings, sortFindings } from "../finding";

describe("Protocol Validator", () => {
  describe("Finding ordering", () => {
    it("should order findings by file path first", () => {
      const findings: Finding[] = [
        { file: "b.md", line: 1, rule: RuleIdentifier.ARTIFACT_MISSING, message: "" },
        { file: "a.md", line: 1, rule: RuleIdentifier.ARTIFACT_MISSING, message: "" },
      ];

      sortFindings(findings);

      expect(findings.map((f) => f.file)).toEqual(["a.md", "b.md"]);
    });

    it("should order findings by line number when files are equal", () => {
      const findings: Finding[] = [
        { file: "test.md", line: 10, rule: RuleIdentifier.ARTIFACT_MISSING, message: "" },
        { file: "test.md", line: 5, rule: RuleIdentifier.ARTIFACT_MISSING, message: "" },
      ];

      sortFindings(findings);

      expect(findings.map((f) => f.line)).toEqual([5, 10]);
    });

    it("should order findings by rule identifier when file and line are equal", () => {
      const findings: Finding[] = [
        { file: "test.md", line: 1, rule: RuleIdentifier.TASK_LINE_INVALID, message: "" },
        { file: "test.md", line: 1, rule: RuleIdentifier.ARTIFACT_MISSING, message: "" },
      ];

      sortFindings(findings);

      // ARTIFACT_MISSING comes before TASK_LINE_INVALID alphabetically
      expect(findings.map((f) => f.rule)).toEqual([
        RuleIdentifier.ARTIFACT_MISSING,
        RuleIdentifier.TASK_LINE_INVALID,
      ]);
    });

    it("compareFindings orders by file, then line, then rule, and is zero for equal findings", () => {
      const base: Finding = { file: "a.md", line: 2, rule: RuleIdentifier.ARTIFACT_MISSING, message: "" };
      expect(compareFindings(base, { ...base, file: "b.md", line: 1 })).toBeLessThan(0);
      expect(compareFindings(base, { ...base, line: 1 })).toBeGreaterThan(0);
      expect(
        compareFindings(base, { ...base, rule: RuleIdentifier.TASK_LINE_INVALID }),
      ).toBeLessThan(0);
      expect(compareFindings(base, { ...base })).toBe(0);
    });
  });
});
