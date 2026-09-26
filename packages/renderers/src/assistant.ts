/**
 * @vellum/renderers — Assistant Projection Renderer
 *
 * Renders agent and rule files in assistant-specific frontmatter dialects.
 * Supports Kiro, Claude, and OpenCode formats.
 */

import type { NeutralFrontmatter, ProvenanceMarker } from "@vellum/protocol";

/** Supported assistant types */
export type AssistantType = "kiro" | "claude" | "opencode";

/**
 * Render assistant frontmatter for the specified assistant type.
 */
export function renderAssistantFrontmatter(
  frontmatter: NeutralFrontmatter,
  assistant: AssistantType,
): string {
  switch (assistant) {
    case "kiro":
      return renderKiroFrontmatter(frontmatter);
    case "claude":
      return renderClaudeFrontmatter(frontmatter);
    case "opencode":
      return renderOpenCodeFrontmatter(frontmatter);
    default:
      throw new Error(`Unknown assistant type: ${assistant}`);
  }
}

/**
 * Render Kiro-specific frontmatter.
 * Uses YAML frontmatter with custom fields.
 */
function renderKiroFrontmatter(frontmatter: NeutralFrontmatter): string {
  const lines: string[] = ["---"];

  // Metadata header
  if (frontmatter.name) {
    lines.push(`name: "${escapeYaml(frontmatter.name)}"`);
  }

  if (frontmatter.description) {
    lines.push(`description: "${escapeYaml(frontmatter.description)}"`);
  }

  // Kind (skill, agent, rule, hook)
  lines.push(`kind: ${frontmatter.kind}`);

  // Provenance marker
  if (frontmatter.provenance) {
    lines.push("");
    lines.push("# Provenance");
    lines.push(`provenance.source: "${escapeYaml(frontmatter.provenance.source)}"`);
    if (frontmatter.provenance.generated_at) {
      lines.push(`provenance.generated_at: "${frontmatter.provenance.generated_at}"`);
    }
    if (frontmatter.provenance.generator) {
      lines.push(`provenance.generator: "${escapeYaml(frontmatter.provenance.generator)}"`);
    }
  }

  // References
  if (frontmatter.references && frontmatter.references.length > 0) {
    lines.push("");
    lines.push("references:");
    for (const ref of frontmatter.references) {
      lines.push(`  - "${escapeYaml(ref)}"`);
    }
  }

  // Tags
  if (frontmatter.tags && frontmatter.tags.length > 0) {
    lines.push("");
    lines.push("tags:");
    for (const tag of frontmatter.tags) {
      lines.push(`  - "${escapeYaml(tag)}"`);
    }
  }

  lines.push("---", "");
  return lines.join("\n");
}

/**
 * Render Claude-specific frontmatter.
 * Uses YAML frontmatter with Claude-specific fields.
 */
function renderClaudeFrontmatter(frontmatter: NeutralFrontmatter): string {
  const lines: string[] = ["---"];

  // Claude uses 'title' instead of 'name'
  if (frontmatter.name) {
    lines.push(`title: "${escapeYaml(frontmatter.name)}"`);
  }

  if (frontmatter.description) {
    lines.push(`description: "${escapeYaml(frontmatter.description)}"`);
  }

  // Kind mapping
  const kindMap: Record<string, string> = {
    skill: "skill",
    agent: "agent",
    rule: "prompt",
    hook: "hook",
  };
  lines.push(`type: ${kindMap[frontmatter.kind] ?? frontmatter.kind}`);

  // Provenance as comment
  if (frontmatter.provenance) {
    lines.push("");
    lines.push("# Provenance marker (do not edit)");
    lines.push(`# source: ${frontmatter.provenance.source}`);
    if (frontmatter.provenance.generated_at) {
      lines.push(`# generated: ${frontmatter.provenance.generated_at}`);
    }
  }

  // References
  if (frontmatter.references && frontmatter.references.length > 0) {
    lines.push("");
    lines.push("context_paths:");
    for (const ref of frontmatter.references) {
      lines.push(`  - "${escapeYaml(ref)}"`);
    }
  }

  // Tags
  if (frontmatter.tags && frontmatter.tags.length > 0) {
    lines.push("");
    lines.push("tags:");
    for (const tag of frontmatter.tags) {
      lines.push(`  - "${escapeYaml(tag)}"`);
    }
  }

  lines.push("---", "");
  return lines.join("\n");
}

/**
 * Render OpenCode-specific frontmatter.
 * Uses YAML frontmatter with OpenCode-specific fields.
 */
function renderOpenCodeFrontmatter(frontmatter: NeutralFrontmatter): string {
  const lines: string[] = ["---"];

  if (frontmatter.name) {
    lines.push(`name: "${escapeYaml(frontmatter.name)}"`);
  }

  if (frontmatter.description) {
    lines.push(`description: "${escapeYaml(frontmatter.description)}"`);
  }

  lines.push(`kind: ${frontmatter.kind}`);

  // Provenance marker
  if (frontmatter.provenance) {
    lines.push("");
    lines.push("# Provenance marker");
    lines.push(`_source: "${escapeYaml(frontmatter.provenance.source)}"`);
    if (frontmatter.provenance.generated_at) {
      lines.push(`_generated: "${frontmatter.provenance.generated_at}"`);
    }
    if (frontmatter.provenance.generator) {
      lines.push(`_generator: "${escapeYaml(frontmatter.provenance.generator)}"`);
    }
  }

  // References (relative paths for OpenCode)
  if (frontmatter.references && frontmatter.references.length > 0) {
    lines.push("");
    lines.push("related:");
    for (const ref of frontmatter.references) {
      lines.push(`  - "${escapeYaml(ref)}"`);
    }
  }

  // Tags
  if (frontmatter.tags && frontmatter.tags.length > 0) {
    lines.push("");
    lines.push("tags:");
    for (const tag of frontmatter.tags) {
      lines.push(`  - "${escapeYaml(tag)}"`);
    }
  }

  lines.push("---", "");
  return lines.join("\n");
}

/**
 * Generate provenance marker.
 */
export function createProvenanceMarker(source: string): ProvenanceMarker {
  return {
    source,
    generated_at: new Date().toISOString(),
    generator: "vellum-sync",
  };
}

/**
 * Escape YAML string value.
 */
function escapeYaml(value: string): string {
  // Escape quotes and backslashes
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
