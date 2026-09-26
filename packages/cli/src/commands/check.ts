/**
 * vellum check — Check Mode: the CI-safe status check (criteria 6.6-6.12)
 */

import { EXIT_STATUS } from "@vellum/protocol";
import { formatCheckResult } from "@vellum/engine";
import { checkDocument, queryCheck } from "@vellum/storage";
import type { CliContext } from "../context.js";
import { openRepo, selectSpecs, writeJson } from "../repo.js";

interface CheckArgs {
  spec?: string | undefined;
  json: boolean;
}

/**
 * Run Check Mode over one or all specs, writing nothing (see `queryCheck` in
 * @vellum/storage, which the MCP `vellum_check` tool runs too).
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

  const query = queryCheck(repo, specs);
  if (query.kind === "inconclusive") {
    ctx.stderr.write(`vellum: ${query.message}\n`);
    return EXIT_STATUS.INCONCLUSIVE;
  }
  const { result, unreadable, exitStatus } = query.value;

  if (args.json) {
    writeJson(ctx, checkDocument(query.value));
  } else {
    ctx.stdout.write(
      `${formatCheckResult({ ...result, exitStatus, passed: exitStatus === EXIT_STATUS.SUCCESS })}\n`,
    );
    for (const { spec, problems } of unreadable) {
      ctx.stdout.write(
        `INCONCLUSIVE ${spec} — could not read:\n${problems.map((p) => `  ${p}`).join("\n")}\n`,
      );
    }
  }
  return exitStatus;
}
