# Getting Started with Vellum

This guide walks you through setting up Vellum for a new project.

## Prerequisites

- **Node.js** >= 22.0.0
- **Git** >= 2.28 (configured with user.name, user.email)
- **GPG** (for commit signing, recommended)

## Step 1: Install Vellum

```bash
npm install @figentra/vellum --save-dev
# or
pnpm add @figentra/vellum --save-dev
```

Verify installation:

```bash
npx vellum --version
```

## Step 2: Initialize Project Structure

Create the spec directory:

```bash
mkdir -p .agents/specs
```

Vellum looks for specifications in `.agents/specs/` by default.

## Step 3: Create Your First Specification

Create a directory for your spec:

```bash
mkdir -p .agents/specs/001-my-feature
cd .agents/specs/001-my-feature
```

### requirements.md

```markdown
---
state: DRAFT
version: 1
last_modified: 2024-01-15T10:30:00Z
checksum: ""
---

# Requirements: My Feature

**Spec**: 001-my-feature  
**Author**: Alice Smith  
**Date**: 2024-01-15  

## Problem Statement

Users cannot do X, which prevents them from achieving Y.

## Success Criteria

- **C1.1**: Users can perform action X
- **C1.2**: Action X completes within 2 seconds
- **C1.3**: Action X works offline

## Acceptance Criteria

**AC1**: Given a user on the dashboard, when they click "Do X", then X happens.  
**AC2**: Given X is triggered, when it completes, then a confirmation is shown.

## Non-Functional Requirements

- **NFR1**: Accessibility (WCAG 2.2 AA)
- **NFR2**: Performance (< 2s response time)
- **NFR3**: Security (input validation)

## Out of Scope

- Integration with external service Z
- Mobile app support

## References

- Related spec: 000-infrastructure-setup
```

### design.md

```markdown
---
state: DRAFT
version: 1
last_modified: 2024-01-15T11:00:00Z
checksum: ""
---

# Design: My Feature

**Spec**: 001-my-feature  
**Author**: Bob Johnson  
**Date**: 2024-01-15  

## Architecture Overview

```
+------------------+     +------------------+
|   UI Component   | --> |   Service Layer  |
+------------------+     +------------------+
                                 |
                                 v
                         +------------------+
                         |   Data Layer     |
                         +------------------+
```

## Components

### Component A: XService

**Purpose**: Handles X operations

**API**:
- `performX(input: XInput): Promise<XResult>`
- `getXStatus(): Promise<XStatus>`

**Dependencies**: AuthService, CacheService

### Component B: XWidget

**Purpose**: UI for X

**Props**:
- `onComplete: (result: XResult) => void`

## Data Model

```typescript
interface XInput {
  userId: string;
  params: XParams;
}

interface XResult {
  success: boolean;
  data: XData;
  timestamp: Date;
}
```

## Sequence Diagram

```
User -> Widget: click "Do X"
Widget -> XService: performX(input)
XService -> AuthService: verify(userId)
AuthService -> XService: verified
XService -> CacheService: check cache
CacheService -> XService: cache miss
XService -> DataLayer: store(data)
DataLayer -> XService: stored
XService -> Widget: result
Widget -> User: show confirmation
```

## Error Handling

- Invalid input: Show validation errors
- Auth failure: Redirect to login
- Network error: Retry with exponential backoff
- Storage failure: Show error, offer retry

## Security Considerations

- Input sanitization (XSS prevention)
- Rate limiting (5 requests/minute)
- Audit logging

## Testing Strategy

- Unit tests: Service methods
- Integration tests: Widget + Service
- E2E tests: Full user flow
- Property tests: Input validation

## Performance

- Target: < 2s response time
- Optimization: Caching, lazy loading
- Monitoring: Performance metrics

## References

- Requirements: [requirements.md](requirements.md) (C1.1, C1.2, C1.3)
- Architecture Decision Records: [ADR-001](../../adr/001-x-service.md)
```

### tasks.md

```markdown
---
state: DRAFT
version: 1
last_modified: 2024-01-15T12:00:00Z
checksum: ""
---

# Tasks: My Feature

**Spec**: 001-my-feature  
**Planner**: Carol Davis  
**Date**: 2024-01-15  

## Dependencies

```
T1.1 (setup) ──> T2.1 (service) ──> T3.1 (widget)
   │                │                   │
   └──> T1.2 ───────┴──> T2.2 ───────────┘
