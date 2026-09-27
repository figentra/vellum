/**
 * Tests for Section Write Threshold.
 *
 * @see Requirement 20.17
 */

import { describe, it, expect } from "vitest";
import {
  readSectionWriteThreshold,
  requiresSectionWrite,
  checkWholeArtifactWrite,
  formatByteSize,
  DEFAULT_SECTION_WRITE_THRESHOLD,
} from "../section-write-threshold";

describe("section-write-threshold", () => {
  describe("DEFAULT_SECTION_WRITE_THRESHOLD", () => {
    it("should be 65,536 bytes (64 KiB)", () => {
      expect(DEFAULT_SECTION_WRITE_THRESHOLD).toBe(65536);
    });
  });

  describe("readSectionWriteThreshold", () => {
    it("should return default when no threshold declared", () => {
      const result = readSectionWriteThreshold(undefined);
      expect(result).toBe(DEFAULT_SECTION_WRITE_THRESHOLD);
    });

    it("should accept declared threshold", () => {
      const result = readSectionWriteThreshold(102400);
      expect(result).toBe(102400);
    });

    it("should warn for very small threshold but still accept", () => {
      const result = readSectionWriteThreshold(512);
      expect(result).toBe(512);
    });

    it("should floor non-integer thresholds", () => {
      const result = readSectionWriteThreshold(1024.7);
      expect(result).toBe(1024);
    });
  });

  describe("requiresSectionWrite", () => {
    it("should return false for sizes at threshold", () => {
      expect(requiresSectionWrite(65536, 65536)).toBe(false);
    });

    it("should return false for sizes below threshold", () => {
      expect(requiresSectionWrite(65000, 65536)).toBe(false);
    });

    it("should return true for sizes above threshold", () => {
      expect(requiresSectionWrite(70000, 65536)).toBe(true);
    });
  });

  describe("checkWholeArtifactWrite", () => {
    it("should return null for artifacts below threshold", () => {
      const result = checkWholeArtifactWrite("test.md", 50000, DEFAULT_SECTION_WRITE_THRESHOLD);
      expect(result).toBeNull();
    });

    it("should return Finding for artifacts above threshold", () => {
      const result = checkWholeArtifactWrite("test.md", 100000, DEFAULT_SECTION_WRITE_THRESHOLD);
      expect(result).not.toBeNull();
      expect(result!.rule).toBe("ARTIFACT_EXCEEDS_THRESHOLD");
      expect(result!.file).toBe("test.md");
      expect(result!.artifactPath).toBe("test.md");
      expect(result!.artifactSize).toBe(100000);
    });
  });

  describe("formatByteSize", () => {
    it("should format bytes", () => {
      expect(formatByteSize(512)).toBe("512 bytes");
    });

    it("should format KiB", () => {
      expect(formatByteSize(1024)).toBe("1.0 KiB");
      expect(formatByteSize(65536)).toBe("64.0 KiB");
    });

    it("should format MiB", () => {
      expect(formatByteSize(1048576)).toBe("1.0 MiB");
    });
  });
});
