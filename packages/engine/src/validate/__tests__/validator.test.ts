/**
 * Tests for Protocol Validator
 *
 * Tests validation of artifacts against the Markdown Protocol,
 * Lifecycle Frontmatter Schema, and Task Line Grammar.
 */

import { describe, it, expect } from "vitest";
import { validateArtifact, validateTasksMd, validateAll } from "../validator";
import { Finding } from "../finding";
import { RuleIdentifier } from "../rules";
import { compareFindings, sortFindings } from "../finding";

describe("Protocol Validator", () => {
  describe("validateArtifact", () => {
    it("should validate artifact with valid frontmatter", async () => {
      const result = validateArtifact("test-requirements.md", "requirements");
      expect(result.valid).toBe(true);
      expect(result.findings).toHaveLength(0);
    });

    it("should report finding for invalid schema_version", async () => {
      // This test will be expanded when we implement actual validation
      const result = validateArtifact("test-invalid-schema.md", "requirements");
      // Placeholder assertion
      expect(result).toHaveProperty("artifact");
      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("findings");
    });

    it("should report finding for missing frontmatter", async () => {
      const result = validateArtifact("test-no-frontmatter.md", "requirements");
      // Placeholder - will be expanded
      expect(result.findings).toBeInstanceOf(Array);
    });

    it("should report finding for unparseable body", async () => {
      const result = validateArtifact("test-unparseable.md", "design");
      expect(result.findings).toBeInstanceOf(Array);
    });
  });

  describe("validateTasksMd", () => {
    it("should validate task lines against Kiro grammar", async () => {
      const result = validateTasksMd("test-tasks.md");
      expect(result).toHaveProperty("artifact");
      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("findings");
    });

    it("should report finding for invalid task line format", async () => {
      // Test lines that don't match `- [x] N.N <title>` format
      const result = validateTasksMd("test-invalid-tasks.md");
      // Placeholder - will check for TASK_LINE_INVALID finding
      expect(result.findings).toBeInstanceOf(Array);
    });

    it("should report finding for undefined criterion reference", async () => {
      const result = validateTasksMd("test-invalid-criterion.md");
      // Will check for CRITERION_REFERENCE_UNDEFINED
      expect(result.findings).toBeInstanceOf(Array);
    });

    it("should report finding for wave graph with undefined task", async () => {
      const result = validateTasksMd("test-invalid-wave.md");
      // Will check for WAVE_TASK_UNDEFINED
      expect(result.findings).toBeInstanceOf(Array);
    });
  });

  describe("validateAll", () => {
    it("should validate all specs in repository", async () => {
      const results = validateAll("/test/repo");
      expect(results).toBeInstanceOf(Map);
    });
  });

  describe("Finding ordering", () => {
    it("should order findings by file path first", () => {
      const findings: Finding[] = [
        { file: "b.md", line: 1, rule: RuleIdentifier.ARTIFACT_MISSING, message: "" },
        { file: "a.md", line: 1, rule: RuleIdentifier.ARTIFACT_MISSING, message: "" },
      ];

      sortFindings(findings);

      expect(findings[0].file).toBe("a.md");
      expect(findings[1].file).toBe("b.md");
    });

    it("should order findings by line number when files are equal", () => {
      const findings: Finding[] = [
        { file: "test.md", line: 10, rule: RuleIdentifier.ARTIFACT_MISSING, message: "" },
        { file: "test.md", line: 5, rule: RuleIdentifier.ARTIFACT_MISSING, message: "" },
      ];

      sortFindings(findings);

      expect(findings[0].line).toBe(5);
      expect(findings[1].line).toBe(10);
    });

    it("should order findings by rule identifier when file and line are equal", () => {
      const findings: Finding[] = [
        { file: "test.md", line: 1, rule: RuleIdentifier.TASK_LINE_INVALID, message: "" },
        { file: "test.md", line: 1, rule: RuleIdentifier.ARTIFACT_MISSING, message: "" },
      ];

      sortFindings(findings);

      // ARTIFACT_MISSING comes before TASK_LINE_INVALID alphabetically
      expect(findings[0].rule).toBe(RuleIdentifier.ARTIFACT_MISSING);
      expect(findings[1].rule).toBe(RuleIdentifier.TASK_LINE_INVALID);
    });
  });
});
