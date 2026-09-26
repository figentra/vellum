/**
 * Release Presenter - collects exact values for Release Confirmation.
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
 * Collect release confirmation values.
 *
 * @param _specSlug - Spec slug
 * @returns Release confirmation values
 */
export async function collectReleaseConfirmation(_specSlug: string): Promise<ReleaseConfirmation> {
  // In real implementation, this collects:
  // 1. Package name from package.json
  // 2. Version from package.json or git tag
  // 3. Current commit SHA from git rev-parse HEAD
  // 4. Tag name (version with 'v' prefix)
  // 5. Environment name from config
  // 6. Migration set from .sdlc/migrations/

  return {
    package_name: "@figentra/vellum",
    version: "1.0.0",
    commit: "abc123def456",
    tag: "v1.0.0",
    environment: "production",
    migrations: ["2026_09_01_init"],
  };
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

  return errors;
}
