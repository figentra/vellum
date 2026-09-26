/**
 * Command routing. `run` is the whole CLI minus process wiring: cli.ts
 * calls it with process.argv and the real context; tests call it with a
 * temp repository and captured streams.
 */

import { EXIT_STATUS } from "@vellum/protocol";
import { parseArgs, stringOption, unknownOption, type ParsedArgs } from "./args.js";
import type { CliContext } from "./context.js";
import { VERSION } from "./version.js";
import { status } from "./commands/status.js";
import { lint } from "./commands/lint.js";
import { verify } from "./commands/verify.js";
import { doctor } from "./commands/doctor.js";
import { approve, APPROVE_HELP } from "./commands/approve.js";
import { task, DEFAULT_TIMEOUT_SECONDS } from "./commands/task.js";

export const HELP = `vellum ${VERSION} — specification lifecycle enforcement

USAGE
  vellum <command> [arguments] [options]

COMMANDS
  status [spec] [--json]
      Recorded state, artifact versions, valid approvals, verified tasks and
      ledger integrity per spec. The Effective Lifecycle State is not
      computed by this version.
  lint [spec] [--type=requirements|design|tasks] [--json]
      Protocol Validator: spec folder contract, frontmatter and checksums,
      task markers and criterion references, ledger schema and integrity.
  verify [spec] [--strict] [--json]
      Strict Verifier (verify is always strict): ledger integrity, signed
      approvals bound to current checksums, coverage, evidence per task.
  doctor [--json]
      Environment and repository diagnostics.
  approve <spec> <requirements|design|tasks> [--reject --rationale=<text>]
      Write an approval record for YOU to commit, signed. Humans only.
      See 'vellum approve --help'.
  task start <spec> <task-id>
      Pre-execution check; records a Task Binding and sets [-].
  task complete <spec> <task-id> --command=<cmd> [--timeout=<seconds>]
      Runs <cmd> itself, records the evidence, sets [x] only on exit 0 at a
      clean HEAD. Default timeout ${DEFAULT_TIMEOUT_SECONDS}s.

EXIT STATUS
  0 PASS / done, 1 FAIL / refused, 2 INCONCLUSIVE, usage error, or not implemented

Not implemented in this version (exit 2): check, adopt, sync.
`;

/** Commands named by the spec but not implemented; each exits 2. */
const NOT_IMPLEMENTED: Readonly<Record<string, string>> = {
  check:
    "check (Check Mode needs the Effective Lifecycle State, criteria 6.7-6.12, which this version does not compute); use 'vellum lint' and 'vellum verify'",
  adopt: "adopt (bringing a legacy spec under management, criterion 14)",
  sync: "sync (projection to assistant directories, criterion 13)",
};

const IMPLEMENTED = ["status", "lint", "verify", "doctor", "approve", "task start", "task complete"];

function usage(ctx: CliContext, message: string): number {
  ctx.stderr.write(`vellum: ${message}\nSee 'vellum --help'.\n`);
  return EXIT_STATUS.INCONCLUSIVE;
}

function checkOptions(ctx: CliContext, args: ParsedArgs, command: string, allowed: string[]): number | null {
  const unknown = unknownOption(args, allowed);
  if (unknown === null) return null;
  return usage(ctx, `'${command}' has no option --${unknown}`);
}

