/**
 * @vellum/protocol — Core domain types
 *
 * Defines the foundational types, branded types, and domain identifiers
 * used throughout the Vellum platform.
 */

// ============================================================================
// Branded Types
// ============================================================================

/**
 * Branded type helper - creates a nominal type from a primitive
 */
declare const brand: unique symbol;

export type Branded<T, B> = T & { readonly [brand]: B };

// ============================================================================
// Domain Identifiers (Branded Types)
// ============================================================================

/**
 * Spec ID — the numeric identifier from the spec folder path
 * Format: three-digit number (e.g., "001", "016")
 */
export type SpecId = Branded<string, "SpecId">;

/**
 * Artifact Path — absolute or relative path to an artifact file
 */
export type ArtifactPath = Branded<string, "ArtifactPath">;

/**
 * Checksum — SHA-256 hash in hexadecimal format (64 chars)
 */
export type Checksum = Branded<string, "Checksum">;

/**
 * Commit SHA — Git commit hash (40 chars)
 */
export type CommitSha = Branded<string, "CommitSha">;

/**
 * Task ID — hierarchical task identifier (e.g., "1", "2.3", "5.1.4")
 */
export type TaskId = Branded<string, "TaskId">;

/**
 * Criterion ID — criterion identifier from requirements.md (e.g., "1.2", "3.4")
 */
export type CriterionId = Branded<string, "CriterionId">;

/**
 * Property ID — property identifier from design.md (e.g., "P1", "P2")
 */
export type PropertyId = Branded<string, "PropertyId">;

/**
 * Ledger Entry ID — sequence number in the ledger
 */
export type EntryId = Branded<number, "EntryId">;

/**
 * Rule Identifier — unique string for each diagnostic rule
 * Format: <package>/<category>/<snake_case>
 * Example: "vellum/protocol/CRITERIA_NOT_COVERED"
 */
export type RuleIdentifier = Branded<string, "RuleIdentifier">;

// ============================================================================
// Type Guards and Validators
// ============================================================================

/**
 * Parse and validate a SpecId from a string
 */
export function parseSpecId(value: string): SpecId | null {
  // Must be a three-digit number
  if (!/^\d{3}$/.test(value)) {
    return null;
  }
  return value as SpecId;
}

/**
 * Format a SpecId to string
 */
export function formatSpecId(id: SpecId): string {
  return id;
}

/**
 * Parse and validate a Checksum from a string
 */
export function parseChecksum(value: string): Checksum | null {
  // Must be 64 hex characters
  if (!/^[a-f0-9]{64}$/.test(value)) {
    return null;
  }
  return value as Checksum;
}

/**
 * Format a Checksum to string
 */
export function formatChecksum(checksum: Checksum): string {
  return checksum;
}

/**
 * Parse and validate a CommitSha from a string
 */
export function parseCommitSha(value: string): CommitSha | null {
  // Must be 40 hex characters
  if (!/^[a-f0-9]{40}$/.test(value)) {
    return null;
  }
  return value as CommitSha;
}

/**
 * Format a CommitSha to string
 */
export function formatCommitSha(sha: CommitSha): string {
  return sha;
}

/**
 * Parse and validate a TaskId from a string
 */
export function parseTaskId(value: string): TaskId | null {
  // Must match pattern: N(.N)* where N is a positive integer
  if (!/^\d+(\.\d+)*$/.test(value)) {
    return null;
  }
  return value as TaskId;
}

/**
 * Format a TaskId to string
 */
export function formatTaskId(id: TaskId): string {
  return id;
}

/**
 * Parse and validate a CriterionId from a string
 */
export function parseCriterionId(value: string): CriterionId | null {
  // Must match pattern: N.N where N is a positive integer
  if (!/^\d+\.\d+$/.test(value)) {
    return null;
  }
  return value as CriterionId;
}

/**
 * Format a CriterionId to string
 */
export function formatCriterionId(id: CriterionId): string {
  return id;
}

/**
 * Parse and validate a PropertyId from a string
 */
export function parsePropertyId(value: string): PropertyId | null {
  // Must match pattern: PN where N is a positive integer
  if (!/^P\d+$/.test(value)) {
    return null;
  }
  return value as PropertyId;
}

/**
 * Format a PropertyId to string
 */
