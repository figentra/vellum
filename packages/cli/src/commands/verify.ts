/**
 * vellum verify — Run the Strict Verifier for one or all specs
 */

import type { LifecycleState } from "@vellum/protocol";
import { EXIT_STATUS } from "@vellum/protocol";
import { formatVerificationHuman, strictVerify, type StrictVerificationResult } from "@vellum/engine";
import { loadSpec, specRiskClass } from "@vellum/storage";
import type { CliContext } from "../context.js";
import {
  enginePolicy,
  gitContext,
  isLegacy,
  openRepo,
  recordedState,
  selectSpecs,
  writeJson,
} from "../repo.js";

interface VerifyArgs {
  spec?: string | undefined;
  json: boolean;
}

/** Table 5.A states from IN_PROGRESS on (criterion 12.9). */
const IN_PROGRESS_OR_LATER: readonly LifecycleState[] = [
  "IN_PROGRESS",
  "VERIFICATION",
  "VERIFIED",
  "MERGED",
  "RELEASED",
  "DONE",
];

/**
 * Run verify (the Strict Verifier; `--strict` is accepted and changes
 * nothing — there is no lenient mode).
 *
 * For each spec: ledger integrity including the Ledger Head; every approval
 * counts only if the commit that added it to the ledger changes only the
 * ledger and is signed by a key the Approval Policy lists for the approving
 * identity, from a human session, bound to the artifact's current checksum;
 * criteria coverage and property citation; each required task has passing
 * evidence at HEAD or an ancestor.
 *
 * Without a spec argument, verifies each managed spec whose Recorded
 * Lifecycle State is IN_PROGRESS or later. (Criterion 12.9 selects by the
 * Effective state, which `vellum status` and `vellum check` compute; verify
 * does not use it for selection yet, and `check` fails a spec whose recorded
 * state is ahead of its effective state.)
 *
 * Exit: 0 PASS, 1 FAIL, 2 INCONCLUSIVE (nothing to verify, or an input that
 * could not be read or parsed).
 */
export async function verify(args: VerifyArgs, ctx: CliContext): Promise<number> {
  const repo = await openRepo(ctx);
  if (typeof repo === "number") return repo;
  const selected = selectSpecs(ctx, repo.root, args.spec);
  if (typeof selected === "number") return selected;
  if (repo.policy.kind === "invalid") {
    ctx.stderr.write(`vellum verify: INCONCLUSIVE — Approval Policy ${repo.policy.path} is invalid: ${repo.policy.message}\n`);
    return EXIT_STATUS.INCONCLUSIVE;
  }
  const policy = enginePolicy(repo.policy);

  const specs = selected
    .map((ref) => loadSpec(ref))
    .filter(
      (spec) =>
        args.spec !== undefined ||
        (!isLegacy(spec) && IN_PROGRESS_OR_LATER.includes(recordedState(spec))),
    );
  if (specs.length === 0) {
    ctx.stderr.write(
      "vellum verify: INCONCLUSIVE — no spec to verify (no managed spec is IN_PROGRESS or later)\n",
    );
    if (args.json) writeJson(ctx, { command: "verify", result: "INCONCLUSIVE", specs: [] });
    return EXIT_STATUS.INCONCLUSIVE;
  }

  const results: Array<
    | ({ spec: string } & StrictVerificationResult)
    | { spec: string; result: "INCONCLUSIVE"; problems: string[] }
  > = [];
  for (const spec of specs) {
    const problems = [
      ...(isLegacy(spec) ? [`${spec.ref.slug} is a legacy spec: it has no Lifecycle Frontmatter or ledger`] : []),
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

  const overall = results.some((r) => r.result === "INCONCLUSIVE")
    ? "INCONCLUSIVE"
    : results.some((r) => r.result === "FAIL")
      ? "FAIL"
      : "PASS";

  if (args.json) {
    writeJson(ctx, { command: "verify", policy: repo.policy.kind, result: overall, specs: results });
  } else {
    if (repo.policy.kind === "missing") {
      ctx.stdout.write(`Approval Policy: missing (${repo.policy.path}); no approval can be valid\n\n`);
    }
    for (const r of results) {
      ctx.stdout.write(`Spec: ${r.spec}\n`);
      ctx.stdout.write(
        "problems" in r
          ? `Result: INCONCLUSIVE\n${r.problems.map((p) => `  ${p}`).join("\n")}\n\n`
          : `${formatVerificationHuman(r)}\n\n`,
      );
    }
    ctx.stdout.write(`Overall: ${overall}\n`);
  }
  return overall === "PASS"
    ? EXIT_STATUS.SUCCESS
    : overall === "FAIL"
      ? EXIT_STATUS.FAILURE
      : EXIT_STATUS.INCONCLUSIVE;
}
