#!/usr/bin/env node
/**
 * Vellum CLI entry point
 *
 * Thin command-line interface that delegates to engine and uses renderers for output.
 * No rule logic lives here; a rule found in a command handler is a finding.
 */

import { cli, command, flag, subcommand } from "cley";
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

const program = cli({
  name: "vellum",
  version: VERSION,
  description: "Specification lifecycle enforcement for AI-assisted development",

  commands: [
    // Spec-level commands
    command({
      name: "status",
      description: "Show combined state for one or all specs",
      arguments: [
        {
          name: "spec",
          description: "Spec number or slug (optional)",
          type: "string",
          default: undefined,
        },
      ],
      flags: {
        json: flag({
          type: "boolean",
          short: "j",
          description: "Output as JSON",
          default: false,
        }),
      },
      handler: status,
    }),

    command({
      name: "lint",
      description: "Run Protocol Validator over spec artifacts",
      arguments: [
        {
          name: "spec",
          description: "Spec number or slug (optional)",
          type: "string",
          default: undefined,
        },
      ],
      flags: {
        json: flag({
          type: "boolean",
          short: "j",
          description: "Output as JSON",
          default: false,
        }),
        type: flag({
          type: "string",
          short: "t",
          description: "Filter by artifact type",
          default: undefined,
        }),
      },
      handler: lint,
    }),

    command({
      name: "check",
      description: "CI-safe verification without writing files",
      arguments: [
        {
          name: "spec",
          description: "Spec number or slug (optional)",
          type: "string",
          default: undefined,
        },
      ],
      flags: {
        json: flag({
          type: "boolean",
          short: "j",
          description: "Output as JSON",
          default: false,
        }),
      },
      handler: check,
    }),

    command({
      name: "verify",
      description: "Run Strict Verifier for one or all specs",
      arguments: [
        {
          name: "spec",
          description: "Spec number or slug (optional)",
          type: "string",
          default: undefined,
        },
      ],
      flags: {
        json: flag({
          type: "boolean",
          short: "j",
          description: "Output as JSON",
          default: false,
        }),
      },
      handler: verify,
    }),

    command({
      name: "approve",
      description: "Record approval for an artifact",
      arguments: [
        {
          name: "spec",
          description: "Spec number or slug",
          type: "string",
          required: true,
        },
        {
          name: "artifact",
          description: "Artifact to approve (requirements, design, tasks)",
          type: "string",
          required: true,
        },
      ],
      flags: {
        reject: flag({
          type: "boolean",
          short: "r",
          description: "Record rejection instead of approval",
          default: false,
        }),
        rationale: flag({
          type: "string",
          description: "Rationale for rejection",
          default: undefined,
        }),
      },
      handler: approve,
    }),

    command({
      name: "adopt",
      description: "Bring a Legacy Spec under Vellum management",
      arguments: [
        {
          name: "spec",
          description: "Spec number or slug",
          type: "string",
          required: true,
        },
      ],
      flags: {
        json: flag({
          type: "boolean",
          short: "j",
          description: "Output as JSON",
          default: false,
        }),
      },
      handler: adopt,
    }),

    command({
      name: "doctor",
      description: "Run diagnostics for environment issues",
      flags: {
        json: flag({
          type: "boolean",
          short: "j",
          description: "Output as JSON",
          default: false,
        }),
      },
      handler: doctor,
    }),

    command({
      name: "sync",
      description: "Project .agents/ to assistant directories",
      flags: {
        target: flag({
          type: "string",
          short: "t",
          description: "Target assistant (kiro, claude, opencode)",
          default: undefined,
        }),
        check: flag({
          type: "boolean",
          short: "c",
          description: "Check mode - detect drift without writing",
          default: false,
        }),
        json: flag({
          type: "boolean",
          short: "j",
          description: "Output as JSON",
          default: false,
        }),
      },
      handler: sync,
    }),

    // Task subcommands
    subcommand({
      name: "task",
      description: "Task lifecycle commands",
      commands: [
        command({
          name: "start",
          description: "Transition task to Started",
          arguments: [
            {
              name: "spec",
              description: "Spec number or slug",
              type: "string",
              required: true,
            },
            {
              name: "taskId",
              description: "Task identifier (e.g., 1, 2.3)",
              type: "string",
              required: true,
            },
          ],
          handler: task.start,
        }),

        command({
          name: "complete",
          description: "Mark task complete with evidence",
          arguments: [
            {
              name: "spec",
              description: "Spec number or slug",
              type: "string",
              required: true,
            },
            {
              name: "taskId",
              description: "Task identifier (e.g., 1, 2.3)",
              type: "string",
              required: true,
            },
          ],
          flags: {
            command: flag({
              type: "string",
              short: "c",
              description: "Command that was executed",
              required: true,
            }),
            exit: flag({
              type: "number",
              short: "e",
              description: "Exit status of command",
              default: 0,
            }),
          },
          handler: task.complete,
        }),
      ],
    }),
  ],

  // Handle unknown commands
  onUnknownCommand: (name: string) => {
    console.error(`vellum: '${name}' is not a vellum command.`);
    console.error("See 'vellum --help'");
    process.exit(2);
  },
});

program.run();
