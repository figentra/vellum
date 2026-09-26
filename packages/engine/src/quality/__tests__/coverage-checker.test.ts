/**
 * Tests for coverage checker.
 * @see requirements.md Requirements 2.1, 2.2
 */

import { describe, it, expect } from "vitest";
import { checkCoverage, parseCoverageTable, parseProperties } from "../coverage-checker";

describe("coverage checker", () => {
  it("detects missing criterion in coverage table", () => {
    const requirements = `
## Requirements

### Requirement 1: Example

#### Acceptance Criteria

1.1. THE System SHALL do something.
1.2. THE System SHALL do something else.
`;

    const design = `
## Requirement coverage

| Criterion | Property |
|-----------|----------|
| 1.1       | 1        |

## Correctness Properties

**Property 1: Example**

Description here.

**Validates: Requirements 1.1**
`;

    const findings = checkCoverage(requirements, design, "design.md");

    expect(findings.some((f) => f.message.includes("1.2"))).toBe(true);
  });

  it("detects missing Validates line", () => {
    const requirements = `
## Requirements

### Requirement 1: Example

#### Acceptance Criteria

1.1. THE System SHALL do something.
`;

    const design = `
## Requirement coverage

| Criterion | Property |
|-----------|----------|
| 1.1       | 1        |

## Correctness Properties

**Property 1: Example**

Description here without Validates line.
`;

    const findings = checkCoverage(requirements, design, "design.md");

    expect(findings.some((f) => f.rule_id === "PROPERTY_VALIDATES_MISSING")).toBe(true);
  });

  it("detects property numbering gaps", () => {
    const requirements = `
## Requirements

### Requirement 1: Example

#### Acceptance Criteria

1.1. THE System SHALL do something.
`;

    const design = `
## Requirement coverage

| Criterion | Property |
|-----------|----------|
| 1.1       | 2        |

## Correctness Properties

**Property 2: Example**

Description here.

**Validates: Requirements 1.1**
`;

    const findings = checkCoverage(requirements, design, "design.md");

    expect(findings.some((f) => f.rule_id === "PROPERTY_NUMBERING_GAP")).toBe(true);
  });

  it("passes for complete coverage", () => {
    const requirements = `
## Requirements

### Requirement 1: Example

#### Acceptance Criteria

1. THE System SHALL do something.
`;

    const design = `
## Requirement coverage

| Criterion | Property |
|-----------|----------|
| 1.1       | 1        |

## Correctness Properties

**Property 1: Example**

Description here.

**Validates: Requirements 1.1**
`;

    const findings = checkCoverage(requirements, design, "design.md");

    expect(findings).toHaveLength(0);
  });
});
