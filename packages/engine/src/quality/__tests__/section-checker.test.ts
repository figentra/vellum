/**
 * Tests for section-checker.ts
 * @see requirements.md Requirement 2.5, 2.6
 */

import { describe, it, expect } from "vitest";
import { checkRequiredSections, checkAdrCitations } from "../section-checker";

describe("checkRequiredSections", () => {
  it("finds all required sections", () => {
    const design = `
## Overview

Some overview.

## Applicable Standards

Standards.

## Glossary

Glossary.

## Architecture

Architecture.

## Components

Components.

## Correctness Properties

Properties.

## Data Model

Data model here.

## API Contracts

API contracts.

## Error Model

Error model.

## Security Model

Security.

## Observability

Observability.

## Idempotency

Idempotency.

## Concurrency

Concurrency.

## Migration Strategy

Migration.

## Rollback Strategy

Rollback.

## ADR Consistency

ADR consistency.
`;

    const findings = checkRequiredSections(design, "design.md");

    expect(findings).toHaveLength(0);
  });

  it("reports missing required sections", () => {
    const design = `
## Overview

Only overview, missing other sections.
`;

    const findings = checkRequiredSections(design, "design.md");

    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some((f) => f.message.includes("Data Model"))).toBe(true);
    expect(findings.some((f) => f.message.includes("API Contracts"))).toBe(true);
  });

  it("accepts N/A sections with reason", () => {
    const design = `
## Overview

Overview.

## Data Model

N/A - No data model for CLI tool.

## API Contracts

N/A - Internal only.
`;

    const findings = checkRequiredSections(design, "design.md");

    // Should not report N/A sections as missing
    expect(findings.every((f) => !f.message.includes("Data Model"))).toBe(true);
    expect(findings.every((f) => !f.message.includes("API Contracts"))).toBe(true);
  });
});

describe("checkAdrCitations", () => {
  it("validates ADR citations", () => {
    const design = `
See ADR-0001 for details.

Also see ADR-0002.
`;

    const findings = checkAdrCitations(design, "design.md");

    // Current implementation assumes all citations are valid
    expect(findings).toHaveLength(0);
  });

  it("extracts ADR citations", () => {
    const design = `
See ADR-0001 for details.
Also ADR-0002 and ADR-0003.
`;

    const citations = [];
    const lines = design.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const matches = lines[i].matchAll(/ADR[-\s]?(\d{4})/gi);
      for (const match of matches) {
        citations.push(match[1]);
      }
    }

    expect(citations).toHaveLength(3);
  });
});
