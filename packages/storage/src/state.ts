/**
 * @vellum/storage — State File Operations
 *
 * Machine folder management for spec state.
 * Stores computed state outside of version control.
 */

import { join } from "node:path";
import type { SpecState, LifecycleState } from "@vellum/protocol";
import { brand } from "@vellum/protocol";
import { createFilesystem } from "./fs.js";

/** Machine folder name */
export const MACHINE_FOLDER = ".sdlc";

/** State file name */
export const STATE_FILE = "state.json";

/** Ledger file name */
export const LEDGER_FILE = "ledger.jsonl";

/**
 * Get machine folder path for a spec directory.
 */
export function getMachineFolder(specPath: string): string {
  return join(specPath, MACHINE_FOLDER);
}

/**
 * Get ledger file path for a spec directory.
 */
export function getLedgerPath(specPath: string): string {
  return join(getMachineFolder(specPath), LEDGER_FILE);
}

/**
 * Get state file path for a spec directory.
 */
export function getStatePath(specPath: string): string {
  return join(getMachineFolder(specPath), STATE_FILE);
}

/**
 * Initialize machine folder for a spec.
 * Creates .sdlc/ directory and initializes ledger.jsonl.
 */
export async function initMachineFolder(specPath: string): Promise<string> {
  const fs = createFilesystem(specPath);
  const machineFolder = MACHINE_FOLDER;

  // Create machine folder
  await fs.mkdirp(machineFolder);

  // Initialize ledger with claim entry
  const ledgerPath = join(machineFolder, LEDGER_FILE);
  if (!(await fs.exists(ledgerPath))) {
    await fs.writeFile(ledgerPath, "");
  }

  return machineFolder;
}

/**
 * Read spec state from machine folder.
 */
export async function readState(machineFolder: string): Promise<SpecState> {
  const fs = createFilesystem(machineFolder);
  const statePath = STATE_FILE;

  if (!(await fs.exists(statePath))) {
    // Return default state if file doesn't exist
    return {
      effectiveState: "DRAFT",
      recordedState: "DRAFT",
    };
  }

  const content = await fs.readFile(statePath);

  try {
    const data = JSON.parse(content);
    const baseState = {
      effectiveState: data.effectiveState as LifecycleState,
      recordedState: data.recordedState as LifecycleState,
    };

    if (data.lastTransition) {
      return {
        ...baseState,
        lastTransition: {
          from: data.lastTransition.from as LifecycleState,
          to: data.lastTransition.to as LifecycleState,
          timestamp: data.lastTransition.timestamp,
          commit: brand<string, "CommitSha">(data.lastTransition.commit),
        },
      };
    }

    return baseState;
  } catch {
    throw new Error(`Invalid state file: ${statePath}`);
  }
}

/**
 * Write spec state to machine folder.
 */
export async function writeState(machineFolder: string, state: Partial<SpecState>): Promise<void> {
  const fs = createFilesystem(machineFolder);
  const statePath = STATE_FILE;

  // Read existing state
  const existing = await readState(machineFolder);

  // Merge updates
  const updated: SpecState = {
    ...existing,
    ...state,
  };

  // Write atomically
  const content = JSON.stringify(updated, null, 2);
  await fs.writeFile(statePath, content);
}

/**
 * Clear state file (reset to default).
 */
export async function clearState(machineFolder: string): Promise<void> {
  const fs = createFilesystem(machineFolder);
  const statePath = STATE_FILE;

  if (await fs.exists(statePath)) {
    await fs.delete(statePath);
  }
}

/**
 * Discover all spec directories in repository.
 */
export async function discoverMachineFolders(repoPath: string): Promise<string[]> {
  const fs = createFilesystem(repoPath);
  const specsPath = ".agents/specs";

  if (!(await fs.exists(specsPath))) {
    return [];
  }

  const specDirs = await fs.readdir(specsPath);
  const machineFolders: string[] = [];

  for (const specDir of specDirs) {
    const specPath = join(specsPath, specDir);
    const machineFolder = join(specPath, MACHINE_FOLDER);

    if (await fs.exists(machineFolder)) {
      machineFolders.push(machineFolder);
    }
  }

  return machineFolders;
}

/**
 * Get cache file path (outside VCS).
 * Cache is stored in ~/.cache/vellum/<repo-hash>/.
 */
export function getCachePath(repoPath: string): string {
  // Use a hash of the repo path for uniqueness
  const { createHash } = require("node:crypto");
  const repoHash = createHash("sha256").update(repoPath, "utf8").digest("hex").slice(0, 16);

  // Platform-specific cache directory
  const cacheDir =
    process.platform === "win32"
      ? join(process.env.LOCALAPPDATA || "~", "cache", "vellum")
      : join(process.env.XDG_CACHE_HOME || join("~", ".cache"), "vellum");

  return join(cacheDir, repoHash);
}

/**
 * Clear all cache files for a repository.
 */
export async function clearCache(repoPath: string): Promise<void> {
  const fs = createFilesystem(repoPath);
  const cachePath = getCachePath(repoPath);

  if (await fs.exists(cachePath)) {
    // Delete all files in cache
    const files = await fs.readdir(cachePath);
    for (const file of files) {
      await fs.delete(join(cachePath, file));
    }
  }
}
