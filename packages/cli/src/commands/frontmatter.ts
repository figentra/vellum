/**
 * vellum adopt <spec> — Bring a legacy spec under Vellum management
 * vellum stamp <spec> — Bring an adopted spec's frontmatter up to date
 *
 * The engine plans (planAdoption, planStamp); this module reads the spec,
 * supplies the clock, and writes: the artifact files atomically, and for
 * adopt the adoption entry through the ledger writer.
 */

import { join, relative } from "node:path";
import { EXIT_STATUS } from "@vellum/protocol";
import {
  planAdoption,
  planStamp,
  type ArtifactRewrite,
  type FrontmatterPlan,
} from "@vellum/engine";
import {
  LedgerError,
  appendLedgerEntry,
  ensureMachineFolder,
  loadSpec,
  resolveSpec,
  writeFileAtomically,
  type LoadedSpec,
} from "@vellum/storage";
import type { CliContext } from "../context.js";
import { openRepo, writeJson } from "../repo.js";

interface FrontmatterArgs {
  spec: string;
  json: boolean;
}

type Command = "adopt" | "stamp";

/** Open the repository and the one spec `fragment` names, or the exit status. */
async function openSpec(
  command: Command,
  fragment: string,
  ctx: CliContext,
): Promise<{ root: string; spec: LoadedSpec } | number> {
  const repo = await openRepo(ctx);
  if (typeof repo === "number") return repo;
  const match = resolveSpec(repo.root, fragment);
  if (match.kind !== "one") {
    ctx.stderr.write(
      `vellum ${command}: '${fragment}' matches ${match.kind === "none" ? "no spec" : "more than one spec"}\n`,
    );
    return EXIT_STATUS.INCONCLUSIVE;
  }
  const spec = loadSpec(match.spec);
  if (spec.ledgerProblem !== null) {
    ctx.stderr.write(`vellum ${command}: refused — ${spec.ledgerProblem}\n`);
    return EXIT_STATUS.FAILURE;
  }
  return { root: repo.root, spec };
}

function refuse(command: Command, args: FrontmatterArgs, ctx: CliContext, message: string): number {
  if (args.json) writeJson(ctx, { command, spec: args.spec, result: "REFUSED", message });
  ctx.stderr.write(`vellum ${command}: refused — ${message}\n`);
  return EXIT_STATUS.FAILURE;
}

function writeAll(spec: LoadedSpec, writes: readonly ArtifactRewrite[]): void {
  for (const write of writes) writeFileAtomically(join(spec.ref.path, `${write.kind}.md`), write.text);
}

function describe(plan: FrontmatterPlan): string {
  return plan.writes
    .map(
      (w) =>
        `  ${w.kind}.md: v${w.frontmatter.version} ${w.frontmatter.state} — ${w.changes.join("; ")}\n`,
    )
    .join("");
}

function document(command: Command, slug: string, result: string, plan: FrontmatterPlan | null) {
  return {
    command,
    spec: slug,
    result,
    recordedState: plan?.recordedState ?? null,
    artifacts: (plan?.writes ?? []).map((w) => ({
      artifact: `${w.kind}.md`,
      version: w.frontmatter.version,
      checksum: w.frontmatter.checksum,
      state: w.frontmatter.state,
      changes: w.changes,
    })),
  };
}

/**
 * Run adopt (criterion 14).
 *
 * Exit: 0 when the spec was adopted, or was already adopted with current
 * frontmatter; 1 when refused (a later artifact without an earlier one, a
 * frontmatter block with a key the protocol does not define, an adopted spec
 * whose frontmatter is not current — run stamp — or an unreadable ledger);
 * 2 on a usage error or a fragment matching no spec or several.
 */
export async function adopt(args: FrontmatterArgs, ctx: CliContext): Promise<number> {
  const opened = await openSpec("adopt", args.spec, ctx);
  if (typeof opened === "number") return opened;
  const { root, spec } = opened;
  const slug = spec.ref.slug;
  const now = new Date().toISOString();

  const plan = planAdoption({
    spec: slug,
    texts: spec.texts,
    ledgerEntries: spec.ledger.length,
    now,
  });
  if (plan.kind === "refused") return refuse("adopt", args, ctx, plan.message);
  if (plan.kind === "current") {
    if (args.json) writeJson(ctx, document("adopt", slug, "CURRENT", null));
    else
      ctx.stdout.write(
        `${slug} is already adopted and its frontmatter is current; nothing to do.\n`,
      );
    return EXIT_STATUS.SUCCESS;
  }

  writeAll(spec, plan.writes);
  ensureMachineFolder(spec.ledgerPath);
  try {
    await appendLedgerEntry(spec.ledgerPath, {
      kind: "adoption",
      id: 1,
      timestamp: now,
      from: "legacy",
      to: "managed",
    });
  } catch (error) {
    if (error instanceof LedgerError) return refuse("adopt", args, ctx, error.message);
    throw error;
  }

  if (args.json) {
    writeJson(ctx, document("adopt", slug, "ADOPTED", plan));
  } else {
    const dir = relative(root, spec.ref.path);
    ctx.stdout.write(
      `Adopted ${slug}: Recorded Lifecycle State ${plan.recordedState}, no approvals.\n` +
        describe(plan) +
        `Commit the spec directory (${dir}). After a later edit to an artifact, run: npx vellum stamp ${slug}\n`,
    );
  }
  return EXIT_STATUS.SUCCESS;
}

/**
 * Run stamp: frontmatter for artifacts written after adoption, the missing
 * fields of a partial block, the next version and checksum of a changed body,
 * and the recorded state raised to the latest artifact's in-review state.
 * Appends nothing to the ledger, and never makes an approval valid: approvals
 * are checked against the body's checksum.
 *
 * Exit: 0 when the frontmatter is current (whether or not anything was
 * written); 1 when refused (a spec not adopted — run adopt — a later artifact
 * without an earlier one, a block with a key the protocol does not define or
 * a bad value, or an unreadable ledger); 2 on a usage error.
 */
export async function stamp(args: FrontmatterArgs, ctx: CliContext): Promise<number> {
  const opened = await openSpec("stamp", args.spec, ctx);
  if (typeof opened === "number") return opened;
  const { spec } = opened;
  const slug = spec.ref.slug;

  const plan = planStamp({
    spec: slug,
    texts: spec.texts,
    ledgerEntries: spec.ledger.length,
    now: new Date().toISOString(),
  });
  if (plan.kind === "refused") return refuse("stamp", args, ctx, plan.message);

  writeAll(spec, plan.writes);
  if (args.json) {
    writeJson(ctx, document("stamp", slug, plan.writes.length === 0 ? "CURRENT" : "STAMPED", plan));
  } else if (plan.writes.length === 0) {
    ctx.stdout.write(`${slug}: frontmatter is current (${plan.recordedState}); nothing to do.\n`);
  } else {
    ctx.stdout.write(
      `Stamped ${slug}: Recorded Lifecycle State ${plan.recordedState}.\n${describe(plan)}` +
        "A changed body is a new version: an approval of the old one no longer counts.\n",
    );
  }
  return EXIT_STATUS.SUCCESS;
}