```

## Wave 1: Setup

### T1.1 — Project scaffold

**Description**: Set up project structure and dependencies.

**Acceptance Criteria**: C1.3 (offline support)

**Property Tests**:
- Package installs without network
- Builds in < 60s

**Effort**: S (30min)

---

### T1.2 — Configuration

**Description**: Configure build tools and linting.

**Acceptance Criteria**: C1.3 (offline support)

**Effort**: S (20min)

---

## Wave 2: Service Implementation

### T2.1 — Implement XService

**Description**: Create the XService class with core logic.

**Acceptance Criteria**: C1.1 (action X), C1.2 (2s response)

**Property Tests**:
- performX returns valid result for valid input
- performX rejects invalid input
- Response time < 2s for 95th percentile

**Effort**: M (60min)

---

### T2.2 — Add caching

**Description**: Implement caching layer for performance.

**Acceptance Criteria**: C1.2 (2s response)

**Property Tests**:
- Cache hit returns same result as compute
- Cache invalidation works correctly

**Effort**: M (45min)

---

## Wave 3: UI Implementation

### T3.1 — Create XWidget

**Description**: Implement the UI component.

**Acceptance Criteria**: C1.1 (action X)

**Property Tests**:
- Widget renders without errors
- Widget handles all states (loading, error, success)

**Effort**: M (60min)

---

### T3.2 — Add integration tests

**Description**: Write integration tests for widget + service.

**Acceptance Criteria**: C1.1, C1.2

**Effort**: M (45min)

---

## Summary

| Wave | Tasks | Total Effort |
|------|-------|--------------|
| 1: Setup | 2 | 50min |
| 2: Service | 2 | 105min |
| 3: UI | 2 | 105min |

**Total**: 6 tasks, ~4.5 hours

---

## Execution Log

| Task | Start | End | Duration | Status | Commit |
|------|-------|-----|----------|--------|--------|
| T1.1 | - | - | - | [ ] | - |
| T1.2 | - | - | - | [ ] | - |
| T2.1 | - | - | - | [ ] | - |
| T2.2 | - | - | - | [ ] | - |
| T3.1 | - | - | - | [ ] | - |
| T3.2 | - | - | - | [ ] | - |
```

## Step 4: Validate Your Specification

Check for syntax and structure errors:

```bash
vellum lint 001
```

Fix any issues reported.

## Step 5: Initialize Ledger

Create the machine folder:

```bash
mkdir .agents/specs/001-my-feature/.sdlc
```

This will hold:
- `ledger.jsonl` - Append-only log of events
- `cache/` - Disposable cache (optional)

## Step 6: Workflow

### Request Review

Update state to IN_REVIEW:

```markdown
---
state: IN_REVIEW
version: 1
---
```

Commit and push:

```bash
git add .
git commit -S -m "spec: Add requirements for 001-my-feature"
git push
```

### Get Approval

A human approver runs:

```bash
vellum approve 001 requirements
```

This:
1. Verifies the human identity (not AI)
2. Checks git signature
3. Records approval in ledger
4. Updates state to REQUIREMENTS_APPROVED

### Repeat for Design and Tasks

Follow the same process for design.md and tasks.md.

### Start Implementation

Once approved, mark as IN_PROGRESS:

```markdown
---
state: IN_PROGRESS
version: 1
---
```

Start a task:

```bash
vellum task start 001 T1.1
```

This:
1. Validates preconditions (artifacts exist, approvals valid)
2. Records task binding in ledger

### Complete Task

After implementing:

```bash
vellum task complete 001 T1.1
```

This:
1. Validates evidence (exit status, commit exists, no secrets)
2. Records evidence in ledger
3. Updates task marker to `[x]`

### Verify Progress

Check overall progress:

```bash
vellum verify 001
```

### Request Verification

When all tasks complete, transition to VERIFICATION state for final review.

### Merge and Release

After verification passes:

```bash
vellum approve 001 verification
# State transitions to MERGED
# Then RELEASED
# Then DONE
```

## Step 7: Set Up CI

Add to your CI pipeline:

```yaml
# .github/workflows/spec-check.yml
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
      
      - run: pnpm install --frozen-lockfile
      - run: pnpm vellum check
      - run: pnpm vellum verify
```

## Step 8: Set Up AI Assistant Integration

### For Claude (Anthropic)

Run:

```bash
vellum sync --target claude --check
vellum sync --target claude
```

This projects your spec files to `~/.claude/` with proper frontmatter.

### For Kiro (Cline)

```bash
vellum sync --target kiro --check
vellum sync --target kiro
```

Projects to `.agents/` with Kiro-compatible format.

### For OpenCode

```bash
vellum sync --target opencode --check
vellum sync --target opencode
```

Projects to `~/.opencode/`.

## Common Patterns

### Starting a New Task

```bash
# 1. Check status
vellum status 001

# 2. Verify preconditions
vellum check 001

# 3. Start task
vellum task start 001 T2.1

# 4. Work on task...

# 5. Complete task
vellum task complete 001 T2.1

# 6. Verify
vellum verify 001
```

### Handling Failures

If `vellum task complete` fails:

1. Check the error message
2. Fix the issue (e.g., tests failing, secrets in output)
3. Re-run `vellum task complete`

The task marker remains `[-]` (in progress) until successful.

### Moving Back to Draft

If you need to change approved artifacts:

```yaml
# Update state frontmatter
---
state: DRAFT
version: 2  # Increment version
---
```

This invalidates downstream approvals (design → tasks cascading).

## Troubleshooting

### "Git signature verification failed"

Make sure you have a GPG key configured:

```bash
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true
```

### "Detected AI assistant session"

Approvals must come from a human terminal, not an AI assistant. Run the approve command directly in your terminal.

### "Preconditions not met"

Check:
- All artifacts exist
- Approvals are valid
- Checksums match
- References resolve

Use `vellum doctor` to diagnose.

## Next Steps

- Read the [CLI Reference](../cli/README.md)
- Learn about [Architecture](../architecture.md)
- Set up [Integration](../integration/README.md) with your tools
- Join the community (link TBD)

---

Need help? Run `vellum doctor` for diagnostics.
