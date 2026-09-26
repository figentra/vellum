/**
 * @vellum/renderers — JSON Output Renderer
 *
 * Renders machine-readable JSON output for CI and tooling.
 * All output conforms to published schemas.
 */

import type { Finding, ExaminationSummary } from "@vellum/protocol";

/** Spec metadata for rendering */
export interface SpecInfo {
  specId: string;
  specNumber: number;
  state: string;
  isLegacy: boolean;
  legacyStage?: string;
  artifacts: {
    requirements: boolean;
    design: boolean;
    tasks: boolean;
  };
}

/**
 * Render spec status as JSON.
 */
export function renderStatusJson(spec: SpecInfo): string {
  return JSON.stringify(
    {
      specId: spec.specId,
      specNumber: spec.specNumber,
      state: spec.state,
      isLegacy: spec.isLegacy,
      legacyStage: spec.legacyStage,
      artifacts: {
        requirements: spec.artifacts.requirements,
        design: spec.artifacts.design,
        tasks: spec.artifacts.tasks,
      },
    },
    null,
    2,
  );
}

/**
 * Render multiple spec statuses as JSON.
 */
export function renderStatusListJson(specs: SpecInfo[]): string {
  return JSON.stringify(
    {
      specs: specs.map((spec) => ({
        specId: spec.specId,
        specNumber: spec.specNumber,
        state: spec.state,
        isLegacy: spec.isLegacy,
        legacyStage: spec.legacyStage,
        artifacts: {
          requirements: spec.artifacts.requirements,
          design: spec.artifacts.design,
          tasks: spec.artifacts.tasks,
        },
      })),
      count: specs.length,
    },
    null,
    2,
  );
}

/**
 * Render findings as JSON.
 */
export function renderFindingsJson(findings: readonly Finding[]): string {
  return JSON.stringify(
    {
      count: findings.length,
      findings: findings.map((f) => ({
        file: f.file,
        line: f.line,
        rule: f.rule,
        message: f.message,
      })),
    },
    null,
    2,
  );
}

/**
 * Render verification result as JSON.
 */
export function renderVerificationJson(result: {
  specId: string;
  passed: boolean;
  checksTotal: number;
  checksPassed: number;
  checksFailed: number;
  findings: readonly Finding[];
}): string {
  return JSON.stringify(
    {
      specId: result.specId,
      passed: result.passed,
      summary: {
        total: result.checksTotal,
        passed: result.checksPassed,
        failed: result.checksFailed,
      },
      findings: result.findings.map((f) => ({
        file: f.file,
        line: f.line,
        rule: f.rule,
        message: f.message,
      })),
    },
    null,
    2,
  );
}

/**
 * Render examination summary as JSON.
 */
export function renderExaminationSummaryJson(summary: ExaminationSummary): string {
  return JSON.stringify(
    {
      kind: summary.kind,
      count: summary.count,
    },
    null,
    2,
  );
}

/**
 * Render error as JSON.
 */
export function renderErrorJson(error: {
  code: string;
  message: string;
  details?: unknown;
}): string {
  const result: Record<string, unknown> = {
    error: {
      code: error.code,
      message: error.message,
    },
  };

  if (error.details !== undefined) {
    result.error = { ...result.error, details: error.details };
  }

  return JSON.stringify(result, null, 2);
}

/**
 * Render lint result as JSON.
 */
export function renderLintResultJson(result: {
  artifact: string;
  findings: readonly Finding[];
}): string {
  return JSON.stringify(
    {
      artifact: result.artifact,
      findingsCount: result.findings.length,
      findings: result.findings.map((f) => ({
        file: f.file,
        line: f.line,
        rule: f.rule,
        message: f.message,
      })),
    },
    null,
    2,
  );
}

/**
 * Render multiple lint results as JSON.
 */
export function renderLintResultsJson(
  results: Array<{
    artifact: string;
    findings: readonly Finding[];
  }>,
): string {
  const totalFindings = results.reduce((sum, r) => sum + r.findings.length, 0);

  return JSON.stringify(
    {
      artifacts: results.map((r) => ({
        artifact: r.artifact,
        findingsCount: r.findings.length,
        findings: r.findings.map((f) => ({
          file: f.file,
          line: f.line,
          rule: f.rule,
          message: f.message,
        })),
      })),
      summary: {
        artifactsChecked: results.length,
        totalFindings,
      },
    },
    null,
    2,
  );
}
