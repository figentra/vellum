#!/usr/bin/env node
/**
 * Vellum CLI entry point
 *
 * Thin command-line interface that delegates to engine and uses renderers for output.
 * No rule logic lives here; a rule found in a command handler is a finding.
 */

import { VERSION } from "./index.js";
import { lint } from "./commands/lint.js";
import { status } from "./commands/status.js";
import { approve } from "./commands/approve.js";
import { verify } from "./commands/verify.js";
import { check } from "./commands/check.js";
import { adopt } from "./commands/adopt.js";
import { doctor } from "./commands/doctor.js";
import { sync } from "./commands/sync.js";
import { task } from "./commands/task.js";
import { createCliContext, exitWithStatus } from "./context.js";
import { EXIT_STATUS } from "@vellum/protocol";

/**
 * CLI argument parser
 */
interface ParsedArgs {
  command: string | null;
  subcommand: string | null;
  positional: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {
    command: null,
    subcommand: null,
    positional: [],
    flags: {},
  };

  let i = 2; // Skip 'node' and 'script'
  while (i < argv.length) {
    const arg = argv[i];
    if (!arg) {
      i++;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      result.flags.help = true;
    } else if (arg === "--version" || arg === "-v") {
      result.flags.version = true;
    } else if (arg === "--json" || arg === "-j") {
      result.flags.json = true;
    } else if (arg === "--check" || arg === "-c") {
      result.flags.check = true;
    } else if (arg === "--reject" || arg === "-r") {
      result.flags.reject = true;
    } else if (arg.startsWith("--")) {
      // Flag with value (--flag=value or --flag value)
      const eqIndex = arg.indexOf("=");
      if (eqIndex !== -1) {
        const flagName = arg.slice(2, eqIndex);
        const flagValue = arg.slice(eqIndex + 1);
        result.flags[flagName] = flagValue;
      } else {
        const flagName = arg.slice(2);
        i++;
        const flagValue = argv[i];
        if (flagValue && !flagValue.startsWith("-")) {
          result.flags[flagName] = flagValue;
        } else {
          result.flags[flagName] = true;
          i--;
        }
      }
    } else if (arg.startsWith("-")) {
      // Short flag (-f)
      const flagName = arg.slice(1);
      result.flags[flagName] = true;
    } else {
      // Positional argument
      if (result.command === null) {
        result.command = arg;
      } else if (result.subcommand === null && result.command === "task") {
        result.subcommand = arg;
      } else {
        result.positional.push(arg);
      }
    }

    i++;
  }

