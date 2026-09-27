/**
 * @vellum/testing — Testing utilities
 *
 * - Fixture-repo builder
 * - Conformance harness
 * - Property test helpers
 * - Parity test fixtures
 * - Performance benchmarks
 *
 * Can depend on any package (private, never published)
 */

// Core testing framework
export {
  FixtureBuilder,
  SimulatedRepo,
  createMinimalSpec,
  createArtifact,
  createTestLedger,
  computePredecessorDigest,
  testChecksum,
  withTestDir,
  randomSpecId,
  randomChecksum,
  randomCommitSha,
} from "./framework.js";

// Assertion helpers
export {
  assertFindingCode,
  assertFindingsSorted,
  assertEqual,
  assertTrue,
  assertContains,
} from "./framework.js";

// Version
export const VERSION = "0.0.0" as const;
