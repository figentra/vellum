/**
 * @vellum/engine — Task Graph Validator
 *
 * Validates task dependency graph for cycles, missing dependencies,
 * and wave ordering. Pure function - no I/O.
 *
 * @see design.md Criterion 11.6
 */

import type { TaskId, Finding, TaskLine, TaskGraph } from "@vellum/protocol";
import { createFinding } from "./finding.js";

/**
 * Task graph validation result.
 */
export interface TaskGraphValidationResult {
  /** Whether validation passed */
  readonly valid: boolean;
  /** All findings from validation */
  readonly findings: readonly Finding[];
  /** Topologically sorted task IDs (empty if cycles detected) */
  readonly sorted: readonly TaskId[];
  /** Detected cycles */
  readonly cycles: readonly TaskId[][];
}

/**
 * Validate task graph.
 * Checks for cycles, missing dependencies, and wave ordering.
 *
 * @param graph - The task dependency graph
 * @param tasks - The task lines (for finding locations)
 * @param filePath - The file path for findings
 * @returns Validation result with findings
 */
export function validateTaskGraph(
  graph: TaskGraph,
  tasks: readonly TaskLine[],
  filePath: string,
): TaskGraphValidationResult {
  const findings: Finding[] = [];
  const cycles: TaskId[][] = [];

  // Check for missing dependencies
  const missingFindings = checkMissingDependencies(graph, tasks, filePath);
  findings.push(...missingFindings);

  // Detect cycles using DFS
  const cycleResult = detectCycles(graph);
  cycles.push(...cycleResult);

  if (cycles.length > 0) {
    // Report each cycle
    for (const cycle of cycles) {
      const cycleStr = cycle.join(" -> ");
      findings.push(
        createFinding(
          filePath,
          0,
          "TASK_DEPENDENCY_CYCLE",
          `Task dependency cycle detected: ${cycleStr}`,
        ),
      );
    }
  }

  // Topological sort (only if no cycles)
  let sorted: TaskId[] = [];
  if (cycles.length === 0) {
    sorted = topologicalSort(graph);
  }

  return {
    valid: findings.length === 0,
    findings: Object.freeze(findings),
    sorted: Object.freeze(sorted),
    cycles: Object.freeze(cycles),
  };
}

/**
 * Check for missing dependencies.
 */
function checkMissingDependencies(
  graph: TaskGraph,
  tasks: readonly TaskLine[],
  filePath: string,
): Finding[] {
  const findings: Finding[] = [];
  const validIds = new Set(graph.nodes);
  const taskMap = new Map(tasks.map((t) => [t.identifier, t]));

  for (const [taskId, deps] of graph.edges.entries()) {
    for (const dep of deps) {
      if (!validIds.has(dep)) {
        const task = taskMap.get(taskId);
        const line = task?.lineNumber ?? 0;
        findings.push(
          createFinding(
            filePath,
            line,
            "TASK_DEPENDENCY_MISSING",
            `Task ${taskId} depends on non-existent task ${dep}`,
          ),
        );
      }
    }
  }

  return findings;
}

/**
 * Detect cycles in the dependency graph using DFS.
 */
function detectCycles(graph: TaskGraph): TaskId[][] {
  const cycles: TaskId[][] = [];
  const visited = new Set<TaskId>();
  const recursionStack = new Set<TaskId>();
  const path: TaskId[] = [];

  function dfs(node: TaskId): void {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const deps = graph.edges.get(node) ?? [];
    for (const dep of deps) {
      if (!visited.has(dep)) {
        dfs(dep);
      } else if (recursionStack.has(dep)) {
        // Found a cycle - extract it from the path
        const cycleStart = path.indexOf(dep);
        const cycle = [...path.slice(cycleStart), dep];
        cycles.push(cycle);
      }
    }

    path.pop();
    recursionStack.delete(node);
  }

  for (const node of graph.nodes) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return cycles;
}

/**
 * Topological sort using Kahn's algorithm.
 */
function topologicalSort(graph: TaskGraph): TaskId[] {
  const sorted: TaskId[] = [];
  const inDegree = new Map<TaskId, number>();
  const queue: TaskId[] = [];

  // Calculate in-degrees
  for (const node of graph.nodes) {
    inDegree.set(node, 0);
  }

  for (const [, deps] of graph.edges.entries()) {
    for (const dep of deps) {
      inDegree.set(dep, (inDegree.get(dep) ?? 0) + 1);
    }
  }

  // Start with nodes that have no dependencies
  for (const [node, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(node);
    }
  }

  // Process queue
  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);

    const deps = graph.edges.get(node) ?? [];
    for (const dep of deps) {
      const newDegree = (inDegree.get(dep) ?? 0) - 1;
      inDegree.set(dep, newDegree);
      if (newDegree === 0) {
        queue.push(dep);
      }
    }
  }

  return sorted;
}

/**
 * Build a task graph from tasks and their dependencies.
 */
export function buildTaskGraph(tasks: readonly TaskLine[]): TaskGraph {
  const nodes = tasks.map((t) => t.identifier);
  const edges = new Map<TaskId, TaskId[]>();

  // Extract dependencies from task text
  // Format: "Depends on: T1, T2" or "Dependency: T1"
  for (const task of tasks) {
    const deps: TaskId[] = [];

    // Check for dependencies in task text
    const depMatch = task.text.match(/Depends? on:?\s*([T\d,\s]+)/i);
    if (depMatch && depMatch[1]) {
      const depIds = depMatch[1].split(",").map((s) => s.trim() as TaskId);
      deps.push(...depIds);
    }

    edges.set(task.identifier, deps);
  }

  return {
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
  };
}

/**
 * Check if tasks respect wave ordering.
 * Tasks in later waves cannot depend on tasks in earlier waves.
 */
export function validateWaveOrdering(
  graph: TaskGraph,
  waves: Map<TaskId, number>,
  filePath: string,
): Finding[] {
  const findings: Finding[] = [];

  for (const [taskId, deps] of graph.edges.entries()) {
    const taskWave = waves.get(taskId) ?? 0;

    for (const dep of deps) {
      const depWave = waves.get(dep) ?? 0;

      if (depWave > taskWave) {
        findings.push(
          createFinding(
            filePath,
            0,
            "WAVE_ORDERING_VIOLATION",
            `Task ${taskId} (wave ${taskWave}) depends on task ${dep} (wave ${depWave})`,
          ),
        );
      }
    }
  }

  return findings;
}