  return result;
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
vellum — Specification lifecycle enforcement for AI-assisted development
Version: ${VERSION}

USAGE:
  vellum <command> [options] [arguments]

COMMANDS:
  status [spec]           Show combined state for one or all specs
  lint [spec]             Run Protocol Validator over spec artifacts
  check [spec]            CI-safe verification without writing files
  verify [spec]           Run Strict Verifier for one or all specs
  approve <spec> <artifact>   Record approval for an artifact
  adopt <spec>            Bring a Legacy Spec under Vellum management
  doctor                  Run diagnostics for environment issues
  sync                    Project .agents/ to assistant directories
  task start <spec> <id>  Transition task to Started
  task complete <spec> <id> [options]  Mark task complete with evidence

OPTIONS:
  -j, --json              Output as JSON
  -h, --help              Show this help message
  -v, --version           Show version

EXAMPLES:
  vellum status 016
  vellum lint --json
  vellum approve 016 requirements
  vellum task start 016 1
  vellum task complete 016 1 --command="pnpm test" --exit=0
  vellum doctor
`);
}

/**
 * Show unknown command error
 */
function showUnknownCommand(command: string): never {
  console.error(`vellum: '${command}' is not a vellum command.`);
  console.error("See 'vellum --help'");
  exitWithStatus(EXIT_STATUS.INCONCLUSIVE);
}

/**
 * Main entry point
 */
async function main() {
  const args = parseArgs(process.argv);
  const ctx = createCliContext({
    json: Boolean(args.flags.json),
  });

  // Handle global flags
  if (args.flags.version) {
    console.log(`vellum version ${VERSION}`);
    process.exit(0);
  }

  if (args.flags.help) {
    showHelp();
    process.exit(0);
  }

  // Route to command handler
  try {
    let exitCode: number;

    switch (args.command) {
      case "status": {
        const [spec] = args.positional;
        exitCode = await status({ spec, json: Boolean(args.flags.json) }, ctx);
        break;
      }

      case "lint": {
        const [spec] = args.positional;
        const type = typeof args.flags.type === "string" ? args.flags.type : undefined;
        exitCode = await lint({ spec, json: Boolean(args.flags.json), type }, ctx);
        break;
      }

      case "check": {
        const [spec] = args.positional;
        exitCode = await check({ spec, json: Boolean(args.flags.json) }, ctx);
        break;
      }

      case "verify": {
        const [spec] = args.positional;
        exitCode = await verify({ spec, json: Boolean(args.flags.json) }, ctx);
        break;
      }

      case "approve": {
        const [spec, artifact] = args.positional;
        if (!spec || !artifact) {
          console.error("Error: approve requires <spec> and <artifact>");
          console.error("Usage: vellum approve <spec> <artifact> [--reject] [--rationale='...']");
          exitCode = EXIT_STATUS.FAILURE;
        } else {
          exitCode = await approve(
            {
              spec,
              artifact,
              reject: Boolean(args.flags.reject),
              rationale:
                typeof args.flags.rationale === "string" ? args.flags.rationale : undefined,
            },
            ctx,
          );
        }
        break;
      }

      case "adopt": {
        const [spec] = args.positional;
        if (!spec) {
          console.error("Error: adopt requires <spec>");
          console.error("Usage: vellum adopt <spec>");
          exitCode = EXIT_STATUS.FAILURE;
        } else {
          exitCode = await adopt({ spec, json: Boolean(args.flags.json) }, ctx);
        }
        break;
      }

      case "doctor": {
        exitCode = await doctor({ json: Boolean(args.flags.json) }, ctx);
        break;
      }

      case "sync": {
        const target = typeof args.flags.target === "string" ? args.flags.target : undefined;
        exitCode = await sync(
          {
            target,
            check: Boolean(args.flags.check),
            json: Boolean(args.flags.json),
          },
          ctx,
        );
        break;
      }

      case "task": {
        const [spec, taskId] = args.positional;

        switch (args.subcommand) {
          case "start": {
            if (!spec || !taskId) {
              console.error("Error: task start requires <spec> and <taskId>");
              console.error("Usage: vellum task start <spec> <taskId>");
              exitCode = EXIT_STATUS.FAILURE;
            } else {
              exitCode = await task.start({ spec, taskId }, ctx);
            }
            break;
          }

          case "complete": {
            const commandText =
              typeof args.flags.command === "string" ? args.flags.command : undefined;
            const exit = typeof args.flags.exit === "string" ? parseInt(args.flags.exit, 10) : 0;

            if (!spec || !taskId || !commandText) {
              console.error("Error: task complete requires <spec>, <taskId>, and --command");
              console.error(
                "Usage: vellum task complete <spec> <taskId> --command='...' [--exit=0]",
              );
              exitCode = EXIT_STATUS.FAILURE;
            } else {
              exitCode = await task.complete({ spec, taskId, command: commandText, exit }, ctx);
            }
            break;
          }

          default: {
            console.error(`vellum: 'task ${args.subcommand ?? ""}' is not a vellum task command.`);
            console.error("See 'vellum --help'");
            exitCode = EXIT_STATUS.INCONCLUSIVE;
          }
        }
        break;
      }

      case null: {
        showHelp();
        exitCode = EXIT_STATUS.SUCCESS;
        break;
      }

      default: {
        showUnknownCommand(args.command);
      }
    }

    process.exit(exitCode);
  } catch (error) {
    console.error(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(EXIT_STATUS.FAILURE);
  }
}

main();
