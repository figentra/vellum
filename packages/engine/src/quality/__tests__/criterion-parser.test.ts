/**
 * Tests for the acceptance-criterion parser, which the quality checks and
 * strict verification's coverage both read criteria through.
 */

import { describe, expect, it } from "vitest";
import { parseCriteria } from "../patterns/criterion-parser";

describe("parseCriteria", () => {
  it("reads criteria written as N.M", () => {
    const text = `### Requirement 1: One

#### Acceptance Criteria

1.1 WHEN a thing happens, THE System SHALL do one thing.
1.2 WHEN another thing happens, THE System SHALL do another thing.
`;
    expect(parseCriteria(text).map((c) => c.reference)).toEqual(["1.1", "1.2"]);
  });

  it("reads criteria written as a numbered list under their requirement, as the specs do", () => {
    const text = `### Requirement 5: Lifecycle

#### Acceptance Criteria

1. THE Lifecycle Engine SHALL assign each Spec one state.
2. WHEN a transition is requested, THE Lifecycle Engine SHALL
   update the recorded state.

### Requirement 6: Status

#### Acceptance Criteria

1. WHEN status is requested, THE Status Reporter SHALL report.
`;
    const criteria = parseCriteria(text);
    expect(criteria.map((c) => c.reference)).toEqual(["5.1", "5.2", "6.1"]);
    expect(criteria.map((c) => c.requirement_number)).toEqual(["5", "5", "6"]);
    expect(criteria[1]?.text).toBe(
      "WHEN a transition is requested, THE Lifecycle Engine SHALL update the recorded state.",
    );
  });

  it("ignores numbered lists outside an Acceptance Criteria section", () => {
    const text = `### Requirement 1: One

1. Not a criterion.
`;
    expect(parseCriteria(text)).toEqual([]);
  });
});
