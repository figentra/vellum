/**
 * vellum approve — Write an Approval (or Rejection) Record for a human to sign
 */

import { relative } from "node:path";
import type { ArtifactKind } from "@vellum/protocol";
import { EXIT_STATUS, computeChecksum } from "@vellum/protocol";
import { approverKeys, checkLedgerIntegrity, getApprovers } from "@vellum/engine";
import {
  LedgerError,
  appendLedgerEntry,
  getLedgerHeadPath,
  gitConfig,
  loadSpec,
  resolveSpec,
  specRiskClass,
} from "@vellum/storage";
import type { CliContext } from "../context.js";
import { isLegacy, openRepo } from "../repo.js";

interface ApproveArgs {
  spec: string;
  artifact: string;
  reject: boolean;
  rationale?: string | undefined;
}

export const APPROVE_HELP = `vellum approve <spec> <requirements|design|tasks> [--reject --rationale=<text>]

Writes an Approval Record (or, with --reject, a Rejection Record) to the
spec's ledger, binding the artifact's current version and checksum, under
your git identity (git config user.email).

The record is NOT valid when this command finishes. It becomes valid only
when you commit it yourself: a commit that changes only the spec's
.sdlc/ledger.jsonl and .sdlc/ledger.head.json, signed (git commit -S) with a
key the Approval Policy (.sdlc/policy.json) lists for your identity.
'vellum verify' checks exactly that, and rejects the approval otherwise —
including when the artifact changes after you approved it.

This command refuses to run outside an interactive terminal, in CI, or in
a detected assistant session. That refusal is a courtesy, not the
guarantee: the guarantee is the signature check, which no one without your
signing key can satisfy.
`;

const KINDS: readonly ArtifactKind[] = ["requirements", "design", "tasks"];

/**
 * Run approve.
 *
 * Exit: 0 when the record was written (it still needs your signed commit);
 * 1 when refused (non-interactive, assistant session, no policy, not an
 * authorised approver, no key, missing artifact, damaged ledger); 2 on a
 * usage error.
 */
