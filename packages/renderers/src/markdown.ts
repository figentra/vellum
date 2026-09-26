/**
 * @vellum/renderers — Markdown Renderer
 *
 * Renders status, diagnostics, and reports as Markdown.
 * All output is deterministic and pure.
 */

import type { SpecMetadata, Finding, LifecycleState, TaskMarker } from "@vellum/protocol";

/**
 * Render spec status as Markdown.
 */
export function renderStatusMarkdown(spec: SpecMetadata): string {
  const lines: string[] = [];

  lines.push(`# Spec ${spec.specId}`, "");
  lines.push(`**State**: ${spec.state}`, "");

  if (spec.isLegacy) {
    lines.push(`**Type**: Legacy (${spec.legacyStage})`, "");
  }

  lines.push("**Artifacts**:", "");
  lines.push(`- Requirements: ${spec.artifacts.requirements ? "✓" : "✗"}`);
  lines.push(`- Design: ${spec.artifacts.design ? "✓" : "✗"}`);
  lines.push(`- Tasks: ${spec.artifacts.tasks ? "✓" : "✗"}`);
  lines.push("");

  return lines.join("\n");
}

/**
 * Render findings as Markdown table.
 */
export function renderFindingsMarkdown(findings: readonly Finding[]): string {
  if (findings.length === 0) {
    return "No findings.\n";
  }

  const lines: string[] = [];

  lines.push("| File | Line | Rule | Message |", "|------|------|------|---------|");

  for (const finding of findings) {
    const file = escapeMarkdown(finding.file);
    const line = finding.line.toString();
    const rule = escapeMarkdown(finding.rule);
    const message = escapeMarkdown(finding.message);

    lines.push(`| ${file} | ${line} | ${rule} | ${message} |`);
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Render task list as Markdown.
 */
export function renderTaskListMarkdown(
  tasks: Array<{ id: string; marker: TaskMarker; text: string }>,
): string {
  const lines: string[] = [];

  for (const task of tasks) {
    const marker = formatMarker(task.marker);
    lines.push(`- [${marker}] ${task.id}: ${escapeMarkdown(task.text)}`);
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Render lifecycle state transitions as Markdown table.
 */
export function renderTransitionsMarkdown(
  transitions: Array<{ from: LifecycleState; to: LifecycleState; timestamp: string }>,
): string {
  if (transitions.length === 0) {
    return "No transitions recorded.\n";
  }

  const lines: string[] = [];

  lines.push("| From | To | Timestamp |", "|------|----|-----------|");

  for (const t of transitions) {
    const from = escapeMarkdown(t.from);
    const to = escapeMarkdown(t.to);
    const timestamp = escapeMarkdown(t.timestamp);
    lines.push(`| ${from} | ${to} | ${timestamp} |`);
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Render verification report as Markdown.
 */
export function renderVerificationReportMarkdown(result: {
  specId: string;
  passed: boolean;
  checksTotal: number;
  checksPassed: number;
  checksFailed: number;
  findings: readonly Finding[];
}): string {
  const lines: string[] = [];

  lines.push(`# Verification Report: ${result.specId}`, "");
  lines.push(`**Result**: ${result.passed ? "✓ PASSED" : "✗ FAILED"}`, "");
  lines.push("## Summary", "");
  lines.push(`- Total checks: ${result.checksTotal}`);
  lines.push(`- Passed: ${result.checksPassed}`);
  lines.push(`- Failed: ${result.checksFailed}`);
  lines.push("");

  if (result.findings.length > 0) {
    lines.push("## Findings", "");
    lines.push(renderFindingsMarkdown(result.findings));
  }

  return lines.join("\n");
}

/**
 * Format task marker for display.
 */
function formatMarker(marker: TaskMarker): string {
  switch (marker) {
    case " ":
      return " ";
    case "x":
      return "x";
    case "-":
      return "-";
    case "~":
      return "~";
    default:
      return " ";
  }
}

/**
 * Escape Markdown special characters.
 */
function escapeMarkdown(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ").replace(/\r/g, "");
}
