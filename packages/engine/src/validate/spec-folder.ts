/**
 * @vellum/engine — Spec Folder Validator
 *
 * Validates .agents/specs/ structure and machine folders.
 * Pure function - no I/O.
 *
 * @see design.md Criterion 23
 */

import type { Finding } from "@vellum/protocol";
import { createFinding } from "./finding.js";

/**
 * Spec folder validation result.
 */
export interface SpecFolderValidationResult {
  /** Whether validation passed */
  readonly valid: boolean;
  /** All findings */
  readonly findings: readonly Finding[];
}

/**
 * Permitted entries in a spec directory.
 * Criterion 23.1: Permitted entries validated
 */
const PERMITTED_ENTRIES = ["requirements.md", "design.md", "tasks.md", ".sdlc"] as const;

/**
 * Validate spec directory structure.
 *
 * @param entries - Directory entries (filenames)
 * @param specId - Spec ID for error messages
 * @param isProgramme - Whether this is a programme spec
 * @returns Validation result
 */
export function validateSpecFolder(
  entries: readonly string[],
  specId: string,
  isProgramme: boolean,
): SpecFolderValidationResult {
  const findings: Finding[] = [];

  // Criterion 23.2: Check for extra files
  for (const entry of entries) {
    if (!PERMITTED_ENTRIES.includes(entry as any)) {
      findings.push(
        createFinding(
          `${specId}/${entry}`,
          0,
          "SPEC_EXTRA_FILE",
          `Extra file in spec directory: ${entry}`,
        ),
      );
    }
  }

  // Criterion 23.6: Programme spec with tasks.md reported
  if (isProgramme && entries.includes("tasks.md")) {
    findings.push(
      createFinding(
        `${specId}/tasks.md`,
        0,
        "PROGRAMME_SPEC_HAS_TASKS",
        `Programme spec cannot have tasks.md`,
      ),
    );
  }

  // Criterion 23.7: Programme spec without requirements.md reported
  if (isProgramme && !entries.includes("requirements.md")) {
    findings.push(
      createFinding(
        `${specId}`,
        0,
        "SPEC_MISSING_REQUIREMENTS",
        `Programme spec missing requirements.md`,
      ),
    );
  }

  // Check for required files (non-programme specs)
  if (!isProgramme) {
    if (!entries.includes("requirements.md")) {
      findings.push(
        createFinding(`${specId}`, 0, "SPEC_MISSING_REQUIREMENTS", `Spec missing requirements.md`),
      );
    }
  }

  return {
    valid: findings.length === 0,
    findings: Object.freeze(findings),
  };
}

/**
 * Validate machine folder contents.
 * Criterion 23.5: Machine folder files validated
 *
 * @param entries - Machine folder entries
 * @param specId - Spec ID
 * @returns Validation result
 */
export function validateMachineFolder(
  entries: readonly string[],
  specId: string,
): SpecFolderValidationResult {
  const findings: Finding[] = [];

  // Permitted files in .sdlc/
  const permitted = ["ledger.jsonl", "metadata.json", "state.json"];

  for (const entry of entries) {
    if (!permitted.includes(entry)) {
      findings.push(
        createFinding(
          `${specId}/.sdlc/${entry}`,
          0,
          "SPEC_MACHINE_FOLDER_INVALID",
          `Invalid file in machine folder: ${entry}`,
        ),
      );
    }
  }

  // Check required ledger file
  if (!entries.includes("ledger.jsonl")) {
    findings.push(
      createFinding(
        `${specId}/.sdlc/ledger.jsonl`,
        0,
        "SPEC_MACHINE_FOLDER_INVALID",
        `Missing required ledger.jsonl`,
      ),
    );
  }

  return {
    valid: findings.length === 0,
    findings: Object.freeze(findings),
  };
}

/**
 * Check if a spec is a legacy spec (no frontmatter).
 */
export function isLegacySpec(entries: readonly string[]): boolean {
  // Legacy specs have markdown files but no .sdlc folder
  const hasMarkdown =
    entries.includes("requirements.md") ||
    entries.includes("design.md") ||
    entries.includes("tasks.md");
  const hasMachineFolder = entries.includes(".sdlc");

  return hasMarkdown && !hasMachineFolder;
}

/**
 * Detect legacy spec stage from artifacts present.
 * Criterion 5.14: Legacy Stage derived from artifacts present
 */
export function detectLegacyStage(entries: readonly string[]): string {
  const hasRequirements = entries.includes("requirements.md");
  const hasDesign = entries.includes("design.md");
  const hasTasks = entries.includes("tasks.md");

  if (hasRequirements && hasDesign && hasTasks) {
    return "in-progress";
  }

  if (hasRequirements && hasDesign) {
    return "tasks";
  }

  if (hasRequirements) {
    return "design";
  }

  if (hasTasks) {
    // Invalid: tasks without requirements
    return "invalid";
  }

  return "empty";
}

/**
 * Check if a spec ID is a programme spec.
 */
export function isProgrammeSpecEntry(entries: readonly string[]): boolean {
  // Programme specs don't have design.md or tasks.md in expected flow
  const hasDesign = entries.includes("design.md");
  const hasTasks = entries.includes("tasks.md");

  // If only requirements exists and it's marked as programme
  return entries.includes("requirements.md") && !hasDesign && !hasTasks;
}
