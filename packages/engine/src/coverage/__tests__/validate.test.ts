/**
 * Tests for coverage computation.
 * @see requirements.md Requirement 20
 */

import { describe, it, expect } from "vitest";
import { parseTaskLine } from "@vellum/protocol";
import type { TaskLine } from "@vellum/protocol";
import {
  computeCoverage,
  extractCriteria,
  extractProperties,
  getCoveragePercentage,
  hasCompleteCoverage,
  validateCriteriaCoverage,
  validatePropertiesCitation,
} from "../validate";

const requirements = `# Requirements

### Requirement 1: One

#### Acceptance Criteria

1.1 WHEN a thing happens, THE System SHALL do one thing.
1.2 WHEN another thing happens, THE System SHALL do another thing.

### Requirement 2: Two

#### Acceptance Criteria

2.1 THE System SHALL do a third thing.
`;

const design = `# Design

**Property 1: First**
**Validates: Requirements 1.1**

**Property 2: Second**
**Validates: Requirements 1.2, 2.1**
`;

function tasks(...lines: string[]): TaskLine[] {
  return lines.map((line, i) => {
    const parsed = parseTaskLine(line);
    if (!parsed) throw new Error(`unparseable task line: ${line}`);
    return { ...parsed, lineNumber: i + 1 };
  });
}

describe("extractCriteria / extractProperties", () => {
  it("reads criterion and property identifiers in order", () => {
    expect(extractCriteria(requirements)).toEqual(["1.1", "1.2", "2.1"]);
    expect(extractProperties(design)).toEqual(["P1", "P2"]);
  });
});

describe("computeCoverage", () => {
  it("passes when every criterion is covered and every property cited", () => {
    const result = computeCoverage(
      requirements,
      design,
      tasks(
        "- [ ] 1 Build one <!-- criteria: 1.1, 1.2 --> <!-- properties: P1 -->",
        "- [ ] 2 Build two <!-- criteria: 2.1 --> <!-- properties: P2 -->",
      ),
    );
    expect(result.result).toBe("PASS");
    expect(hasCompleteCoverage(result)).toBe(true);
    expect(getCoveragePercentage(result)).toBe(100);
    expect(result.examined).toEqual({ criteria: 3, properties: 2, tasks: 2 });
    expect(validateCriteriaCoverage(result)).toEqual([]);
    expect(validatePropertiesCitation(result)).toEqual([]);
  });

  it("names each uncovered criterion and uncited property (20.1, 20.2)", () => {
    const result = computeCoverage(
      requirements,
      design,
      tasks("- [ ] 1 Build one <!-- criteria: 1.1 --> <!-- properties: P1 -->"),
    );
    expect(result.result).toBe("FAIL");
    expect(hasCompleteCoverage(result)).toBe(false);
    expect(result.uncoveredCriteria).toEqual(["1.2", "2.1"]);
    expect(result.uncitedProperties).toEqual(["P2"]);
    expect(getCoveragePercentage(result)).toBe(40);

    const criteriaFindings = validateCriteriaCoverage(result);
    expect(criteriaFindings.map((f) => f.rule)).toEqual([
      "vellum/coverage/CRITERIA_NOT_COVERED",
      "vellum/coverage/CRITERIA_NOT_COVERED",
    ]);
    expect(criteriaFindings[0]?.message).toContain("1.2");
    expect(validatePropertiesCitation(result)[0]?.rule).toBe("vellum/coverage/PROPERTY_NOT_CITED");
  });

  it("counts a criterion covered only by optional tasks as covered, and names it (20.8)", () => {
    const result = computeCoverage(
      requirements,
      design,
      tasks(
        "- [ ] 1 Build one <!-- criteria: 1.1, 2.1 --> <!-- properties: P1, P2 -->",
        "- [ ] 2 (optional) Extra <!-- criteria: 1.2 -->",
      ),
    );
    expect(result.result).toBe("PASS");
    expect(result.coveredByOptionalOnly).toEqual(["1.2"]);
  });

  it("is INCONCLUSIVE and names requirements.md when there are no criteria (20.7)", () => {
    const result = computeCoverage("# Requirements\n", design, []);
    expect(result.result).toBe("INCONCLUSIVE");
    expect(hasCompleteCoverage(result)).toBe(false);
    const findings = validateCriteriaCoverage(result);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.file).toBe("requirements.md");
    expect(findings[0]?.rule).toBe("vellum/coverage/CRITERIA_SOURCE_UNREADABLE");
  });
});

describe("the method's forms: plain property headings and Kiro `_Properties:_` trailers", () => {
  // Shaped as packages/method/templates/design.md writes it.
  const methodDesign = `# Design

## Correctness Properties

Property 1: First

For all inputs, the first thing holds.

**Validates: Requirements 1.1, 1.2**

Property 2: Second

For every input, the second thing holds.

**Validates: Requirements 2.1**

### Requirement coverage

| Requirement | Criterion | Classification | Covered by |
| ----------- | --------- | -------------- | ---------- |
| 1           | 1.1       | Universal      | Property 1 |

\`\`\`
Property 9: an example inside a fence is not a definition
\`\`\`

The coverage of Property 2: prose that mentions a property is not a heading.
`;

  it("reads plain `Property N:` headings and ignores table cells, prose and fences", () => {
    expect(extractProperties(methodDesign)).toEqual(["P1", "P2"]);
  });

  it("fails naming a property no task cites (PROPERTY_NOT_CITED)", () => {
    const result = computeCoverage(
      requirements,
      methodDesign,
      tasks(
        "  - [ ] 1.1 Build one _Requirements: 1.1, 1.2_",
        "  - [ ] 1.2* Property test for Property 1 _Requirements: 1.1, 1.2_ _Properties: 1_",
        "- [ ] 2. Build two _Requirements: 2.1_",
      ),
    );
    expect(result.result).toBe("FAIL");
    expect(result.uncitedProperties).toEqual(["P2"]);
    expect(validatePropertiesCitation(result)).toEqual([
      expect.objectContaining({ rule: "vellum/coverage/PROPERTY_NOT_CITED" }),
    ]);
  });

  it("passes once every property is cited, in either trailer order", () => {
    const result = computeCoverage(
      requirements,
      methodDesign,
      tasks(
        "  - [ ] 1.1 Build one _Requirements: 1.1, 1.2_",
        "  - [ ] 1.2* Property test for Property 1 _Requirements: 1.1, 1.2_ _Properties: 1_",
        "- [ ] 2. Build two _Properties: P2_ _Requirements: 2.1_",
      ),
    );
    expect(result.result).toBe("PASS");
    expect(result.properties).toEqual([
      { id: "P1", citedBy: ["1.2"] },
      { id: "P2", citedBy: ["2"] },
    ]);
  });
});
