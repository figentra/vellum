/**
 * vellum status — Show what the engine computes for one or all specs
 */

import { EXIT_STATUS } from "@vellum/protocol";
import { computeStatusReport, detectLegacyStage, formatStatusHuman } from "@vellum/engine";
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

interface StatusArgs {
  spec?: string | undefined;
  json: boolean;
}

/**
 * Run status command.
 *
 * Reports, per spec: the Recorded Lifecycle State, each artifact's version
 * and whether its frontmatter checksum is current, valid approvals against
 * the policy, required tasks with passing evidence, and ledger integrity.
 * The Effective Lifecycle State and next transition (criteria 5.10, 6.5) are
 * not computed by this version, and the output says so.
 *
 * Exit: 0 when every spec was reported; 2 when a spec or the policy could not
 * be read, or a spec fragment matched none or several specs.
 */
export async function status(args: StatusArgs, ctx: CliContext): Promise<number> {
  const repo = await openRepo(ctx);
  if (typeof repo === "number") return repo;
  const specs = selectSpecs(ctx, repo.root, args.spec);
  if (typeof specs === "number") return specs;

  if (repo.policy.kind === "invalid") {
    ctx.stderr.write(`vellum: Approval Policy ${repo.policy.path} is invalid: ${repo.policy.message}\n`);
    return EXIT_STATUS.INCONCLUSIVE;
  }
  const policy = enginePolicy(repo.policy);

  let unreadable = false;
  const reports: unknown[] = [];
  const human: string[] = [];
  for (const ref of specs) {
    const spec = loadSpec(ref);
    if (isLegacy(spec)) {
      const stage = detectLegacyStage(spec.entries);
      reports.push({ specId: ref.slug, legacy: true, legacyStage: stage });
      human.push(`Spec: ${ref.slug}\nLegacy spec (not under Vellum management), stage: ${stage}`);
      continue;
    }
    const problems = [
      ...spec.artifactProblems.map((p) => p.message),
      ...(spec.ledgerProblem ? [spec.ledgerProblem] : []),
    ];
    if (problems.length > 0) {
      unreadable = true;
      reports.push({ specId: ref.slug, result: "INCONCLUSIVE", problems });
      human.push(`Spec: ${ref.slug}\nINCONCLUSIVE — could not read:\n${problems.map((p) => `  ${p}`).join("\n")}`);
      continue;
    }
    const git = gitContext(repo.root, spec, policy);
    const report = computeStatusReport({
      specId: ref.slug,
      artifacts: spec.artifacts,
      ledger: spec.ledger,
      recordedState: recordedState(spec),
      policy,
      riskClass: specRiskClass(repo.policy, ref.slug),
      gitCommits: git.gitCommits,
      ledgerHead: spec.ledgerHead,
      approvalCommits: git.approvalCommits,
    });
    reports.push(report);
    human.push(formatStatusHuman(report));
  }

  if (args.json) {
    writeJson(ctx, {
      command: "status",
      policy: repo.policy.kind,
      specs: reports,
    });
  } else {
    if (repo.policy.kind === "missing") {
      ctx.stdout.write(`Approval Policy: missing (${repo.policy.path}); no approval can be valid\n\n`);
    }
    ctx.stdout.write(specs.length === 0 ? "No specs found under .agents/specs/\n" : `${human.join("\n\n")}\n`);
  }
  return unreadable ? EXIT_STATUS.INCONCLUSIVE : EXIT_STATUS.SUCCESS;
}
