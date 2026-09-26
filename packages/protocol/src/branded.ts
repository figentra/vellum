/**
 * @vellum/protocol — Branded Types
 *
 * Branded types provide type safety for domain identifiers.
 * They are nominal (not structural) to prevent mixing different ID types.
 */

/** Branded type marker */
export type Branded<T, B> = T & { readonly __brand: B };

// ============================================================================
// Type Guards and Constructors
// ============================================================================

/**
 * Create a branded type from an underlying value.
 * Use when you're certain the value is valid (e.g., after parsing).
 */
export function brand<T, B>(value: T): Branded<T, B> {
  return value as Branded<T, B>;
}

/**
 * Extract the underlying value from a branded type.
 * Use when you need to serialize or display the value.
 */
export function unbrand<T, B>(branded: Branded<T, B>): T {
  return branded as T;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/** Check if a string is a valid hex string of given length */
export function isHexString(value: string, length: number): boolean {
  return value.length === length && /^[a-f0-9]+$/i.test(value);
}

/** Check if a string is a valid SHA-256 checksum */
export function isValidChecksum(value: string): boolean {
  return isHexString(value, 64);
}

/** Check if a string is a valid Git SHA (40 hex chars) */
export function isValidGitSha(value: string): boolean {
  return isHexString(value, 40);
}

/** Check if a string is a valid task identifier (e.g., "1", "2.3") */
export function isValidTaskId(value: string): boolean {
  return /^\d+(\.\d+)*$/.test(value);
}

/** Check if a string is a valid criterion identifier (e.g., "1.2") */
export function isValidCriterionId(value: string): boolean {
  return /^\d+\.\d+$/.test(value);
}

/** Check if a string is a valid property identifier (e.g., "P1") */
export function isValidPropertyId(value: string): boolean {
  return /^P\d+$/.test(value);
}

/** Check if a string is a valid spec ID (e.g., "016") */
export function isValidSpecId(value: string): boolean {
  return /^\d{3,}$/.test(value);
}

/** Check if a spec number is valid (positive integer) */
export function isValidSpecNumber(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/** Check if a sequence number is valid (non-negative integer) */
export function isValidEntrySeq(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

// ============================================================================
// Parsing Functions (safe construction)
// ============================================================================

/** Parse a checksum from string, returning null if invalid */
export function parseChecksum(value: string): Branded<string, "Checksum"> | null {
  return isValidChecksum(value) ? brand<string, "Checksum">(value) : null;
}

/** Parse a Git SHA from string, returning null if invalid */
export function parseCommitSha(value: string): Branded<string, "CommitSha"> | null {
  return isValidGitSha(value) ? brand<string, "CommitSha">(value) : null;
}

/** Parse a task ID from string, returning null if invalid */
export function parseTaskId(value: string): Branded<string, "TaskId"> | null {
  return isValidTaskId(value) ? brand<string, "TaskId">(value) : null;
}

/** Parse a criterion ID from string, returning null if invalid */
export function parseCriterionId(value: string): Branded<string, "CriterionId"> | null {
  return isValidCriterionId(value) ? brand<string, "CriterionId">(value) : null;
}

/** Parse a property ID from string, returning null if invalid */
export function parsePropertyId(value: string): Branded<string, "PropertyId"> | null {
  return isValidPropertyId(value) ? brand<string, "PropertyId">(value) : null;
}

/** Parse a spec ID from string, returning null if invalid */
export function parseSpecId(value: string): Branded<string, "SpecId"> | null {
  return isValidSpecId(value) ? brand<string, "SpecId">(value) : null;
}

/** Parse a sequence number from number, returning null if invalid */
export function parseEntrySeq(value: number): Branded<number, "EntrySeq"> | null {
  return isValidEntrySeq(value) ? brand<number, "EntrySeq">(value) : null;
}

// ============================================================================
// Format Functions (safe deconstruction)
// ============================================================================

/** Format checksum as string (64 lower-case hex chars) */
export function formatChecksum(checksum: Branded<string, "Checksum">): string {
  return unbrand(checksum).toLowerCase();
}

/** Format commit SHA as string (40 lower-case hex chars) */
export function formatCommitSha(sha: Branded<string, "CommitSha">): string {
  return unbrand(sha).toLowerCase();
}

/** Format task ID as string */
export function formatTaskId(taskId: Branded<string, "TaskId">): string {
  return unbrand(taskId);
}

/** Format criterion ID as string */
export function formatCriterionId(criterionId: Branded<string, "CriterionId">): string {
  return unbrand(criterionId);
}

/** Format property ID as string */
export function formatPropertyId(propertyId: Branded<string, "PropertyId">): string {
  return unbrand(propertyId);
}

/** Format spec ID as string */
export function formatSpecId(specId: Branded<string, "SpecId">): string {
  return unbrand(specId);
}

/** Create entry ID from number */
export function createEntryId(id: number): Branded<number, "EntrySeq"> {
  if (!isValidEntrySeq(id)) {
    throw new Error(`Invalid entry ID: ${id}`);
  }
  return brand<number, "EntrySeq">(id);
}

/** Get numeric value from entry ID */
export function getEntryIdValue(id: Branded<number, "EntrySeq">): number {
  return unbrand(id);
}

/** Parse rule identifier */
export function parseRuleIdentifier(value: string): string | null {
  // Rule identifier format: package/category/rule_name
  if (/^[a-z]+\/[a-z]+\/[A-Z_]+$/.test(value)) {
    return value;
  }
  return null;
}

/** Format rule identifier */
export function formatRuleIdentifier(rule: string): string {
  return rule;
}
