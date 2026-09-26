# Vellum Repository Guidance

This repository follows the Vellum method for AI-assisted development.

## Project Structure

- `packages/` — All packages (protocol, engine, storage, renderers, cli, mcp, method, plugins)
- `tooling/` — Shared tsconfig, oxlint, vitest presets
- `fixtures/` — Test fixture repositories
- `conformance/` — Negative test cases per diagnostic code
- `.agents/` — Vellum's own method content (specs, rules, agents)

## Dependency Boundaries

Enforced by Turborepo `boundaries`:

```
protocol  ←  engine  ←  storage  ←  cli
                 ↑          ↑        mcp
                 └── renderers ──────┘
method  (data only, depends on nothing)
plugin-*  →  method + renderers
```

**Rules**:

1. `engine` imports ONLY `protocol`. No `node:fs`, `node:child_process`, `Date.now`, network.
2. `storage` is the ONLY package allowed I/O (fs, child_process, network).
3. `cli` and `mcp` contain NO rules — a rule found in a command handler is a finding.
4. `method` is Markdown and JSON only; it never imports code.

## Commands

```bash
pnpm turbo run lint typecheck test  # CI checks
pnpm turbo run build               # Build all
pnpm test                          # Run tests
```

## Conventional Commits

All commits must follow conventional commits:

- `feat(scope): description`
- `fix(scope): description`
- `docs: description`
- `chore: description`

## Changesets

Use changesets for version changes:

```bash
pnpm changeset
pnpm version
pnpm release
```
