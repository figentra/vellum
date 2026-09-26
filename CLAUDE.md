# Vellum — Claude Code Instructions

This repository uses the Vellum method for AI-assisted development.

## Quick Reference

- Follow the dependency boundaries in `AGENTS.md`
- Use conventional commits
- Run `pnpm turbo run lint typecheck test` before claiming completion
- Use changesets for version changes

## Project Packages

- `@vellum/protocol` — Types and schemas (NO dependencies)
- `@vellum/engine` — Pure logic (depends on protocol ONLY)
- `@vellum/storage` — I/O operations (depends on protocol, engine)
- `@vellum/renderers` — Output projections (depends on protocol, engine)
- `@vellum/cli` — Command-line tool
- `@vellum/mcp` — MCP server
- `@vellum/method` — Skills, agents, templates (data only)
- Plugin packages — Assembled from method

## Development Workflow

1. Make changes
2. Run `pnpm turbo run lint typecheck test`
3. Create changeset if version change
4. Commit with conventional commit format
