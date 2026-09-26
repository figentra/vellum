/**
 * Confining a caller-supplied path to the repository root.
 */

import { existsSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

export type RepoPath =
  | {
      readonly kind: "inside";
      readonly absolute: string;
      readonly relative: string;
    }
  | { readonly kind: "rejected"; readonly message: string };

function escapes(rel: string): boolean {
  return rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel);
}

/**
 * Resolve `input` against `root`. Rejects an absolute path, any `..`
 * segment, a NUL byte, and a path whose real location (symbolic links
 * followed) lies outside the real root. `relative` uses `/` separators.
 */
export function resolveRepoPath(root: string, input: string): RepoPath {
  if (input.length === 0) return { kind: "rejected", message: "path is empty" };
  if (input.includes("\0"))
    return { kind: "rejected", message: "path contains a NUL byte" };
  if (
    isAbsolute(input) ||
    /^[A-Za-z]:[\\/]/.test(input) ||
    input.startsWith("\\")
  ) {
    return {
      kind: "rejected",
      message: `path '${input}' is absolute; give it relative to the repository root`,
    };
  }
  if (input.split(/[\\/]/).includes("..")) {
    return {
      kind: "rejected",
      message: `path '${input}' contains '..'; it must stay inside the repository root`,
    };
  }
  const absolute = resolve(root, input);
  const rel = relative(root, absolute);
  if (escapes(rel)) {
    return {
      kind: "rejected",
      message: `path '${input}' is outside the repository root`,
    };
  }
  if (existsSync(absolute)) {
    const realRel = relative(realpathSync(root), realpathSync(absolute));
    if (escapes(realRel)) {
      return {
        kind: "rejected",
        message: `path '${input}' resolves outside the repository root`,
      };
    }
  }
  return { kind: "inside", absolute, relative: rel.split(sep).join("/") };
}
