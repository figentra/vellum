/**
 * Quality Checker Rule Identifiers
 *
 * @see design.md Quality Checker Rule Set
 */

import type { CheckDefinition } from "@vellum/protocol";

/**
 * Rule Identifier constants - stable codes for quality checks.
 */
export const RULE_IDS = {
  // Requirements artifact rules
  EARS_PATTERN_INVALID: "EARS_PATTERN_INVALID",
  CLAUSE_ORDER_INVALID: "CLAUSE_ORDER_INVALID",
  BOTH_WHEN_AND_IF: "BOTH_WHEN_AND_IF",
  GLOSSARY_UNDEFINED: "GLOSSARY_UNDEFINED",
  VAGUE_TERM_USED: "VAGUE_TERM_USED",
  DUPLICATE_CRITERION: "DUPLICATE_CRITERION",
  MEASURABLE_SUCCESS_UNDEFINED: "MEASURABLE_SUCCESS_UNDEFINED",
  USER_STORY_ROLE_MISSING: "USER_STORY_ROLE_MISSING",
  CANDIDATE_CONTRADICTION: "CANDIDATE_CONTRADICTION",
  RISK_CLASS_MISSING: "RISK_CLASS_MISSING",
  LIFECYCLE_PATH_MISSING: "LIFECYCLE_PATH_MISSING",

  // Design artifact rules
  COVERAGE_TABLE_INCOMPLETE: "COVERAGE_TABLE_INCOMPLETE",
  PROPERTY_VALIDATES_MISSING: "PROPERTY_VALIDATES_MISSING",
  PROPERTY_NUMBERING_GAP: "PROPERTY_NUMBERING_GAP",
  TESTING_STRATEGY_MISSING: "TESTING_STRATEGY_MISSING",
  REQUIRED_SECTION_MISSING: "REQUIRED_SECTION_MISSING",
  ADR_CITATION_INVALID: "ADR_CITATION_INVALID",

  // Plan artifact rules
  CRITERION_NOT_REFERENCED: "CRITERION_NOT_REFERENCED",
  PROPERTY_NO_TEST_TASK: "PROPERTY_NO_TEST_TASK",
  TASK_NO_EXECUTOR: "TASK_NO_EXECUTOR",
  TASK_TOO_MANY_PATHS: "TASK_TOO_MANY_PATHS",
  MISSING_MIGRATION_TASK: "MISSING_MIGRATION_TASK",
  MISSING_ROLLBACK_TASK: "MISSING_ROLLBACK_TASK",
  MISSING_DOCUMENTATION_TASK: "MISSING_DOCUMENTATION_TASK",
  MISSING_RELEASE_TASK: "MISSING_RELEASE_TASK",
} as const;

/**
 * All rule definitions with metadata.
 */
export const RULE_DEFINITIONS: CheckDefinition[] = [
  // Requirements rules
  {
    code: RULE_IDS.EARS_PATTERN_INVALID,
    artifact_kind: "requirements",
    description: "Each acceptance criterion must match one of the six EARS patterns",
    severity: "error",
    applicable_sections: ["## Requirements"],
  },
  {
    code: RULE_IDS.CLAUSE_ORDER_INVALID,
    artifact_kind: "requirements",
    description: "Complex-pattern clause order must be: WHERE → WHILE → WHEN|IF → THE → SHALL",
    severity: "error",
    applicable_sections: ["## Requirements"],
  },
  {
    code: RULE_IDS.BOTH_WHEN_AND_IF,
    artifact_kind: "requirements",
    description: "A criterion must not use both WHEN and IF clauses",
    severity: "error",
    applicable_sections: ["## Requirements"],
  },
  {
    code: RULE_IDS.GLOSSARY_UNDEFINED,
    artifact_kind: "requirements",
    description: "Every THE <subject> in criteria must be defined in the Glossary",
    severity: "error",
    applicable_sections: ["## Requirements", "## Glossary"],
  },
  {
    code: RULE_IDS.VAGUE_TERM_USED,
    artifact_kind: "requirements",
    description: "No vague term, escape clause, or absolute word should be used",
    severity: "warn",
    applicable_sections: ["## Requirements"],
  },
  {
    code: RULE_IDS.DUPLICATE_CRITERION,
    artifact_kind: "requirements",
    description: "No two criteria should have equal normalised text",
    severity: "error",
    applicable_sections: ["## Requirements"],
  },
  // Design rules
  {
    code: RULE_IDS.COVERAGE_TABLE_INCOMPLETE,
    artifact_kind: "design",
    description: "Every criterion must have a coverage row in design.md",
    severity: "error",
    applicable_sections: ["## Requirement coverage"],
  },
  {
    code: RULE_IDS.PROPERTY_VALIDATES_MISSING,
    artifact_kind: "design",
    description: "Every property must have a Validates line citing defined criteria",
    severity: "error",
    applicable_sections: ["## Correctness Properties"],
  },
  {
    code: RULE_IDS.PROPERTY_NUMBERING_GAP,
    artifact_kind: "design",
    description: "Property numbering must be contiguous from 1",
    severity: "error",
    applicable_sections: ["## Correctness Properties"],
  },
  {
    code: RULE_IDS.REQUIRED_SECTION_MISSING,
    artifact_kind: "design",
    description: "Required sections must be present or marked N/A with reason",
    severity: "error",
    applicable_sections: ["all"],
  },
  {
    code: RULE_IDS.ADR_CITATION_INVALID,
    artifact_kind: "design",
    description: "ADR citations must exist and not be Superseded",
    severity: "error",
    applicable_sections: ["all"],
  },
  // Plan rules
  {
    code: RULE_IDS.CRITERION_NOT_REFERENCED,
    artifact_kind: "plan",
    description: "Every criterion must be referenced by at least one task",
    severity: "error",
    applicable_sections: ["## Tasks"],
  },
  {
    code: RULE_IDS.PROPERTY_NO_TEST_TASK,
    artifact_kind: "plan",
    description: "Every property must be referenced by at least one test task",
    severity: "error",
    applicable_sections: ["## Tasks"],
  },
  {
    code: RULE_IDS.TASK_NO_EXECUTOR,
    artifact_kind: "plan",
    description: "Every task must name an executor",
    severity: "error",
    applicable_sections: ["## Tasks"],
  },
];

/**
 * Get a rule definition by its code.
 */
export function getRuleDefinition(code: string): CheckDefinition | undefined {
  return RULE_DEFINITIONS.find((r) => r.code === code);
}

/**
 * Get all rule definitions for a specific artifact kind.
 */
export function getRulesForArtifact(
  kind: "requirements" | "design" | "plan",
): CheckDefinition[] {
  return RULE_DEFINITIONS.filter(
    (r) => r.artifact_kind === kind || r.artifact_kind === "all",
  );
}
