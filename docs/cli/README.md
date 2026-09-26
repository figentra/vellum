# CLI Reference

## Installation

```bash
npm install -g @figentra/vellum
# or use npx
npx @figentra/vellum <command>
```

## Global Options

```bash
vellum [options] <command>

Options:
  --json           Output as JSON
  --no-color       Disable colors
  -v, --version    Show version
  -h, --help       Show help
```

## Commands

### vellum lint

Validate specification artifacts against protocol rules.

```bash
vellum lint [spec]
vellum lint 001           # Lint spec 001
vellum lint --type requirements  # Only lint requirements
```

**Options**:
- `--type <artifact>` - Filter by artifact type (requirements, design, tasks)

**Exit Status**:
- `0` - All artifacts valid
- `1` - Violations found
- `2` - Could not evaluate (unknown command, invalid spec)

**Output** (JSON):
```json
{
  "findings": [
    {
      "file": "requirements.md",
      "line": 42,
      "rule": "V001",
      "message": "Invalid criterion reference"
    }
  ]
}
```

### vellum status

Show the current state of a specification.

```bash
vellum status [spec]
vellum status 001
vellum status --json
```

**Options**:
- `--json` - Output as JSON

**Exit Status**:
- `0` - Valid spec
- `1` - Invalid state
- `2` - Spec not found

**Output** (JSON):
```json
{
  "specId": "001-feature-x",
  "recordedState": "IN_PROGRESS",
  "effectiveState": "IN_PROGRESS",
  "artifacts": {
    "requirements": { "version": 3, "checksum": "abc123..." },
    "design": { "version": 2, "checksum": "def456..." },
    "tasks": { "version": 5, "checksum": "789xyz..." }
  },
  "approvals": {
    "requirements": { "approved": true, "approvedBy": "alice" },
    "design": { "approved": true, "approvedBy": "bob" },
    "tasks": { "approved": false }
  },
  "nextTransition": "VERIFICATION",
  "unmetPreconditions": []
}
```

### vellum check

CI-safe verification that doesn't modify files.

```bash
vellum check [spec]
vellum check            # Check all specs
vellum check 001
```

**Options**:
- (same as status)

**Exit Status**:
- `0` - All checks pass
- `1` - Violations found
- `2` - Could not evaluate

**Use Case**: Run in CI pipelines to verify specs without side effects.

### vellum verify

Run strict verification including coverage and ledger integrity.

```bash
vellum verify [spec]
vellum verify           # Verify all IN_PROGRESS+ specs
vellum verify 001
```

**Checks**:
- All criteria covered by tests/properties
- All properties cited by tasks
- Required task evidence present
- Valid approvals present
- Ledger integrity verified

**Exit Status**:
- `0` - Verification passed
- `1` - Verification failed
- `2` - Could not verify

**Output**:
```
Verification Results for spec 001:
  
  Criteria Coverage:  47/47 (100%)
  Property Coverage:  23/23 (100%)
  Task Evidence:      15/15 (100%)
  Approvals:          3/3 valid
  Ledger Integrity:   ✅ Pass
  
  Result: PASS
```

### vellum approve

Record an approval (human-only).

```bash
vellum approve <spec> <stage>
vellum approve 001 requirements
vellum approve 001 design
vellum approve 001 tasks
```

**Requirements**:
- Must run in an interactive terminal
- Cannot run from AI assistant session
- Git must be configured with signing key

**Exit Status**:
- `0` - Approval recorded
- `1` - Approval refused
- `2` - Invalid request

**Error Cases**:
- "Approval refused: Running in non-interactive session"
- "Approval refused: Detected AI assistant session"
- "Approval refused: Git signature verification failed"

### vellum doctor

Diagnose environment and configuration issues.

```bash
vellum doctor
```

**Checks**:
- Git version and configuration
- GPG signing setup
- Node.js version
- Spec directory structure
- Permissions

**Output**:
```
Running diagnostics...

✅ Git version: 2.43.0
✅ Git configured: user.name, user.email
✅ GPG signing: enabled
✅ Node.js: 22.0.0
✅ .agents/specs/ directory exists
⚠️  No specs found

Status: 5/6 checks passed
```

### vellum adopt

Bring a legacy spec under Vellum management.

```bash
vellum adopt <spec>
vellum adopt 001
```

**What it does**:
- Adds frontmatter to artifacts
- Sets initial state to IN_REVIEW
- Creates `.sdlc/` directory
- Preserves original content

**Exit Status**:
- `0` - Adoption successful
- `1` - Adoption refused
- `2` - Invalid spec

### vellum task start

Record a task binding before execution.

```bash
vellum task start <spec> <task>
vellum task start 001 T2.3
```

**Prerequisites**:
- Spec must be in IN_PROGRESS state
- All artifacts exist with valid approvals
- Checksums match approval records
- Task exists in tasks.md

**Exit Status**:
- `0` - Task binding recorded
- `1` - Preconditions not met
- `2` - Invalid task

### vellum task complete

Record evidence after task completion.

```bash
vellum task complete <spec> <task>
vellum task complete 001 T2.3
```

**What it validates**:
- Exit status was 0
- Commit exists and is uncommitted check passed
- No secret patterns in command text
- Timestamps are valid
- Checksum matches binding

**Exit Status**:
- `0` - Evidence recorded
- `1` - Evidence invalid
- `2` - No task binding found

### vellum sync

Project .agents/ to assistant directories.

```bash
vellum sync [options]
vellum sync --target claude
vellum sync --target kiro
vellum sync --target opencode
vellum sync --check    # Check mode (no modifications)
```

**Options**:
- `--target <assistant>` - Target assistant (claude, kiro, opencode)
- `--check` - Check for drift without modifying

**What it syncs**:
- Skills, agents, templates, rules, hooks
- Adds provenance markers
- Removes orphaned entries
- Converts frontmatter to assistant format

## Exit Status Convention

Vellum follows the exit status convention:

| Status | Meaning |
|--------|---------|
| `0` | Success |
| `1` | Failure (validation, verification, approval refusal) |
| `2` | Could not evaluate (unknown command, invalid spec, not found) |

Use these in CI:

```yaml
- name: Check specs
  run: vellum check
  # Exits 0 = pass, 1 = fail, 2 = error
```

## JSON Output

All commands support `--json` for machine-readable output:

```bash
vellum status 001 --json | jq '.effectiveState'
vellum lint --json | jq '.findings | length'
vellum verify --json > results.json
```

## Configuration

No configuration file needed. Vellum uses:

- `.agents/specs/` - Specification directory
- `.sdlc/` - Machine folder (ledger, cache)
- Git configuration (user, signing)

## Environment Variables

- `VELLUM_NO_COLOR=1` - Disable colors
- `VELLUM_LOG_LEVEL=debug` - Set log level

## Examples

### CI Pipeline

```yaml
name: Specification Checks

on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      
      - name: Install
        run: pnpm install --frozen-lockfile
      
      - name: Check specs
        run: pnpm vellum check
      
      - name: Verify specs
        run: pnpm vellum verify
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

pnpm vellum check || {
  echo "Spec validation failed. Fix issues before committing."
  exit 1
}
```

### Daily Workflow

```bash
# Morning: Check status
vellum status

# Start a task
vellum task start 001 T2.4

# ... write code, run tests ...

# Complete task
vellum task complete 001 T2.4

# Check progress
vellum verify 001

# Ready for approval
vellum approve 001 requirements
```

## Getting Help

```bash
vellum --help
vellum <command> --help
```

For more details, see the [Getting Started Guide](../guides/getting-started.md).
