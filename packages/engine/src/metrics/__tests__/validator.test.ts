import { describe, it, expect } from "vitest";
import { parseScope, validateScope } from "../validator.js";
import { IndividualGroupingRefusalError } from "../errors.js";

describe("Scope Validator - Property 5", () => {
  describe("parseScope", () => {
    it("parses repository scope", () => {
      const result = parseScope("repository");
      expect(result).toEqual({ kind: "repository" });
    });

    it("parses spec scope", () => {
      const result = parseScope("spec:039-vellum-insight");
      expect(result).toEqual({ kind: "spec", specId: "039-vellum-insight" });
    });

    it("parses time_period scope", () => {
      const result = parseScope("time_period:2026-01-01T00:00:00Z/2026-12-31T23:59:59Z");
      expect(result).toEqual({
        kind: "time_period",
        from: "2026-01-01T00:00:00Z",
        to: "2026-12-31T23:59:59Z",
      });
    });
  });

  describe("Individual grouping refusal (criterion 1.5)", () => {
    it("refuses grouping by individual (Property 5)", () => {
      const scope = parseScope("individual:alice@example.com");
      expect(scope).toEqual({ kind: "forbidden", grouping: "individual" });

      expect(() => validateScope(scope)).toThrow(IndividualGroupingRefusalError);
    });

    it("refuses grouping by identity", () => {
      const scope = parseScope("identity:bob@example.com");
      expect(scope).toEqual({ kind: "forbidden", grouping: "identity" });

      expect(() => validateScope(scope)).toThrow(IndividualGroupingRefusalError);
    });

    it("refuses grouping by session", () => {
      const scope = parseScope("session:ses-123");
      expect(scope).toEqual({ kind: "forbidden", grouping: "session" });

      expect(() => validateScope(scope)).toThrow(IndividualGroupingRefusalError);
    });

    it("refuses grouping by author", () => {
      const scope = parseScope("author:charlie@example.com");
      expect(scope).toEqual({ kind: "forbidden", grouping: "author" });

      expect(() => validateScope(scope)).toThrow(IndividualGroupingRefusalError);
    });

    it("refuses grouping by approver", () => {
      const scope = parseScope("approver:diana@example.com");
      expect(scope).toEqual({ kind: "forbidden", grouping: "approver" });

      expect(() => validateScope(scope)).toThrow(IndividualGroupingRefusalError);
    });

    it("refuses grouping by executor", () => {
      const scope = parseScope("executor:eve@example.com");
      expect(scope).toEqual({ kind: "forbidden", grouping: "executor" });

      expect(() => validateScope(scope)).toThrow(IndividualGroupingRefusalError);
    });

    it("refuses grouping by email", () => {
      const scope = parseScope("email:frank@example.com");
      expect(scope).toEqual({ kind: "forbidden", grouping: "email" });

      expect(() => validateScope(scope)).toThrow(IndividualGroupingRefusalError);
    });

    it("IndividualGroupingRefusalError has exit status 2", () => {
      const scope = parseScope("individual:test");
      expect(scope.kind).toBe("forbidden");

      try {
        validateScope(scope);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(IndividualGroupingRefusalError);
        expect((error as IndividualGroupingRefusalError).exitStatus).toBe(2);
        expect((error as IndividualGroupingRefusalError).message).toContain(
          "Metrics measure the system, not individuals",
        );
      }
    });
  });
});
