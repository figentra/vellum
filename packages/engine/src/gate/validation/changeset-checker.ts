/**
 * Changeset Checker - validates changesets for documentation and versioning.
 *
 * The engine reads no files: the caller supplies the `.changeset/*.md` files
 * the change adds. A changeset is a Changesets file: a frontmatter block of
 * `"<package>": major | minor | patch` lines, then a non-empty summary.
 *
 * @see requirements.md Requirement 6.1
 */

import type { CheckOutcome } from "./outcome.js";

/** A changeset file the change adds. */
export interface ChangesetFile {
  /** Repository path, e.g. `.changeset/brave-owls-sing.md` */
  readonly path: string;
  /** File content */
  readonly content: string;
}

/** One package release a changeset declares. */
export interface ChangesetRelease {
  readonly package: string;
  readonly bump: "major" | "minor" | "patch";
}

/**
 * Changeset validation result.
 */
export interface ChangesetValidationResult {
  /** Whether the changeset is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Releases the changeset declares */
  releases: ChangesetRelease[];
}

/**
 * Check the changesets a change adds.
 *
 * @param required - Whether the Policy requires a changeset for this change
 * @param changesets - The changeset files the change adds; undefined when the caller did not read them
 * @returns pass, fail naming each problem, or not_checked when the files were not supplied
 */
export function checkChangeset(
  required: boolean,
  changesets: readonly ChangesetFile[] | undefined,
): CheckOutcome {
  if (changesets === undefined) {
    return required
      ? { status: "not_checked", reason: "the change's .changeset files were not supplied" }
      : { status: "pass" };
  }

  const errors: string[] = [];
  if (required && changesets.length === 0) {
    errors.push("The Policy requires a changeset and the change adds none");
  }
  for (const file of changesets) {
    for (const error of validateChangesetContent(file.content).errors) {
      errors.push(`${file.path}: ${error}`);
    }
  }
  return errors.length === 0 ? { status: "pass" } : { status: "fail", errors };
}

/**
 * Validate one changeset file's content.
 *
 * @param content - The file's content
 * @returns Validation result
 */
export function validateChangesetContent(content: string): ChangesetValidationResult {
  const errors: string[] = [];
  const releases: ChangesetRelease[] = [];
  const match = content.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n?---\n?([\s\S]*)$/);
  if (!match) {
    return { valid: false, errors: ["no frontmatter block (--- … ---)"], releases };
  }

  const [, frontmatter = "", summary = ""] = match;
  for (const line of frontmatter.split("\n")) {
    if (line.trim() === "") continue;
    const release = line.match(/^\s*["']?([^"':\s]+)["']?\s*:\s*(major|minor|patch)\s*$/);
    if (release && release[1] && release[2]) {
      releases.push({ package: release[1], bump: release[2] as ChangesetRelease["bump"] });
    } else {
      errors.push(`frontmatter line is not "<package>": major|minor|patch: ${line.trim()}`);
    }
  }
  if (releases.length === 0 && errors.length === 0) {
    errors.push("declares no package release");
  }
  if (summary.trim() === "") {
    errors.push("has no summary");
  }

  return { valid: errors.length === 0, errors, releases };
}

/**
 * Check if changesets are required for a change.
 *
 * @param hasPublicSurfaceChange - Whether change affects public surface
 * @returns True if changeset required
 */
export function isChangesetRequired(hasPublicSurfaceChange: boolean): boolean {
  return hasPublicSurfaceChange;
}