/** Run the CLI for `argv` (without node and script). Returns the exit status. */
export async function run(argv: readonly string[], ctx: CliContext): Promise<number> {
  const args = parseArgs(argv);
  const [command, ...rest] = args.positional;
  const json = args.options.has("json");
  const withJson: CliContext = { ...ctx, json };

  if (command === undefined) {
    if (args.options.has("version")) {
      ctx.stdout.write(`vellum ${VERSION}\n`);
      return EXIT_STATUS.SUCCESS;
    }
    ctx.stdout.write(HELP);
    return args.options.size === 0 || args.options.has("help")
      ? EXIT_STATUS.SUCCESS
      : usage(ctx, "no command given");
  }

  if (command in NOT_IMPLEMENTED) {
    ctx.stderr.write(`vellum: not implemented: ${NOT_IMPLEMENTED[command]}\n`);
    return EXIT_STATUS.INCONCLUSIVE;
  }

  switch (command) {
    case "status": {
      const bad = checkOptions(ctx, args, command, ["json"]);
      if (bad !== null) return bad;
      if (rest.length > 1) return usage(ctx, "status takes at most one spec");
      return status({ spec: rest[0], json }, withJson);
    }

    case "lint": {
      const bad = checkOptions(ctx, args, command, ["json", "type"]);
      if (bad !== null) return bad;
      if (rest.length > 1) return usage(ctx, "lint takes at most one spec");
      const type = stringOption(args, "type");
      if (type === null) return usage(ctx, "--type needs a value");
      return lint({ spec: rest[0], json, type }, withJson);
    }

    case "verify": {
      const bad = checkOptions(ctx, args, command, ["json", "strict"]);
      if (bad !== null) return bad;
      if (rest.length > 1) return usage(ctx, "verify takes at most one spec");
      return verify({ spec: rest[0], json }, withJson);
    }

    case "doctor": {
      const bad = checkOptions(ctx, args, command, ["json"]);
      if (bad !== null) return bad;
      if (rest.length > 0) return usage(ctx, "doctor takes no arguments");
      return doctor({ json }, withJson);
    }

    case "approve": {
      if (args.options.has("help")) {
        ctx.stdout.write(APPROVE_HELP);
        return EXIT_STATUS.SUCCESS;
      }
      const bad = checkOptions(ctx, args, command, ["reject", "rationale"]);
      if (bad !== null) return bad;
      const [spec, artifact] = rest;
      if (spec === undefined || artifact === undefined || rest.length > 2) {
        return usage(ctx, "usage: vellum approve <spec> <requirements|design|tasks> [--reject --rationale=<text>]");
      }
      const rationale = stringOption(args, "rationale");
      return approve(
        { spec, artifact, reject: args.options.has("reject"), rationale: rationale ?? undefined },
        ctx,
      );
    }

    case "task": {
      const [sub, spec, taskId, ...extra] = rest;
      if (sub === "start") {
        const bad = checkOptions(ctx, args, "task start", []);
        if (bad !== null) return bad;
        if (spec === undefined || taskId === undefined || extra.length > 0) {
          return usage(ctx, "usage: vellum task start <spec> <task-id>");
        }
        return task.start({ spec, taskId }, ctx);
      }
      if (sub === "complete") {
        if (args.options.has("exit")) {
          return usage(
            ctx,
            "task complete has no --exit option: vellum runs the verification command itself and records its real exit status",
          );
        }
        const bad = checkOptions(ctx, args, "task complete", ["command", "timeout"]);
        if (bad !== null) return bad;
        const commandText = stringOption(args, "command");
        if (spec === undefined || taskId === undefined || extra.length > 0 || !commandText) {
          return usage(ctx, "usage: vellum task complete <spec> <task-id> --command=<cmd> [--timeout=<seconds>]");
        }
        const timeout = stringOption(args, "timeout");
        const timeoutSeconds = timeout === undefined ? DEFAULT_TIMEOUT_SECONDS : Number(timeout);
        if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 1) {
          return usage(ctx, "--timeout must be a whole number of seconds, at least 1");
        }
        return task.complete({ spec, taskId, command: commandText, timeoutSeconds }, ctx);
      }
      return usage(ctx, `'task ${sub ?? ""}' is not a vellum command; implemented: task start, task complete`);
    }

    default:
      // Criterion 3.4
      return usage(ctx, `'${command}' is not a vellum command. Implemented commands: ${IMPLEMENTED.join(", ")}`);
  }
}
