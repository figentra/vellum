# Basalt Parity Tests

This directory contains fixtures for comparing Vellum's output against basalt's Legacy Tooling.

## Parity Commit

**Placeholder**: The actual Parity Commit will be recorded after Wave 1-4 completion.

Current placeholder: `HEAD`

## Directory Structure

```
fixtures/basalt-parity/
├── README.md               # This file
├── PARITY_COMMIT           # Records the Parity Commit SHA
├── tool-comparison/        # Tool-by-tool comparison fixtures
│   ├── spec-status/       # Comparing with tools/spec/spec-status.mjs
│   ├── validate-repo/     # Comparing with tools/scripts/validate-repository.mjs
│   └── lint-tasks/        # Comparing with tools/scripts/lint-tasks.mjs
└── snapshots/             # Expected output snapshots from basalt
    ├── spec-status.snapshot.json
    ├── validate-repo.snapshot.txt
    └── lint-tasks.snapshot.txt
```

## Parity Testing Strategy

For each tool in basalt's Legacy Tooling:

### 1. spec-status.mjs → vellum status

- Input: Same spec directory structure
- Output: JSON format must match field-for-field
- Differences allowed: Additional fields in Vellum output (but not missing fields)

### 2. validate-repository.mjs → vellum lint

- Input: Same spec directory structure
- Output: Findings must match by (file, line, rule)
- Differences allowed: Rule identifier namespace (legacy vs vellum/)

### 3. lint-tasks.mjs → vellum lint --type tasks

- Input: Same tasks.md
- Output: Findings must match by (file, line, rule)
- Differences allowed: Rule identifier namespace

## Verification

Parity tests verify that Vellum can reproduce basalt's behavior at the Parity Commit:

1. **Rule Identifiers**: Each diagnostic from basalt must have a corresponding Vellum rule
2. **Finding Locations**: Same file and line numbers
3. **Exit Statuses**: Same exit status convention
4. **JSON Schema**: Compatible JSON output format

## Running Parity Tests

```bash
# Run parity tests
pnpm test packages/testing/src/parity/

# Update snapshots (when Parity Commit changes)
pnpm test --update packages/testing/src/parity/
```
