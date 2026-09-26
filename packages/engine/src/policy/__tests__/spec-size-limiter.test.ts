/**
 * Tests for Spec Size Limiter.
 *
 * @see Requirement 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7
 */

import { describe, it, expect } from "vitest";
import {
  validateSpecSizeLimit,
  checkSpecSizeLimit,
  permitsTransitionWithSizeFinding,
  DEFAULT_SPEC_SIZE_LIMIT,
} from "../spec-size-limiter";
import type { Finding } from "@vellum/protocol";

describe("spec-size-limiter", () => {
  describe("DEFAULT_SPEC_SIZE_LIMIT", () => {
    it("should be 80 criteria", () => {
      expect(DEFAULT_SPEC_SIZE_LIMIT).toBe(80);
    });
  });

  describe("validateSpecSizeLimit", () => {
    it("should return default when no limit declared", () => {
      const result = validateSpecSizeLimit(undefined);
      expect(result).toBe(DEFAULT_SPEC_SIZE_LIMIT);
    });

    it("should accept positive integer limit", () => {
      const result = validateSpecSizeLimit(100);
      expect(result).toBe(100);
    });

    it("should throw for non-integer", () => {
      expect(() => validateSpecSizeLimit(80.5)).toThrow();
    });

    it("should throw for zero", () => {
      expect(() => validateSpecSizeLimit(0)).toThrow();
    });

    it("should throw for negative", () => {
      expect(() => validateSpecSizeLimit(-10)).toThrow();
    });
  });

  describe("checkSpecSizeLimit", () => {
    it("should return null when within limit", () => {
      const result = checkSpecSizeLimit("test-spec", 50, 80);
      expect(result).toBeNull();
    });

    it("should return null when at limit", () => {
      const result = checkSpecSizeLimit("test-spec", 80, 80);
      expect(result).toBeNull();
    });

    it("should return Finding when exceeding limit", () => {
      const result = checkSpecSizeLimit("test-spec", 100, 80);
      expect(result).not.toBeNull();
      expect(result!.rule).toBe("SPEC_SIZE_LIMIT_EXCEEDED");
      expect(result!.file).toBe("requirements.md");
      expect(result!.specId).toBe("test-spec");
      expect(result!.criterionCount).toBe(100);
      expect(result!.limit).toBe(80);
    });

    it("should include Split Proposal in Finding", () => {
      const result = checkSpecSizeLimit("test-spec", 200, 80);
      expect(result!.splitProposal).toBeDefined();
      expect(result!.splitProposal.specId).toBe("test-spec");
    });
  });

  describe("permitsTransitionWithSizeFinding", () => {
    it("should permit when preconditions hold and only size finding", () => {
      const sizeFinding = checkSpecSizeLimit("test-spec", 100, 80);
      expect(sizeFinding).not.toBeNull();
      const findings: Finding[] = [sizeFinding!];
      const result = permitsTransitionWithSizeFinding(findings, true);
      expect(result).toBe(true);
    });

    it("should not permit when preconditions do not hold", () => {
      const findings: Finding[] = [];
      const result = permitsTransitionWithSizeFinding(findings, false);
      expect(result).toBe(false);
    });

    it("should not permit when other findings exist", () => {
      const findings: Finding[] = [
        { file: "requirements.md", line: 3, rule: "OTHER_FINDING", message: "test" },
        { file: "requirements.md", line: 1, rule: "SPEC_SIZE_LIMIT_EXCEEDED", message: "test" },
      ];
      const result = permitsTransitionWithSizeFinding(findings, true);
      expect(result).toBe(false);
    });
  });
});

describe("split proposal (criteria 13.2-13.3)", () => {
  const requirements = [
    { id: "1", deliverySlice: 1 },
    { id: "2", deliverySlice: 2 },
    { id: "3", deliverySlice: 1 },
  ];

  it("assigns each Requirement to the Child Spec of its Delivery slice", () => {
    const finding = checkSpecSizeLimit("007-big", 100, 80, "requirements.md", requirements);
    expect(
      finding!.splitProposal.proposedChildren.map((c) => [c.deliverySlice, c.requirements]),
    ).toEqual([
      [1, ["1", "3"]],
      [2, ["2"]],
    ]);
    expect(finding!.splitProposal.notComputed).toBeUndefined();
  });

  it("proposes no invented children when the Requirements' slices were not supplied", () => {
    const finding = checkSpecSizeLimit("007-big", 200, 80);
    expect(finding!.splitProposal.proposedChildren).toEqual([]);
    expect(finding!.splitProposal.notComputed).toMatch(/Delivery slice/);
  });
});
