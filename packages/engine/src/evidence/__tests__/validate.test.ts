/**
 * validateEvidence decides "in the future" against a caller-supplied instant.
 */

import { describe, expect, it } from "vitest";
import type { LedgerEntry } from "@vellum/protocol";
import { hasVerifiedEvidence, validateEvidence } from "../validate.js";

const COMMIT = "a".repeat(40);
const commits = new Map<string, unknown>([[COMMIT, {}]]);

describe("validateEvidence", () => {
  it("accepts timestamps at or before the supplied instant, whatever the clock says", () => {
    const result = validateEvidence(
      {
        exit_status: 0,
        start_timestamp: "2099-01-01T00:00:00Z",
        finish_timestamp: "2099-01-01T00:01:00Z",
        commit: COMMIT,
      },
      commits,
      "2099-01-01T00:01:00Z",
    );

    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("rejects timestamps after the supplied instant, whatever the clock says", () => {
    const result = validateEvidence(
      {
        exit_status: 0,
        start_timestamp: "2001-01-01T00:00:01Z",
        finish_timestamp: "2001-01-01T00:00:02Z",
        commit: COMMIT,
      },
      commits,
      "2001-01-01T00:00:00Z",
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      "Start timestamp is in the future: 2001-01-01T00:00:01Z",
      "Finish timestamp is in the future: 2001-01-01T00:00:02Z",
    ]);
  });

  it("refuses an instant that is not a timestamp", () => {
    expect(() => validateEvidence({ exit_status: 0 }, commits, "not a time")).toThrow(RangeError);
  });
});

describe("hasVerifiedEvidence — a later passing attempt", () => {
  it("counts a task whose first attempt failed and a later one passed", () => {
    const entry = (exit: number) =>
      ({
        kind: "evidence",
        id: 1,
        predecessor_digest: null,
        timestamp: "t",
        task_id: "3",
        exit_status: exit,
      }) as unknown as LedgerEntry;
    expect(hasVerifiedEvidence([entry(1), entry(0)], "3")).toBe(true);
    expect(hasVerifiedEvidence([entry(1)], "3")).toBe(false);
  });
});
