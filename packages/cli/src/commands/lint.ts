/**
 * vellum lint — Run the Protocol Validator over spec artifacts
 */

import { relative } from "node:path";
import type { ArtifactKind, Finding } from "@vellum/protocol";
import {
  EXIT_STATUS,
  canonicalArtifactBody,
  parseTaskLine,
  validateLedgerEntry,
} from "@vellum/protocol";
import {
  checkLedgerIntegrity,
  detectLegacyStage,
  extractCriteria,
  sortFindings,
  validateMachineFolder,
  validateProtocol,
  validateSpecFolder,
} from "@vellum/engine";
import { loadSpec, type LoadedSpec } from "@vellum/storage";
import type { CliContext } from "../context.js";
import { isLegacy, openRepo, relativeFinding, selectSpecs, writeJson } from "../repo.js";

interface LintArgs {
  spec?: string | undefined;
  json: boolean;
  type?: string | undefined;
}

const KINDS: readonly ArtifactKind[] = ["requirements", "design", "tasks"];

/** Machine Folder entries that are transient artifacts of an append in progress. */
const TRANSIENT = /^(ledger\.jsonl\.lock|\..*\.tmp)$/;

/** What lint examined, so a PASS says what it covered (criterion 19.2). */
interface Examined {
  specs: number;
  legacySpecs: number;
  artifacts: number;
  taskLines: number;
  ledgerEntries: number;
}

/**
 * Run lint.
 *
 * Checks, for each spec under Vellum management: the spec folder contract
 * (criteria 23.1-23.5), each artifact's Lifecycle Frontmatter and checksum
 * (11.1, 11.8), task-line markers (10.5), task criterion references (11.4)
 * and, without --type, the ledger's schema and integrity. Legacy specs are
 * listed and not validated. The Markdown Protocol checks of 11.2, 11.5 and
 * 11.6 are not implemented in this version.
 *
 * Exit: 1 when there is a finding; 2 when nothing was examined or an input
 * could not be read; 0 otherwise.
 */
export async function lint(args: LintArgs, ctx: CliContext): Promise<number> {
  if (args.type !== undefined && !KINDS.includes(args.type as ArtifactKind)) {
    ctx.stderr.write(`vellum lint: --type must be one of ${KINDS.join(", ")}\n`);
    return EXIT_STATUS.INCONCLUSIVE;
  }
  const only = args.type as ArtifactKind | undefined;

  const repo = await openRepo(ctx);
  if (typeof repo === "number") return repo;
  const specs = selectSpecs(ctx, repo.root, args.spec);
  if (typeof specs === "number") return specs;

  const findings: Finding[] = [];
  const legacy: string[] = [];
  const examined: Examined = { specs: 0, legacySpecs: 0, artifacts: 0, taskLines: 0, ledgerEntries: 0 };

  for (const ref of specs) {
    const spec = loadSpec(ref);
    if (isLegacy(spec)) {
      examined.legacySpecs++;
      legacy.push(`${ref.slug} (stage: ${detectLegacyStage(spec.entries)})`);
      continue;
    }
    examined.specs++;
    findings.push(...lintSpec(repo.root, spec, only, examined));
  }

  const sorted = sortFindings(findings);
  const nothingExamined = examined.artifacts === 0;
  const status = sorted.length > 0 ? "FAIL" : nothingExamined ? "INCONCLUSIVE" : "PASS";

  if (args.json) {
    writeJson(ctx, { command: "lint", type: only ?? "all", status, examined, legacy, findings: sorted });
  } else {
    for (const f of sorted) ctx.stdout.write(`${f.file}:${f.line} ${f.rule}: ${f.message}\n`);
    for (const l of legacy) ctx.stdout.write(`legacy spec, not validated: ${l}\n`);
    ctx.stdout.write(
      `${status}: ${sorted.length} finding(s); examined ${examined.specs} spec(s), ${examined.artifacts} artifact(s), ${examined.taskLines} task line(s), ${examined.ledgerEntries} ledger entr(ies)\n`,
    );
  }
  if (status === "INCONCLUSIVE") {
    ctx.stderr.write("vellum lint: INCONCLUSIVE — no artifact under Vellum management was examined\n");
  }
  return status === "FAIL"
    ? EXIT_STATUS.FAILURE
    : status === "INCONCLUSIVE"
      ? EXIT_STATUS.INCONCLUSIVE
      : EXIT_STATUS.SUCCESS;
}

