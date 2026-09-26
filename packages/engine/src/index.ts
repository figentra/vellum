/**
 * @vellum/engine — Pure logic implementation
 *
 * This package implements the Vellum specification lifecycle enforcement.
 * It is pure logic with NO I/O dependencies (no fs, no child_process, no network).
 *
 * All dependencies are injected as data, making it:
 * - Deterministic
 * - Fast to test
 * - Safe to property-test
 */

// Lifecycle state machine
export * from "./lifecycle/state-machine.js";

// Approval verification
export * from "./approval/verify.js";

// Version
export const VERSION = "0.0.0" as const;
