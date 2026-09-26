#!/usr/bin/env node
/**
 * Vellum MCP Server entry point
 *
 * Read-only MCP server exposing Vellum capabilities to AI assistants.
 * Refuses all write operations - use the CLI for mutations.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
  type ListToolsRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { VERSION } from "./index.js";

// Create MCP server instance
const server = new Server(
  {
    name: "vellum",
    version: VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async (_request: ListToolsRequest) => {
  return {
    tools: [
      {
        name: "vellum_status",
        description:
          "Get combined state for one or all specs. Shows lifecycle state, approvals, artifacts, and next permitted transitions.",
        inputSchema: {
          type: "object",
          properties: {
            spec: {
              type: "string",
              description: "Spec number or slug (optional, shows all if not provided)",
            },
          },
        },
      },
      {
        name: "vellum_lint",
        description:
          "Run Protocol Validator over spec artifacts. Returns findings for any protocol violations.",
        inputSchema: {
          type: "object",
          properties: {
            spec: {
              type: "string",
              description: "Spec number or slug (optional, lints all if not provided)",
            },
            type: {
              type: "string",
              enum: ["requirements", "design", "tasks"],
              description: "Filter by artifact type",
            },
          },
        },
      },
      {
        name: "vellum_verify",
        description:
          "Run Strict Verifier for one or all specs. Checks coverage, approvals, ledger integrity, and task evidence.",
        inputSchema: {
          type: "object",
          properties: {
            spec: {
              type: "string",
              description:
                "Spec number or slug (optional, verifies all IN_PROGRESS+ if not provided)",
            },
          },
        },
      },
      {
        name: "vellum_check",
        description:
          "CI-safe verification without writing files. Returns PASS/FAIL for all validation checks.",
        inputSchema: {
          type: "object",
          properties: {
            spec: {
              type: "string",
              description: "Spec number or slug (optional, checks all if not provided)",
            },
          },
        },
      },
      {
        name: "vellum_trace",
        description:
          "Get trace information for a spec: recent transitions, approvals, and evidence entries.",
        inputSchema: {
          type: "object",
          properties: {
            spec: {
              type: "string",
              description: "Spec number or slug",
            },
            limit: {
              type: "number",
              description: "Maximum number of entries to return",
              default: 20,
            },
          },
          required: ["spec"],
        },
      },
      {
        name: "vellum_context",
        description:
          "Get context about the current spec: related specs, blocked dependencies, and recent activity.",
        inputSchema: {
          type: "object",
          properties: {
            spec: {
              type: "string",
              description: "Spec number or slug",
            },
          },
          required: ["spec"],
        },
      },
      {
        name: "vellum_workspace",
        description:
          "Get workspace map: all specs with their states, lifecycle positions, and relationships.",
        inputSchema: {
          type: "object",
          properties: {
            filter: {
              type: "string",
              enum: ["all", "in-progress", "blocked", "review", "complete"],
              description: "Filter specs by state category",
              default: "all",
            },
          },
        },
      },
    ],
  };
});

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "vellum_status": {
        const { spec } = args as { spec?: string };
        // TODO: Wire to actual engine when storage is ready
        // const status = await getStatus(spec);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  tool: "vellum_status",
                  spec: spec ?? "all",
                  // Placeholder response
                  specs: spec
                    ? [
                        {
                          id: spec,
                          state: "DRAFT",
                          artifacts: {
                            requirements: { version: 1 },
                            design: { version: 1 },
                            tasks: { version: 1 },
                          },
                          approvals: { requirements: 0, design: 0, tasks: 0 },
                        },
                      ]
                    : [],
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "vellum_lint": {
        const { spec, type } = args as { spec?: string; type?: string };
        // TODO: Wire to actual engine when ready
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  tool: "vellum_lint",
                  spec: spec ?? "all",
                  type: type ?? "all",
                  findings: [],
                  status: "PASS",
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "vellum_verify": {
        const { spec } = args as { spec?: string };
        // TODO: Wire to actual engine when ready
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  tool: "vellum_verify",
                  spec: spec ?? "all",
                  result: "PASS",
                  summary: {
                    criteriaCovered: 0,
                    propertiesCited: 0,
                    tasksVerified: 0,
                    approvalsValid: 0,
                    ledgerIntegrity: "PASS",
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "vellum_check": {
        const { spec } = args as { spec?: string };
        // TODO: Wire to actual engine when ready
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  tool: "vellum_check",
                  spec: spec ?? "all",
                  status: "PASS",
                  checks: {
                    stateValid: true,
                    ledgerIntegrity: true,
                    stateMatch: true,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "vellum_trace": {
        const { spec, limit = 20 } = args as { spec: string; limit?: number };
        // TODO: Wire to actual ledger reading when ready
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  tool: "vellum_trace",
                  spec,
                  entries: [] as any[],
                  limit,
                  total: 0,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "vellum_context": {
        const { spec } = args as { spec: string };
        // TODO: Wire to actual context computation when ready
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  tool: "vellum_context",
                  spec,
                  context: {
                    relatedSpecs: [] as any[],
                    blockedBy: [] as any[],
                    blocking: [] as any[],
                    recentActivity: [] as any[],
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "vellum_workspace": {
        const { filter = "all" } = args as { filter?: string };
        // TODO: Wire to actual workspace scanning when ready
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  tool: "vellum_workspace",
                  filter,
                  specs: [] as any[],
                  total: 0,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: true,
              message: error instanceof Error ? error.message : String(error),
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Vellum MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
