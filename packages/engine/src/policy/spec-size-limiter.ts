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

import type { Finding } from "@vellum/protocol";

/**
 * Default Spec Size Limit.
 */
export const DEFAULT_SPEC_SIZE_LIMIT = 80;

/**
 * Rule identifier of the Spec Size Limit Finding.
 */
export const SPEC_SIZE_LIMIT_RULE = "SPEC_SIZE_LIMIT_EXCEEDED" as const;

/**
 * Spec Size Limit Finding.
 */
export interface SpecSizeLimitFinding extends Finding {
  readonly rule: typeof SPEC_SIZE_LIMIT_RULE;
  /** A warning: the Finding alone does not block a transition (criterion 13.5) */
  readonly level: "warn";
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
  /** One Child Spec per Delivery slice, holding that slice's Requirements */
  readonly proposedChildren: readonly ProposedChildSpec[];
  /** Why no children are proposed: the Requirements' Delivery slices were not supplied */
  readonly notComputed?: string;
}

/** A Requirement and the Delivery slice it is first delivered in. */
export interface SlicedRequirement {
  readonly id: string;
  readonly deliverySlice: number;
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
 * @param requirementsPath - path of the Spec's requirements.md (the Finding's file)
 * @param requirements - each Requirement's Delivery slice, for the Split Proposal
 * @returns Finding or null if within limit
 */
export function checkSpecSizeLimit(
  specId: string,
  criterionCount: number,
  limit: number,
  requirementsPath = "requirements.md",
  requirements?: readonly SlicedRequirement[],
): SpecSizeLimitFinding | null {
  if (criterionCount <= limit) {
    return null;
  }

  return {
    file: requirementsPath,
    line: 1,
    rule: SPEC_SIZE_LIMIT_RULE,
    specId,
    criterionCount,
    limit,
    level: "warn",
    message: `Spec ${specId} has ${criterionCount} acceptance criteria, exceeding the limit of ${limit}`,
    splitProposal: generateSplitProposal(specId, requirements),
  };
}

/**
 * Generate a Split Proposal for a large Spec (criteria 13.2-13.3).
 *
 * Assigns Requirements to proposed Child Specs by their first Delivery slice:
 * one Child Spec per slice, in slice order. Without the Requirements' slices
 * no children are proposed and `notComputed` says why — the proposal never
 * invents empty children.
 *
 * @param specId - Spec identifier
 * @param requirements - each Requirement's Delivery slice
 * @returns Split Proposal
 */
export function generateSplitProposal(
  specId: string,
  requirements?: readonly SlicedRequirement[],
): SplitProposal {
  if (requirements === undefined || requirements.length === 0) {
    return {
      specId,
      proposedChildren: [],
      notComputed: "the Requirements and their Delivery slice annotations were not supplied",
    };
  }

  const bySlice = assignRequirementsByDeliverySlice(requirements);
  const proposedChildren: ProposedChildSpec[] = [...bySlice.keys()]
    .sort((a, b) => a - b)
    .map((slice) => ({
      identifier: `${specId}-slice-${slice}`,
      title: `Delivery slice ${slice} of ${specId}`,
      deliverySlice: slice,
      requirements: bySlice.get(slice) ?? [],
    }));

  return { specId, proposedChildren };
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
  const nonSizeFindings = findings.filter((f) => f.rule !== SPEC_SIZE_LIMIT_RULE);

  return nonSizeFindings.length === 0;
}

/**
 * Assign Requirements to proposed Child Specs by Delivery slice.
 *
 * @param requirements - Requirements with their Delivery slices
 * @returns proposed Child Specs
 */
export function assignRequirementsByDeliverySlice(
  requirements: readonly SlicedRequirement[],
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
