/**
 * vellum check — Check Mode: the CI-safe status check (criteria 6.6-6.12)
 */

import { EXIT_STATUS } from "@vellum/protocol";
import {
  detectLegacyStage,
  formatCheckResult,
  runCheckMode,
  type CheckModeSpec,
} from "@vellum/engine";
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

interface CheckArgs {
  spec?: string | undefined;
  json: boolean;
}

/**
 * Run Check Mode over one or all specs, writing nothing.
 *
 * Fails a spec whose Effective Lifecycle State is INVALID, whose ledger has
 * an integrity failure or fork, or whose Recorded Lifecycle State differs
 * from its Effective Lifecycle State; a legacy spec passes unless its legacy
 * stage is invalid.
 *
 * Exit: 0 when every spec passes; 1 when any fails; 2 when a spec, the
 * policy or a spec's effective state could not be read or decided, or a spec
 * fragment matched none or several specs.
 */
export async function check(args: CheckArgs, ctx: CliContext): Promise<number> {
  const repo = await openRepo(ctx);
  if (typeof repo === "number") return repo;
  const specs = selectSpecs(ctx, repo.root, args.spec);
  if (typeof specs === "number") return specs;

  if (repo.policy.kind === "invalid") {
    ctx.stderr.write(
      `vellum: Approval Policy ${repo.policy.path} is invalid: ${repo.policy.message}\n`,
    );
    return EXIT_STATUS.INCONCLUSIVE;
  }
  const policy = enginePolicy(repo.policy);

  const unreadable: { spec: string; problems: string[] }[] = [];
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
  const exit =
    result.exitStatus === EXIT_STATUS.SUCCESS && unreadable.length > 0
      ? EXIT_STATUS.INCONCLUSIVE
      : result.exitStatus;

  if (args.json) {
    writeJson(ctx, {
      command: "check",
      exitStatus: exit,
      policy: repo.policy.kind,
      summary: result.summary,
      specs: result.specs,
      unreadable,
      findings: result.findings,
    });
  } else {
    ctx.stdout.write(`${formatCheckResult({ ...result, exitStatus: exit, passed: exit === 0 })}\n`);
    for (const { spec, problems } of unreadable) {
      ctx.stdout.write(
        `INCONCLUSIVE ${spec} — could not read:\n${problems.map((p) => `  ${p}`).join("\n")}\n`,
      );
    }
  }
  return exit;
}
