/**
 * Section Write Threshold - determines when Artifacts use Section Writes.
 *
 * @see Requirement 20.17 - default 65,536 bytes
 */

import type { Finding } from "@vellum/protocol";

/**
 * Default Section Write Threshold in bytes.
 */
export const DEFAULT_SECTION_WRITE_THRESHOLD = 65536; // 64 KiB

/**
 * Section Write Threshold Finding when whole-Artifact write refused.
 */
export interface SectionWriteThresholdFinding extends Finding {
  readonly rule: "ARTIFACT_EXCEEDS_THRESHOLD";
  readonly artifactPath: string;
  readonly artifactSize: number;
  readonly threshold: number;
  readonly level: "error";
}

/**
 * Read Section Write Threshold from Policy.
 *
 * @param declaredThreshold - threshold declared in Policy (if any)
 * @returns validated threshold
 */
export function readSectionWriteThreshold(declaredThreshold: unknown): number {
  if (declaredThreshold === undefined || declaredThreshold === null) {
    return DEFAULT_SECTION_WRITE_THRESHOLD;
  }

  if (typeof declaredThreshold !== "number") {
    return DEFAULT_SECTION_WRITE_THRESHOLD;
  }

  if (declaredThreshold < 1024) {
    // Threshold is very small but valid
  }

  return Math.floor(declaredThreshold);
}

/**
 * Check if an Artifact requires Section Writes.
 *
 * @param artifactSize - artifact size in bytes
 * @param threshold - Section Write Threshold
 * @returns true if Section Writes required
 */
export function requiresSectionWrite(artifactSize: number, threshold: number): boolean {
  return artifactSize > threshold;
}

/**
 * Check if whole-Artifact write is permitted.
 *
 * @param artifactPath - path to the Artifact
 * @param artifactSize - artifact size in bytes
 * @param threshold - Section Write Threshold
 * @returns Finding if write refused, null if permitted
 */
export function checkWholeArtifactWrite(
  artifactPath: string,
  artifactSize: number,
  threshold: number,
): SectionWriteThresholdFinding | null {
  if (!requiresSectionWrite(artifactSize, threshold)) {
    return null;
  }

  return {
    file: artifactPath,
    line: 1,
    rule: "ARTIFACT_EXCEEDS_THRESHOLD",
    artifactPath,
    artifactSize,
    threshold,
    level: "error",
    message: `Artifact ${artifactPath} (${artifactSize} bytes) exceeds Section Write Threshold (${threshold} bytes). Use Section Writes.`,
  };
}

/**
 * Format byte size for display.
 *
 * @param bytes - size in bytes
 * @returns formatted string (e.g., "64 KiB")
 */
export function formatByteSize(bytes: number): string {
  const units = ["bytes", "KiB", "MiB", "GiB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  if (unitIndex === 0) {
    return `${size} ${units[unitIndex]}`;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
