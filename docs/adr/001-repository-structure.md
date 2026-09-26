# ADR-001: Repository Structure and Turborepo Boundaries

**Status**: Accepted

**Date**: 2026-09-26

## Context

Vellum is the SDLC enforcement engine for the Figentra platform. It defines:

1. The **method** — the canonical SDLC workflow specification
2. The **enforcement engine** — the runtime that validates behavior against the method

These two concerns must remain in lockstep. If the method diverges from the engine, enforcement produces false positives or false negatives. Previous attempts to maintain them in separate repositories led to:

- Version skew between method definitions and engine capabilities
- Release coordination failures (engine required method v2, but only v1 was published)
- Bug reports that required cross-repo investigation

We needed to decide where Vellum should live and how to structure it.

## Alternatives Considered

### Option A: Add to Figentra (platform repo)

**Rejected**. Figentra is the platform monorepo containing billing, identity, tenant management, and all production services. Adding Vellum would:

- Couple SDLC logic to platform deployment cycles
- Expose internal packages to the platform's dependency graph
- Violate the principle that platform code should not depend on development tooling

### Option B: Add to Basalt (infrastructure/tooling repo)

**Rejected**. Basalt houses infrastructure-as-code, CI/CD templates, and developer tooling. Adding Vellum would:

- Blur the line between "tooling we use" and "product we ship"
- Create ambiguity about release ownership
- Mix internal developer experience (DX) tools with external-distribution packages

Basalt ADRs document infrastructure decisions; Vellum is a product with semantic versioning and public API contracts.

### Option C: Reuse existing `sdlc` repository

**Rejected**. An internal `sdlc` repository already exists with ad-hoc scripts and workflow templates. Reusing it would:

- Require refactoring legacy code that lacks proper boundaries
- Carry historical baggage (untested scripts, informal conventions)
- Lack clear package structure from day one

Starting fresh avoids paying down legacy debt before delivering value.

### Option D: Create new Vellum monorepo

**Accepted**. A dedicated repository for Vellum ensures:

- Method and engine share one version tag (`@figentra/vellum@X.Y.Z` bundles both)
- Independent release cadence from platform and infrastructure
- Clear ownership and responsibility
- Proper Turborepo boundaries from the start

## Decision

We create a new monorepo at `github.com/figentra/vellum` structured as follows:

### Repository Layout

```
vellum/
├── packages/
│   ├── protocol/      # Method specification (types, schemas)
│   ├── engine/        # Enforcement runtime
│   ├── storage/       # Persistence adapters (git, database)
│   ├── cli/           # Command-line interface
│   └── mcp/           # Model Context Protocol server
├── docs/
│   └── adr/           # Architecture decision records
├── turbo.json         # Turborepo pipeline configuration
├── pnpm-workspace.yaml
└── package.json
```

### Package Responsibilities

| Package | Responsibility | Dependencies |
|---------|----------------|--------------|
| `protocol` | Method specification: TypeScript types, JSON Schema definitions, validation. Zero runtime dependencies. | None |
| `engine` | Enforcement runtime: evaluates method rules, computes violations, reports results. | `protocol` |
| `storage` | Persistence adapters: Git repositories, GitLab/GitHub APIs, database snapshots. | `protocol`, `engine` |
| `cli` | Developer CLI: `vellum check`, `vellum init`, `vellum validate`. | All above |
| `mcp` | MCP server: exposes Vellum capabilities to agent runtimes. | All above |

### Dependency Flow

```
protocol ← engine ← storage ← cli/mcp
    ↓          ↓         ↓
  types     runtime   adapters
```

- **Unidirectional**: Dependencies flow left-to-right only
- **No cycles**: `protocol` depends on nothing, `cli`/`mcp` depend on everything
- **Turborepo boundaries**: Each package has a `turbo.json` task pipeline

### Naming Convention

| Scope | Convention | Example |
|-------|------------|----------|
| Published package | `@figentra/vellum` | The unified public package |
| Internal packages | `@vellum/*` | `@vellum/protocol`, `@vellum/engine` |
| Private packages | `@vellum/private-*` | `@vellum/private-storage-gitlab` |

The published `@figentra/vellum` package re-exports the public API from internal packages, providing a single entry point for consumers.

### Turborepo Pipeline

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    }
  }
}
```

- `^build` ensures dependencies build before dependents
- Incremental builds via Turborepo remote cache
- CI runs `turbo run typecheck test lint` on every PR

## Consequences

### Positive

- **Single release tag**: `@figentra/vellum@1.0.0` bundles method and engine — no version drift
- **Clear boundaries**: Turborepo enforces package isolation
- **Independent velocity**: Vellum releases without blocking platform deploys
- **Testable in isolation**: `pnpm test` runs without Figentra infrastructure

### Negative

- **Additional repository**: One more repo to maintain (CI, permissions, secrets)
- **Cross-repo coordination**: Changes to figentra that require Vellum updates need two PRs
- **Publishing overhead**: Publishing `@figentra/vellum` requires provenance, CHANGELOG updates

### Risks

- **Overfragmentation**: If Vellum grows too large, consider splitting `protocol` into its own repo — but only if method-only consumers emerge
- **Dependency divergence**: If figentra imports `@figentra/vellum`, ensure figentra's version stays compatible (use `peerDependencies`)

## Related

- This ADR establishes the repo; subsequent ADRs will cover:
  - ADR-002: Method Specification Schema (forthcoming)
  - ADR-003: Enforcement Engine Plugin Architecture (forthcoming)

## History

- 2026-09-26: Initial acceptance
