/**
 * vellum lint — Run the Protocol Validator over spec artifacts
 */

import { EXIT_STATUS } from "@vellum/protocol";
import {
  ARTIFACT_KINDS,
  isArtifactKind,
  lintDocument,
  lintExitStatus,
  queryLint,
} from "@vellum/storage";
import type { CliContext } from "../context.js";
import { openRepo, selectSpecs, writeJson } from "../repo.js";

interface LintArgs {
  spec?: string | undefined;
  json: boolean;
  type?: string | undefined;
}

/**
 * Run lint (see `queryLint` in @vellum/storage for what is checked).
 *
 * Exit: 1 when there is a finding; 2 when nothing was examined or an input
 * could not be read; 0 otherwise.
 */
export async function lint(args: LintArgs, ctx: CliContext): Promise<number> {
  if (args.type !== undefined && !isArtifactKind(args.type)) {
    ctx.stderr.write(
      `vellum lint: --type must be one of ${ARTIFACT_KINDS.join(", ")}\n`,
    );
    return EXIT_STATUS.INCONCLUSIVE;
  }
  const only = args.type;

  const repo = await openRepo(ctx);
  if (typeof repo === "number") return repo;
  const specs = selectSpecs(ctx, repo.root, args.spec);
  if (typeof specs === "number") return specs;

  const result = queryLint(repo, specs, only);
  const { examined, findings, legacy, status } = result;

  if (args.json) {
    writeJson(ctx, lintDocument(result));
  } else {
    for (const f of findings)
      ctx.stdout.write(`${f.file}:${f.line} ${f.rule}: ${f.message}\n`);
    for (const l of legacy)
      ctx.stdout.write(`legacy spec, not validated: ${l}\n`);
    ctx.stdout.write(
      `${status}: ${findings.length} finding(s); examined ${examined.specs} spec(s), ${examined.artifacts} artifact(s), ${examined.taskLines} task line(s), ${examined.ledgerEntries} ledger entr(ies)\n`,
    );
  }
  if (status === "INCONCLUSIVE") {
    ctx.stderr.write(
      "vellum lint: INCONCLUSIVE — no artifact under Vellum management was examined\n",
    );
  }
  return lintExitStatus(result);
}
