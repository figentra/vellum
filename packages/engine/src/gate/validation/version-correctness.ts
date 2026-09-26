/**
 * Version Correctness Checker - validates semantic versioning.
 *
 * @see requirements.md Requirement 7.1
 */

/**
 * Version validation result.
 */
export interface VersionValidationResult {
  /** Whether version is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Parsed version components */
  version?: {
    major: number;
    minor: number;
    patch: number;
    prerelease?: string;
  };
}

/**
 * Validate semantic version.
 *
 * @param version - Version string to validate
 * @returns Validation result
 */
export function validateVersion(version: string): VersionValidationResult {
  const errors: string[] = [];

  // Match semver format: major.minor.patch[-prerelease]
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);

  if (!match) {
    return {
      valid: false,
      errors: [`Invalid semantic version: ${version}`],
    };
  }

  const major = parseInt(match[1]!, 10);
  const minor = parseInt(match[2]!, 10);
  const patch = parseInt(match[3]!, 10);
  const prerelease = match[4];

  // Check for valid semver constraints
  if (major < 0 || minor < 0 || patch < 0) {
    errors.push("Version components must be non-negative");
  }

  return {
    valid: errors.length === 0,
    errors,
    version:
      prerelease !== undefined ? { major, minor, patch, prerelease } : { major, minor, patch },
  };
}

/**
 * Check version increment is correct for change type.
 *
 * @param oldVersion - Previous version
 * @param newVersion - New version
 * @param changeType - Type of change
 * @returns True if increment is correct
 */
export function isVersionIncrementCorrect(
  oldVersion: string,
  newVersion: string,
  changeType: "major" | "minor" | "patch",
): boolean {
  const oldParsed = validateVersion(oldVersion);
  const newParsed = validateVersion(newVersion);

  if (!oldParsed.valid || !newParsed.valid || !oldParsed.version || !newParsed.version) {
    return false;
  }

  switch (changeType) {
    case "major":
      return (
        newParsed.version.major === oldParsed.version.major + 1 &&
        newParsed.version.minor === 0 &&
        newParsed.version.patch === 0
      );
    case "minor":
      return (
        newParsed.version.major === oldParsed.version.major &&
        newParsed.version.minor === oldParsed.version.minor + 1 &&
        newParsed.version.patch === 0
      );
    case "patch":
      return (
        newParsed.version.major === oldParsed.version.major &&
        newParsed.version.minor === oldParsed.version.minor &&
        newParsed.version.patch === oldParsed.version.patch + 1
      );
  }
}

/**
 * Check if version uses catalog reference.
 *
 * @param packageJson - package.json content
 * @returns True if using catalog
 */
export function usesCatalogReference(packageJson: {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}): boolean {
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  return Object.values(allDeps).some((v) => v === "catalog:" || v.startsWith("catalog:"));
}
