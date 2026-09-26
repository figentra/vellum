# Wave 4 CLI Usage Guide

## Overview

The Vellum CLI provides a command-line interface for specification lifecycle management. All commands follow a consistent pattern of returning exit status 0 for success, 1 for failure, and 2 for inconclusive/unknown.

## Global Options

```
--help, -h       Show help message
--version, -v    Show version
--json, -j       Output as JSON (available on most commands)
```

## Commands

### vellum status

Show combined state for one or all specs.

**Usage**:
```bash
# Show all specs
vellum status

# Show specific spec
vellum status 016
vellum status 016-queue-capability

# JSON output
vellum status --json
vellum status 016 --json
```

**Output** (human-readable):
```
Spec: 016
State: DRAFT
Next: Write requirements and run 'vellum approve 016 requirements'
```

**Output** (JSON):
```json
{
  "command": "status",
  "specs": [{
    "id": "016",
    "state": "DRAFT",
    "recordedState": "DRAFT",
    "effectiveState": "DRAFT",
    "artifacts": {
      "requirements": {"version": 1, "checksum": "abcd1234"},
      "design": {"version": 1, "checksum": "efgh5678"},
      "tasks": {"version": 1, "checksum": "ijkl9012"}
    },
    "approvals": {"requirements": 0, "design": 0, "tasks": 0},
    "nextTransition": null,
    "unmetPreconditions": ["ARTIFACT_EXISTS"]
  }]
}
```

### vellum lint

Run Protocol Validator over spec artifacts.

**Usage**:
```bash
# Lint all specs
vellum lint

# Lint specific spec
vellum lint 016

# Filter by artifact type
vellum lint --type requirements
vellum lint --type design
vellum lint --type tasks

# JSON output
vellum lint --json
```

**Output** (human-readable):
```
Linting all specs...
No issues found.
```

**Output** (JSON):
```json
{
  "command": "lint",
  "spec": "all",
  "type": "all",
  "findings": [],
  "status": "PASS"
}
```

### vellum check

CI-safe verification without writing files.

**Usage**:
```bash
# Check all specs
vellum check

# Check specific spec
vellum check 016

# JSON output
vellum check --json
```

**Output** (human-readable):
```
Checking all specs (read-only)...
✓ All checks passed
```

**Output** (JSON):
```json
{
  "command": "check",
  "spec": "all",
  "status": "PASS",
  "checks": {
    "stateValid": true,
    "ledgerIntegrity": true,
    "stateMatch": true,
    "artifactsValid": true
  }
}
```

### vellum verify

Run Strict Verifier for one or all specs.

**Usage**:
```bash
# Verify all IN_PROGRESS+ specs
vellum verify

# Verify specific spec
vellum verify 016

# JSON output
vellum verify --json
```

**Output** (human-readable):
```
Verifying all IN_PROGRESS+ specs...

✓ All checks passed
```

**Output** (JSON):
```json
{
  "command": "verify",
  "spec": "all",
  "result": "PASS",
  "summary": {
    "criteriaTotal": 0,
    "criteriaCovered": 0,
    "propertiesTotal": 0,
    "propertiesCited": 0,
    "tasksExecuted": 0,
    "tasksVerified": 0,
    "approvalsRequired": 0,
    "approvalsValid": 0,
    "ledgerIntegrity": "PASS"
  },
  "details": {
    "uncoveredCriteria": [],
    "uncitedProperties": [],
    "invalidApprovals": [],
    "ledgerIssues": []
  }
}
```

### vellum approve

Record approval for an artifact (interactive sessions only).

**Usage**:
```bash
# Approve requirements
vellum approve 016 requirements

# Approve design
vellum approve 016 design

# Approve tasks (plan)
vellum approve 016 tasks

# Reject with rationale
vellum approve 016 requirements --reject --rationale="Missing error handling"
```

**Output** (approval):
```
Approved requirements for spec 016.
Recorded in ledger.
```

**Output** (rejection):
```
Rejected requirements for spec 016.
Rationale: Missing error handling
```

**Error Cases**:
```
# Non-interactive session
Error: Approvals can only be recorded in interactive sessions.
Refusing: Non-interactive environment detected.

# Assistant session
Error: Approvals cannot be recorded from assistant sessions.
Refusing: Assistant session detected.

# Missing rationale for rejection
Error: Rejection requires a rationale.
Use: vellum approve <spec> <artifact> --reject --rationale='...'
```

### vellum adopt

Bring a Legacy Spec under Vellum management.

**Usage**:
```bash
# Adopt a legacy spec
vellum adopt 016

# JSON output
vellum adopt 016 --json
```

**Output** (human-readable):
```
Adopting spec 016...
✓ Added lifecycle frontmatter
✓ Created .sdlc/ledger.jsonl
✓ Initial state: IN_REVIEW

Next: Run 'vellum approve 016 requirements' to begin.
```

**Output** (JSON):
```json
{
  "command": "adopt",
  "spec": "016",
  "status": "ADOPTED",
  "changes": {
    "addedFrontmatter": true,
    "createdLedger": true,
    "initialState": "IN_REVIEW",
    "artifacts": {
      "requirements": {"adopted": true, "version": 1},
      "design": {"adopted": true, "version": 1},
      "tasks": {"adopted": true, "version": 1}
    }
  }
}
```

### vellum doctor

Run diagnostics for environment issues.

**Usage**:
```bash
# Run all diagnostics
vellum doctor

# JSON output
vellum doctor --json
```

