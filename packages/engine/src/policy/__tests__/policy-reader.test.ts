/**
 * Tests for Policy Reader.
 *
 * @see Requirement 1.2, 1.3, 1.6
 */

import { describe, it, expect } from "vitest";
import {
  readPolicy,
  validatePolicySchema,
  mergeWithDefaults,
  DEFAULT_RISK_CLASS_CONTROLS,
} from "../policy-reader";
import type { RiskClass } from "../domain/policy/types";

describe("policy-reader", () => {
  describe("DEFAULT_RISK_CLASS_CONTROLS", () => {
    it("should have controls for all four Risk Classes", () => {
      const riskClasses: RiskClass[] = ["low", "standard", "high", "critical"];
      for (const rc of riskClasses) {
        expect(DEFAULT_RISK_CLASS_CONTROLS[rc]).toBeDefined();
      }
    });

    it("should have quick path permitted only for low risk", () => {
      expect(DEFAULT_RISK_CLASS_CONTROLS.low.quickPathPermitted).toBe(true);
      expect(DEFAULT_RISK_CLASS_CONTROLS.standard.quickPathPermitted).toBe(false);
      expect(DEFAULT_RISK_CLASS_CONTROLS.high.quickPathPermitted).toBe(false);
      expect(DEFAULT_RISK_CLASS_CONTROLS.critical.quickPathPermitted).toBe(false);
    });

    it("should require two approvals for critical", () => {
      expect(DEFAULT_RISK_CLASS_CONTROLS.critical.approvalsPerArtifact).toBe(2);
    });

    it("should have explicit release gate for high and critical", () => {
      expect(DEFAULT_RISK_CLASS_CONTROLS.high.releaseGate).toBe("explicit");
      expect(DEFAULT_RISK_CLASS_CONTROLS.critical.releaseGate).toBe("explicit_with_rollback_path");
    });
  });

  describe("validatePolicySchema", () => {
    it("should accept a valid Policy object", () => {
      const policy = {
        risk_classes: ["low", "standard", "high", "critical"],
        spec_size_limit: 80,
      };
      const result = validatePolicySchema(policy, "test-policy.json");
      expect(result.valid).toBe(true);
    });

    it("should reject non-object Policy", () => {
      const result = validatePolicySchema("not-an-object", "test-policy.json");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.message).toContain("must be an object");
      }
    });

    it("should reject invalid risk class", () => {
      const policy = {
        risk_classes: ["low", "invalid-class"],
      };
      const result = validatePolicySchema(policy, "test-policy.json");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.message).toContain("Invalid risk class");
      }
    });

    it("should reject non-positive spec_size_limit", () => {
      const policy = {
        spec_size_limit: 0,
      };
      const result = validatePolicySchema(policy, "test-policy.json");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.message).toContain("positive integer");
      }
    });

    it("should reject invalid model tier", () => {
      const policy = {
        model_tiers: {
          "test-role": "invalid-tier",
        },
      };
      const result = validatePolicySchema(policy, "test-policy.json");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.message).toContain("Invalid model tier");
      }
    });
  });

  describe("mergeWithDefaults", () => {
    it("should apply defaults when no declared controls", () => {
      const result = mergeWithDefaults(undefined, "low");
      expect(result).toEqual(DEFAULT_RISK_CLASS_CONTROLS.low);
    });

    it("should merge declared controls with defaults", () => {
      const declared = {
        approvalsPerArtifact: 3,
      };
      const result = mergeWithDefaults(declared, "critical");
      expect(result.approvalsPerArtifact).toBe(3);
      expect(result.requirementsReview).toBe("required");
    });

    it("should keep all declared values", () => {
      const declared = {
        requirementsReview: "optional" as const,
        designReview: "optional" as const,
        securityGate: "optional" as const,
        approvalsPerArtifact: 1,
        releaseGate: "standard" as const,
        quickPathPermitted: true,
      };
      const result = mergeWithDefaults(declared, "critical");
      expect(result).toEqual(declared);
    });
  });
});
