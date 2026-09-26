# Fixtures

What this directory holds today:

- `basalt-parity/` — the pinned parity commit (`PARITY_COMMIT`) and a status snapshot of
  Basalt's specs at that commit.

Planned but not present: fixture repositories for a minimal spec, a full lifecycle,
invalid specs, concurrent updates, amendments, the critical risk class, releases, and each
assistant. The CLI's integration tests build their fixture repository in a temporary
directory per test instead (`packages/cli/src/__tests__/fixture.ts`).
