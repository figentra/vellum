/**
 * @vellum/storage — I/O layer (file system, git, ledger)
 *
 * This package is the ONLY package with I/O. It reads and writes files,
 * git repository state, and the Ledger. Wraps the engine with side effects.
 *
 * ## Design Principles
 *
 * - All I/O is in this package
 * - Engine remains pure
 * - Atomic operations where possible
 * - Ledger modifications only through programmatic interface
 */

// Placeholder — will be populated during Slice 1 Wave 3 implementation
export const VERSION = "0.0.0" as const;
