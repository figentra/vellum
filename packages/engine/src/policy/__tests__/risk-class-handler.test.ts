/**
 * Tests for Risk Class Handler.
 *
 * @see Requirement 1.1, 1.3, 1.7, 1.8, 1.9, 1.10, 1.11
 */

import { describe, it, expect } from "vitest";
import {
  isValidRiskClass,
  isQuickPathPermitted,
  permitsQuickPathTransition,
  approverAuthoredArtifact,
  validateRiskClassDeclaration,
  getTable1ADefaults,
  VALID_RISK_CLASSES,
} from "../risk-class-handler";

describe("risk-class-handler", () => {
  describe("VALID_RISK_CLASSES", () => {
    it("should have four Risk Classes", () => {
      expect(VALID_RISK_CLASSES).toHaveLength(4);
      expect(VALID_RISK_CLASSES).toContain("low");
      expect(VALID_RISK_CLASSES).toContain("standard");
      expect(VALID_RISK_CLASSES).toContain("high");
      expect(VALID_RISK_CLASSES).toContain("critical");
    });
  });

  describe("isValidRiskClass", () => {
    it("should accept valid Risk Classes", () => {
      expect(isValidRiskClass("low")).toBe(true);
      expect(isValidRiskClass("standard")).toBe(true);
      expect(isValidRiskClass("high")).toBe(true);
      expect(isValidRiskClass("critical")).toBe(true);
    });

    it("should reject invalid Risk Classes", () => {
      expect(isValidRiskClass("medium")).toBe(false);
      expect(isValidRiskClass("unknown")).toBe(false);
      expect(isValidRiskClass("")).toBe(false);
    });
  });

  describe("isQuickPathPermitted", () => {
    it("should permit quick path only for low risk", () => {
      expect(isQuickPathPermitted("low")).toBe(true);
      expect(isQuickPathPermitted("standard")).toBe(false);
      expect(isQuickPathPermitted("high")).toBe(false);
      expect(isQuickPathPermitted("critical")).toBe(false);
    });
  });

  describe("permitsQuickPathTransition", () => {
    it("should permit transition for low risk", () => {
      expect(permitsQuickPathTransition("low")).toBe(true);
    });

    it("should not permit transition for other risks", () => {
      expect(permitsQuickPathTransition("standard")).toBe(false);
      expect(permitsQuickPathTransition("high")).toBe(false);
      expect(permitsQuickPathTransition("critical")).toBe(false);
    });
  });

  describe("approverAuthoredArtifact", () => {
    it("should detect when approver authored", () => {
      const authors = ["alice@example.com", "bob@example.com"];
      expect(approverAuthoredArtifact("alice@example.com", authors)).toBe(true);
    });

    it("should detect when approver did not author", () => {
      const authors = ["alice@example.com", "bob@example.com"];
      expect(approverAuthoredArtifact("charlie@example.com", authors)).toBe(false);
    });
  });

  describe("validateRiskClassDeclaration", () => {
    it("should accept valid Risk Class", () => {
      const result = validateRiskClassDeclaration("high");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.riskClass).toBe("high");
      }
    });

    it("should reject invalid Risk Class", () => {
      const result = validateRiskClassDeclaration("extreme");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain("Invalid Risk Class");
      }
    });
  });

  describe("getTable1ADefaults", () => {
    it("should return defaults for each Risk Class", () => {
      for (const rc of VALID_RISK_CLASSES) {
        const defaults = getTable1ADefaults(rc);
        expect(defaults.requirementsReview).toBe("required");
        expect(defaults.approvalsPerArtifact).toBeGreaterThan(0);
      }
    });

    it("should have correct defaults per Table 1.A", () => {
      const low = getTable1ADefaults("low");
      expect(low.designReview).toBe("optional");
      expect(low.quickPathPermitted).toBe(true);

      const critical = getTable1ADefaults("critical");
      expect(critical.approvalsPerArtifact).toBe(2);
      expect(critical.releaseGate).toBe("explicit_with_rollback_path");
    });
  });
});
