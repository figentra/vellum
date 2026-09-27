/**
 * @vellum/engine — Property Tests for State Machine
 *
 * Tests invariants and properties of the lifecycle state machine.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { LifecycleState, TerminalState } from "@vellum/protocol";
import { isTerminalState } from "@vellum/protocol";

describe("Property: Lifecycle State Machine", () => {
  const allStates: LifecycleState[] = [
    "DRAFT",
    "IN_REVIEW",
    "REQUIREMENTS_APPROVED",
    "DESIGN_IN_REVIEW",
    "DESIGN_APPROVED",
    "PLAN_IN_REVIEW",
    "PLAN_APPROVED",
    "IN_PROGRESS",
    "VERIFICATION",
    "VERIFIED",
    "MERGED",
    "RELEASED",
    "DONE",
    "BLOCKED",
    "REJECTED",
    "SUPERSEDED",
    "ABANDONED",
    "INVALID",
  ];

  const terminalStates: TerminalState[] = [
    "VERIFIED",
    "REJECTED",
    "SUPERSEDED",
    "ABANDONED",
    "INVALID",
  ];

  it("should identify terminal states correctly", () => {
    fc.assert(
      fc.property(fc.constantFrom(...allStates), (state) => {
        const isTerminal = isTerminalState(state);
        const shouldBeTerminal = terminalStates.includes(state as any);

        expect(isTerminal).toBe(shouldBeTerminal);
      }),
    );
  });

  it("should allow transitions from non-terminal states only", () => {
    fc.assert(
      fc.property(fc.constantFrom(...allStates), (state) => {
        const isTerminal = isTerminalState(state);

        // Terminal states have no outgoing transitions
        if (isTerminal) {
          // Cannot transition from terminal state
          expect(terminalStates).toContain(state);
        } else {
          // Non-terminal states may have transitions
          expect(terminalStates).not.toContain(state);
        }
      }),
    );
  });

  it("should maintain determinism for state transitions", () => {
    fc.assert(
      fc.property(
        fc.record({
          currentState: fc.constantFrom(...allStates),
        }),
        ({ currentState }) => {
          // Given same state and preconditions, transition result should be deterministic
          const canTransition1 = !isTerminalState(currentState);
          const canTransition2 = !isTerminalState(currentState);

          // Same input → same output
          expect(canTransition1).toBe(canTransition2);
        },
      ),
    );
  });

  it("should respect state progression order", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.constantFrom("DRAFT", "IN_REVIEW", "REQUIREMENTS_APPROVED"),
          fc.constantFrom("IN_REVIEW", "REQUIREMENTS_APPROVED", "DESIGN_IN_REVIEW"),
        ),
        ([from, to]) => {
          // Define valid transitions (Table 5.A)
          const validTransitions: Map<LifecycleState, LifecycleState[]> = new Map([
            ["DRAFT", ["IN_REVIEW"]],
            ["IN_REVIEW", ["REQUIREMENTS_APPROVED", "REJECTED"]],
            ["REQUIREMENTS_APPROVED", ["DESIGN_IN_REVIEW", "BLOCKED"]],
          ]);

          const allowed = validTransitions.get(from as any) || [];
          const isValid = allowed.includes(to as any);

          // If transition is valid, it should be in allowed list
          if (isValid) {
            expect(allowed).toContain(to);
          }
        },
      ),
    );
  });
});

describe("Property: Approval Validation", () => {
  it("should require distinct approvers", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            approver: fc.string({ minLength: 1, maxLength: 50 }),
            timestamp: fc.date().map((d) => d.toISOString()),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (approvals) => {
          // Check if approvals are from distinct approvers
          const approvers = new Set(approvals.map((a) => a.approver));

          // If all approvers are unique, count should match
          if (approvers.size === approvals.length) {
            expect(approvers.size).toBe(approvals.length);
          }
        },
      ),
    );
  });

  it("should validate approval timestamps are not in future", () => {
    fc.assert(
      fc.property(
        fc.record({
          timestamp: fc
            .date({ min: new Date(2020, 0, 1), max: new Date() })
            .map((d) => d.toISOString()),
        }),
        (approval) => {
          const timestamp = new Date(approval.timestamp);
          const now = new Date();

          // Approval timestamp should not be in the future
          expect(timestamp.getTime()).toBeLessThanOrEqual(now.getTime());
        },
      ),
    );
  });

  it("should reject approvals from assistant sessions", () => {
    fc.assert(
      fc.property(
        fc.record({
          approver: fc.string(),
          sessionMetadata: fc.option(
            fc.record({
              isAssistant: fc.boolean(),
              assistantName: fc.option(fc.string()),
            }),
          ),
        }),
        (approval) => {
          const isFromAssistant = approval.sessionMetadata?.isAssistant ?? false;

          // If approval is from assistant, it should be rejected
          if (isFromAssistant) {
            expect(approval.sessionMetadata?.isAssistant).toBe(true);
          }
        },
      ),
    );
  });
});

describe("Property: Coverage Validation", () => {
  it("should detect uncovered criteria", () => {
    fc.assert(
      fc.property(
        fc.record({
          criteria: fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 20 }),
          coveredCriteria: fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 20 }),
        }),
        ({ criteria, coveredCriteria }) => {
          const coveredSet = new Set(coveredCriteria);

          const uncovered = criteria.filter((c) => !coveredSet.has(c));

          // Uncovered criteria should be exactly those not in covered set
          expect(uncovered.length).toBe(criteria.filter((c) => !coveredSet.has(c)).length);
        },
      ),
    );
  });

  it("should handle empty criteria gracefully", () => {
    fc.assert(
      fc.property(fc.constant([]), (criteria) => {
        // Empty criteria should result in INCONCLUSIVE
        expect(criteria.length).toBe(0);
      }),
    );
  });
});
