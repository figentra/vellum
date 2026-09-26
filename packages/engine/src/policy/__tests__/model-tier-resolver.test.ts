/**
 * Tests for Model Tier Resolver.
 *
 * @see Requirement 12.1, 12.2, 12.3, 12.4
 */

import { describe, it, expect } from "vitest";
import {
  isValidModelTier,
  isFrontierOnlyRole,
  validateModelTierAssignment,
  resolveModelTier,
  FRONTIER_ONLY_ROLES,
} from "../model-tier-resolver";

describe("model-tier-resolver", () => {
  describe("FRONTIER_ONLY_ROLES", () => {
    it("should include spec-executor", () => {
      expect(FRONTIER_ONLY_ROLES).toContain("spec-executor");
    });

    it("should include architecture-guardian", () => {
      expect(FRONTIER_ONLY_ROLES).toContain("architecture-guardian");
    });

    it("should have at least 5 roles", () => {
      expect(FRONTIER_ONLY_ROLES.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("isValidModelTier", () => {
    it("should accept valid Model Tiers", () => {
      expect(isValidModelTier("reader")).toBe(true);
      expect(isValidModelTier("frontier")).toBe(true);
    });

    it("should reject invalid Model Tiers", () => {
      expect(isValidModelTier("standard")).toBe(false);
      expect(isValidModelTier("economy")).toBe(false);
      expect(isValidModelTier("")).toBe(false);
    });
  });

  describe("isFrontierOnlyRole", () => {
    it("should identify Frontier-Only roles", () => {
      expect(isFrontierOnlyRole("spec-executor")).toBe(true);
      expect(isFrontierOnlyRole("architecture-guardian")).toBe(true);
    });

    it("should not flag non-Frontier-Only roles", () => {
      expect(isFrontierOnlyRole("unknown-role")).toBe(false);
    });
  });

  describe("validateModelTierAssignment", () => {
    it("should throw for invalid Model Tier", () => {
      expect(() => validateModelTierAssignment("test-role", "invalid" as any)).toThrow();
    });

    it("should throw when reader assigned to Frontier-Only role", () => {
      expect(() => validateModelTierAssignment("spec-executor", "reader")).toThrow();
    });

    it("should accept frontier assigned to Frontier-Only role", () => {
      expect(() => validateModelTierAssignment("spec-executor", "frontier")).not.toThrow();
    });

    it("should accept reader assigned to non-Frontier-Only role", () => {
      expect(() => validateModelTierAssignment("unknown-role", "reader")).not.toThrow();
    });
  });

  describe("resolveModelTier", () => {
    it("should return assigned tier for role", () => {
      const assignments = { "test-role": "frontier" as const };
      const result = resolveModelTier(assignments, "test-role");
      expect(result).toBe("frontier");
    });

    it("should default to frontier for undeclared roles", () => {
      const assignments = {};
      const result = resolveModelTier(assignments, "unknown-role");
      expect(result).toBe("frontier");
    });

    it("should validate assignments", () => {
      const assignments = { "spec-executor": "reader" as const };
      expect(() => resolveModelTier(assignments, "spec-executor")).toThrow();
    });
  });
});
