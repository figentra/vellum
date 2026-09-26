/**
 * State Manager - reads and writes Lifecycle Frontmatter and Task Markers in place.
 *
 * All writes to Lifecycle Frontmatter go through this module, nowhere else.
 *
 * @see requirements.md Requirements 4.2, 5.2, 10.2
 */

import { readFile, writeFile } from "fs/promises";
import { extractFrontmatter } from "./artifact-reader.js";

/**
 * Task marker values.
 */
export type TaskMarker = "[ ]" | "[~]" | "[-]" | "[x]";

/**
 * Parsed Lifecycle Frontmatter.
 */
export interface LifecycleFrontmatter {
  schema_version: string;
  artifact_version: number;
  artifact_status: string;
  risk_class?: string | undefined;
}

/**
 * Artifacts that can have frontmatter.
 */
export type ArtifactType = "requirements.md" | "design.md" | "tasks.md";

/**
 * Read frontmatter from an artifact.
 *
 * @param artifactPath - Path to the artifact file
 * @returns Parsed frontmatter (or null if none)
 */
export async function readFrontmatter(artifactPath: string): Promise<LifecycleFrontmatter | null> {
  const content = await readFile(artifactPath, "utf8");
  const { frontmatter } = extractFrontmatter(content);

  if (!frontmatter) {
    return null;
  }

  return {
    schema_version: frontmatter.schema_version as string,
    artifact_version: frontmatter.artifact_version as number,
    artifact_status: frontmatter.artifact_status as string,
    risk_class: frontmatter.risk_class as string | undefined,
  };
}

/**
 * Write frontmatter to an artifact, preserving the body.
 *
 * Frontmatter is written in YAML key: value format.
 * The body is left byte-identical.
 *
 * @param artifactPath - Path to the artifact file
 * @param frontmatter - Frontmatter to write
 */
export async function writeFrontmatter(
  artifactPath: string,
  frontmatter: LifecycleFrontmatter,
): Promise<void> {
  const content = await readFile(artifactPath, "utf8");
  const { body } = extractFrontmatter(content);

  // Build YAML frontmatter
  let yaml = "---\n";
  yaml += `schema_version: "${frontmatter.schema_version}"\n`;
  yaml += `artifact_version: ${frontmatter.artifact_version}\n`;
  yaml += `artifact_status: "${frontmatter.artifact_status}"\n`;

  if (frontmatter.risk_class) {
    yaml += `risk_class: "${frontmatter.risk_class}"\n`;
  }

  yaml += "---\n";

  // Combine frontmatter and body
  const newContent = yaml + body;

  await writeFile(artifactPath, newContent, "utf8");
}

/**
 * Initialize frontmatter for an artifact.
 *
 * Creates initial frontmatter at the top of the file.
 *
 * @param artifactPath - Path to the artifact file
 * @param artifactType - Type of artifact
 * @param options - Initial values
 */
export async function initializeFrontmatter(
  artifactPath: string,
  artifactType: ArtifactType,
  options?: { artifact_status?: string; risk_class?: string },
): Promise<void> {
  const content = await readFile(artifactPath, "utf8");

  // Don't overwrite existing frontmatter
  if (content.startsWith("---")) {
    return;
  }

  const frontmatter: LifecycleFrontmatter = {
    schema_version: "1.0",
    artifact_version: 1,
    artifact_status: options?.artifact_status || "DRAFT",
    risk_class: artifactType === "requirements.md" ? options?.risk_class || "standard" : undefined,
  };

  // Build YAML frontmatter
  let yaml = "---\n";
  yaml += `schema_version: "${frontmatter.schema_version}"\n`;
  yaml += `artifact_version: ${frontmatter.artifact_version}\n`;
  yaml += `artifact_status: "${frontmatter.artifact_status}"\n`;

  if (frontmatter.risk_class) {
    yaml += `risk_class: "${frontmatter.risk_class}"\n`;
  }

  yaml += "---\n";

  // Combine frontmatter and existing content
  const newContent = yaml + content;

  await writeFile(artifactPath, newContent, "utf8");
}

/**
 * Read task marker from a task line.
 *
 * Task lines match: `- [x] N.N <title>` (Kiro Task Line Grammar).
 *
 * @param tasksPath - Path to tasks.md
 * @param taskId - Task identifier (e.g., "2.1")
 * @returns Marker value or null if task not found
 */
export async function readTaskMarker(
  tasksPath: string,
  taskId: string,
): Promise<TaskMarker | null> {
  const content = await readFile(tasksPath, "utf8");
  const lines = content.split("\n");

  for (const line of lines) {
    // Match task line pattern: - [x] N.N ...
    const match = line?.match(/^-\s+\[([ x~\-])\]\s+(\d+\.\d+)/);
    if (match) {
      const markerChar = match[1];
      const foundTaskId = match[2];

      if (foundTaskId === taskId) {
        switch (markerChar) {
          case " ":
            return "[ ]";
          case "~":
            return "[~]";
          case "-":
            return "[-]";
          case "x":
            return "[x]";
        }
      }
    }
  }

  return null;
}

/**
 * Write task marker, preserving rest of line.
 *
 * @param tasksPath - Path to tasks.md
 * @param taskId - Task identifier (e.g., "2.1")
 * @param marker - Marker value to write
 */
export async function writeTaskMarker(
  tasksPath: string,
  taskId: string,
  marker: TaskMarker,
): Promise<void> {
  const content = await readFile(tasksPath, "utf8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Match task line pattern: - [x] N.N ...
    const match = line.match(/^(^-\s+)\[([ x~\-])\](\s+)(\d+\.\d+)(.*)$/);
    if (match) {
      const prefix = match[1];
      const spaces = match[3];
      const foundTaskId = match[4];
      const restOfLine = match[5];

      if (foundTaskId === taskId) {
        // Replace marker, keep rest of line intact
        lines[i] = `${prefix}[${marker[1]}]${spaces}${foundTaskId}${restOfLine}`;
        break;
      }
    }
  }

  await writeFile(tasksPath, lines.join("\n"), "utf8");
}

/**
 * Validate task marker value.
 *
 * @param marker - Marker to validate
 * @returns True if valid
 */
export function isValidMarker(marker: string): marker is TaskMarker {
  return ["[ ]", "[~]", "[-]", "[x]"].includes(marker);
}

/**
 * Increment artifact version.
 *
 * Increments artifact_version by 1 in frontmatter.
 *
 * @param artifactPath - Path to artifact
 */
export async function incrementArtifactVersion(artifactPath: string): Promise<void> {
  const frontmatter = await readFrontmatter(artifactPath);

  if (!frontmatter) {
    return;
  }

  frontmatter.artifact_version += 1;
  await writeFrontmatter(artifactPath, frontmatter);
}
