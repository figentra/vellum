/**
 * @vellum/protocol — Tests for Core Types
 */

import { describe, it, expect } from "vitest";
import {
  brand,
  unbrand,
  parseChecksum,
  parseCommitSha,
  parseTaskId,
  parseCriterionId,
  parsePropertyId,
  isValidChecksum,
  isValidGitSha,
  isValidTaskId,
  isValidCriterionId,
  isValidPropertyId,
} from "../src/branded.js";

describe("Branded Types", () => {
  describe("checksum", () => {
    it("should accept valid SHA-256 checksums", () => {
      const checksum = "a".repeat(64);
      expect(isValidChecksum(checksum)).toBe(true);
      expect(parseChecksum(checksum)).not.toBeNull();
    });

    it("should reject invalid checksums", () => {
      expect(isValidChecksum("short")).toBe(false);
      expect(isValidChecksum("toolong" + "a".repeat(64))).toBe(false);
      expect(isValidChecksum("invalid!chars" + "a".repeat(52))).toBe(false);
      expect(parseChecksum("short")).toBeNull();
    });

    it("should roundtrip", () => {
      const original = "a".repeat(64);
      const checksum = parseChecksum(original);
      expect(checksum).not.toBeNull();
      expect(unbrand(checksum!)).toBe(original);
    });
  });

  describe("Git SHA", () => {
    it("should accept valid 40-character hex strings", () => {
      const sha = "a".repeat(40);
      expect(isValidGitSha(sha)).toBe(true);
      expect(parseCommitSha(sha)).not.toBeNull();
    });

    it("should reject invalid Git SHAs", () => {
      expect(isValidGitSha("short")).toBe(false);
      expect(isValidGitSha("a".repeat(41))).toBe(false);
      expect(isValidGitSha("g".repeat(40))).toBe(false); // 'g' not valid hex
      expect(parseCommitSha("short")).toBeNull();
    });
  });

  describe("Task ID", () => {
    it("should accept valid task identifiers", () => {
      expect(isValidTaskId("1")).toBe(true);
      expect(isValidTaskId("1.2")).toBe(true);
      expect(isValidTaskId("1.2.3")).toBe(true);
      expect(parseTaskId("1")).not.toBeNull();
      expect(parseTaskId("1.2")).not.toBeNull();
    });

    it("should reject invalid task identifiers", () => {
      expect(isValidTaskId("")).toBe(false);
      expect(isValidTaskId(".1")).toBe(false);
      expect(isValidTaskId("1.")).toBe(false);
      expect(isValidTaskId("a")).toBe(false);
      expect(parseTaskId("")).toBeNull();
    });
  });

  describe("Criterion ID", () => {
    it("should accept valid criterion identifiers (N.M format)", () => {
      expect(isValidCriterionId("1.2")).toBe(true);
      expect(isValidCriterionId("10.20")).toBe(true);
      expect(parseCriterionId("1.2")).not.toBeNull();
    });

    it("should reject invalid criterion identifiers", () => {
      expect(isValidCriterionId("1")).toBe(false);
      expect(isValidCriterionId("1.2.3")).toBe(false);
      expect(isValidCriterionId("a.b")).toBe(false);
      expect(parseCriterionId("1")).toBeNull();
    });
  });

  describe("Property ID", () => {
    it("should accept valid property identifiers (PN format)", () => {
      expect(isValidPropertyId("P1")).toBe(true);
      expect(isValidPropertyId("P10")).toBe(true);
      expect(parsePropertyId("P1")).not.toBeNull();
    });

    it("should reject invalid property identifiers", () => {
      expect(isValidPropertyId("")).toBe(false);
      expect(isValidPropertyId("p1")).toBe(false); // lowercase
      expect(isValidPropertyId("1")).toBe(false);
      expect(isValidPropertyId("PP1")).toBe(false);
      expect(parsePropertyId("p1")).toBeNull();
    });
  });

  describe("brand/unbrand", () => {
    it("should preserve value", () => {
      const value = "test";
      const branded = brand<string, "Test">(value);
      expect(unbrand(branded)).toBe(value);
    });
  });
});
