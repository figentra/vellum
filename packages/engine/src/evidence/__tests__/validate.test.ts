/**
 * validateEvidence decides "in the future" against a caller-supplied instant.
 */

import { describe, expect, it } from "vitest";
import { validateEvidence } from "../validate.js";

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
