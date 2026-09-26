# Architecture Overview

Vellum implements a layered architecture with strict dependency boundaries enforced by Turborepo.

## Dependency Graph

```
+------------------+
|   @vellum/cli    |
|   @vellum/mcp    |
+--------+---------+
         |
         v
+------------------+
| @vellum/vellum   |  <-- Bundle package
+--------+---------+
         |
         v
+--------+---------+
|  @vellum/engine  |  <-- Pure logic (no I/O)
+--------+---------+
         |
         v
+--------+---------+
| @vellum/protocol |  <-- Types & schemas
+------------------+

+------------------+
| @vellum/storage  |
+--------+---------+
         |
         v
+--------+---------+
| @vellum/renderers|
+------------------+
```

## Package Boundaries

### @vellum/protocol

**Purpose**: Core types, schemas, and constants.

**Contains**:
- Branded types (SpecId, ArtifactPath, Checksum, etc.)
- Lifecycle state definitions
- Artifact schemas (frontmatter validation)
- Ledger entry types
- Diagnostic and finding types
- JSON Schema definitions

**Dependencies**: None (except tooling)

**Rules**:
- Zero runtime I/O
- Pure TypeScript types and Zod schemas
- All schemas exported for JSON Schema generation

### @vellum/engine

**Purpose**: Pure business logic engine.

**Contains**:
- State machine implementation
- Protocol validator
- Approval verifier
- Ledger integrity checker
- Coverage validation
- Evidence validation

**Dependencies**: @vellum/protocol

**Rules**:
- **Zero I/O** - no file system, network, or process operations
- Pure functions: `(input) => Result<output, Error>`
- All logic is testable without mocking
- Deterministic output

### @vellum/storage

**Purpose**: I/O adapters for filesystem and git.

**Contains**:
- File system operations (atomic writes)
- Git operations (log, show, verify)
- Spec directory scanner
- Artifact reader/writer
- Ledger persistence
- Cache adapter

**Dependencies**: @vellum/protocol, @vellum/engine

**Rules**:
- All I/O is isolated to this package
- Implements interfaces from engine
- Handles errors gracefully
- Atomic operations where possible

### @vellum/renderers

**Purpose**: Output formatters.

**Contains**:
- JSON renderer
- Markdown renderer
- Human-readable console output
- Assistant projection renderer

**Dependencies**: @vellum/protocol, @vellum/engine

**Rules**:
- Pure functions
- Deterministic output (same input → same bytes)
- Multiple output formats from same data

### @vellum/cli

**Purpose**: Command-line interface.

**Contains**:
- Command router
- Individual command implementations
- Argument parsing
- Help generation

**Dependencies**: @vellum/protocol, @vellum/engine, @vellum/storage, @vellum/renderers

**Commands**:
- `vellum lint` - Validate spec artifacts
- `vellum status` - Show spec state
- `vellum check` - CI-safe verification
- `vellum verify` - Strict verification
- `vellum approve` - Record approval (human-only)
- `vellum doctor` - Diagnose environment
- `vellum adopt` - Bring legacy spec under management
- `vellum task start` - Record task binding
- `vellum task complete` - Record evidence
- `vellum sync` - Project to assistant directories

### @vellum/mcp

**Purpose**: MCP server for AI assistants.

**Contains**:
- MCP protocol implementation
- Tool definitions
- Resource handlers

**Dependencies**: Same as CLI

**Tools**:
- `status` - Get spec status
- `lint` - Validate spec
- `check` - Verify spec
- `next_transition` - Get next permitted transition

### @figentra/vellum

**Purpose**: The ONE published package.

**Contains**:
- Re-exports from CLI and MCP packages
- CLI binary entry point
- MCP server entry point

**Dependencies**: @vellum/cli, @vellum/mcp

**Rules**:
- Single version number
- Bundle all internal dependencies
- Zero external runtime dependencies
- < 500KB bundle size

## Specification Lifecycle

States flow through this progression:

```
DRAFT → IN_REVIEW → REQUIREMENTS_APPROVED
  ↓
DESIGN_IN_REVIEW → DESIGN_APPROVED
  ↓
PLAN_IN_REVIEW → PLAN_APPROVED
  ↓
IN_PROGRESS → VERIFICATION → VERIFIED → MERGED
  ↓
RELEASED → DONE

Terminal states:
- BLOCKED, REJECTED, SUPERSEDED, ABANDONED, INVALID
```

Each transition has preconditions:
- Required approvals
- Artifact checksums match
- References resolve
- Ledger integrity

## Ledger System

The ledger (`.sdlc/ledger.jsonl`) is an append-only log:

```
Entry 1: ApprovalRecord (no predecessor)
Entry 2: EvidenceEntry (predecessor = SHA-256 of Entry 1)
Entry 3: TaskBindingEntry (predecessor = SHA-256 of Entry 2)
...
```

**Properties**:
- Every entry after the first has a predecessor digest
- Entries are immutable
- Tampering detected via digest chain
- Forks detected (duplicate predecessor)

## Approval System

Approvals must:

1. Come from a human (not AI assistant)
2. Have a verified git signature
3. Match the policy (approvers per artifact)
4. Be bound to exact artifact version and checksum

Invalidations cascade:
- Requirements invalidation → design + plan invalidations
- Design invalidation → plan invalidation
- Plan invalidation → standalone

## Testing Strategy

1. **Unit Tests**: Vitest for all packages
2. **Property Tests**: fast-check for engine package
3. **Integration Tests**: CLI end-to-end tests
4. **Conformance Tests**: Negative/near-miss fixtures
5. **Mutation Testing**: Stryker for engine package (≥85% threshold)
6. **Coverage**: ≥90% for engine package

## CI/CD Pipeline

```
Lint → TypeCheck → Test → Build
  ↓
Mutation Testing (engine only)
  ↓
Bundle Size Check
  ↓
Security Audit
  ↓
Release
```

## Security Model

1. **Human-Only Approvals**: AI assistants cannot approve
2. **Signature Verification**: Git commits must be signed
3. **Checksum Binding**: Approvals bound to exact artifact state
4. **Tamper Detection**: Ledger integrity prevents modification
5. **No Bypass**: All checks run in CI, no shortcuts

## Performance Characteristics

- **Deterministic**: Same input → same output (byte-identical)
- **Offline**: Zero network calls after installation
- **Fast**: Pure functions, no reflection, minimal allocations
- **Scalable**: O(n) for n artifacts, entries, or findings

## Extension Points

1. **Renderers**: Add new output formats
2. **Storage Adapters**: Implement for different backends
3. **CLI Plugins**: Add new commands
4. **MCP Tools**: Add new AI-facing capabilities

## Boundaries Enforcement

Turborepo enforces:

```json
{
  "protocol": { "allow": ["tooling"] },
  "engine": { "allow": ["protocol", "tooling"] },
  "storage": { "allow": ["protocol", "engine", "tooling"] },
  "cli": { "allow": ["protocol", "engine", "storage", "renderers", "tooling"] },
  "mcp": { "allow": ["protocol", "engine", "storage", "renderers", "tooling"] }
}
```

No circular dependencies. No backdoors. Enforced at build time.
