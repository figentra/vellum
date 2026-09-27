/**
 * Quality Checker - main entry point that orchestrates all quality checks.
 *
 * @see requirements.md Requirements 1, 2, 3
 */

import type { QualityFinding, CheckResult } from "@vellum/protocol";
import { createQualityFinding } from "@vellum/protocol";
import { RULE_IDS } from "./rules";
import { parseAndValidateEars } from "./ears-parser";
import { checkVagueTerms } from "./vague-terms";
import { checkGlossaryCoverage } from "./glossary-checker";
import { checkCoverage } from "./coverage-checker";
import { checkRequiredSections, checkAdrCitations } from "./section-checker";
import type { AdrStatus } from "./section-checker";
import { CHECK_NOT_RUN, checkPlanCoverage, type PlanCoverageOptions } from "./planning-checker";

/**
 * Quality check result for a single artifact.
 */
export interface QualityCheckResult {
  /** Artifact path */
  artifact_path: string;
  /** Artifact version */
  artifact_version: number;
  /**
   * Overall status: fail on any error finding; otherwise inconclusive when a
   * check could not run (see `not_checked`); otherwise warn or pass.
   */
  status: "pass" | "fail" | "warn" | "inconclusive";
  /** All findings */
  findings: QualityFinding[];
  /** Check results per rule */
  check_results: CheckResult[];
  /** Checks that could not run, and why (each is also a CHECK_NOT_RUN info finding) */
  not_checked: { check: string; reason: string }[];
}

/**
 * Options for quality checking.
 */
export interface QualityCheckOptions {
  /** Artifact file path */
  filePath: string;
  /** Artifact content */
  content: string;
  /** Artifact kind */
  kind: "requirements" | "design" | "plan";
  /** Artifact version */
  version: number;
  /** Additional artifacts needed for cross-reference */
  requirementsContent?: string;
  designContent?: string;
  /** ADR number to status; when given, design.md's ADR citations are checked */
  adrs?: ReadonlyMap<string, AdrStatus>;
  /** Change and Policy context for the plan checks that need it (criteria 3.7, 3.8) */
  plan?: PlanCoverageOptions;
}

// Re-export components
export * from "./rules";
export * from "./patterns";
export * from "./lists";
export * from "./ears-parser";
export * from "./vague-terms";
export * from "./glossary-checker";
export * from "./coverage-checker";
export * from "./section-checker";
export * from "./planning-checker";

/**
 * Run quality checks on requirements.md.
 */
export function checkRequirements(
  content: string,
  filePath: string,
  version: number,
): QualityCheckResult {
  const findings: QualityFinding[] = [];

  // Extract glossary section
  const glossaryMatch = content.match(/## Glossary[\s\S]*?(?=##|$)/);
  const glossaryText = glossaryMatch ? glossaryMatch[0] : "";

  // Run all requirements checks (Requirements 1.1-1.10)
  findings.push(...parseAndValidateEars(content, filePath));
  findings.push(...checkVagueTerms(content, filePath));
  findings.push(...checkGlossaryCoverage(content, glossaryText, filePath));

  // Check for risk class and lifecycle path (criterion 1.10)
  if (!content.includes("Risk Class:") && !content.includes("Risk class:")) {
    findings.push(
      createQualityFinding(
        RULE_IDS.RISK_CLASS_MISSING,
        "Requirements document missing Risk Class declaration",
        filePath,
        1,
        "error",
      ),
    );
  }

  if (!content.includes("Lifecycle path:") && !content.includes("Lifecycle:")) {
    findings.push(
      createQualityFinding(
        RULE_IDS.LIFECYCLE_PATH_MISSING,
        "Requirements document missing lifecycle path declaration",
        filePath,
        1,
        "error",
      ),
    );
  }

  return summarize(filePath, version, findings);
}

/**
 * Run quality checks on design.md.
 */
export function checkDesign(
  content: string,
  filePath: string,
  version: number,
  requirementsContent?: string,
  adrs?: ReadonlyMap<string, AdrStatus>,
): QualityCheckResult {
  const findings: QualityFinding[] = [];

  // Run all design checks (Requirements 2.1-2.6)
  if (requirementsContent) {
    findings.push(...checkCoverage(requirementsContent, content, filePath));
  } else {
    findings.push(notRun("coverage of requirements", "requirements.md was not supplied", filePath));
  }
  findings.push(...checkRequiredSections(content, filePath));
  if (adrs) {
    findings.push(...checkAdrCitations(content, filePath, adrs));
  } else {
    findings.push(notRun("ADR citations", "the ADR statuses were not supplied", filePath));
  }

  return summarize(filePath, version, findings);
}

/**
 * Run quality checks on tasks.md.
 */
export function checkPlan(
  content: string,
  filePath: string,
  version: number,
  requirementsContent?: string,
  designContent?: string,
  planOptions?: PlanCoverageOptions,
): QualityCheckResult {
  const findings: QualityFinding[] = [];

  // Run all plan checks (Requirements 3.1-3.8)
  if (requirementsContent !== undefined && designContent !== undefined) {
    findings.push(
      ...checkPlanCoverage(requirementsContent, designContent, content, filePath, planOptions),
    );
  } else {
    findings.push(
      notRun(
        "plan coverage (criteria 3.1-3.8)",
        "requirements.md and design.md were not both supplied",
        filePath,
      ),
    );
  }

  return summarize(filePath, version, findings);
}

/**
 * Run quality checks on an artifact.
 *
 * @param options - Check options
 * @returns Quality check result
 */
export function runQualityChecks(options: QualityCheckOptions): QualityCheckResult {
  const { filePath, content, kind, version, requirementsContent, designContent, adrs, plan } =
    options;

  switch (kind) {
    case "requirements":
      return checkRequirements(content, filePath, version);
    case "design":
      return checkDesign(content, filePath, version, requirementsContent, adrs);
    case "plan":
      return checkPlan(content, filePath, version, requirementsContent, designContent, plan);
  }
}

/** A CHECK_NOT_RUN info finding: `check` could not run, for `reason`. */
function notRun(check: string, reason: string, filePath: string): QualityFinding {
  return createQualityFinding(
    CHECK_NOT_RUN,
    `${check} not checked: ${reason}`,
    filePath,
    1,
    "info",
  );
}

/** Status and not-checked list from a check's findings. */
function summarize(
  filePath: string,
  version: number,
  findings: QualityFinding[],
): QualityCheckResult {
  const not_checked = findings
    .filter((f) => f.rule_id === CHECK_NOT_RUN)
    .map((f) => {
      const [check = f.message, reason = ""] = f.message.split(" not checked: ");
      return { check, reason };
    });
  const status = findings.some((f) => f.severity === "error")
    ? "fail"
    : not_checked.length > 0
      ? "inconclusive"
      : findings.some((f) => f.severity === "warn")
        ? "warn"
        : "pass";

  return {
    artifact_path: filePath,
    artifact_version: version,
    status,
    findings,
    check_results: [],
    not_checked,
  };
}
