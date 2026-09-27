/**
 * Tests for vague terms checker.
 * @see requirements.md Requirement 1.5
 */

import { describe, it, expect } from "vitest";
import { checkVagueTerms } from "../vague-terms";

describe("vague terms checker", () => {
  it("detects vague terms in criteria", () => {
    const requirements = `
## Requirements

### Requirement 1: Example

#### Acceptance Criteria

1.1. IF a request is received, THE System SHALL quickly process it.
`;

    const findings = checkVagueTerms(requirements, "requirements.md");

    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings.some((f) => f.violating_text === "quickly")).toBe(true);
  });

  it("detects escape clauses", () => {
    const requirements = `
## Requirements

### Requirement 1: Example

#### Acceptance Criteria

1.1. THE System SHALL retry the payment where possible.
`;

    const findings = checkVagueTerms(requirements, "requirements.md");

    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings.some((f) => f.violating_text?.includes("where possible"))).toBe(true);
  });

  it("detects absolute terms", () => {
    const requirements = `
## Requirements

### Requirement 1: Example

#### Acceptance Criteria

1.1. THE System SHALL never lose data.
`;

    const findings = checkVagueTerms(requirements, "requirements.md");

    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings.some((f) => f.violating_text === "never")).toBe(true);
  });

  it("returns no findings for clean criteria", () => {
    const requirements = `
## Requirements

### Requirement 1: Example

#### Acceptance Criteria

1.1. THE System SHALL execute the transaction.
`;

    const findings = checkVagueTerms(requirements, "requirements.md");

    expect(findings).toHaveLength(0);
  });
});
