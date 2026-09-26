# Vellum

**Specification lifecycle enforcement for AI-assisted development.**

Vellum ensures that AI generated code follows approved specifications. It provides a rules-based engine that validates every change against requirements, design documents, and task plans — making AI-assisted development trustworthy.

## What Vellum does

- **Enforces the spec lifecycle**: Requirements → Design → Tasks → Implementation → Verification
- **Validates every change**: No unverified completions, no orphaned changes
- **Tracks approvals**: Who approved what, when, for which version
- **Projects for every assistant**: Claude Code, Kiro, OpenCode

## Architecture

```
protocol   ← The contract (types + schemas)
engine     ← Pure logic, no I/O
storage    ← File system + git operations
renderers  ← Output projections (markdown, assistants, reports)
cli        ← `vellum` command-line tool
mcp        ← Read-only Model Context Protocol server
method     ← Skills, agents, templates, prompts (data only)
plugin-*   ← Assistant-specific packages assembled from method
```

**Dependency flow** (enforced by Turborepo boundaries):

```
protocol  ←  engine  ←  storage  ←  cli
                 ↑          ↑        mcp
                 └── renderers ──────┘
method  (data only, depends on nothing)
plugin-*  →  method + renderers
```

## Packages

| Package | Purpose |
|---------|---------|
| `@figentra/vellum` | The published npm package — installs everything |
| `@vellum/protocol` | Types and JSON schemas for the spec contract |
| `@vellum/engine` | Pure logic implementation (no I/O) |
| `@vellum/storage` | File system and git operations |
| `@vellum/renderers` | Deterministic output projections |
| `@vellum/cli` | Command-line interface |
| `@vellum/mcp` | Read-only MCP server |
| `@vellum/method` | Skills, agents, templates (data) |
| `@vellum/plugin-claude` | Claude Code plugin |
| `@vellum/plugin-kiro` | Kiro Power |
| `@vellum/plugin-opencode` | OpenCode package |

## Development

```bash
# Install dependencies
pnpm install

# Run CI checks
pnpm turbo run lint typecheck test

# Build all packages
pnpm turbo run build
```

## Status

🚧 **Under active development** — This is a scaffold. Implementation begins with Phase 2 (Slice 1).

## License

MIT