**Output** (human-readable):
```
Running diagnostics...

✓ git: PASS
✓ git: PASS
✓ environment: PASS
✓ spec: PASS
✓ policy: PASS
✓ ledger: PASS

✓ All checks passed.
```

**Output** (JSON):
```json
{
  "command": "doctor",
  "status": "PASS",
  "diagnostics": [
    {
      "category": "git",
      "name": "repository",
      "severity": "error",
      "message": "Not in a Git repository",
      "passed": true
    },
    {
      "category": "environment",
      "name": "node-version",
      "severity": "error",
      "message": "Node.js 24.21.0 is supported",
      "passed": true
    }
  ]
}
```

### vellum sync

Project .agents/ to assistant directories.

**Usage**:
```bash
# Sync to all targets
vellum sync

# Sync to specific target
vellum sync --target kiro
vellum sync --target claude
vellum sync --target opencode

# Check mode (detect drift)
vellum sync --check

# JSON output
vellum sync --json
```

**Output** (write mode):
```
Syncing .agents/ to assistant directories...

kiro: 3 files written 1 files removed
claude: 3 files written 1 files removed
opencode: 3 files written 1 files removed
```

**Output** (check mode):
```
Checking for drift (read-only)...

kiro: No drift detected
claude: No drift detected
opencode: No drift detected
```

### vellum task start

Transition task to Started.

**Usage**:
```bash
# Start a task
vellum task start 016 1
vellum task start 016 2.3
```

**Output**:
```
Starting task 1 in spec 016...
✓ Pre-execution checks passed
✓ Task binding recorded
✓ Task marker updated to [-]
```

### vellum task complete

Mark task complete with evidence.

**Usage**:
```bash
# Complete with successful execution
vellum task complete 016 1 --command="pnpm test" --exit=0

# Complete with failed execution (will be rejected)
vellum task complete 016 1 --command="pnpm test" --exit=1
```

**Output** (success):
```
Completing task 1 in spec 016...
✓ Evidence recorded
✓ Execution time: 0s
✓ Task marker updated to [x]
```

**Output** (failure):
```
Error: Command exited with status 1
Task cannot be marked complete with non-zero exit status.
```

## Exit Statuses

All commands follow the exit status convention:

- `0` - Success
- `1` - Failure
- `2` - Inconclusive/Unknown command

**Example**:
```bash
vellum lint
echo $?  # 0 if no issues, 1 if issues found

vellum unknown-command
echo $?  # 2 (unknown command)

vellum approve 016 requirements
echo $?  # 0 if approved, 1 if refused
```

## Programmatic Access (JSON Mode)

All commands support `--json` for machine-readable output. The JSON output is stable and follows the protocol schemas.

**Example**: Parse verification results in CI
```bash
result=$(vellum verify --json)
status=$(echo "$result" | jq -r '.result')

if [ "$status" = "PASS" ]; then
  echo "Verification passed"
  exit 0
else
  echo "Verification failed"
  echo "$result" | jq '.details'
  exit 1
fi
```

## MCP Server

The MCP server exposes read-only tools for AI assistants.

**Starting the server**:
```bash
vellum-mcp
```

**Available Tools**:
1. `vellum_status` - Get combined state
2. `vellum_lint` - Run Protocol Validator
3. `vellum_verify` - Run Strict Verifier
4. `vellum_check` - CI-safe verification
5. `vellum_trace` - Get spec trace
6. `vellum_context` - Get spec context
7. `vellum_workspace` - Get workspace map

**Note**: The MCP server is read-only. All mutations must go through the CLI to ensure proper human-in-the-loop enforcement.

## Common Workflows

### Starting a New Spec

```bash
# 1. Create spec directory structure
mkdir -p .agents/specs/016-my-feature

# 2. Write initial requirements
# (edit .agents/specs/016-my-feature/requirements.md)

# 3. Check status
vellum status 016

# 4. Lint for issues
vellum lint 016

# 5. Approve requirements (interactive session)
vellum approve 016 requirements
```

### Executing Tasks

```bash
# 1. View tasks
vellum status 016

# 2. Start a task
vellum task start 016 1

# 3. Implement the task
# (make code changes)

# 4. Complete the task with evidence
vellum task complete 016 1 --command="pnpm test" --exit=0

# 5. Verify progress
vellum verify 016
```

### CI Integration

```bash
#!/bin/bash
# .github/workflows/verify.yml

# Check all specs (read-only)
vellum check

# Run strict verification
vellum verify

# Exit with proper status
exit $?
```

### Adopting Legacy Specs

```bash
# 1. Identify legacy spec
# (spec without lifecycle frontmatter)

# 2. Adopt it
vellum adopt 016

# 3. Review status
vellum status 016 --json

# 4. Begin approval process
vellum approve 016 requirements
```

## Troubleshooting

### Common Issues

**"Approvals can only be recorded in interactive sessions"**
- You're running in a CI environment or non-interactive shell
- Use the CLI in a real terminal

**"Approvals cannot be recorded from assistant sessions"**
- An AI assistant is trying to approve
- Human approval required

**"Command exited with status X"**
- Exit status 0: Success
- Exit status 1: Failure (check output for details)
- Exit status 2: Unknown command or inconclusive result

**"Task cannot be marked complete with non-zero exit status"**
- The command you ran failed
- Fix the issue and re-run `task complete`

### Debugging

Enable verbose output (future feature):
```bash
vellum --verbose lint 016
```

Check environment:
```bash
vellum doctor
```

## Performance

All commands are optimized for speed:
- `status`: < 100ms per spec
- `lint`: < 500ms per spec
- `verify`: Depends on spec complexity
- `check`: < 1s for typical repositories
