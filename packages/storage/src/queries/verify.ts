/**
 * The verify query: the Strict Verifier for one or all specs.
 */

import type { LifecycleState } from "@vellum/protocol";
import { strictVerify, type StrictVerificationResult } from "@vellum/engine";
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
import { outcomeExitStatus, type Outcome, type QueryResult } from "./result.js";

/** Table 5.A states from IN_PROGRESS on (criterion 12.9). */
const IN_PROGRESS_OR_LATER: readonly LifecycleState[] = [
  "IN_PROGRESS",
  "VERIFICATION",
  "VERIFIED",
  "MERGED",
  "RELEASED",
  "DONE",
];

/** One spec's verification, or why it could not be verified. */
export type SpecVerification =
  | ({ spec: string } & StrictVerificationResult)
  | { spec: string; result: "INCONCLUSIVE"; problems: string[] };

export interface VerifyQuery {
  readonly policy: PolicyLoad;
  readonly result: Outcome;
  readonly specs: readonly SpecVerification[];
}

/**
 * For each spec: ledger integrity including the Ledger Head; every approval
 * counts only if the commit that added it to the ledger changes only the
 * ledger and is signed by a key the Approval Policy lists for the approving
 * identity, from a human session, bound to the artifact's current checksum;
 * criteria coverage and property citation; each required task has passing
 * evidence at HEAD or an ancestor.
 *
 * When `explicit` is false (no spec was named), verifies each managed spec
 * whose Recorded Lifecycle State is IN_PROGRESS or later (the Effective state
 * is not computed by this version). INCONCLUSIVE when the policy is invalid
 * or there is no spec to verify.
 */
export function queryVerify(
  repo: Repository,
  selected: readonly SpecRef[],
  explicit: boolean,
): QueryResult<VerifyQuery> {
  if (repo.policy.kind === "invalid") {
    return {
      kind: "inconclusive",
      message: `Approval Policy ${repo.policy.path} is invalid: ${repo.policy.message}`,
    };
  }
  const policy = enginePolicy(repo.policy);

  const specs = selected
    .map((ref) => loadSpec(ref))
    .filter(
      (spec) =>
        explicit ||
        (!isLegacy(spec) && IN_PROGRESS_OR_LATER.includes(recordedState(spec))),
    );

  const results: SpecVerification[] = [];
  for (const spec of specs) {
    const problems = [
      ...(isLegacy(spec)
        ? [
            `${spec.ref.slug} is a legacy spec: it has no Lifecycle Frontmatter or ledger`,
          ]
        : []),
      ...spec.artifactProblems.map((p) => p.message),
      ...(spec.ledgerProblem ? [spec.ledgerProblem] : []),
    ];
    if (problems.length > 0) {
      results.push({ spec: spec.ref.slug, result: "INCONCLUSIVE", problems });
      continue;
    }
    const git = gitContext(repo.root, spec, policy);
    const result = strictVerify(
      spec.artifacts,
      spec.ledger,
      policy,
      git.gitCommits,
      specRiskClass(repo.policy, spec.ref.slug),
      {
        ledgerHead: spec.ledgerHead,
        approvalCommits: git.approvalCommits,
        verifiedHistory: git.verifiedHistory,
      },
    );
    results.push({ spec: spec.ref.slug, ...result });
  }

  const overall: Outcome =
    results.length === 0 || results.some((r) => r.result === "INCONCLUSIVE")
      ? "INCONCLUSIVE"
      : results.some((r) => r.result === "FAIL")
        ? "FAIL"
        : "PASS";
  return {
    kind: "ok",
    value: { policy: repo.policy, result: overall, specs: results },
  };
}

/** The message an empty verification carries. */
export const NOTHING_TO_VERIFY =
  "no spec to verify (no managed spec is IN_PROGRESS or later)";

/** The JSON document `vellum verify --json` writes (criterion 3.5). */
export function verifyDocument(
  query: VerifyQuery,
):
  | { command: "verify"; result: "INCONCLUSIVE"; specs: [] }
  | {
      command: "verify";
      policy: PolicyLoad["kind"];
      result: Outcome;
      specs: readonly SpecVerification[];
    } {
  if (query.specs.length === 0)
    return { command: "verify", result: "INCONCLUSIVE", specs: [] };
  return {
    command: "verify",
    policy: query.policy.kind,
    result: query.result,
    specs: query.specs,
  };
}

/** 0 PASS, 1 FAIL, 2 INCONCLUSIVE. */
export function verifyExitStatus(query: VerifyQuery) {
  return outcomeExitStatus(query.result);
}
