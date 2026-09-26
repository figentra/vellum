/**
 * The status query: what the engine computes for one or all specs.
 */

import { EXIT_STATUS, type ExitStatus } from "@vellum/protocol";
import { computeStatusReport, detectLegacyStage } from "@vellum/engine";
import {
  loadSpec,
  specRiskClass,
  type PolicyLoad,
  type SpecRef,
} from "../workspace.js";
import {
  enginePolicy,
  gitContext,
  isLegacy,
  recordedState,
  type Repository,
} from "./repository.js";
import type { QueryResult } from "./result.js";

export type StatusReport = ReturnType<typeof computeStatusReport>;

/** One spec's line in the status query. */
export type StatusEntry =
  | {
      readonly kind: "legacy";
      readonly slug: string;
      readonly stage: ReturnType<typeof detectLegacyStage>;
    }
  | {
      readonly kind: "unreadable";
      readonly slug: string;
      readonly problems: readonly string[];
    }
  | { readonly kind: "report"; readonly report: StatusReport };

export interface StatusQuery {
  readonly policy: PolicyLoad;
  readonly entries: readonly StatusEntry[];
}

/**
 * Per spec: the Recorded Lifecycle State, each artifact's version and whether
 * its checksum is current, valid approvals against the policy, required tasks
 * with passing evidence, and ledger integrity. INCONCLUSIVE when the Approval
 * Policy exists but is invalid.
 */
export function queryStatus(
  repo: Repository,
  specs: readonly SpecRef[],
): QueryResult<StatusQuery> {
  if (repo.policy.kind === "invalid") {
    return {
      kind: "inconclusive",
      message: `Approval Policy ${repo.policy.path} is invalid: ${repo.policy.message}`,
    };
  }
  const policy = enginePolicy(repo.policy);
  const entries: StatusEntry[] = [];
  for (const ref of specs) {
    const spec = loadSpec(ref);
    if (isLegacy(spec)) {
      entries.push({
        kind: "legacy",
        slug: ref.slug,
        stage: detectLegacyStage(spec.entries),
      });
      continue;
    }
    const problems = [
      ...spec.artifactProblems.map((p) => p.message),
      ...(spec.ledgerProblem ? [spec.ledgerProblem] : []),
    ];
    if (problems.length > 0) {
      entries.push({ kind: "unreadable", slug: ref.slug, problems });
      continue;
    }
    const git = gitContext(repo.root, spec, policy);
    entries.push({
      kind: "report",
      report: computeStatusReport({
        specId: ref.slug,
        artifacts: spec.artifacts,
        ledger: spec.ledger,
        recordedState: recordedState(spec),
        policy,
        riskClass: specRiskClass(repo.policy, ref.slug),
        gitCommits: git.gitCommits,
        ledgerHead: spec.ledgerHead,
        approvalCommits: git.approvalCommits,
      }),
    });
  }
  return { kind: "ok", value: { policy: repo.policy, entries } };
}

/** The JSON document `vellum status --json` writes (criterion 3.5). */
export function statusDocument(query: StatusQuery): {
  command: "status";
  policy: PolicyLoad["kind"];
  specs: unknown[];
} {
  return {
    command: "status",
    policy: query.policy.kind,
    specs: query.entries.map((entry) =>
      entry.kind === "legacy"
        ? { specId: entry.slug, legacy: true, legacyStage: entry.stage }
        : entry.kind === "unreadable"
          ? {
              specId: entry.slug,
              result: "INCONCLUSIVE",
              problems: entry.problems,
            }
          : entry.report,
    ),
  };
}

/** 0 when every spec was reported; 2 when a spec could not be read. */
export function statusExitStatus(query: StatusQuery): ExitStatus {
  return query.entries.some((e) => e.kind === "unreadable")
    ? EXIT_STATUS.INCONCLUSIVE
    : EXIT_STATUS.SUCCESS;
}
