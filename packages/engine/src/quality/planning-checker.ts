/**
 * Planning Checker - validates tasks.md coverage and required task kinds.
 *
 * @see requirements.md Requirements 3.1-3.8
 */

import type { QualityFinding } from "@vellum/protocol";
import { createQualityFinding } from "@vellum/protocol";
import { RULE_IDS } from "./rules";
import { parseCriteria } from "./patterns/criterion-parser";
import { parseProperties } from "./coverage-checker";

/**
 * Task record from tasks.md.
 */
export interface TaskInfo {
  /** Task ID (e.g., "1.2") */
  id: string;
  /** Task title */
  title: string;
  /** Task state */
  state: string;
  /** Task line number */
  line_number: number;
  /** Referenced criteria (from _Requirements:_ trailer) */
  referenced_criteria?: string[];
  /** Referenced properties (from task description) */
  referenced_properties?: string[];
  /** Executor role */
  executor?: string;
  /** Paths declared */
  paths?: string[];
  /** Whether it's a test task */
  is_test?: boolean;
}

/**
 * Parse tasks from tasks.md.
 *
 * @param tasksText - Full tasks.md text
 * @returns Array of task info
 */
export function parseTasks(tasksText: string): TaskInfo[] {
  const tasks: TaskInfo[] = [];
  const lines = tasksText.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Match task markdown: - [ ] N. Title or - [-] N.N Title (sub-tasks may be indented)
    const match = line.match(/^\s*-\s+\[[~\-\sx]\]\*?\s+(\d+(?:\.\d+)*)\*?\.?\s+(.+)/);
    if (match && match[1] && match[2]) {
      // The protocol's trailers: <!-- criteria: 1.2 --> <!-- properties: P1 -->
      const criteriaTrailer = match[2].match(/<!--\s*criteria:\s*([\d.,\s]+?)\s*-->/);
      const propertiesTrailer = match[2].match(/<!--\s*properties:\s*([P\d,\s]+?)\s*-->/);
      let title = match[2].replace(/<!--[\s\S]*?-->/g, "").trim();
      // Kiro trailers on the task line itself, as the method's template writes them
      const kiroCriteria: string[] = [];
      const kiroProperties: string[] = [];
      for (;;) {
        const req = /\s*_Requirements:\s*([\d.,\s]+?)\s*_$/.exec(title);
        const prop = /\s*_Properties:\s*((?:P?\d+)(?:\s*,\s*P?\d+)*)\s*_$/.exec(title);
        const found = req ?? prop;
        if (!found?.[1]) break;
        (found === req ? kiroCriteria : kiroProperties).push(...splitList(found[1]));
        title = title.slice(0, found.index).trim();
      }
      const task: TaskInfo = {
        id: match[1],
        title,
        state: "pending",
        line_number: i + 1,
      };
      if (criteriaTrailer?.[1]) {
        task.referenced_criteria = splitList(criteriaTrailer[1]);
      }
      if (propertiesTrailer?.[1]) {
        task.referenced_properties = splitList(propertiesTrailer[1]).map((p) =>
          p.replace(/^P/, ""),
        );
      }
      if (kiroCriteria.length > 0) {
        task.referenced_criteria = [...(task.referenced_criteria ?? []), ...kiroCriteria];
      }
      if (kiroProperties.length > 0) {
        task.referenced_properties = [
          ...(task.referenced_properties ?? []),
          ...kiroProperties.map((p) => p.replace(/^P/, "")),
        ];
      }

      // Look for Requirements trailer in following lines
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const reqLine = lines[j];
        if (!reqLine) continue;
        const reqMatch = reqLine.match(/_Requirements:\s*([\d.,\s]+)_/i);
        if (reqMatch && reqMatch[1]) {
          task.referenced_criteria = [
            ...(task.referenced_criteria ?? []),
            ...splitList(reqMatch[1]),
          ];
          break;
        }
        if (reqLine.match(/^-\s+\[/)) {
          break; // Next task
        }
      }

      // Check if it's a test task
      task.is_test = task.title.toLowerCase().includes("test");

      // Look for executor in title
      const executorMatch = task.title.match(/\(([^)]+)\)$/);
      if (executorMatch && executorMatch[1]) {
        task.executor = executorMatch[1];
      }

      tasks.push(task);
    }
  }

  return tasks;
}

