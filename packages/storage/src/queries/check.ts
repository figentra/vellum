/**
 * The check query: Check Mode for CI (criteria 6.6-6.12), writing nothing.
 * Shared by `vellum check` and the MCP `vellum_check` tool, so both return
 * the same document for the same repository state.
 */

import { EXIT_STATUS } from "@vellum/protocol";
import {
  detectLegacyStage,
  runCheckMode,
  type CheckModeResult,
  type CheckModeSpec,
} from "@vellum/engine";
import { loadSpec, specRiskClass, type SpecRef } from "../workspace.js";
import {
  enginePolicy,
  gitContext,
  isLegacy,
  recordedState,
  type Repository,
} from "./repository.js";
import type { QueryResult } from "./result.js";

/** Why Check Mode examined nothing. */
export const NOTHING_TO_CHECK = "no spec to check (.agents/specs/ holds no spec directory)";

/** A spec whose artifacts or ledger could not be read. */
export interface UnreadableSpec {
  readonly spec: string;
  readonly problems: readonly string[];
}

export interface CheckQuery {
  readonly policy: Repository["policy"]["kind"];
  /** The engine's Check Mode result over every readable spec */
  readonly result: CheckModeResult;
  readonly unreadable: readonly UnreadableSpec[];
  /** 0 every spec passes; 1 any fails; 2 all pass but a spec could not be read */
  readonly exitStatus: number;
}

/**
 * Run Check Mode over `specs`. Fails a spec whose Effective Lifecycle State is
 * INVALID, whose ledger has an integrity failure or fork, or whose Recorded
 * Lifecycle State differs from its Effective Lifecycle State; a legacy spec
 * passes unless its legacy stage is invalid. INCONCLUSIVE before examining
 * anything when the Approval Policy is invalid, or when there is no spec to
 * check — a PASS must name what it examined, and a check that read nothing
 * must not look like one that found nothing wrong (criteria 19.2, 19.3).
 */
export function queryCheck(
  repo: Repository,
  specs: readonly SpecRef[],
): QueryResult<CheckQuery> {
  if (repo.policy.kind === "invalid") {
    return {
      kind: "inconclusive",
      message: `Approval Policy ${repo.policy.path} is invalid: ${repo.policy.message}`,
    };
  }
  if (specs.length === 0) {
    return { kind: "inconclusive", message: NOTHING_TO_CHECK };
  }
  const policy = enginePolicy(repo.policy);

  const unreadable: UnreadableSpec[] = [];
  const checked: CheckModeSpec[] = [];
  for (const ref of specs) {
    const spec = loadSpec(ref);
    const riskClass = specRiskClass(repo.policy, ref.slug);
    if (isLegacy(spec)) {
      checked.push({
        id: ref.slug,
        legacyStage: detectLegacyStage(spec.entries),
        artifacts: [],
        ledger: [],
        ledgerHead: null,
        recordedState: "DRAFT",
        policy,
        riskClass,
        gitCommits: new Map(),
      });
      continue;
    }
    const problems = [
      ...spec.artifactProblems.map((p) => p.message),
      ...(spec.ledgerProblem ? [spec.ledgerProblem] : []),
    ];
    if (problems.length > 0) {
      unreadable.push({ spec: ref.slug, problems });
      continue;
    }
    const git = gitContext(repo.root, spec, policy);
    checked.push({
      id: ref.slug,
      artifacts: spec.artifacts,
      ledger: spec.ledger,
      ledgerHead: spec.ledgerHead,
      recordedState: recordedState(spec),
      policy,
      riskClass,
      gitCommits: git.gitCommits,
      approvalCommits: git.approvalCommits,
      verifiedHistory: git.verifiedHistory,
    });
  }

  const result = runCheckMode(checked);
  const exitStatus =
    result.exitStatus === EXIT_STATUS.SUCCESS && unreadable.length > 0
      ? EXIT_STATUS.INCONCLUSIVE
      : result.exitStatus;
  return {
    kind: "ok",
    value: { policy: repo.policy.kind, result, unreadable, exitStatus },
  };
}

/** The document `vellum check --json` prints and `vellum_check` returns. */
export function checkDocument(query: CheckQuery): {
  command: "check";
  exitStatus: number;
  policy: CheckQuery["policy"];
  summary: CheckModeResult["summary"];
  specs: CheckModeResult["specs"];
  unreadable: readonly UnreadableSpec[];
  findings: CheckModeResult["findings"];
} {
  return {
    command: "check",
    exitStatus: query.exitStatus,
    policy: query.policy,
    summary: query.result.summary,
    specs: query.result.specs,
    unreadable: query.unreadable,
    findings: query.result.findings,
  };
}