export async function approve(args: ApproveArgs, ctx: CliContext): Promise<number> {
  if (!KINDS.includes(args.artifact as ArtifactKind)) {
    ctx.stderr.write(`vellum approve: artifact must be one of ${KINDS.join(", ")}\n`);
    return EXIT_STATUS.INCONCLUSIVE;
  }
  const kind = args.artifact as ArtifactKind;

  // Criteria 7.6, 7.7
  if (ctx.assistantSession !== null) {
    ctx.stderr.write(
      `vellum approve: refused — an assistant session was detected (${ctx.assistantSession}); an approval requires a human\n`,
    );
    return EXIT_STATUS.FAILURE;
  }
  if (!ctx.interactive || ctx.ci) {
    ctx.stderr.write(
      "vellum approve: refused — not an interactive terminal session; an approval requires a human\n",
    );
    return EXIT_STATUS.FAILURE;
  }
  if (args.reject && (args.rationale === undefined || args.rationale.trim() === "")) {
    ctx.stderr.write("vellum approve: --reject requires --rationale=<text>\n");
    return EXIT_STATUS.INCONCLUSIVE;
  }

  const repo = await openRepo(ctx);
  if (typeof repo === "number") return repo;
  const match = resolveSpec(repo.root, args.spec);
  if (match.kind !== "one") {
    ctx.stderr.write(`vellum approve: '${args.spec}' matches ${match.kind === "none" ? "no spec" : "more than one spec"}\n`);
    return EXIT_STATUS.INCONCLUSIVE;
  }

  // Criterion 7.4
  if (repo.policy.kind !== "loaded") {
    ctx.stderr.write(
      repo.policy.kind === "missing"
        ? `vellum approve: refused — the Approval Policy is missing (${repo.policy.path})\n`
        : `vellum approve: refused — the Approval Policy is invalid: ${repo.policy.message}\n`,
    );
    return EXIT_STATUS.FAILURE;
  }
  const policy = repo.policy.policy;
  const riskClass = specRiskClass(repo.policy, match.spec.slug);

  const identity = gitConfig(repo.root, "user.email");
  if (identity === null) {
    ctx.stderr.write("vellum approve: refused — git config user.email is not set\n");
    return EXIT_STATUS.FAILURE;
  }
  // Criterion 7.5
  const approvers = getApprovers(policy, riskClass, kind);
  if (approvers.length === 0) {
    ctx.stderr.write(
      `vellum approve: refused — the Approval Policy names no approver for ${kind} at risk class ${riskClass}\n`,
    );
    return EXIT_STATUS.FAILURE;
  }
  if (!approvers.some((a) => a.trim().toLowerCase() === identity.trim().toLowerCase())) {
    ctx.stderr.write(
      `vellum approve: refused — ${identity} is not an authorised approver of ${kind} at risk class ${riskClass}\n`,
    );
    return EXIT_STATUS.FAILURE;
  }
  if (approverKeys(policy, identity).length === 0) {
    ctx.stderr.write(
      `vellum approve: refused — the Approval Policy lists no signing key for ${identity}; no commit you sign could make the record valid\n`,
    );
    return EXIT_STATUS.FAILURE;
  }

  const spec = loadSpec(match.spec);
  if (isLegacy(spec)) {
    ctx.stderr.write(`vellum approve: refused — ${match.spec.slug} is a legacy spec (not under Vellum management)\n`);
    return EXIT_STATUS.FAILURE;
  }
  const artifact = spec.artifacts.find((a) => a.kind === kind);
  if (!artifact) {
    const problem = spec.artifactProblems.find((p) => p.kind === kind);
    ctx.stderr.write(`vellum approve: refused — ${problem?.message ?? `${kind}.md does not exist`}\n`);
    return EXIT_STATUS.FAILURE;
  }
  if (spec.ledgerProblem !== null) {
    ctx.stderr.write(`vellum approve: refused — ${spec.ledgerProblem}\n`);
    return EXIT_STATUS.FAILURE;
  }
  const integrity = checkLedgerIntegrity(spec.ledger, spec.ledgerHead);
  if (!integrity.valid) {
    ctx.stderr.write(
      `vellum approve: refused — ledger integrity failure: ${integrity.failures.map((f) => f.message).join("; ")}\n`,
    );
    return EXIT_STATUS.FAILURE;
  }

  const id = (spec.ledger[spec.ledger.length - 1]?.id ?? 0) + 1;
  const timestamp = new Date().toISOString();
  const common = {
    id,
    timestamp,
    artifact: `${kind}.md` as const,
    artifact_version: artifact.frontmatter.version,
    identity,
  };
  try {
    if (args.reject) {
      await appendLedgerEntry(spec.ledgerPath, {
        ...common,
        kind: "rejection",
        rationale: args.rationale!,
      });
    } else {
      await appendLedgerEntry(spec.ledgerPath, {
        ...common,
        kind: "approval",
        artifact_checksum: computeChecksum(artifact.body),
        identity_key: gitConfig(repo.root, "user.signingkey") ?? "",
        session_type: "human",
        approval_signal: { commit: null, message_prefix: "approve:" },
      });
    }
  } catch (error) {
    if (error instanceof LedgerError) {
      ctx.stderr.write(`vellum approve: refused — ${error.message}\n`);
      return EXIT_STATUS.FAILURE;
    }
    throw error;
  }

  const ledgerRel = relative(repo.root, spec.ledgerPath);
  const headRel = relative(repo.root, getLedgerHeadPath(spec.ledgerPath));
  ctx.stdout.write(
    `${args.reject ? "Rejection" : "Approval"} record ${id} for ${kind}.md v${artifact.frontmatter.version} written to ${ledgerRel}.\n` +
      (args.reject
        ? `Commit it to record the rejection:\n`
        : `It is NOT valid yet. It counts only once you commit it, signed with your key from the policy, changing nothing else:\n`) +
      `  git add ${ledgerRel} ${headRel}\n` +
      `  git commit -S -m "approve: ${match.spec.slug} ${kind}" -- ${ledgerRel} ${headRel}\n`,
  );
  return EXIT_STATUS.SUCCESS;
}
