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
  const design = `
See ADR-0001 for details.

Also see ADR-0002 and adr/0003.
`;

  it("reports nothing when every cited ADR exists and is active", () => {
    const adrs = new Map([
      ["0001", "active" as const],
      ["0002", "active" as const],
      ["0003", "active" as const],
    ]);
    expect(checkAdrCitations(design, "design.md", adrs)).toHaveLength(0);
  });

  it("names a missing ADR and a Superseded ADR with their lines", () => {
    const adrs = new Map([
      ["0001", "active" as const],
      ["0002", "superseded" as const],
    ]);
    const findings = checkAdrCitations(design, "design.md", adrs);

    expect(findings.map((f) => [f.message, f.line_number])).toEqual([
      ["Cited ADR-0002 is Superseded", 4],
      ["Cited ADR-0003 does not exist", 4],
    ]);
    expect(findings.every((f) => f.rule_id === "ADR_CITATION_INVALID")).toBe(true);
    expect(findings.every((f) => f.file_path === "design.md")).toBe(true);
  });
});
