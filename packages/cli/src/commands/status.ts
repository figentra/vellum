/**
 * vellum status — Show what the engine computes for one or all specs
 */

import { EXIT_STATUS } from "@vellum/protocol";
import { formatStatusHuman } from "@vellum/engine";
import { queryStatus, statusDocument, statusExitStatus } from "@vellum/storage";
import type { CliContext } from "../context.js";
import { openRepo, selectSpecs, writeJson } from "../repo.js";

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
export async function status(
  args: StatusArgs,
  ctx: CliContext,
): Promise<number> {
  const repo = await openRepo(ctx);
  if (typeof repo === "number") return repo;
  const specs = selectSpecs(ctx, repo.root, args.spec);
  if (typeof specs === "number") return specs;

  const query = queryStatus(repo, specs);
  if (query.kind === "inconclusive") {
    ctx.stderr.write(`vellum: ${query.message}\n`);
    return EXIT_STATUS.INCONCLUSIVE;
  }
  const result = query.value;

  if (args.json) {
    writeJson(ctx, statusDocument(result));
  } else {
    if (result.policy.kind === "missing") {
      ctx.stdout.write(
        `Approval Policy: missing (${result.policy.path}); no approval can be valid\n\n`,
      );
    }
    const human = result.entries.map((entry) =>
      entry.kind === "legacy"
        ? `Spec: ${entry.slug}\nLegacy spec (not under Vellum management), stage: ${entry.stage}` +
          (entry.next !== null
            ? `\nIts artifacts have no Lifecycle Frontmatter. Adopt it: ${entry.next}`
            : entry.adoptionProblem !== null
              ? `\nIt cannot be adopted yet: ${entry.adoptionProblem}`
              : "")
        : entry.kind === "unreadable"
          ? `Spec: ${entry.slug}\nINCONCLUSIVE — could not read:\n${entry.problems.map((p) => `  ${p}`).join("\n")}` +
            (entry.next === null ? "" : `\nRepair the frontmatter: ${entry.next}`)
          : formatStatusHuman(entry.report),
    );
    ctx.stdout.write(
      specs.length === 0
        ? "No specs found under .agents/specs/\n"
        : `${human.join("\n\n")}\n`,
    );
  }
  return statusExitStatus(result);
}
