/**
 * @vellum/engine — Coverage computation (design §2.6)
 *
 * Requirement 20: a plan that leaves any criterion or property without a task
 * is unapprovable, and each gap is named. Pure: takes artifact text and parsed
 * task lines, returns a decision.
 */

import { getRuleIdentifier } from "@vellum/protocol";
import type { CheckResult, Finding, TaskLine } from "@vellum/protocol";
import { parseCriteria } from "../quality/patterns/criterion-parser.js";
import { parseProperties } from "../quality/coverage-checker.js";

/** Coverage of one criterion. */
export interface CriterionCoverage {
  readonly id: string;
  /** Identifiers of every task whose requirements trailer names the criterion */
  readonly coveredBy: readonly string[];
  /** True when every covering task is optional (criterion 20.8) */
  readonly optionalOnly: boolean;
}

/** Citation of one property. */
export interface PropertyCitation {
  readonly id: string;
  /** Identifiers of every task whose properties trailer names the property */
  readonly citedBy: readonly string[];
}

/** Result of a coverage computation (criteria 20.1, 20.2, 20.6–20.8). */
export interface CoverageResult {
  /**
   * PASS when every criterion is covered and every property cited; FAIL when
   * any is not; INCONCLUSIVE when requirements.md yields zero criteria (20.7).
   */
  readonly result: CheckResult;
  readonly criteria: readonly CriterionCoverage[];
  readonly properties: readonly PropertyCitation[];
  readonly uncoveredCriteria: readonly string[];
  readonly uncitedProperties: readonly string[];
  /** Criteria covered only by optional tasks (criterion 20.8) */
  readonly coveredByOptionalOnly: readonly string[];
  /** Examination Summary counts (criterion 20.6) */
  readonly examined: {
    readonly criteria: number;
    readonly properties: number;
    readonly tasks: number;
  };
}

/** Criterion identifiers requirements.md defines, in document order, without duplicates. */
export function extractCriteria(requirements: string): string[] {
  return unique(parseCriteria(requirements).map((c) => c.reference));
}

/** Property identifiers design.md defines (`**Property N: …**` → `PN`), without duplicates. */
export function extractProperties(design: string): string[] {
  return unique(parseProperties(design).map((p) => `P${p.number}`));
}

/**
 * Compute which tasks cover each criterion and cite each property.
 *
 * @param requirements - requirements.md text
 * @param design - design.md text
 * @param tasks - task lines parsed from tasks.md
 */
export function computeCoverage(
  requirements: string,
  design: string,
  tasks: readonly TaskLine[],
): CoverageResult {
  const criterionIds = extractCriteria(requirements);
  const propertyIds = extractProperties(design);

  const criteria = criterionIds.map((id): CriterionCoverage => {
    const covering = tasks.filter((t) => (t.requirementsTrailer ?? []).some((r) => r === id));
    return {
      id,
      coveredBy: covering.map((t) => t.identifier),
      optionalOnly: covering.length > 0 && covering.every((t) => t.isOptional),
    };
  });

  const properties = propertyIds.map(
    (id): PropertyCitation => ({
      id,
      citedBy: tasks
        .filter((t) => (t.propertiesTrailer ?? []).some((p) => p === id))
        .map((t) => t.identifier),
    }),
  );

  const uncoveredCriteria = criteria.filter((c) => c.coveredBy.length === 0).map((c) => c.id);
  const uncitedProperties = properties.filter((p) => p.citedBy.length === 0).map((p) => p.id);

  let result: CheckResult;
  if (criterionIds.length === 0) {
    result = "INCONCLUSIVE";
  } else if (uncoveredCriteria.length > 0 || uncitedProperties.length > 0) {
    result = "FAIL";
  } else {
    result = "PASS";
  }

  return {
    result,
    criteria,
    properties,
    uncoveredCriteria,
    uncitedProperties,
    coveredByOptionalOnly: criteria.filter((c) => c.optionalOnly).map((c) => c.id),
    examined: {
      criteria: criterionIds.length,
      properties: propertyIds.length,
      tasks: tasks.length,
    },
  };
}

/** True only when the coverage precondition holds (result PASS). */
export function hasCompleteCoverage(coverage: CoverageResult): boolean {
  return coverage.result === "PASS";
}

/**
 * Share of criteria and properties that are covered or cited, as a percentage
 * in [0, 100]. Zero when nothing was examined.
 */
export function getCoveragePercentage(coverage: CoverageResult): number {
  const total = coverage.criteria.length + coverage.properties.length;
  if (total === 0) {
    return 0;
  }
  const gaps = coverage.uncoveredCriteria.length + coverage.uncitedProperties.length;
  return ((total - gaps) / total) * 100;
}

/**
 * One finding per Uncovered Criterion (criterion 20.1), or one naming
 * requirements.md when it yields zero criteria (criterion 20.7).
 *
 * @param coverage - Result of computeCoverage
 * @param tasksPath - Path reported for coverage gaps (default "tasks.md")
 * @param requirementsPath - Path reported when no criteria exist (default "requirements.md")
 */
export function validateCriteriaCoverage(
  coverage: CoverageResult,
  tasksPath = "tasks.md",
  requirementsPath = "requirements.md",
): Finding[] {
  if (coverage.criteria.length === 0) {
    return [
      {
        file: requirementsPath,
        line: 1,
        rule: getRuleIdentifier("E0042"),
        message: `${requirementsPath} yields zero criteria; coverage is INCONCLUSIVE`,
      },
    ];
  }
  return coverage.uncoveredCriteria.map((id) => ({
    file: tasksPath,
    line: 1,
    rule: getRuleIdentifier("E0040"),
    message: `Criterion ${id} is referenced by no task's requirements trailer`,
  }));
}

/**
 * One finding per property cited by no task (criterion 20.2).
 *
 * @param coverage - Result of computeCoverage
 * @param tasksPath - Path reported for citation gaps (default "tasks.md")
 */
export function validatePropertiesCitation(
  coverage: CoverageResult,
  tasksPath = "tasks.md",
): Finding[] {
  return coverage.uncitedProperties.map((id) => ({
    file: tasksPath,
    line: 1,
    rule: getRuleIdentifier("E0041"),
    message: `Property ${id} is cited by no task`,
  }));
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
