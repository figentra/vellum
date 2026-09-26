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

// ============================================================================
// Filesystem Operations
// ============================================================================

export {
  createFilesystem,
  parseFrontmatter,
  serializeFrontmatter,
  computeChecksum,
  stripFrontmatter,
} from "./fs.js";

// ============================================================================
// Git Operations
// ============================================================================

export { createGitOps, verifyCommitSignature, getSignatureStatus } from "./git.js";

// ============================================================================
// Ledger Operations
// ============================================================================

export {
  readLedger,
  getLastEntry,
  appendLedgerEntry,
  verifyLedgerIntegrity,
  readLedgerHead,
  parseLedgerHead,
  getLedgerHeadPath,
  LEDGER_HEAD_FILE,
  detectFork,
  parseLedger,
  LedgerError,
  nodeLedgerFileSystem,
  type NewLedgerEntry,
  type LedgerErrorCode,
  type LedgerFileSystem,
  type AppendLedgerEntryOptions,
} from "./ledger.js";

// ============================================================================
// Machine Folder Operations
// ============================================================================

export {
  MACHINE_FOLDER,
  STATE_FILE,
  LEDGER_FILE,
  getMachineFolder,
  getLedgerPath,
  getStatePath,
  initMachineFolder,
  readState,
  writeState,
  clearState,
  discoverMachineFolders,
  getCachePath,
  clearCache,
} from "./state.js";

// ============================================================================
// Policy Operations
// ============================================================================

export {
  loadPolicy,
  getApproverByEmail,
  isAuthorisedForRiskClass,
  getRequirementsForRiskClass,
} from "./policy.js";

// ============================================================================
// Spec Discovery
// ============================================================================

export {
  SPEC_DIR,
  ARTIFACT_FILES,
  discoverSpecs,
  readSpecMetadata,
  findSpec,
  isValidSpecDirectory,
} from "./discovery.js";

// ============================================================================
// Artifact Cache
// ============================================================================

export { createCache } from "./cache.js";

// ============================================================================
// Version
// ============================================================================

export const VERSION = "0.0.0" as const;
