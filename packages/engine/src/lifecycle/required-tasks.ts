/**
 * @vellum/engine — Required Tasks
 *
 * The tasks strict verification, the Effective Lifecycle State and status
 * require an Evidence Entry for. Pure.
 *
 * - An optional task (`*` or `(optional)`) is not required.
 * - A parent task — a line with sub-task lines beneath it (`1.` when `1.1`
 *   exists) — is a container, not a unit of work: the method's spec-implement
 *   refuses to implement one, and `vellum task start` refuses to start one. It
 *   is complete when each of its required sub-tasks is verified, so it needs no
 *   evidence of its own.
 * - A checkpoint (`N. Checkpoint: …`) is required. The method runs the
 *   workspace-wide verification at a checkpoint and marks it only if that run
 *   is green; the Evidence Entry `vellum task complete` records for that run is
 *   what makes the claim checkable, as for any other task.
 */

import type { TaskLine } from "@vellum/protocol";

type TaskRef = Pick<TaskLine, "identifier" | "isOptional">;

/** Identifiers of the tasks that have at least one sub-task line in `tasks`. */
export function parentTaskIds(tasks: readonly Pick<TaskLine, "identifier">[]): Set<string> {
  const parents = new Set<string>();
  for (const task of tasks) {
    const id = task.identifier as string;
    const dot = id.lastIndexOf(".");
    if (dot > 0) parents.add(id.slice(0, dot));
  }
  return parents;
}

/** The Required Tasks among `tasks`, in their order: neither optional nor a parent. */
export function requiredTasks<T extends TaskRef>(tasks: readonly T[]): T[] {
  const parents = parentTaskIds(tasks);
  return tasks.filter((task) => !task.isOptional && !parents.has(task.identifier as string));
}
