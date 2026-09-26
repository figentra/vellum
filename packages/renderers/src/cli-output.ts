/**
 * @vellum/renderers — CLI Output Renderer
 *
 * Renders human-readable output for terminal with colors and formatting.
 */

import type { SpecMetadata, Finding, LifecycleState, TaskMarker } from "@vellum/protocol";

/** ANSI color codes */
const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

/** Check if colors should be used */
function useColors(): boolean {
  return process.stdout.isTTY && process.env.NO_COLOR !== "1";
}

/**
 * Render spec status for CLI.
 */
export function renderStatusCli(spec: SpecMetadata, colors = useColors()): string {
  const c = colors ? COLORS : noColors();
  const lines: string[] = [];

  lines.push(`${c.bold}Spec ${spec.specId}${c.reset}`, "");
  lines.push(`State: ${formatState(spec.state, colors)}`, "");

  if (spec.isLegacy) {
    lines.push(`Type: ${c.yellow}Legacy${c.reset} (${spec.legacyStage})`, "");
  }

  lines.push("Artifacts:");
  lines.push(`  Requirements: ${formatArtifactStatus(spec.artifacts.requirements, colors)}`);
  lines.push(`  Design: ${formatArtifactStatus(spec.artifacts.design, colors)}`);
  lines.push(`  Tasks: ${formatArtifactStatus(spec.artifacts.tasks, colors)}`);
  lines.push("");

  return lines.join("\n");
}

/**
 * Render findings for CLI.
 */
export function renderFindingsCli(findings: readonly Finding[], colors = useColors()): string {
  const c = colors ? COLORS : noColors();

  if (findings.length === 0) {
    return `${c.green}✓ No findings${c.reset}\n`;
  }

  const lines: string[] = [];
  lines.push(`${c.red}✗ ${findings.length} finding(s)${c.reset}`, "");

  for (const finding of findings) {
    const location = `${c.cyan}${finding.file}${c.reset}:${c.yellow}${finding.line}${c.reset}`;
    const rule = `${c.magenta}${finding.rule}${c.reset}`;
    lines.push(`  ${location} ${rule}`);
    lines.push(`    ${c.dim}${finding.message}${c.reset}`);
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Render task list for CLI.
 */
export function renderTaskListCli(
  tasks: Array<{ id: string; marker: TaskMarker; text: string }>,
  colors = useColors(),
): string {
  const c = colors ? COLORS : noColors();
  const lines: string[] = [];

  for (const task of tasks) {
    const marker = formatMarkerCli(task.marker, colors);
    lines.push(`  [${marker}] ${c.bold}${task.id}${c.reset}: ${task.text}`);
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Render progress indicator.
 */
export function renderProgress(message: string, current: number, total: number): string {
  const percent = Math.round((current / total) * 100);
  const bar = "█".repeat(Math.floor(percent / 5)) + "░".repeat(20 - Math.floor(percent / 5));
  return `\r${bar} ${percent}% ${message}`;
}

/**
 * Render spinner.
 */
export function createSpinner(message: string): {
  frame: () => string;
  done: (finalMessage?: string) => string;
} {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;

  return {
    frame: () => `\r${frames[i++ % frames.length]} ${message}`,
    done: (finalMessage?: string) => `\r✓ ${finalMessage ?? message}`,
  };
}

/**
 * Render error message.
 */
export function renderError(message: string, colors = useColors()): string {
  const c = colors ? COLORS : noColors();
  return `${c.red}✗ Error:${c.reset} ${message}\n`;
}

/**
 * Render success message.
 */
export function renderSuccess(message: string, colors = useColors()): string {
  const c = colors ? COLORS : noColors();
  return `${c.green}✓${c.reset} ${message}\n`;
}

/**
 * Render warning message.
 */
export function renderWarning(message: string, colors = useColors()): string {
  const c = colors ? COLORS : noColors();
  return `${c.yellow}⚠ Warning:${c.reset} ${message}\n`;
}

/**
 * Render info message.
 */
export function renderInfo(message: string, colors = useColors()): string {
  const c = colors ? COLORS : noColors();
  return `${c.blue}ℹ${c.reset} ${message}\n`;
}

/**
 * Format lifecycle state with color.
 */
function formatState(state: LifecycleState, colors: boolean): string {
  if (!colors) return state;

  const c = COLORS;
  const terminalStates = ["DONE", "ABANDONED", "INVALID", "SUPERSEDED"];

  if (terminalStates.includes(state)) {
    return `${c.dim}${state}${c.reset}`;
  }

  if (state === "IN_PROGRESS") {
    return `${c.green}${state}${c.reset}`;
  }

  if (state === "BLOCKED") {
    return `${c.red}${state}${c.reset}`;
  }

  if (state.includes("REVIEW")) {
    return `${c.yellow}${state}${c.reset}`;
  }

  return state;
}

/**
 * Format artifact status with color.
 */
function formatArtifactStatus(exists: boolean, colors: boolean): string {
  if (colors) {
    return exists ? `${COLORS.green}✓${COLORS.reset}` : `${COLORS.red}✗${COLORS.reset}`;
  }
  return exists ? "✓" : "✗";
}

/**
 * Format task marker for CLI.
 */
function formatMarkerCli(marker: TaskMarker, colors: boolean): string {
  const c = colors ? COLORS : noColors();

  switch (marker) {
    case " ":
      return " ";
    case "x":
      return `${c.green}x${c.reset}`;
    case "-":
      return `${c.yellow}-${c.reset}`;
    case "~":
      return `${c.dim}~${c.reset}`;
    default:
      return " ";
  }
}

/**
 * No-op colors object.
 */
function noColors() {
  return {
    reset: "",
    bold: "",
    dim: "",
    red: "",
    green: "",
    yellow: "",
    blue: "",
    magenta: "",
    cyan: "",
  };
}
