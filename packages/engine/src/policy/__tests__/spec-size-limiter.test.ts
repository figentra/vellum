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
import type { Finding } from "../../../domain/ledger/types";

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
      expect(result!.code).toBe("SPEC_SIZE_LIMIT_EXCEEDED");
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
      const findings: Finding[] = [
        {
          code: "SPEC_SIZE_LIMIT_EXCEEDED",
          level: "warn",
          message: "test",
          specId: "test-spec",
          criterionCount: 100,
          limit: 80,
          splitProposal: { specId: "test-spec", proposedChildren: [] },
        } as any,
      ];
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
        { code: "OTHER_FINDING", level: "error", message: "test" } as Finding,
        {
          code: "SPEC_SIZE_LIMIT_EXCEEDED",
          level: "warn",
          message: "test",
        } as any,
      ];
      const result = permitsTransitionWithSizeFinding(findings, true);
      expect(result).toBe(false);
    });
  });
});
