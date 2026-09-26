# Fixtures

Test fixture repositories used by every release:

- `minimal/` — Smallest valid spec repository
- `complete/` — Full spec lifecycle example
- `invalid/` — Invalid spec cases for testing diagnostics
- `concurrent/` — Concurrent update scenarios
- `amendment/` — Amendment and approval invalidation cases
- `critical/` — Critical risk class examples
- `release/` — Release workflow scenarios
- `kiro/` — Kiro-specific fixtures
- `claude/` — Claude Code-specific fixtures
- `opencode/` — OpenCode-specific fixtures
- `basalt-parity/` — Basalt's specs at the pinned parity commit

These fixtures are used for:
- Conformance testing (one negative case per diagnostic)
- Integration testing across all packages
- Mutation testing
