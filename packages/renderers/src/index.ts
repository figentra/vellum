/**
 * @vellum/renderers — Deterministic output projections
 *
 * This package contains pure functions that format engine output
 * into human-readable and machine-readable formats.
 *
 * ## Design Principles
 *
 * - Pure functions only
 * - Deterministic output (same input → same output)
 * - Zero I/O
 * - Format: JSON, Markdown, CLI output
 */

// ============================================================================
// Markdown Renderer
// ============================================================================

export {
  renderStatusMarkdown,
  renderFindingsMarkdown,
  renderTaskListMarkdown,
  renderTransitionsMarkdown,
  renderVerificationReportMarkdown,
} from "./markdown.js";

export type { SpecInfo } from "./markdown.js";

// ============================================================================
// Assistant Renderer
// ============================================================================

export { renderAssistantFrontmatter, createProvenanceMarker } from "./assistant.js";

export type { AssistantType } from "./assistant.js";

// ============================================================================
// CLI Output Renderer
// ============================================================================

export {
  renderStatusCli,
  renderFindingsCli,
  renderTaskListCli,
  renderProgress,
  createSpinner,
  renderError,
  renderSuccess,
  renderWarning,
  renderInfo,
} from "./cli-output.js";

// ============================================================================
// JSON Renderer
// ============================================================================

export {
  renderStatusJson,
  renderStatusListJson,
  renderFindingsJson,
  renderVerificationJson,
  renderExaminationSummaryJson,
  renderErrorJson,
  renderLintResultJson,
  renderLintResultsJson,
} from "./json.js";

// ============================================================================
// Context Bundle Renderer
// ============================================================================

export { buildContextBundle, renderContextBundle } from "./context.js";

export type { ContextBundle } from "./context.js";

// ============================================================================
// Version
// ============================================================================

export const VERSION = "0.0.0" as const;
