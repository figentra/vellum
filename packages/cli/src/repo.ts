/**
 * Opening the repository and gathering, per spec, what the engine needs
 * from git. Reads only; every decision is the engine's.
 */

import { relative } from "node:path";
import type { ApprovalPolicy, Finding, GitCommit, LifecycleState } from "@vellum/protocol";
import { EXIT_STATUS } from "@vellum/protocol";
import type { ApprovalCommitResolution } from "@vellum/engine";
import {
  findRepoRoot,
  listSpecs,
  loadApprovalPolicy,
  readCommits,
  resolveApprovalCommits,
  resolveSpec,
  verifiedHistory,
  type LoadedSpec,
  type PolicyLoad,
  type SpecRef,
} from "@vellum/storage";
import type { CliContext } from "./context.js";

/** An open repository. */
export interface Repo {
  readonly root: string;
  readonly policy: PolicyLoad;
}

/** Open the repository containing ctx.cwd; exit status 2 when there is none. */
export async function openRepo(ctx: CliContext): Promise<Repo | number> {
  const root = findRepoRoot(ctx.cwd);
  if (root === null) {
    ctx.stderr.write(`vellum: ${ctx.cwd} is not inside a git work tree\n`);
    return EXIT_STATUS.INCONCLUSIVE;
  }
  return { root, policy: await loadApprovalPolicy(root) };
}

/**
 * The specs a command runs on: the one `fragment` names, or every spec.
 * A fragment matching none or several is a usage error (criterion 6.4).
 */
export function selectSpecs(
  ctx: CliContext,
  root: string,
  fragment: string | undefined,
): SpecRef[] | number {
  if (fragment === undefined) return listSpecs(root);
  const match = resolveSpec(root, fragment);
  if (match.kind === "one") return [match.spec];
  if (match.kind === "none") {
    ctx.stderr.write(`vellum: no spec matches '${fragment}'\n`);
  } else {
    ctx.stderr.write(
      `vellum: '${fragment}' matches more than one spec: ${match.matches.map((m) => m.slug).join(", ")}\n`,
    );
  }
  return EXIT_STATUS.INCONCLUSIVE;
}

/** The approval policy as the engine takes it (null when missing or invalid). */
export function enginePolicy(policy: PolicyLoad): ApprovalPolicy | null {
  return policy.kind === "loaded" ? policy.policy : null;
}

/** What the engine needs from git to verify a spec's approvals and evidence. */
export interface GitContext {
  readonly gitCommits: ReadonlyMap<string, GitCommit>;
  readonly approvalCommits: ReadonlyMap<number, ApprovalCommitResolution>;
  readonly verifiedHistory: ReadonlySet<string>;
}

/** Resolve approval adding commits, read them with verified signers, and HEAD's history. */
export function gitContext(root: string, spec: LoadedSpec, policy: ApprovalPolicy | null): GitContext {
  const approvalCommits = resolveApprovalCommits(root, spec);
  const shas = [...approvalCommits.values()].flatMap((r) => ("commit" in r ? [r.commit] : []));
  return {
    gitCommits: readCommits(root, shas, policy),
    approvalCommits,
    verifiedHistory: verifiedHistory(root),
  };
}

/** The Recorded Lifecycle State: requirements.md's frontmatter state, else DRAFT. */
export function recordedState(spec: LoadedSpec): LifecycleState {
  return spec.artifacts.find((a) => a.kind === "requirements")?.frontmatter.state ?? "DRAFT";
}

/** A spec with no Machine Folder and no parsed artifact: not under Vellum management. */
export function isLegacy(spec: LoadedSpec): boolean {
  return spec.machineEntries === null && spec.artifacts.length === 0;
}

/** Rewrite a finding's absolute path relative to the repository root. */
export function relativeFinding(root: string, finding: Finding): Finding {
  return finding.file.startsWith("/") ? { ...finding, file: relative(root, finding.file) } : finding;
}

/** Write one JSON document to stdout (criterion 3.5). */
export function writeJson(ctx: CliContext, value: unknown): void {
  ctx.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