export function formatPropertyId(id: PropertyId): string {
  return id;
}

/**
 * Create an EntryId from a number
 */
export function createEntryId(seq: number): EntryId | null {
  if (!Number.isInteger(seq) || seq < 0) {
    return null;
  }
  return seq as EntryId;
}

/**
 * Get the numeric value of an EntryId
 */
export function getEntryIdValue(id: EntryId): number {
  return id;
}

/**
 * Parse and validate a RuleIdentifier from a string
 */
export function parseRuleIdentifier(value: string): RuleIdentifier | null {
  // Must match pattern: <package>/<category>/<snake_case>
  if (!/^[a-z]+\/[a-z]+\/[A-Z_]+$/.test(value)) {
    return null;
  }
  return value as RuleIdentifier;
}

/**
 * Format a RuleIdentifier to string
 */
export function formatRuleIdentifier(rule: RuleIdentifier): string {
  return rule;
}

// ============================================================================
// Spec Directory Types
// ============================================================================

/**
 * A spec directory in `.agents/specs/<slug>/`.
 */
export interface SpecDirectory {
  readonly path: string;
  readonly slug: string;
  readonly number: number;
}

// ============================================================================
// Artifact Types
// ============================================================================

/**
 * One of the three protocol artifacts.
 */
export type ArtifactKind = "requirements" | "design" | "tasks";

/**
 * An artifact file with parsed content.
 */
export interface Artifact {
  readonly kind: ArtifactKind;
  readonly path: ArtifactPath;
  readonly body: string;
  readonly frontmatter: LifecycleFrontmatter;
}

/**
 * Lifecycle frontmatter at the top of each artifact.
 */
export interface LifecycleFrontmatter {
  readonly version: number;
  readonly checksum: Checksum;
  readonly state: LifecycleState;
  readonly createdAt: string; // ISO 8601
  readonly updatedAt: string; // ISO 8601
}

// ============================================================================
// Lifecycle State Types
// ============================================================================

/**
 * Lifecycle states from Table 5.A.
 */
export type LifecycleState =
  | "DRAFT"
  | "IN_REVIEW"
  | "REQUIREMENTS_APPROVED"
  | "DESIGN_IN_REVIEW"
  | "DESIGN_APPROVED"
  | "PLAN_IN_REVIEW"
  | "PLAN_APPROVED"
  | "IN_PROGRESS"
  | "VERIFICATION"
  | "VERIFIED"
  | "MERGED" // Slice 3
  | "RELEASED" // Slice 3
  | "DONE" // Slice 3
  | "BLOCKED"
  | "REJECTED"
  | "SUPERSEDED"
  | "ABANDONED"
  | "INVALID";

/**
 * Terminal states cannot transition.
 */
export type TerminalState = "VERIFIED" | "REJECTED" | "SUPERSEDED" | "ABANDONED" | "INVALID";

/**
 * Check if a state is terminal
 */
export function isTerminalState(state: LifecycleState): state is TerminalState {
  return (
    state === "VERIFIED" ||
    state === "REJECTED" ||
    state === "SUPERSEDED" ||
    state === "ABANDONED" ||
    state === "INVALID"
  );
}

// ============================================================================
// Task Types
// ============================================================================

/**
 * Task marker: [ ] not started, [~] queued, [-] in progress, [x] complete
 */
export type TaskMarker = " " | "~" | "-" | "x";

/**
 * A task line parsed from tasks.md.
 */
export interface TaskLine {
  readonly lineNumber: number;
  readonly marker: TaskMarker;
  readonly identifier: TaskId;
  readonly text: string;
  readonly requirementsTrailer?: readonly CriterionId[];
  readonly propertiesTrailer?: readonly PropertyId[];
  readonly isOptional: boolean;
}

// ============================================================================
// Ledger Entry Types
// ============================================================================

/**
 * A ledger entry.
 */
export interface LedgerEntry {
  readonly seq: EntryId;
  readonly kind: LedgerEntryKind;
  readonly timestamp: string; // ISO 8601
  readonly predecessorHash:
    | Checksum
    | "0000000000000000000000000000000000000000000000000000000000000000";
  readonly payload: LedgerPayload;
  readonly hash?: Checksum; // computed on write
}

/**
 * Ledger entry kinds
 */
