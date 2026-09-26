/**
 * Spec Size Limiter - checks acceptance-criterion count against limit.
 *
 * @see Requirement 13.1 - warn when criterion count exceeds limit
 * @see Requirement 13.2 - produce Split Proposal on exceed
 * @see Requirement 13.3 - assign Requirements to proposed Child Specs by Delivery slice
 * @see Requirement 13.4 - report within limit status
 * @see Requirement 13.5 - permit transitions with only Spec Size Limit Finding
 * @see Requirement 13.6 - default limit 80 criteria
 * @see Requirement 13.7 - exit 2 for non-positive-integer limit
 */

import type { Finding } from "../../domain/ledger/types";

/**
 * Default Spec Size Limit.
 */
export const DEFAULT_SPEC_SIZE_LIMIT = 80;

/**
 * Spec Size Limit Finding.
 */
export interface SpecSizeLimitFinding extends Finding {
  readonly specId: string;
  readonly criterionCount: number;
  readonly limit: number;
  readonly splitProposal: SplitProposal;
}

/**
 * Split Proposal for a large Spec.
 */
export interface SplitProposal {
  readonly specId: string;
  readonly proposedChildren: readonly ProposedChildSpec[];
}

/**
 * Proposed Child Spec from a split.
 */
export interface ProposedChildSpec {
  readonly identifier: string;
  readonly title: string;
  readonly deliverySlice: number;
  readonly requirements: readonly string[];
}

/**
 * Check Spec Size Limit from Policy.
 *
 * @param declaredLimit - limit declared in Policy (if any)
 * @returns validated limit
 * @throws Error if limit is not a positive integer
 */
export function validateSpecSizeLimit(declaredLimit: unknown): number {
  if (declaredLimit === undefined || declaredLimit === null) {
    return DEFAULT_SPEC_SIZE_LIMIT;
  }

  if (typeof declaredLimit !== "number" || !Number.isInteger(declaredLimit)) {
    throw new Error(`Spec Size Limit must be a positive integer, got ${declaredLimit}`);
  }

  if (declaredLimit < 1) {
    throw new Error(`Spec Size Limit must be a positive integer, got ${declaredLimit}`);
  }

  return declaredLimit;
}

/**
 * Check acceptance-criterion count against Spec Size Limit.
 *
 * @param specId - Spec identifier
 * @param criterionCount - number of acceptance criteria
 * @param limit - Spec Size Limit
 * @returns Finding or null if within limit
 */
export function checkSpecSizeLimit(
  specId: string,
  criterionCount: number,
  limit: number,
): SpecSizeLimitFinding | null {
  if (criterionCount <= limit) {
    return null;
  }

  return {
    code: "SPEC_SIZE_LIMIT_EXCEEDED",
    specId,
    criterionCount,
    limit,
    level: "warn",
    message: `Spec ${specId} has ${criterionCount} acceptance criteria, exceeding the limit of ${limit}`,
    splitProposal: generateSplitProposal(specId, criterionCount, limit),
  };
}

/**
 * Generate a Split Proposal for a large Spec.
 *
 * Assigns Requirements to proposed Child Specs by their first Delivery slice.
 *
 * @param specId - Spec identifier
 * @param criterionCount - number of criteria
 * @param limit - Spec Size Limit
 * @returns Split Proposal
 */
export function generateSplitProposal(
  specId: string,
  criterionCount: number,
  limit: number,
): SplitProposal {
  // Placeholder: in real implementation would analyze requirements
  // and their Delivery slice annotations

  const sliceCount = Math.ceil(criterionCount / limit);

  const proposedChildren: ProposedChildSpec[] = [];
  for (let i = 0; i < sliceCount; i++) {
    proposedChildren.push({
      identifier: `${specId}-${i + 1}`,
      title: `Split ${i + 1} from ${specId}`,
      deliverySlice: i + 1,
      requirements: [], // Would be populated from actual requirements
    });
  }

  return {
    specId,
    proposedChildren,
  };
}

/**
 * Check if lifecycle transition is permitted with only Spec Size Limit Finding.
 *
 * @param findings - all Findings for the Spec
 * @param preconditionHolds - whether transition Preconditions hold
 * @returns true if transition is permitted
 */
export function permitsTransitionWithSizeFinding(
  findings: readonly Finding[],
  preconditionHolds: boolean,
): boolean {
  if (!preconditionHolds) {
    return false;
  }

  // Permit if the only Finding is Spec Size Limit
  const nonSizeFindings = findings.filter((f) => f.code !== "SPEC_SIZE_LIMIT_EXCEEDED");

  return nonSizeFindings.length === 0;
}

/**
 * Assign Requirements to proposed Child Specs by Delivery slice.
 *
 * @param requirements - Requirements with their Delivery slices
 * @returns proposed Child Specs
 */
export function assignRequirementsByDeliverySlice(
  requirements: Array<{ id: string; deliverySlice: number }>,
): Map<number, string[]> {
  const assignments = new Map<number, string[]>();

  for (const req of requirements) {
    const slice = req.deliverySlice;
    if (!assignments.has(slice)) {
      assignments.set(slice, []);
    }
    assignments.get(slice)!.push(req.id);
  }

  return assignments;
}