function splitList(list: string): string[] {
  return list
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

/** Rule identifier of a check the planning checker could not run. */
export const CHECK_NOT_RUN = "CHECK_NOT_RUN" as const;

/**
 * What the plan's context says, for the checks tasks.md alone cannot decide.
 * An option left undefined makes its check report CHECK_NOT_RUN rather than
 * pass or fail.
 */
export interface PlanCoverageOptions {
  /** Whether the change adds a published surface (criterion 3.7) */
  readonly addsPublishedSurface?: boolean;
  /** Whether the Policy requires a release for the Spec's Risk Class (criterion 3.8) */
  readonly releaseRequired?: boolean;
}

/**
 * Check plan coverage (criterion 3.1-3.8).
 *
 * Checks it cannot run are reported as `info` findings with rule
 * CHECK_NOT_RUN, naming the criterion and the reason — never as a pass.
 *
 * @param requirementsText - Full requirements.md text
 * @param designText - Full design.md text
 * @param tasksText - Full tasks.md text
 * @param tasksPath - Path to tasks.md
 * @param options - Change and Policy context for criteria 3.7 and 3.8
 * @returns Array of quality findings
 */
export function checkPlanCoverage(
  requirementsText: string,
  designText: string,
  tasksText: string,
  tasksPath: string,
  options: PlanCoverageOptions = {},
): QualityFinding[] {
  const findings: QualityFinding[] = [];

  const criteria = parseCriteria(requirementsText);
  const properties = parseProperties(designText);
  const tasks = parseTasks(tasksText);

  // Build sets of referenced elements
  const referencedCriteria = new Set<string>();
  const referencedProperties = new Set<string>();
  const testTaskProperties = new Set<string>();

  for (const task of tasks) {
    if (task.referenced_criteria) {
      task.referenced_criteria.forEach((c) => referencedCriteria.add(c));
    }
    if (task.referenced_properties) {
      task.referenced_properties.forEach((p) => referencedProperties.add(p));
    }
    if (task.is_test && task.referenced_properties) {
      task.referenced_properties.forEach((p) => testTaskProperties.add(p));
    }

    // Check task has executor (criterion 3.3)
    if (!task.executor) {
      findings.push(
        createQualityFinding(
          RULE_IDS.TASK_NO_EXECUTOR,
          `Task ${task.id} has no executor`,
          tasksPath,
          task.line_number,
          "error",
        ),
      );
    }
  }

  // Path count against the Policy's per-task maximum (criterion 3.4)
  findings.push(
    notRun(
      "3.4",
      "tasks.md has no specified syntax for a task's declared paths, so the per-task path count cannot be read",
      tasksPath,
    ),
  );

  // Check each criterion is referenced (criterion 3.1)
  for (const criterion of criteria) {
    if (!referencedCriteria.has(criterion.reference)) {
      findings.push(
        createQualityFinding(
          RULE_IDS.CRITERION_NOT_REFERENCED,
          `Criterion ${criterion.reference} not referenced by any task`,
          tasksPath,
          1,
          "error",
          criterion.reference,
        ),
      );
    }
  }

  // Check each property has a test task (criterion 3.2)
  for (const prop of properties) {
    if (!testTaskProperties.has(prop.number)) {
      findings.push(
        createQualityFinding(
          RULE_IDS.PROPERTY_NO_TEST_TASK,
          `Property ${prop.number} not referenced by any test task`,
          tasksPath,
          1,
          "error",
        ),
      );
    }
  }

  // Check for required task kinds
  const hasMigrationTask = tasks.some((t) => t.title.toLowerCase().includes("migration"));
  const hasRollbackTask = tasks.some((t) => t.title.toLowerCase().includes("rollback"));
  const hasDocumentationTask = tasks.some((t) => t.title.toLowerCase().includes("documentation"));
  const hasReleaseTask = tasks.some((t) => t.title.toLowerCase().includes("release"));

  // Check design declares migration strategy (criterion 3.5)
  if (designText.includes("Migration Strategy") && !hasMigrationTask) {
    findings.push(
      createQualityFinding(
        RULE_IDS.MISSING_MIGRATION_TASK,
        "Design declares migration strategy but no migration task found",
        tasksPath,
        1,
        "error",
      ),
    );
  }

  // Check design declares rollback strategy (criterion 3.6)
  if (designText.includes("Rollback Strategy") && !hasRollbackTask) {
    findings.push(
      createQualityFinding(
        RULE_IDS.MISSING_ROLLBACK_TASK,
        "Design declares rollback strategy but no rollback task found",
        tasksPath,
        1,
        "error",
      ),
    );
  }

  // Documentation task when the change adds a published surface (criterion 3.7)
  if (options.addsPublishedSurface === undefined) {
    findings.push(
      notRun("3.7", "whether the change adds a published surface was not supplied", tasksPath),
    );
  } else if (options.addsPublishedSurface && !hasDocumentationTask) {
    findings.push(
      createQualityFinding(
        RULE_IDS.MISSING_DOCUMENTATION_TASK,
        "The change adds a published surface and no documentation task was found",
        tasksPath,
        1,
        "error",
      ),
    );
  }

  // Release task when the Policy requires a release (criterion 3.8)
  if (options.releaseRequired === undefined) {
    findings.push(
      notRun(
        "3.8",
        "whether the Policy requires a release for the Spec's Risk Class was not supplied",
        tasksPath,
      ),
    );
  } else if (options.releaseRequired && !hasReleaseTask) {
    findings.push(
      createQualityFinding(
        RULE_IDS.MISSING_RELEASE_TASK,
        "The Policy requires a release and no release task was found",
        tasksPath,
        1,
        "error",
      ),
    );
  }

  return findings;
}

function notRun(criterion: string, reason: string, tasksPath: string): QualityFinding {
  return createQualityFinding(
    CHECK_NOT_RUN,
    `criterion ${criterion} not checked: ${reason}`,
    tasksPath,
    1,
    "info",
    criterion,
  );
}
