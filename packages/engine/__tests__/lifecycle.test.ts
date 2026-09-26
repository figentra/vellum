/**
 * @vellum/engine — Tests for Lifecycle State Machine
 */

import { describe, it, expect } from "vitest";
import {
  isTerminalState,
  isValidTransition,
  getValidNextStates,
  getTransitionPreconditions,
} from "../src/lifecycle/state-machine.js";
import type { LifecycleState } from "@vellum/protocol";

describe("Lifecycle State Machine", () => {
  describe("isTerminalState", () => {
    it("should identify terminal states", () => {
      expect(isTerminalState("VERIFIED")).toBe(true);
      expect(isTerminalState("REJECTED")).toBe(true);
      expect(isTerminalState("SUPERSEDED")).toBe(true);
      expect(isTerminalState("ABANDONED")).toBe(true);
      expect(isTerminalState("INVALID")).toBe(true);
    });

    it("should identify non-terminal states", () => {
      expect(isTerminalState("DRAFT")).toBe(false);
      expect(isTerminalState("IN_REVIEW")).toBe(false);
      expect(isTerminalState("IN_PROGRESS")).toBe(false);
      expect(isTerminalState("BLOCKED")).toBe(false);
    });
  });

  describe("isValidTransition", () => {
    it("should allow valid transitions from DRAFT", () => {
      expect(isValidTransition("DRAFT", "IN_REVIEW")).toBe(true);
      expect(isValidTransition("DRAFT", "BLOCKED")).toBe(true);
      expect(isValidTransition("DRAFT", "REJECTED")).toBe(true);
      expect(isValidTransition("DRAFT", "ABANDONED")).toBe(true);
    });

    it("should reject invalid transitions from DRAFT", () => {
      expect(isValidTransition("DRAFT", "REQUIREMENTS_APPROVED")).toBe(false);
      expect(isValidTransition("DRAFT", "VERIFIED")).toBe(false);
    });

    it("should allow valid progression", () => {
      expect(isValidTransition("IN_REVIEW", "REQUIREMENTS_APPROVED")).toBe(true);
      expect(isValidTransition("REQUIREMENTS_APPROVED", "DESIGN_IN_REVIEW")).toBe(true);
      expect(isValidTransition("DESIGN_IN_REVIEW", "DESIGN_APPROVED")).toBe(true);
      expect(isValidTransition("DESIGN_APPROVED", "PLAN_IN_REVIEW")).toBe(true);
      expect(isValidTransition("PLAN_IN_REVIEW", "PLAN_APPROVED")).toBe(true);
      expect(isValidTransition("PLAN_APPROVED", "IN_PROGRESS")).toBe(true);
      expect(isValidTransition("IN_PROGRESS", "VERIFICATION")).toBe(true);
      expect(isValidTransition("VERIFICATION", "VERIFIED")).toBe(true);
    });

    it("should reject transitions from terminal states", () => {
      expect(isValidTransition("VERIFIED", "DRAFT")).toBe(false);
      expect(isValidTransition("REJECTED", "IN_REVIEW")).toBe(false);
      expect(isValidTransition("ABANDONED", "DRAFT")).toBe(false);
    });

    it("should allow blocking from any non-terminal state", () => {
      expect(isValidTransition("DRAFT", "BLOCKED")).toBe(true);
      expect(isValidTransition("IN_REVIEW", "BLOCKED")).toBe(true);
      expect(isValidTransition("IN_PROGRESS", "BLOCKED")).toBe(true);
    });
  });

  describe("getValidNextStates", () => {
    it("should return valid next states for DRAFT", () => {
      const states = getValidNextStates("DRAFT");
      expect(states).toContain("IN_REVIEW");
      expect(states).toContain("BLOCKED");
      expect(states).toContain("REJECTED");
      expect(states).toContain("ABANDONED");
      expect(states.length).toBe(4);
    });

    it("should return empty array for terminal states", () => {
      expect(getValidNextStates("VERIFIED")).toEqual([]);
      expect(getValidNextStates("REJECTED")).toEqual([]);
      expect(getValidNextStates("INVALID")).toEqual([]);
    });

    it("should return next state in progression", () => {
      const states = getValidNextStates("IN_REVIEW");
      expect(states).toContain("REQUIREMENTS_APPROVED");
      expect(states).toContain("BLOCKED");
      expect(states).toContain("REJECTED");
    });
  });

  describe("getTransitionPreconditions", () => {
    it("should return preconditions for DRAFT->IN_REVIEW", () => {
      const preconditions = getTransitionPreconditions("DRAFT", "IN_REVIEW");
      expect(preconditions).toContain("ARTIFACT_EXISTS");
      expect(preconditions).toContain("ARTIFACT_VALID");
    });

    it("should return preconditions for IN_REVIEW->REQUIREMENTS_APPROVED", () => {
      const preconditions = getTransitionPreconditions("IN_REVIEW", "REQUIREMENTS_APPROVED");
      expect(preconditions).toContain("APPROVAL_COUNT_MET");
      expect(preconditions).toContain("NO_BLOCKING_DECISIONS");
    });

    it("should return preconditions for PLAN_IN_REVIEW->PLAN_APPROVED", () => {
      const preconditions = getTransitionPreconditions("PLAN_IN_REVIEW", "PLAN_APPROVED");
      expect(preconditions).toContain("APPROVAL_COUNT_MET");
      expect(preconditions).toContain("TASK_GRAPH_VALID");
      expect(preconditions).toContain("COVERAGE_COMPLETE");
    });

    it("should return preconditions for transition to BLOCKED", () => {
      const preconditions = getTransitionPreconditions("DRAFT", "BLOCKED");
      expect(preconditions).toContain("BLOCKING_REASON_RECORDED");
    });

    it("should return preconditions for transition to ABANDONED", () => {
      const preconditions = getTransitionPreconditions("DRAFT", "ABANDONED");
      expect(preconditions).toContain("RATIONALE_RECORDED");
    });
  });

  describe("State progression", () => {
    it("should follow valid lifecycle path", () => {
      const path: LifecycleState[] = [
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
      ];

      for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];
        expect(isValidTransition(from, to), `Transition ${from}->${to} should be valid`).toBe(true);
      }
    });

    it("should allow terminal transitions at any point", () => {
      const progressStates: LifecycleState[] = [
        "DRAFT",
        "IN_REVIEW",
        "REQUIREMENTS_APPROVED",
        "DESIGN_APPROVED",
        "PLAN_APPROVED",
        "IN_PROGRESS",
      ];

      for (const state of progressStates) {
        expect(isValidTransition(state, "REJECTED"), `${state}->REJECTED should be valid`).toBe(
          true,
        );
        expect(isValidTransition(state, "ABANDONED"), `${state}->ABANDONED should be valid`).toBe(
          true,
        );
      }
    });
  });
});