export type LedgerEntryKind =
  | "CREATED"
  | "AMENDED"
  | "APPROVAL"
  | "REJECTION"
  | "DECISION"
  | "EVIDENCE"
  | "CLAIM"
  | "FAILURE"
  | "TASK_BINDING"
  | "GATE_RESULT"
  | "MERGE"
  | "RELEASE"
  | "BLOCK"
  | "UNBLOCK"
  | "ADOPTION";

/**
 * Ledger payload discriminated union
 */
export type LedgerPayload =
  | CreatedPayload
  | AmendedPayload
  | ApprovalPayload
  | RejectionPayload
  | DecisionPayload
  | EvidencePayload
  | ClaimPayload
  | FailurePayload
  | TaskBindingPayload
  | GateResultPayload
  | MergePayload
  | ReleasePayload
  | BlockPayload
  | UnblockPayload
  | AdoptionPayload;

/**
 * Created payload — spec directory created
 */
export interface CreatedPayload {
  readonly specId: SpecId;
}

/**
 * Amended payload — artifact amended
 */
export interface AmendedPayload {
  readonly artifactKind: ArtifactKind;
  readonly previousVersion: number;
  readonly previousChecksum: Checksum;
  readonly newVersion: number;
  readonly newChecksum: Checksum;
}

/**
 * Approval payload
 */
export interface ApprovalPayload {
  readonly approver: string;
  readonly artifactKind: ArtifactKind;
  readonly artifactChecksum: Checksum;
  readonly signalCommit: CommitSha;
}

/**
 * Rejection payload
 */
export interface RejectionPayload {
  readonly rejector: string;
  readonly artifactKind: ArtifactKind;
  readonly artifactChecksum: Checksum;
  readonly rationale: string;
  readonly signalCommit: CommitSha;
}

/**
 * Decision payload
 */
export interface DecisionPayload {
  readonly decision: string;
  readonly rationale: string;
}

/**
 * Evidence payload
 */
export interface EvidencePayload {
  readonly taskIdentifier: TaskId;
  readonly commandText: string;
  readonly exitStatus: number;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly headCommit: CommitSha;
  readonly affectedPaths: readonly string[];
  readonly environmentVersions: Record<string, string>;
}

/**
 * Claim payload
 */
export interface ClaimPayload {
  readonly claim: string;
  readonly evidence: string;
}

/**
 * Failure payload
 */
export interface FailurePayload {
  readonly taskIdentifier: TaskId;
  readonly reason: string;
  readonly exitStatus: number;
}

/**
 * Task binding payload
 */
export interface TaskBindingPayload {
  readonly taskIdentifier: TaskId;
  readonly requirementsVersion: number;
  readonly requirementsChecksum: Checksum;
  readonly designVersion: number;
  readonly designChecksum: Checksum;
  readonly planVersion: number;
  readonly planChecksum: Checksum;
}

/**
 * Gate result payload
 */
export interface GateResultPayload {
  readonly gate: string;
  readonly result: CheckResult;
  readonly findings: readonly Finding[];
}

/**
 * Merge payload (Slice 3)
 */
export interface MergePayload {
  readonly mergeCommit: CommitSha;
  readonly targetBranch: string;
}

/**
 * Release payload (Slice 3)
 */
export interface ReleasePayload {
  readonly releaseTag: string;
  readonly releaseCommit: CommitSha;
}

/**
 * Block payload
 */
export interface BlockPayload {
  readonly reason: string;
  readonly blockedBy: string;
}

/**
 * Unblock payload
 */
export interface UnblockPayload {
  readonly reason: string;
  readonly unblockedBy: string;
}

/**
 * Adoption payload — legacy spec adopted
 */
export interface AdoptionPayload {
  readonly specId: SpecId;
  readonly adoptedAt: string;
}

// ============================================================================
// Finding and Diagnostic Types
// ============================================================================

/**
 * A finding from a validator.
 */
export interface Finding {
  readonly file: string;
  readonly line: number;
  readonly rule: RuleIdentifier;
  readonly message: string;
}

/**
 * Check result: PASS, FAIL, or INCONCLUSIVE.
 */
export type CheckResult = "PASS" | "FAIL" | "INCONCLUSIVE";

/**
 * Examination summary for a PASS result.
 */
export interface ExaminationSummary {
  readonly kind: string;
  readonly count: number;
}
