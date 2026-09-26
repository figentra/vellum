# Vellum — Specification Lifecycle Enforcement

**Vellum** is a specification lifecycle enforcement tool for AI-assisted development. It ensures that specifications (requirements, design, tasks) progress through defined lifecycle states with proper approvals, evidence, and integrity checks.

## Why Vellum?

When AI assistants help write code, specifications can drift from reality. Vellum enforces a structured workflow that:

- ✅ Tracks specification lifecycle (DRAFT → RELEASED)
- ✅ Validates approvals are from authorized humans (not AI bots)
- ✅ Verifies task completion with evidence
- ✅ Detects and prevents specification tampering
- ✅ Integrates with your existing git workflow
- ✅ Works with Claude, Kiro, OpenCode, and other AI assistants

## Quick Start

### Installation

```bash
npm install @figentra/vellum
# or
pnpm add @figentra/vellum
# or
yarn add @figentra/vellum
```

### Initialize a Specification

```bash
# Create a new spec
mkdir -p .agents/specs/001-my-feature
cd .agents/specs/001-my-feature

# Write requirements, design, and tasks
echo "---\nstate: DRAFT\nversion: 1\n---" > requirements.md
echo "---\nstate: DRAFT\nversion: 1\n---" > design.md
echo "---\nstate: DRAFT\nversion: 1\n---" > tasks.md
```

### Check Status

```bash
vellum status 001
```

### Validate Specifications

```bash
# Lint all specs
vellum lint

# Verify integrity
vellum verify

# CI-ready check (no file modifications)
vellum check
```

## Architecture

Vellum is structured as a monorepo with clear boundaries:

```
@figentra/vellum        # The published bundle (ONE version)
├── @vellum/cli         # Command-line interface
├── @vellum/mcp         # MCP server for AI assistants
├── @vellum/engine      # Pure logic engine (no I/O)
├── @vellum/protocol    # Type definitions and schemas
├── @vellum/storage     # File system and git adapters
└── @vellum/renderers   # Output formatters (JSON, Markdown, etc.)
```

### Key Principles

1. **Single Version**: One npm package (`@figentra/vellum`) with a single pinned version
2. **Pure Engine**: Business logic has zero I/O, making it easy to test
3. **Deterministic Output**: Same input → same output (byte-identical)
4. **Offline Capable**: Zero runtime dependencies after installation
5. **Git-Native**: Uses git for integrity, approvals, and verification

## Documentation

- [Getting Started Guide](docs/guides/getting-started.md)
- [CLI Reference](docs/cli/README.md)
- [API Documentation](docs/api.md)
- [Architecture Overview](docs/architecture.md)
- [Integration Guides](docs/integration/README.md)
- [Troubleshooting](docs/troubleshooting.md)

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build all packages
pnpm build

# Run linter
pnpm lint

# Type check
pnpm typecheck
```

## Requirements

- Node.js >= 22.0.0
- Git >= 2.28 (for gpg signatures)

## License

MIT

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

Built with ❤️ by [Figentra](https://figentra.com)