function lintSpec(
  root: string,
  spec: LoadedSpec,
  only: ArtifactKind | undefined,
  examined: Examined,
): Finding[] {
  const findings: Finding[] = [];
  const slugPath = relative(root, spec.ref.path);
  const rel = (f: Finding) => relativeFinding(root, f);
  const withSpecPath = (f: Finding) => ({ ...f, file: f.file.replace(spec.ref.slug, slugPath) });

  if (only === undefined) {
    findings.push(...validateSpecFolder(spec.entries, spec.ref.slug, false).findings.map(withSpecPath));
    if (spec.machineEntries !== null) {
      const entries = spec.machineEntries.filter((e) => !TRANSIENT.test(e));
      findings.push(...validateMachineFolder(entries, spec.ref.slug).findings.map(withSpecPath));
    }
  }

  for (const problem of spec.artifactProblems) {
    if (only !== undefined && problem.kind !== only) continue;
    examined.artifacts++;
    findings.push({
      file: relative(root, problem.file),
      line: 1,
      rule: "FRONTMATTER_MISSING",
      message: problem.message,
    });
  }
  for (const artifact of spec.artifacts) {
    if (only !== undefined && artifact.kind !== only) continue;
    examined.artifacts++;
    findings.push(...validateProtocol([artifact]).findings.map(rel));
  }

  const tasksText = spec.texts.get("tasks");
  if (tasksText !== undefined && (only === undefined || only === "tasks")) {
    const tasksFile = relative(root, `${spec.ref.path}/tasks.md`);
    const requirements = spec.artifacts.find((a) => a.kind === "requirements");
    const criteria = requirements ? new Set(extractCriteria(canonicalArtifactBody(requirements.body))) : null;
    tasksText.split("\n").forEach((raw, index) => {
      const line = raw.replace(/\r$/, "");
      const checkbox = /^\s*-\s*\[(.)\]\s*\d/.exec(line);
      if (checkbox && !" x~-".includes(checkbox[1]!)) {
        findings.push({
          file: tasksFile,
          line: index + 1,
          rule: "TASK_MARKER_INVALID",
          message: `Task marker [${checkbox[1]}] is not one of [ ], [~], [-], [x]`,
        });
        return;
      }
      const task = parseTaskLine(line);
      if (!task) return;
      examined.taskLines++;
      if (criteria === null) return;
      for (const ref of task.requirementsTrailer ?? []) {
        if (!criteria.has(ref)) {
          findings.push({
            file: tasksFile,
            line: index + 1,
            rule: "TASK_CRITERION_UNDEFINED",
            message: `Task ${task.identifier} cites criterion ${ref}, which requirements.md does not define`,
          });
        }
      }
    });
  }

  if (only === undefined) {
    const ledgerFile = relative(root, spec.ledgerPath);
    if (spec.ledgerProblem !== null) {
      findings.push({ file: ledgerFile, line: 0, rule: "LEDGER_UNREADABLE", message: spec.ledgerProblem });
    } else {
      examined.ledgerEntries += spec.ledger.length;
      for (const entry of spec.ledger) {
        for (const f of validateLedgerEntry(entry as unknown as Record<string, unknown>)) {
          findings.push({
            file: ledgerFile,
            line: entry.id,
            rule: "LEDGER_SCHEMA",
            message: `entry ${entry.id}: ${f.message}`,
          });
        }
      }
      for (const failure of checkLedgerIntegrity(spec.ledger, spec.ledgerHead).failures) {
        findings.push({
          file: ledgerFile,
          line: failure.entry_id,
          rule: "LEDGER_INTEGRITY",
          message: failure.message,
        });
      }
    }
  }
  return findings;
}
