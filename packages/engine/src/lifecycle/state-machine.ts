/**
 * @vellum/engine — Lifecycle State Machine
 *
 * Pure logic for state transitions. No I/O.
 * Follows Table 5.A from design.md.
 */

import type {
  LifecycleState,
  TerminalState,
  TransitionPrecondition,
  TransitionPreconditionKind,
  Artifact,
  LedgerEntry,
  SpecDirectory,
} from "@vellum/protocol";

/** Is this state terminal (no outgoing transitions)? */
export function isTerminalState(state: LifecycleState): state is TerminalState {
  return (
    state === "VERIFIED" ||
    state === "REJECTED" ||
    state === "SUPERSEDED" ||
    state === "ABANDONED" ||
    state === "INVALID"
  );
}

/** Valid transitions from each state */
const TRANSITIONS: ReadonlyMap<LifecycleState, readonly LifecycleState[]> = new Map([
  ["DRAFT", ["IN_REVIEW", "BLOCKED", "REJECTED", "ABANDONED"]],
  ["IN_REVIEW", ["REQUIREMENTS_APPROVED", "BLOCKED", "REJECTED", "ABANDONED"]],
  ["REQUIREMENTS_APPROVED", ["DESIGN_IN_REVIEW", "BLOCKED", "REJECTED", "ABANDONED"]],
  ["DESIGN_IN_REVIEW", ["DESIGN_APPROVED", "BLOCKED", "REJECTED", "ABANDONED"]],
  ["DESIGN_APPROVED", ["PLAN_IN_REVIEW", "BLOCKED", "REJECTED", "ABANDONED"]],
  ["PLAN_IN_REVIEW", ["PLAN_APPROVED", "BLOCKED", "REJECTED", "ABANDONED"]],
  ["PLAN_APPROVED", ["IN_PROGRESS", "BLOCKED", "REJECTED", "ABANDONED"]],
  ["IN_PROGRESS", ["VERIFICATION", "BLOCKED", "REJECTED", "ABANDONED"]],
  ["VERIFICATION", ["VERIFIED", "BLOCKED", "REJECTED", "ABANDONED"]],
  // Terminal states have no outgoing transitions
]);

/** Check if a transition is valid */
export function isValidTransition(from: LifecycleState, to: LifecycleState): boolean {
  if (isTerminalState(from)) {
    return false;
  }

  const allowed = TRANSITIONS.get(from);
  return allowed?.includes(to) ?? false;
}

/** Get valid next states from current state */
export function getValidNextStates(state: LifecycleState): readonly LifecycleState[] {
  return TRANSITIONS.get(state) ?? [];
}

/** Transition precondition definitions */
const PRECONDITIONS: ReadonlyMap<string, readonly TransitionPreconditionKind[]> = new Map([
  ["DRAFT->IN_REVIEW", ["ARTIFACT_EXISTS", "ARTIFACT_VALID"] as const],

  ["IN_REVIEW->REQUIREMENTS_APPROVED", ["APPROVAL_COUNT_MET", "NO_BLOCKING_DECISIONS"] as const],

  [
    "REQUIREMENTS_APPROVED->DESIGN_IN_REVIEW",
    ["ARTIFACT_EXISTS", "ARTIFACT_VALID", "PREVIOUS_APPROVALS_VALID"] as const,
  ],

  [
    "DESIGN_IN_REVIEW->DESIGN_APPROVED",
    [
      "APPROVAL_COUNT_MET",
      "NO_BLOCKING_DECISIONS",
      "NO_OPEN_BLOCKING_QUESTIONS",
      "PREVIOUS_APPROVALS_VALID",
    ] as const,
  ],

  [
    "DESIGN_APPROVED->PLAN_IN_REVIEW",
    ["ARTIFACT_EXISTS", "ARTIFACT_VALID", "PREVIOUS_APPROVALS_VALID"] as const,
  ],

  [
    "PLAN_IN_REVIEW->PLAN_APPROVED",
    [
      "APPROVAL_COUNT_MET",
      "NO_BLOCKING_DECISIONS",
      "TASK_GRAPH_VALID",
      "COVERAGE_COMPLETE",
      "PREVIOUS_APPROVALS_VALID",
    ] as const,
  ],

  ["PLAN_APPROVED->IN_PROGRESS", ["TASK_DISPATCHED"] as const],

  ["IN_PROGRESS->VERIFICATION", ["ALL_REQUIRED_TASKS_VERIFIED", "NO_BLOCKING_DECISIONS"] as const],

  ["VERIFICATION->VERIFIED", ["STRICT_VERIFICATION_PASS"] as const],

  ["*->BLOCKED", ["BLOCKING_REASON_RECORDED"] as const],

  ["BLOCKED->*", ["UNBLOCKING_DECISION_RECORDED"] as const],

  ["*->REJECTED", ["RATIONALE_RECORDED"] as const],

  ["*->SUPERSEDED", ["RATIONALE_RECORDED", "SUPERSEDING_SPEC_RECORDED"] as const],

  ["*->ABANDONED", ["RATIONALE_RECORDED"] as const],
]);

/**
 * Get preconditions for a transition.
 */
export function getTransitionPreconditions(
  from: LifecycleState,
  to: LifecycleState,
): readonly TransitionPreconditionKind[] {
  const key = `${from}->${to}`;
  const wildcardFrom = `*->${to}`;
  const wildcardTo = `${from}->*`;
  const wildcardBoth = "*->*";

  return (
    PRECONDITIONS.get(key) ??
    PRECONDITIONS.get(wildcardFrom) ??
    PRECONDITIONS.get(wildcardTo) ??
    PRECONDITIONS.get(wildcardBoth) ??
    []
  );
}

/** Precondition check functions (to be implemented by other modules) */
export type PreconditionChecker = (
  kind: TransitionPreconditionKind,
  context: {
    spec: SpecDirectory;
    artifacts: readonly Artifact[];
    ledger: readonly LedgerEntry[];
    targetState: LifecycleState;
  },
) => Promise<{ met: boolean; message?: string }>;

/**
 * Check all preconditions for a transition.
 * Pure function - all I/O delegated to checker.
 */
export async function checkPreconditions(
  from: LifecycleState,
  to: LifecycleState,
  context: {
    spec: SpecDirectory;
    artifacts: readonly Artifact[];
    ledger: readonly LedgerEntry[];
  },
  checker: PreconditionChecker,
): Promise<readonly TransitionPrecondition[]> {
  // Check if transition is valid
  if (!isValidTransition(from, to)) {
    return [
      {
        kind: "TRANSITION_INVALID",
        met: false,
        message: isTerminalState(from)
          ? `Cannot transition from terminal state ${from}`
          : `Invalid transition from ${from} to ${to}`,
      },
    ];
  }

  // Get required preconditions
  const kinds = getTransitionPreconditions(from, to);

  // Check each precondition
  const results: TransitionPrecondition[] = [];
  for (const kind of kinds) {
    const result = await checker(kind, { ...context, targetState: to });
    results.push({
      kind,
      met: result.met,
      ...(result.message && { message: result.message }),
    });
  }

  return Object.freeze(results);
}

/**
 * Invalid transition error.
 */
export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: LifecycleState,
    public readonly to: LifecycleState,
    public readonly preconditions: readonly TransitionPrecondition[],
  ) {
    const failedCount = preconditions.filter((p) => !p.met).length;
    super(
      isTerminalState(from)
        ? `Cannot transition from terminal state ${from}`
        : `Invalid transition from ${from} to ${to}: ${failedCount} precondition(s) failed`,
    );
  }
}
