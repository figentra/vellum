/**
 * @vellum/storage — The ONLY package that touches disk/network
 *
 * This package encapsulates all I/O operations:
 * - File system operations (atomic writes, section writes)
 * - Git CLI adapter (log, show, signatures, status)
 * - Ledger read/append (append-only, fork detection)
 * - State file management (machine folder operations)
 */

// Filesystem operations
export * from "./fs.js";

// Git operations
export * from "./git.js";

// Ledger operations
export * from "./ledger.js";

// State file operations
export * from "./state.js";

// Version
export const VERSION = "0.0.0" as const;
