/**
 * vellum doctor — Diagnose the environment and the repository
 */

import { execFileSync } from "node:child_process";
import { EXIT_STATUS } from "@vellum/protocol";
import { checkLedgerIntegrity } from "@vellum/engine";
import { findRepoRoot, listSpecs, loadApprovalPolicy, loadSpec, runGit } from "@vellum/storage";
import type { CliContext } from "../context.js";
import { isLegacy, writeJson } from "../repo.js";

interface DoctorArgs {
  json: boolean;
}

/** One diagnostic's outcome. NOT_CHECKED is never counted as a pass. */
type Outcome = "PASS" | "FAIL" | "NOT_APPLICABLE" | "NOT_CHECKED";

interface Diagnostic {
  readonly category: string;
  readonly outcome: Outcome;
  readonly message: string;
}

/** Table 17.A categories this version does not evaluate. */
const NOT_IMPLEMENTED = [
  "Assistant plugin version",
  "Repository hooks",
  "Stale markers",
  "ADR supersession",
  "Disposable cache",
] as const;

/** Git 2.34 is the first release that verifies SSH commit signatures. */
const MIN_GIT: readonly [number, number] = [2, 34];

/**
 * Run doctor.
 *
 * Evaluates: git repository and version, Node.js version, the signing tools
 * the Approval Policy's keys need, the Approval Policy, each managed spec's
 * ledger integrity (Ledger Head included), and untracked spec documents
 * (criterion 17.7). The other Table 17.A categories are reported as
 * NOT_CHECKED (not implemented) — never as PASS.
 *
 * Exit: 1 when a diagnostic FAILs, 0 otherwise.
 */
export async function doctor(args: DoctorArgs, ctx: CliContext): Promise<number> {
  const results: Diagnostic[] = [];
  const add = (category: string, outcome: Outcome, message: string) =>
    results.push({ category, outcome, message });

  const node = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
  add(
    "Node.js version",
    node >= 22 ? "PASS" : "FAIL",
    `Node.js ${process.versions.node}${node >= 22 ? "" : " is too old (need >= 22)"}`,
  );

  const gitVersion = tool("git", ["--version"]);
  const parsed = /(\d+)\.(\d+)/.exec(gitVersion ?? "");
  const gitOk =
    parsed !== null &&
    (Number(parsed[1]) > MIN_GIT[0] ||
      (Number(parsed[1]) === MIN_GIT[0] && Number(parsed[2]) >= MIN_GIT[1]));
  add(
    "Git version",
    gitOk ? "PASS" : "FAIL",
    gitVersion === null
      ? "git is not installed"
      : `${gitVersion.trim()}${gitOk ? "" : ` (need >= ${MIN_GIT.join(".")} to verify SSH-signed approvals)`}`,
  );

  const root = findRepoRoot(ctx.cwd);
  add(
    "Git repository",
    root === null ? "FAIL" : "PASS",
    root === null ? `${ctx.cwd} is not inside a git work tree` : root,
  );

  if (root !== null) {
    const specs = listSpecs(root);
    const managed = specs.map((ref) => loadSpec(ref)).filter((spec) => !isLegacy(spec));

    const policy = await loadApprovalPolicy(root);
    if (policy.kind === "loaded") {
      add("Approval Policy", "PASS", `${policy.path}: ${policy.policy.identities.length} approver(s)`);
      const types = new Set(policy.policy.identities.flatMap((i) => i.keys.map((k) => k.type)));
      if (types.has("ssh")) {
        const found = tool("ssh-keygen", ["-V"]) !== null || tool("which", ["ssh-keygen"]) !== null;
        add("Signing tools", found ? "PASS" : "FAIL", found ? "ssh-keygen found" : "the policy lists SSH keys but ssh-keygen is not installed");
      }
      if (types.has("gpg")) {
        const found = tool("gpg", ["--version"]) !== null;
        add("Signing tools", found ? "PASS" : "FAIL", found ? "gpg found" : "the policy lists GPG keys but gpg is not installed");
      }
    } else if (policy.kind === "invalid") {
      add("Approval Policy", "FAIL", `${policy.path} is invalid: ${policy.message}`);
    } else {
      add(
        "Approval Policy",
        managed.length > 0 ? "FAIL" : "NOT_APPLICABLE",
        managed.length > 0
          ? `${policy.path} is missing: no approval of a managed spec can be valid`
          : `${policy.path} is missing; no spec is under Vellum management`,
      );
    }

    if (managed.length === 0) {
      add("Ledger integrity", "NOT_APPLICABLE", "no spec is under Vellum management");
    }
    for (const spec of managed) {
      const failures = spec.ledgerProblem
        ? [spec.ledgerProblem]
        : checkLedgerIntegrity(spec.ledger, spec.ledgerHead).failures.map(
            (f) => `entry ${f.entry_id}: ${f.message}`,
          );
      add(
        "Ledger integrity",
        failures.length === 0 ? "PASS" : "FAIL",
        failures.length === 0
          ? `${spec.ref.slug}: ${spec.ledger.length} entries intact`
          : `${spec.ref.slug}: ${failures.join("; ")}`,
      );
    }

    if (specs.length === 0) {
      add("Untracked spec documents", "NOT_APPLICABLE", "the repository holds no Spec Directory");
    } else {
      const untracked = runGit(root, [
        "status",
        "--porcelain",
        "--untracked-files=all",
        "--",
        ".agents/specs",
      ])
        .split("\n")
        .filter((l) => l.startsWith("?? "))
        .map((l) => l.slice(3))
        .filter((p) => !p.includes("/.sdlc/"));
      add(
        "Untracked spec documents",
        untracked.length === 0 ? "PASS" : "FAIL",
        untracked.length === 0
          ? `${specs.length} spec director(ies), no untracked document`
          : `untracked: ${untracked.join(", ")}`,
      );
    }
  }

  for (const category of NOT_IMPLEMENTED) {
    add(category, "NOT_CHECKED", "not implemented in this version");
  }

  const failed = results.some((r) => r.outcome === "FAIL");
  if (args.json) {
    writeJson(ctx, { command: "doctor", result: failed ? "FAIL" : "PASS", diagnostics: results });
  } else {
    for (const r of results) ctx.stdout.write(`${r.outcome.padEnd(14)} ${r.category}: ${r.message}\n`);
    ctx.stdout.write(
      failed
        ? "\nFAIL: at least one diagnostic failed\n"
        : "\nNo evaluated diagnostic failed; NOT_CHECKED categories were not evaluated\n",
    );
  }
  return failed ? EXIT_STATUS.FAILURE : EXIT_STATUS.SUCCESS;
}

/** A tool's stdout, or null when it cannot run. */
function tool(command: string, args: readonly string[]): string | null {
  try {
    return execFileSync(command, [...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    // `ssh-keygen -V` is not an option on every build; a spawn that ran and
    // exited non-zero still proves the binary exists.
    const code = (error as { code?: unknown }).code;
    return code === "ENOENT" ? null : command === "ssh-keygen" ? "" : null;
  }
}
