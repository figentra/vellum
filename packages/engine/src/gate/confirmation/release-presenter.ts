/**
 * Release Presenter - formats and validates the Release Confirmation.
 *
 * The engine reads no package.json, git or environment: the caller collects
 * the exact package, version, commit, tag, environment and migration set and
 * passes them in. (A previous `collectReleaseConfirmation` returned fixed
 * example values whatever was being released; it is gone.)
 *
 * @see requirements.md Requirement 7.2
 */

/**
 * Release confirmation values.
 */
export interface ReleaseConfirmation {
  /** Package name */
  package_name: string;
  /** Version string */
  version: string;
  /** Commit SHA-1 */
  commit: string;
  /** Tag name */
  tag: string;
  /** Environment name */
  environment: string;
  /** Migration set */
  migrations: string[];
}

/**
 * Format release confirmation for display.
 *
 * @param confirmation - Release confirmation
 * @returns Formatted string
 */
export function formatReleaseConfirmation(confirmation: ReleaseConfirmation): string {
  return `
Release Confirmation
--------------------

Package:    ${confirmation.package_name}
Version:    ${confirmation.version}
Commit:     ${confirmation.commit}
Tag:        ${confirmation.tag}
Environment: ${confirmation.environment}
Migrations: ${confirmation.migrations.length > 0 ? confirmation.migrations.join(", ") : "none"}

Proceed with release? [y/N]
`.trim();
}

/**
 * Validate release confirmation values.
 *
 * @param confirmation - Release confirmation
 * @returns Validation errors
 */
export function validateReleaseConfirmation(confirmation: ReleaseConfirmation): string[] {
  const errors: string[] = [];

  if (!confirmation.package_name.startsWith("@")) {
    errors.push("Package name must be a scoped package");
  }

  if (!confirmation.tag.match(/^v\d+\.\d+\.\d+/)) {
    errors.push("Tag must start with 'v' and follow semver");
  }

  if (!confirmation.commit.match(/^[a-f0-9]{40}$/)) {
    errors.push("Commit must be a valid SHA-1 hash");
  }

  if (confirmation.tag !== `v${confirmation.version}`) {
    errors.push(`Tag ${confirmation.tag} does not name version ${confirmation.version}`);
  }

  if (confirmation.environment.trim() === "") {
    errors.push("Environment must be named");
  }

  return errors;
}
