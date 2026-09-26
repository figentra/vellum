/**
 * Property-based tests for findings ordering
 *
 * Validates that findings are always ordered by file path, then line, then rule identifier.
 */

import { describe, it } from "vitest";
import * as fc from "fast-check";
import { Finding } from "../../finding";
import { RuleIdentifier } from "../../rules";
import { compareFindings, sortFindings } from "../../finding";

describe("Findings ordering properties", () => {
  it("should always order by file path first", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.integer({ min: 1 }),
        fc.integer({ min: 1 }),
        (file1, file2, line1, line2) => {
          // Skip if files are equal
          if (file1 === file2) return true;

          const findings: Finding[] = [
            { file: file1, line: line1, rule: RuleIdentifier.ARTIFACT_MISSING, message: "" },
            { file: file2, line: line2, rule: RuleIdentifier.ARTIFACT_MISSING, message: "" },
          ];

          sortFindings(findings);

          // The finding with the smaller file path should come first
          if (file1 < file2) {
            expect(findings[0].file).toBe(file1);
          } else {
            expect(findings[0].file).toBe(file2);
          }
        },
      ),
    );
  });

  it("should always order by line second when files are equal", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.integer({ min: 1 }),
        fc.integer({ min: 1 }),
        (file, line1, line2) => {
          const findings: Finding[] = [
            { file, line: line1, rule: RuleIdentifier.ARTIFACT_MISSING, message: "" },
            { file, line: line2, rule: RuleIdentifier.ARTIFACT_MISSING, message: "" },
          ];

          sortFindings(findings);

          // The finding with the smaller line should come first
          expect(findings[0].line).toBe(Math.min(line1, line2));
          expect(findings[1].line).toBe(Math.max(line1, line2));
        },
      ),
    );
  });

  it("should always order by rule identifier third when file and line are equal", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), fc.integer({ min: 1 }), (file, line) => {
        const rules = Object.values(RuleIdentifier);
        const rule1 = rules[Math.floor(Math.random() * rules.length)];
        const rule2 = rules[Math.floor(Math.random() * rules.length)];

        const findings: Finding[] = [
          { file, line, rule: rule1, message: "" },
          { file, line, rule: rule2, message: "" },
        ];

        sortFindings(findings);

        // Findings should be sorted by rule identifier (string comparison)
        if (rule1 < rule2) {
          expect(findings[0].rule).toBe(rule1);
        } else if (rule1 > rule2) {
          expect(findings[0].rule).toBe(rule2);
        } else {
          // Same rule
          expect(findings[0].rule).toBe(findings[1].rule);
        }
      }),
    );
  });

  it("should maintain stable ordering for any set of findings", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            file: fc.string({ minLength: 1 }),
            line: fc.integer({ min: 1 }),
            rule: fc.constantFrom(...Object.values(RuleIdentifier)),
            message: fc.string(),
          }),
          { minLength: 2, maxLength: 100 },
        ),
        (rawFindings) => {
          // Convert to proper Finding objects
          const findings: Finding[] = rawFindings.map((f) => ({
            file: f.file,
            line: f.line,
            rule: f.rule as RuleIdentifier,
            message: f.message,
          }));

          sortFindings(findings);

          // Verify ordering invariant: each element should compare <= the next
          for (let i = 0; i < findings.length - 1; i++) {
            const comparison = compareFindings(findings[i], findings[i + 1]);
            expect(comparison).toBeLessThanOrEqual(0);
          }
        },
      ),
    );
  });
});
