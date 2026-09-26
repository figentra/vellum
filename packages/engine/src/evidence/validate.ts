/**
 * @vellum/engine — Evidence Validation
 *
 * Validates evidence completeness and correctness.
 * Pure function - no I/O.
 *
 * @see design.md Criterion 9
 */

import type { LedgerEntry, Checksum } from "@vellum/protocol";
import { createFinding } from "../validate/finding.js";

/**
 * Evidence validation result.
 */
export interface EvidenceValidationResult {
  /** Whether evidence is valid */
  readonly valid: boolean;
  /** Validation errors */
  readonly errors: readonly string[];
}

/**
 * Validate an evidence entry.
 * Checks: exit status, timestamps, commit, no secrets.
 *
 * @param evidence - Evidence payload from ledger
 * @param commits - Available git commits
 * @returns Validation result
 */
export function validateEvidence(
  evidence: {
    readonly exit_status?: number;
    readonly start_timestamp?: string;
    readonly finish_timestamp?: string;
    readonly commit?: string;
    readonly command?: string;
    readonly uncommitted?: boolean;
  },
  commits: ReadonlyMap<string, unknown>,
): EvidenceValidationResult {
  const errors: string[] = [];

  // Criterion 9.8: Non-zero exit status handling
  if (evidence.exit_status !== undefined && evidence.exit_status !== 0) {
    errors.push(`Evidence has non-zero exit status: ${evidence.exit_status}`);
  }

  // Criterion 9.9: Commit existence check
  if (evidence.commit && !commits.has(evidence.commit)) {
    errors.push(`Commit not found: ${evidence.commit}`);
  }

  // Criterion 9.5: Timestamp validity
  if (evidence.start_timestamp) {
    try {
      const start = new Date(evidence.start_timestamp);
      if (isNaN(start.getTime())) {
        errors.push(`Invalid start timestamp: ${evidence.start_timestamp}`);
      }

      // Check not in future
      if (start.getTime() > Date.now()) {
        errors.push(`Start timestamp is in the future: ${evidence.start_timestamp}`);
      }
    } catch (error) {
      errors.push(`Failed to parse start timestamp: ${evidence.start_timestamp}`);
    }
  }

  if (evidence.finish_timestamp) {
    try {
      const finish = new Date(evidence.finish_timestamp);
      if (isNaN(finish.getTime())) {
        errors.push(`Invalid finish timestamp: ${evidence.finish_timestamp}`);
      }

      // Check not in future
      if (finish.getTime() > Date.now()) {
        errors.push(`Finish timestamp is in the future: ${evidence.finish_timestamp}`);
      }
    } catch (error) {
      errors.push(`Failed to parse finish timestamp: ${evidence.finish_timestamp}`);
    }
  }

  // Criterion 9.4: Secret pattern check
  if (evidence.command) {
    const secretResult = containsSecretPattern(evidence.command);
    if (secretResult.contains) {
      errors.push(`Evidence contains potential secret pattern: ${secretResult.pattern}`);
    }
  }

  // Criterion 9.6: Uncommitted check
  if (evidence.uncommitted === true) {
    errors.push("Evidence recorded with uncommitted changes");
  }

  return {
    valid: errors.length === 0,
    errors: Object.freeze(errors),
  };
}

/**
 * Check if text contains a secret pattern.
 * Criterion 9.4: Secret pattern match refusal
 */
export function containsSecretPattern(
  text: string,
): { contains: true; pattern: string } | { contains: false } {
  const patterns = [
    { name: "AWS_ACCESS_KEY_ID", pattern: /AKIA[A-Z0-9]{16}/ },
    { name: "AWS_SECRET_ACCESS_KEY", pattern: /[A-Za-z0-9/+=]{40}/ },
    { name: "GITHUB_TOKEN", pattern: /ghp_[A-Za-z0-9]{36}/ },
    { name: "GENERIC_BEARER_TOKEN", pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/ },
    { name: "BASE64_SECRET", pattern: /[A-Za-z0-9+/]{40,}={0,2}/ },
    { name: "PRIVATE_KEY", pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
  ];

  for (const { name, pattern } of patterns) {
    if (pattern.test(text)) {
      return { contains: true, pattern: name };
    }
  }

  return { contains: false };
}

/**
 * Check if a task has evidence with exit status 0.
 * Criterion 9.1: Unverified completion detection
 */
export function hasVerifiedEvidence(
  ledger: readonly LedgerEntry[],
  taskIdentifier: string,
): boolean {
  for (const entry of ledger) {
    if (entry.kind === "evidence") {
      const payload = entry as any;
      if (payload.task_id === taskIdentifier || payload.taskIdentifier === taskIdentifier) {
        return payload.exit_status === 0;
      }
    }
  }

  return false;
}

/**
 * Find all tasks with unverified evidence.
 */
export function findUnverifiedTasks(
  ledger: readonly LedgerEntry[],
): Array<{ taskId: string; exitStatus: number }> {
  const unverified: Array<{ taskId: string; exitStatus: number }> = [];

  for (const entry of ledger) {
    if (entry.kind === "evidence") {
      const payload = entry as any;
      const taskId = payload.task_id ?? payload.taskIdentifier;
      const exitStatus = payload.exit_status ?? payload.exitStatus ?? 1;

      if (exitStatus !== 0) {
        unverified.push({
          taskId,
          exitStatus,
        });
      }
    }
  }

  return unverified;
}

/**
 * Count evidence entries in ledger.
 */
export function countEvidence(ledger: readonly LedgerEntry[]): number {
  return ledger.filter((e) => e.kind === "evidence").length;
}

/**
 * Check evidence completeness.
 * Criterion 18.11: All required tasks have evidence
 */
export function checkEvidenceCompleteness(
  requiredTasks: readonly string[],
  ledger: readonly LedgerEntry[],
): { complete: boolean; missing: readonly string[] } {
  const missing: string[] = [];

  for (const taskId of requiredTasks) {
    if (!hasVerifiedEvidence(ledger, taskId)) {
      missing.push(taskId);
    }
  }

  return {
    complete: missing.length === 0,
    missing: Object.freeze(missing),
  };
}
