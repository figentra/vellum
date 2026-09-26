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

    // Match task markdown: - [ ] N. Title or - [-] N.N Title
    const match = line.match(/^-\s+\[[~\-\sx]\]\s+([\d.]+)\.\s+(.+)/);
    if (match && match[1] && match[2]) {
      const task: TaskInfo = {
        id: match[1],
        title: match[2],
        state: "pending",
        line_number: i + 1,
      };

      // Look for Requirements trailer in following lines
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const reqLine = lines[j];
        if (!reqLine) continue;
        const reqMatch = reqLine.match(/_Requirements:\s*([\d.,\s]+)_/i);
        if (reqMatch && reqMatch[1]) {
          task.referenced_criteria = reqMatch[1].split(",").map((s) => s.trim());
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

/**
 * Check plan coverage (criterion 3.1-3.8).
 *
 * @param requirementsText - Full requirements.md text
 * @param designText - Full design.md text
 * @param tasksText - Full tasks.md text
 * @param tasksPath - Path to tasks.md
 * @returns Array of quality findings
 */
export function checkPlanCoverage(
  requirementsText: string,
  designText: string,
  tasksText: string,
  tasksPath: string,
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

    // TODO: Check path count against policy maximum (criterion 3.4)
  }

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

  // Check for documentation task when public surface changes (criterion 3.7)
  // TODO: Detect public surface changes
  // For now, assume any design.md has public surface
  if (!hasDocumentationTask) {
    findings.push(
      createQualityFinding(
        RULE_IDS.MISSING_DOCUMENTATION_TASK,
        "No documentation task found",
        tasksPath,
        1,
        "warn",
      ),
    );
  }

  // Check for release task if policy requires (criterion 3.8)
  // TODO: Check policy
  if (!hasReleaseTask) {
    findings.push(
      createQualityFinding(
        RULE_IDS.MISSING_RELEASE_TASK,
        "No release task found",
        tasksPath,
        1,
        "warn",
      ),
    );
  }

  return findings;
}
