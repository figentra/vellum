/**
 * Tests for Control Resolver.
 *
 * @see Requirement 1.4, 1.5
 */

import { describe, it, expect } from "vitest";
import {
  resolveControl,
  calculateSpecificity,
  ruleMatches,
  matchPattern,
  getDefaultControl,
} from "../control-resolver";
import type { ControlContext, PolicyRule } from "../control-resolver";
import type { RiskClass, Control } from "../../../domain/policy/types";

describe("control-resolver", () => {
  describe("calculateSpecificity", () => {
    it("should return 0 for a rule with no scope", () => {
      const rule: PolicyRule = { control: getDefaultControl("low") };
      expect(calculateSpecificity(rule)).toBe(0);
    });

    it("should count each scoped property", () => {
      const rule: PolicyRule = {
        riskClass: "high",
        artifactPattern: "src/**/*.ts",
        control: getDefaultControl("high"),
      };
      expect(calculateSpecificity(rule)).toBe(2);
    });

    it("should return 4 for fully scoped rule", () => {
      const rule: PolicyRule = {
        riskClass: "critical",
        artifactPattern: "**/*.md",
        changeType: "write",
        environment: "production",
        control: getDefaultControl("critical"),
      };
      expect(calculateSpecificity(rule)).toBe(4);
    });
  });

  describe("matchPattern", () => {
    it("should match exact path", () => {
      expect(matchPattern("src/index.ts", "src/index.ts")).toBe(true);
    });

    it("should match single wildcard", () => {
      expect(matchPattern("*.ts", "index.ts")).toBe(true);
      expect(matchPattern("*.ts", "test.js")).toBe(false);
    });

    it("should match double wildcard", () => {
      expect(matchPattern("src/**/*.ts", "src/components/test.ts")).toBe(true);
      expect(matchPattern("src/**/*.ts", "src/utils/helpers/format.ts")).toBe(true);
    });
  });

  describe("ruleMatches", () => {
    it("should match when all conditions match", () => {
      const rule: PolicyRule = {
        riskClass: "high",
        control: getDefaultControl("high"),
      };
      const context: ControlContext = { riskClass: "high" };
      expect(ruleMatches(rule, context)).toBe(true);
    });

    it("should not match when risk class differs", () => {
      const rule: PolicyRule = {
        riskClass: "low",
        control: getDefaultControl("low"),
      };
      const context: ControlContext = { riskClass: "high" };
      expect(ruleMatches(rule, context)).toBe(false);
    });

    it("should match pattern against artifact path", () => {
      const rule: PolicyRule = {
        artifactPattern: "**/*.ts",
        control: getDefaultControl("low"),
      };
      const context: ControlContext = {
        riskClass: "low",
        artifactPath: "src/components/test.ts",
      };
      expect(ruleMatches(rule, context)).toBe(true);
    });
  });

  describe("resolveControl", () => {
    it("should return most specific matching rule", () => {
      const rules: PolicyRule[] = [
        { control: getDefaultControl("low") }, // specificity 0
        {
          riskClass: "high",
          control: { ...getDefaultControl("high"), approvalsPerArtifact: 5 },
        }, // specificity 1
      ];
      const context: ControlContext = { riskClass: "high" };
      const result = resolveControl(rules, context);
      expect(result.approvalsPerArtifact).toBe(5);
    });

    it("should return default when no rules match", () => {
      const rules: PolicyRule[] = [];
      const context: ControlContext = { riskClass: "critical" };
      const result = resolveControl(rules, context);
      expect(result).toEqual(getDefaultControl("critical"));
    });

    it("should throw when two rules of equal specificity conflict", () => {
      const rules: PolicyRule[] = [
        {
          riskClass: "high",
          control: { ...getDefaultControl("high"), approvalsPerArtifact: 1 },
        },
        {
          riskClass: "high",
          control: { ...getDefaultControl("high"), approvalsPerArtifact: 2 },
        },
      ];
      const context: ControlContext = { riskClass: "high" };
      expect(() => resolveControl(rules, context)).toThrow();
    });
  });

  describe("getDefaultControl", () => {
    it("should return control for each Risk Class", () => {
      const riskClasses: RiskClass[] = ["low", "standard", "high", "critical"];
      for (const rc of riskClasses) {
        const control = getDefaultControl(rc);
        expect(control).toBeDefined();
        expect(control.requirementsReview).toBeDefined();
      }
    });
  });
});
