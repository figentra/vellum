/**
 * Tests for EARS Parser.
 *
 * @see requirements.md Requirements 1.1, 1.2, 1.3
 */

import { describe, it, expect } from "vitest";
import {
  matchEarsPattern,
  isValidEarsPattern,
  hasBothWhenAndIf,
  extractSubject,
} from "../patterns/ears-patterns";
import { validateClauseOrder } from "../patterns/clause-order";

describe("EARS Pattern Recognizers", () => {
  describe("ubiquitous pattern", () => {
    it("matches ubiquitous pattern: THE System SHALL...", () => {
      const text = "THE Platform SHALL record every approval in the Ledger";
      const result = matchEarsPattern(text);
      expect(result.matches).toBe(true);
      expect(result.pattern).toBe("ubiquitous");
      expect(result.subject).toBe("Platform");
    });

    it("is valid EARS pattern", () => {
      const text = "THE System SHALL process requests within 200ms";
      expect(isValidEarsPattern(text)).toBe(true);
    });
  });

  describe("event-driven pattern", () => {
    it("matches WHEN trigger, THE Subject SHALL", () => {
      const text =
        "WHEN a request is received, THE System SHALL process it within 200ms";
      const result = matchEarsPattern(text);
      expect(result.matches).toBe(true);
      expect(result.pattern).toBe("event-driven");
      expect(result.subject).toBe("System");
    });
  });

  describe("state-driven pattern", () => {
    it("matches WHILE state, THE Subject SHALL", () => {
      const text =
        "WHILE the archive window is open, THE Archiver SHALL move records to cold storage";
      const result = matchEarsPattern(text);
      expect(result.matches).toBe(true);
      expect(result.pattern).toBe("state-driven");
      expect(result.subject).toBe("Archiver");
    });
  });

  describe("optional pattern", () => {
    it("matches IF condition, THEN THE Subject SHALL", () => {
      const text =
        "IF the artifact contains a vague term, THEN THE Quality Checker SHALL report a Finding";
      const result = matchEarsPattern(text);
      expect(result.matches).toBe(true);
      expect(result.pattern).toBe("optional");
      expect(result.subject).toBe("Quality Checker");
    });
  });

  describe("scope pattern", () => {
    it("matches WHERE scope, THE Subject SHALL", () => {
      const text =
        "WHERE the Policy permits automated merge, THE Merge Gate SHALL accept merge without authorisation";
      const result = matchEarsPattern(text);
      expect(result.matches).toBe(true);
      expect(result.pattern).toBe("scope");
      expect(result.subject).toBe("Merge Gate");
    });
  });

  describe("complex pattern", () => {
    it("matches complex patterns with multiple clauses", () => {
      const text =
        "WHERE the Policy permits, WHILE the queue is healthy, THE Queue Processor SHALL handle messages";
      const result = matchEarsPattern(text);
      expect(result.matches).toBe(true);
      expect(result.isComplex).toBe(true);
    });
  });

  describe("invalid patterns", () => {
    it("rejects text that is not an EARS pattern", () => {
      const text = "The system should be fast";
      expect(isValidEarsPattern(text)).toBe(false);
    });

    it("rejects text missing SHALL", () => {
      const text = "THE System will process requests";
      expect(isValidEarsPattern(text)).toBe(false);
    });
  });

  describe("WHEN and IF exclusivity", () => {
    it("detects both WHEN and IF", () => {
      const text =
        "WHEN X happens, IF Y is true, THE System SHALL do something";
      expect(hasBothWhenAndIf(text)).toBe(true);
    });

    it("accepts WHEN without IF", () => {
      const text = "WHEN X happens, THE System SHALL do something";
      expect(hasBothWhenAndIf(text)).toBe(false);
    });
  });

  describe("subject extraction", () => {
    it("extracts subject from pattern", () => {
      expect(extractSubject("THE Platform SHALL do X")).toBe("Platform");
      expect(extractSubject("WHEN triggered, THE System SHALL respond")).toBe(
        "System",
      );
    });
  });
});

describe("Clause Order Validation", () => {
  describe("valid complex patterns", () => {
    it("accepts WHERE → WHILE → WHEN → THE → SHALL", () => {
      const text =
        "WHERE X is enabled, WHILE Y is active, WHEN Z happens, THE System SHALL respond";
      const result = validateClauseOrder(text);
      expect(result.valid).toBe(true);
    });

    it("accepts WHERE → WHEN → THE → SHALL", () => {
      const text =
        "WHERE X is enabled, WHEN Z happens, THE System SHALL respond";
      const result = validateClauseOrder(text);
      expect(result.valid).toBe(true);
    });

    it("accepts IF → THE → SHALL", () => {
      const text = "IF X is true, THEN THE System SHALL respond";
      const result = validateClauseOrder(text);
      expect(result.valid).toBe(true);
    });
  });

  describe("invalid complex patterns", () => {
    it("rejects WHEN before WHERE", () => {
      const text =
        "WHEN Z happens, WHERE X is enabled, THE System SHALL respond";
      const result = validateClauseOrder(text);
      expect(result.valid).toBe(false);
    });

    it("rejects both WHEN and IF", () => {
      const text =
        "WHEN X happens, IF Y is true, THE System SHALL respond";
      const result = validateClauseOrder(text);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("both WHEN and IF");
    });
  });
});
