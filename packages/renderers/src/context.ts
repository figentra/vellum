/**
 * @vellum/renderers — Context Bundle Renderer
 *
 * Builds context bundles for AI assistants with size budget enforcement.
 */

/** Spec metadata for rendering */
export interface SpecInfo {
  specId: string;
  specNumber: number;
}

/** Default max bundle size in characters (approximately 100KB) */
const DEFAULT_MAX_BUDGET = 100_000;

/** Size overhead for metadata and formatting */
const SIZE_OVERHEAD = 500;

/**
 * Context bundle for AI assistant.
 */
export interface ContextBundle {
  specId: string;
  artifacts: Array<{
    kind: string;
    path: string;
    content: string;
    extractedSections?: string[];
  }>;
  metadata: {
    totalSize: number;
    budget: number;
    truncated: boolean;
    excludedArtifacts: string[];
  };
}

/**
 * Build context bundle for a spec.
 */
export function buildContextBundle(
  spec: SpecInfo,
  artifacts: Map<string, { kind: string; content: string }>,
  options?: {
    budget?: number;
    includeSections?: string[];
  },
): ContextBundle {
  const budget = options?.budget ?? DEFAULT_MAX_BUDGET;
  const includeSections = options?.includeSections;

  const includedArtifacts: ContextBundle["artifacts"] = [];
  const excludedArtifacts: string[] = [];
  let totalSize = SIZE_OVERHEAD;
  let truncated = false;

  // Sort artifacts by priority: requirements > design > tasks
  const priorityOrder = ["requirements", "design", "tasks"];
  const sortedArtifacts = Array.from(artifacts.entries()).sort((a, b) => {
    const aPriority = priorityOrder.indexOf(a[1].kind) ?? 99;
    const bPriority = priorityOrder.indexOf(b[1].kind) ?? 99;
    return aPriority - bPriority;
  });

  for (const [path, artifact] of sortedArtifacts) {
    const remainingBudget = budget - totalSize;

    if (remainingBudget <= 0) {
      excludedArtifacts.push(path);
      truncated = true;
      continue;
    }

    let { content } = artifact;
    let extractedSections: string[] | undefined;

    // Extract specific sections if requested
    if (includeSections && includeSections.length > 0) {
      const extracted = extractSections(content, includeSections);
      if (extracted) {
        content = extracted.content;
        extractedSections = [...extracted.headings];
      }
    }

    // Check if content fits in budget
    if (content.length <= remainingBudget) {
      const artifactData: ContextBundle["artifacts"][number] = {
        kind: artifact.kind,
        path,
        content,
      };
      if (extractedSections) artifactData.extractedSections = extractedSections;
      includedArtifacts.push(artifactData);
      totalSize += content.length;
    } else {
      // Truncate content to fit
      const truncatedContent = truncateContent(content, remainingBudget);
      const artifactData: ContextBundle["artifacts"][number] = {
        kind: artifact.kind,
        path,
        content: truncatedContent,
      };
      if (extractedSections) artifactData.extractedSections = extractedSections;
      includedArtifacts.push(artifactData);
      totalSize += truncatedContent.length;
      truncated = true;
    }
  }

  return {
    specId: spec.specId,
    artifacts: includedArtifacts,
    metadata: {
      totalSize,
      budget,
      truncated,
      excludedArtifacts,
    },
  };
}

/**
 * Render context bundle as text for AI assistant.
 */
export function renderContextBundle(bundle: ContextBundle): string {
  const lines: string[] = [];

  lines.push(`# Context Bundle: ${bundle.specId}`, "");

  if (bundle.metadata.truncated) {
    lines.push(
      `⚠ This bundle was truncated to fit ${bundle.metadata.budget} character budget.`,
      "",
    );
  }

  for (const artifact of bundle.artifacts) {
    lines.push(`## ${artifact.kind}: ${artifact.path}`, "");

    if (artifact.extractedSections) {
      lines.push(`Sections: ${artifact.extractedSections.join(", ")}`, "");
    }

    lines.push(artifact.content);
    lines.push("");
  }

  lines.push("---", "");
  lines.push(`Total size: ${bundle.metadata.totalSize} characters`);
  lines.push(`Budget: ${bundle.metadata.budget} characters`);

  if (bundle.metadata.excludedArtifacts.length > 0) {
    lines.push(`Excluded: ${bundle.metadata.excludedArtifacts.join(", ")}`);
  }

  return lines.join("\n");
}

/**
 * Extract specific sections from markdown content.
 */
function extractSections(
  content: string,
  sections: string[],
): { content: string; headings: string[] } | null {
  const lines = content.split("\n");
  const extracted: string[] = [];
  const headings: string[] = [];

  let inTargetSection = false;
  let currentHeading = "";

  for (const line of lines) {
    // Check for heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      const headingText = headingMatch[2]?.trim() ?? "";
      if (!headingText) continue;

      // Check if this heading is in our target list
      const isTarget = sections.some(
        (s) =>
          headingText.toLowerCase().includes(s.toLowerCase()) ||
          s.toLowerCase().includes(headingText.toLowerCase()),
      );

      if (isTarget) {
        inTargetSection = true;
        currentHeading = headingText;
        headings.push(headingText);
      } else {
        // Check if we're moving to a different heading at same or higher level
        const level = headingMatch[1]?.length ?? 0;
        const currentHeadingLine = currentHeading
          ? lines.find((l) => l.includes(currentHeading))
          : undefined;
        const currentLevel = currentHeadingLine?.match(/^#+/)?.[0]?.length ?? 0;

        if (level <= currentLevel) {
          inTargetSection = false;
        }
      }
    }

    if (inTargetSection) {
      extracted.push(line);
    }
  }

  const result = extracted.join("\n").trim();
  return result.length > 0 ? { content: result, headings } : null;
}

/**
 * Truncate content to fit budget, preserving complete lines.
 */
function truncateContent(content: string, budget: number): string {
  if (content.length <= budget) {
    return content;
  }

  // Find a good truncation point
  const lines = content.split("\n");
  const result: string[] = [];
  let size = 0;

  for (const line of lines) {
    if (line === undefined) continue;
    if (size + line.length + 1 > budget - 50) {
      // Leave room for truncation marker
      break;
    }
    result.push(line);
    size += line.length + 1;
  }

  // Add truncation marker
  result.push("");
  result.push("... (truncated)");

  return result.join("\n");
}
