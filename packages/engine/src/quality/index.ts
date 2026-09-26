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
import { checkPlanCoverage } from "./planning-checker";

/**
 * Quality check result for a single artifact.
 */
export interface QualityCheckResult {
  /** Artifact path */
  artifact_path: string;
  /** Artifact version */
  artifact_version: number;
  /** Overall status */
  status: "pass" | "fail" | "warn";
  /** All findings */
  findings: QualityFinding[];
  /** Check results per rule */
  check_results: CheckResult[];
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

  const status = findings.some((f) => f.severity === "error")
    ? "fail"
    : findings.some((f) => f.severity === "warn")
      ? "warn"
      : "pass";

  return {
    artifact_path: filePath,
    artifact_version: version,
    status,
    findings,
    check_results: [],
  };
}

/**
 * Run quality checks on design.md.
 */
export function checkDesign(
  content: string,
  filePath: string,
  version: number,
  requirementsContent?: string,
): QualityCheckResult {
  const findings: QualityFinding[] = [];

  // Run all design checks (Requirements 2.1-2.6)
  if (requirementsContent) {
    findings.push(...checkCoverage(requirementsContent, content, filePath));
  }
  findings.push(...checkRequiredSections(content, filePath));
  findings.push(...checkAdrCitations(content, filePath));

  const status = findings.some((f) => f.severity === "error")
    ? "fail"
    : findings.some((f) => f.severity === "warn")
      ? "warn"
      : "pass";

  return {
    artifact_path: filePath,
    artifact_version: version,
    status,
    findings,
    check_results: [],
  };
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
): QualityCheckResult {
  const findings: QualityFinding[] = [];

  // Run all plan checks (Requirements 3.1-3.8)
  if (requirementsContent && designContent) {
    findings.push(...checkPlanCoverage(requirementsContent, designContent, content, filePath));
  }

  const status = findings.some((f) => f.severity === "error")
    ? "fail"
    : findings.some((f) => f.severity === "warn")
      ? "warn"
      : "pass";

  return {
    artifact_path: filePath,
    artifact_version: version,
    status,
    findings,
    check_results: [],
  };
}

/**
 * Run quality checks on an artifact.
 *
 * @param options - Check options
 * @returns Quality check result
 */
export function runQualityChecks(options: QualityCheckOptions): QualityCheckResult {
  const { filePath, content, kind, version, requirementsContent, designContent } = options;

  switch (kind) {
    case "requirements":
      return checkRequirements(content, filePath, version);
    case "design":
      return checkDesign(content, filePath, version, requirementsContent);
    case "plan":
      return checkPlan(content, filePath, version, requirementsContent, designContent);
  }
}
