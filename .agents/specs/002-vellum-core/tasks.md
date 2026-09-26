# Tasks — Slice 1: The Enforceable Core

This document defines the implementation tasks for Slice 1 of vellum-core. Tasks are ordered by dependency and grouped into waves for parallel execution.

## Dependency Graph

```
                                    ┌─────────────────────────────────────────────────────────────────┐
                                    │                        WAVE 6                                   │
                                    │  Distribution + Documentation                                   │
                                    │  T6.1 → T6.2 → T6.3 → T6.4                                     │
                                    └─────────────────────────────────────────────────────────────────┘
                                                                    ▲
                                                                    │
                                    ┌─────────────────────────────────────────────────────────────────┐
                                    │                        WAVE 5                                   │
                                    │  Integration + Testing                                          │
                                    │  T5.1 ─┬─→ T5.2 ─┬─→ T5.3 ─┬─→ T5.4                            │
                                    │        │         │         │                                    │
                                    │        └─→ T5.5 ─┴─→ T5.6 ─┴─→ T5.7                            │
                                    └─────────────────────────────────────────────────────────────────┘
                                                                    ▲
                                                                    │
                                    ┌─────────────────────────────────────────────────────────────────┐
                                    │                        WAVE 4                                   │
                                    │  CLI + MCP                                                      │
                                    │  T4.1 ──→ T4.2 ──→ T4.3 ──→ T4.4 ──→ T4.5 ──→ T4.6            │
                                    │                                                                 │
                                    │  T4.7 ──→ T4.8 ──→ T4.9 ──→ T4.10 ──→ T4.11                  │
                                    └─────────────────────────────────────────────────────────────────┘
                                                                    ▲
                                                                    │
                                    ┌─────────────────────────────────────────────────────────────────┐
                                    │                        WAVE 3                                   │
                                    │  Storage + Renderers                                            │
                                    │  T3.1 ─┬─→ T3.2 ─┬─→ T3.3 ─┬─→ T3.4                            │
                                    │        │         │         │                                    │
                                    │        └─→ T3.5 ─┴─→ T3.6 ─┴─→ T3.7                            │
                                    │                                                                 │
                                    │  T3.8 ──→ T3.9 ──→ T3.10 ──→ T3.11                             │
                                    └─────────────────────────────────────────────────────────────────┘
                                                                    ▲
                                                                    │
                                    ┌─────────────────────────────────────────────────────────────────┐
                                    │                        WAVE 2                                   │
                                    │  Engine Core                                                    │
                                    │  T2.1 ──→ T2.2 ──→ T2.3 ──→ T2.4 ──→ T2.5                     │
                                    │     │         │         │                                       │
                                    │     └─→ T2.6 ─┴─→ T2.7 ─┴─→ T2.8 ──→ T2.9                     │
                                    │                                                                 │
                                    │  T2.10 ──→ T2.11 ──→ T2.12 ──→ T2.13 ──→ T2.14                │
                                    └─────────────────────────────────────────────────────────────────┘
                                                                    ▲
                                                                    │
                                    ┌─────────────────────────────────────────────────────────────────┐
                                    │                        WAVE 1                                   │
                                    │  Protocol + Package Setup                                       │
                                    │  T1.1 ──→ T1.2 ──→ T1.3 ──→ T1.4 ──→ T1.5                     │
                                    │     │         │         │         │                            │
                                    │     └─→ T1.6 ─┴─→ T1.7 ─┴─→ T1.8 ──→ T1.9                     │
                                    │                                                                 │
                                    │  T1.10 ──→ T1.11 ──→ T1.12 ──→ T1.13                          │
                                    └─────────────────────────────────────────────────────────────────┘
```

---

## Wave 1: Protocol + Package Setup

Tasks in this wave establish the foundational types, schemas, and package structure. All later work depends on these.

### T1.1 — Define core types and branded types

**Description**: Establish the foundational type system in `@vellum/protocol`, including branded types for SpecId, ArtifactPath, Checksum, CommitSha, TaskId, CriterionId, PropertyId, EntryId, and other domain identifiers.

**Acceptance Criteria**:
- Criterion 4.1: Types support Ledger Entry identifiers
- Criterion 4.2: Types support Artifact Version and Checksum
- Criterion 5.1: Types support Lifecycle State Set
- Criterion 11.7: Types support Rule Identifier in Findings

**Property Tests**:
- Branded types are runtime-checkable
- Type guards correctly narrow branded from string
- Parse functions reject invalid format (e.g., short SHA, invalid SpecId pattern)
- Roundtrip: `parse(format(x)) === x` for all branded types

**Dependencies**: None

**Estimated Effort**: M (45-60 min)

---

### T1.2 — Define Lifecycle State Set and transition types

**Description**: Define the complete Lifecycle State Set (DRAFT, IN_REVIEW, REQUIREMENTS_APPROVED, DESIGN_IN_REVIEW, DESIGN_APPROVED, PLAN_IN_REVIEW, PLAN_APPROVED, IN_PROGRESS, VERIFICATION, VERIFIED, MERGED, RELEASED, DONE, BLOCKED, REJECTED, SUPERSEDED, ABANDONED, INVALID) and transition request types.

**Acceptance Criteria**:
- Criterion 5.1: Lifecycle State Set defined as discriminated union
- Criterion 5.4: Transition request type captures source and target states
- Criterion 5.6: Terminal states can be identified programmatically
- Table 5.A: Each transition enumerated with correct from/to

**Property Tests**:
- All states are unique (no duplicates)
- Terminal states never appear as transition source
- Each non-terminal state has at least one outgoing transition
- State ordering respects Table 5.A ordinal progression

**Dependencies**: T1.1

**Estimated Effort**: M (45-60 min)

---

### T1.3 — Define Artifact types and frontmatter schema

**Description**: Define types for Artifact (requirements, design, tasks), ArtifactVersion, ArtifactStatus, ArtifactChecksum, and Lifecycle Frontmatter schema with Zod validation.

**Acceptance Criteria**:
- Criterion 4.2: Artifact Version and Status in frontmatter
- Criterion 8.1: Approval Record binds to Artifact Version and Checksum
- Criterion 11.1: Frontmatter validation against Schema
- Criterion 11.17: Zod schemas exported for JSON Schema generation

**Property Tests**:
- Generate valid frontmatter → parse succeeds
- Generate with extra fields → parse fails (strict mode)
- Generate with missing required fields → parse fails
- Checksum is valid SHA-256 hex string

**Dependencies**: T1.1, T1.2

**Estimated Effort**: M (45-60 min)

---

### T1.4 — Define Ledger Entry types and schema

**Description**: Define the discriminated union of Ledger Entry types (ApprovalRecord, RejectionRecord, DecisionRecord, EvidenceEntry, ClaimEntry, FailureEntry, AmendmentEntry, GateResultEntry, MergeEntry, ReleaseEntry) with common fields (id, kind, timestamp, predecessorDigest).

**Acceptance Criteria**:
- Criterion 4.1: All entry types defined
- Criterion 4.3: Schema validation for each entry kind
- Criterion 4.5: Predecessor digest field present after first entry
- Criterion 4.11: Entry-specific schema validation

**Property Tests**:
- Each entry kind has unique discriminator
- Common fields required on all entries
- First entry has no predecessor digest
- Non-first entries require predecessor digest (32-byte hex)
- Timestamps are valid ISO 8601 UTC

**Dependencies**: T1.1, T1.3

**Estimated Effort**: L (60-90 min)

---

### T1.5 — Define Task Marker types and Kiro Task Line Grammar

**Description**: Define the four Task Markers (`[ ]`, `[x]`, `[-]`, `[~]`) and the Kiro Task Line Grammar as a structured type with parser.

**Acceptance Criteria**:
- Criterion 10.1: Four markers defined
- Criterion 10.5: Invalid markers detectable
- Criterion 10.6: Task line grammar parses Kiro-accepted lines
- Criterion 10.7: Renderer produces Kiro-compliant lines

**Property Tests**:
- Marker roundtrip: parse(format(marker)) === marker
- Task line parser accepts all valid Kiro fixtures
- Task line parser rejects invalid markers
- Task identifiers extracted correctly from line
- Criterion reference trailers parsed correctly

**Dependencies**: T1.1

**Estimated Effort**: M (45-60 min)

---

### T1.6 — Define Finding and Diagnostic types

**Description**: Define Finding type (file, line, RuleIdentifier, message), CheckResult (PASS, FAIL, INCONCLUSIVE), NotApplicableReport, ExaminationSummary, and the Rule Identifier namespace (V001-V999).

**Acceptance Criteria**:
- Criterion 11.7: Finding includes file path, line, Rule Identifier, message
- Criterion 15.2: Findings orderable by file, line, Rule Identifier
- Criterion 19.1: Check Result enum defined
- Criterion 19.2: Examination Summary includes kind and count

**Property Tests**:
- Findings sorted by (file, line, rule) are deterministic
- All Rule Identifiers are unique strings
- Check Result exhaustively covers {PASS, FAIL, INCONCLUSIVE}
- Examination Summary counts are non-negative integers

**Dependencies**: T1.1

**Estimated Effort**: M (45-60 min)

---

### T1.7 — Define Approval Policy and Approval Signal types

**Description**: Define ApprovalPolicy type (approvers per artifact + risk class), ApprovalSignal (identity + commit signature), ApprovalRecord (approving identity, artifact, version, checksum, stage, decision, timestamp, signal reference), and ValidApproval/InvalidatedApproval discriminations.

**Acceptance Criteria**:
- Criterion 7.1: Approval Record and Signal types
- Criterion 7.11: N approvals from N distinct approvers typeable
- Criterion 7.12: Approval Record field set defined
- Criterion 8.1: Bound to one Artifact Version and Checksum

**Property Tests**:
- Approval Policy has non-empty approvers list per artifact
- Risk class enumeration complete
- Approval Signal identity is non-empty string
- Approval Record timestamp is valid UTC

**Dependencies**: T1.1, T1.3

**Estimated Effort**: M (45-60 min)

---

### T1.8 — Define Spec Directory contract and Machine Folder types

**Description**: Define the permitted entries in a Spec Directory (requirements.md, design.md, tasks.md, .sdlc/), the Machine Folder name constant, and types for Spec Directory validation.

**Acceptance Criteria**:
- Criterion 23.1: Permitted entries enumerated
- Criterion 23.2: Extra entries detectable
- Criterion 23.3: Ledger path inside Machine Folder
- Criterion 23.5: Machine Folder files validated against Schema

**Property Tests**:
- Machine Folder name is exactly `.sdlc/`
- Permitted entries are unique
- Any other entry name triggers finding
- Machine Folder path construction is correct

**Dependencies**: T1.1, T1.4

**Estimated Effort**: S (30-45 min)

---

### T1.9 — Generate JSON Schemas from Zod schemas

**Description**: Generate and publish JSON Schema definitions for all protocol types, ensuring schemas match TypeScript types exactly.

**Acceptance Criteria**:
- Criterion 11.17: Schemas published with package
- Criterion 23.5: Machine Folder files validated against published schema
- Schema files emitted to `schemas/` directory

**Property Tests**:
- Generated schemas parse as valid JSON Schema
- Sample valid data validates against schema
- Sample invalid data fails schema validation
- TypeScript and schema are in sync (use ts-json-schema-generator)

**Dependencies**: T1.3, T1.4, T1.6, T1.7

**Estimated Effort**: M (45-60 min)

---

### T1.10 — Setup @vellum/testing package with fixture builder

**Description**: Create the `@vellum/testing` package structure with fixture-repo builder (in-memory git repo creation), test utilities, and property test helpers.

**Acceptance Criteria**:
- Fixture builder creates in-memory git repository
- Operations: init, commit, branch, checkout, write file, delete file
- Deterministic fixture creation (same seed → same repo)
- Integration with vitest

**Property Tests**:
- Generated repos are valid git repositories
- Commit SHAs match expected values for given seed
- File content roundtrips through write/read

**Dependencies**: None (can run in parallel with T1.1)

**Estimated Effort**: L (60-90 min)

---

### T1.11 — Define Neutral Frontmatter Schema for agents and rules

**Description**: Define the neutral frontmatter schema for agent and rule sources (used by Projector). Must be assistant-agnostic with provenance markers.

**Acceptance Criteria**:
- Criterion 13.4: Provenance Marker defined
- Criterion 13.13: Neutral Frontmatter Schema validation
- Supports: skills, agents, templates, rules, hooks

**Property Tests**:
- Valid neutral frontmatter passes
- Missing required fields fail
- Unknown fields fail (strict mode)
- Provenance marker is preserved

**Dependencies**: T1.1

**Estimated Effort**: M (45-60 min)

---

### T1.12 — Define Exit Status Convention

**Description**: Define the Exit Status Convention as a documented enum (0 = success, 1 = failure, 2 = could not evaluate/unknown command), with helper functions for CLI exit handling.

**Acceptance Criteria**:
- Criterion 3.6: Exit Status Convention documented
- Criterion 15.3: Exit statuses 0, 1, 2 defined
- Criterion 19.8: Status 2 covers INCONCLUSIVE

**Property Tests**:
- Exit status values are exactly {0, 1, 2}
- Helper functions return correct status for each case

**Dependencies**: None

**Estimated Effort**: S (20-30 min)

---

### T1.13 — Define Legacy Spec and Legacy Stage types

**Description**: Define types for Legacy Spec detection, Legacy Stage (empty, requirements, design, tasks, in-progress, verification, invalid), and the frontmatter absence that indicates legacy.

**Acceptance Criteria**:
- Criterion 5.14: Legacy Stage derived from artifacts present
- Criterion 6.11: Legacy Spec labeled correctly
- Criterion 6.12: Legacy Stage 'invalid' detectable

**Property Tests**:
- Legacy Stage correctly derived from artifact presence
- 'invalid' stage for malformed legacy spec
- Legacy detection is deterministic

**Dependencies**: T1.2, T1.3

**Estimated Effort**: M (30-45 min)

---

## Wave 2: Engine Core

Tasks implement the pure-logic engine that enforces the specification lifecycle. No I/O in this wave.

### T2.1 — Implement Lifecycle State Machine

**Description**: Implement the state transition engine with precondition checking, state computation, and invalid state handling. Pure function: `(state, artifacts, approvals, ...context) => Result<NewState, Error>`.

**Acceptance Criteria**:
- Criterion 5.3: Transition when preconditions hold
- Criterion 5.4: Reject when preconditions fail, naming unmet preconditions
- Criterion 5.5: Reject unknown transitions
- Criterion 5.6: Reject transitions in Terminal State
- Criterion 5.10: Effective state computed when preconditions fail
- Criterion 5.11: INVALID state for unrecognized recorded state
- Criterion 5.12: INVALID state for missing artifact

**Property Tests**:
- All Table 5.A transitions succeed with valid preconditions
- Invalid preconditions produce named rejection
- Terminal states reject all transitions
- Effective state is latest whose preconditions hold
- State machine is idempotent (same input → same output)

**Dependencies**: T1.2, T1.3

**Estimated Effort**: L (90 min)

---

### T2.2 — Implement Protocol Validator (frontmatter + markdown protocol)

**Description**: Implement the Protocol Validator that validates frontmatter against schemas, validates artifact content against the Markdown Protocol, and reports Findings. Pure function consuming string content.

**Acceptance Criteria**:
- Criterion 11.1: Frontmatter validation against Schema
- Criterion 11.2: Artifact validation against Markdown Protocol
- Criterion 11.3: Task-line syntax, numbering, optional-task marking
- Criterion 11.4: Criterion reference validation
- Criterion 11.5: Checkpoint and Execution Log row validation
- Criterion 11.6: Wave graph validation
- Criterion 11.7: Finding format (file, line, rule, message)
- Criterion 11.8: Continue after unparseable line
- Criterion 11.9: Artifact type filtering

**Property Tests**:
- Valid artifacts produce zero findings
- Invalid artifacts produce at least one finding per violation
- Findings are sorted by (file, line, rule)
- Parser recovers from unparseable line
- Empty artifact handled gracefully

**Dependencies**: T1.3, T1.5, T1.6

**Estimated Effort**: L (90 min)

---

### T2.3 — Implement Task Graph Validator

**Description**: Implement task graph validation: dependency cycles, missing dependencies, orphan tasks, wave ordering. Returns Findings for each violation.

**Acceptance Criteria**:
- Row `PLAN_IN_REVIEW → PLAN_APPROVED` of Table 5.A: Task graph passes validation
- Waves respect task dependencies (no backward edges across waves)
- Criterion 11.6: Named task in wave graph must exist

**Property Tests**:
- Valid task graphs pass
- Cyclic dependencies detected
- Missing dependencies detected
- Wave ordering violations detected
- Empty task graph handled

**Dependencies**: T1.5

**Estimated Effort**: M (60 min)

---

### T2.4 — Implement Approval Verifier

**Description**: Implement the Approval Verifier that checks validity of approval records based on policy, approval signals, signatures, and human-only constraints.

**Acceptance Criteria**:
- Criterion 7.1: Valid Approval when signal from authorised identity
- Criterion 7.2: Reject git author/committer name/email as identity evidence
- Criterion 7.3: Require commit signature verification
- Criterion 7.8: Reject approval from Assistant Session
- Criterion 7.9: Determinable from record, signal, policy alone
- Criterion 7.10: Evaluate against target branch policy
- Criterion 8.1: Bind to one Artifact Version and Checksum
- Criterion 8.2: Report Invalidated Approval on checksum mismatch

**Property Tests**:
- Valid approval with proper signature → counted
- Approval with only author name → rejected
- Unsigned commit signal → rejected
- Assistant session origin → rejected
- Policy mismatch → rejected
- Checksum mismatch → invalidated

**Dependencies**: T1.7, T2.1

**Estimated Effort**: L (90 min)

---

### T2.5 — Implement Approval Invalidation cascade

**Description**: Implement the cascade logic where invalidating requirements approvals also invalidates design and plan approvals, and invalidating design approvals invalidates plan approvals.

**Acceptance Criteria**:
- Criterion 8.6: Requirements invalidation cascades to design and plan
- Criterion 8.7: Design invalidation cascades to plan
- Criterion 8.3: Effective state becomes in-review for that artifact's stage

**Property Tests**:
- Requirements invalidation affects exactly 3 approvals (r, d, t)
- Design invalidation affects exactly 2 approvals (d, t)
- Plan invalidation affects exactly 1 approval (t)
- Invalidation is transitive

**Dependencies**: T2.4, T2.1

**Estimated Effort**: M (45 min)

---

### T2.6 — Implement Ledger integrity checker

**Description**: Implement the pure logic for validating ledger integrity: predecessor digest chaining, fork detection, missing entry detection, order validation, and schema validation per entry.

**Acceptance Criteria**:
- Criterion 4.5: Predecessor digest after first entry
- Criterion 4.7: Content digest mismatch detection
- Criterion 4.8: Missing entry detection (predecessor with no match)
- Criterion 4.9: Order mismatch detection
- Criterion 4.10: Fork detection (duplicate predecessor digest)
- Criterion 4.11: Entry schema validation

**Property Tests**:
- Valid ledger passes (correct chain)
- Broken chain detected (wrong predecessor digest)
- Removed entry detected
- Reordered entries detected
- Fork detected
- Schema-invalid entry detected
- Empty ledger handled

**Dependencies**: T1.4, T1.6

**Estimated Effort**: L (90 min)

---

### T2.7 — Implement Status Reporter logic

**Description**: Implement the pure logic for computing spec status: effective state, recorded state, artifact versions, approval state, decision state, validation state, execution state, verification state.

**Acceptance Criteria**:
- Criterion 6.1: Combined state report
- Criterion 6.2: JSON output conforms to status Schema
- Criterion 6.5: Next permitted transition and unmet preconditions
- Criterion 6.10: Mismatch between recorded and effective reported
- Criterion 11.10: Equal parsing for Validator, Status, Verifier

**Property Tests**:
- Status computed deterministically from input
- All state components present in output
- JSON serialization roundtrips
- Legacy specs labeled correctly

**Dependencies**: T2.1, T2.2, T2.4, T2.6

**Estimated Effort**: L (90 min)

---

### T2.8 — Implement Strict Verifier

**Description**: Implement the Strict Verifier that checks: every criterion covered by property/test, every property cited by task, every required task has evidence, every required approval is valid, ledger integrity, and computes the final PASS/FAIL result.

**Acceptance Criteria**:
- Criterion 12.1: Counts reported and PASS/FAIL
- Criterion 12.2: Uncovered criterion detection
- Criterion 12.3: Uncited property detection
- Criterion 12.4: Required task evidence check
- Criterion 12.5: Valid Approval check
- Criterion 12.6: Ledger integrity check
- Criterion 12.7: FAIL → exit status 1
- Criterion 12.8: No file modification
- Criterion 12.9: Verify all IN_PROGRESS+ specs when no argument

**Property Tests**:
- Complete verification passes
- Each failure type detected individually
- Multiple failures reported together
- Counts are accurate

**Dependencies**: T2.2, T2.4, T2.6

**Estimated Effort**: L (90 min)

---

### T2.9 — Implement Pre-Execution Checker

**Description**: Implement the Pre-Execution Checker that validates: artifacts exist, approvals valid, checksums match approvals, references resolve. Records Task Binding before task marker change.

**Acceptance Criteria**:
- Criterion 18.1: Three artifacts exist
- Criterion 18.2: Valid approvals present
- Criterion 18.3: Checksums match approvals
- Criterion 18.4: References resolve
- Criterion 18.5: Task Binding recorded before marker change
- Criterion 18.6: Refusal on failure
- Criterion 18.7: Marker unchanged on failure
- Criterion 18.8: Legacy Spec task start refused

**Property Tests**:
- Valid preconditions → pass
- Missing artifact → fail + named artifact
- Invalid approval → fail + named approval
- Changed checksum → fail + named checksum
- Unresolvable reference → fail + named reference

**Dependencies**: T2.1, T2.4, T1.3

**Estimated Effort**: L (90 min)

---

### T2.10 — Implement Evidence validation logic

**Description**: Implement pure logic for validating evidence entries: exit status 0, commit exists, uncommitted check, timestamps valid, secret pattern check (text matching, not execution).

**Acceptance Criteria**:
- Criterion 9.2: Evidence entry field validation
- Criterion 9.3: No stdout/stderr in evidence
- Criterion 9.4: Secret pattern match refusal
- Criterion 9.6: Uncommitted check
- Criterion 9.8: Non-zero exit status handling
- Criterion 9.9: Commit existence check
- Criterion 18.10: Checksum mismatch at completion

**Property Tests**:
- Valid evidence passes
- Non-zero exit status detected
- Secret patterns in command text detected
- Future timestamps rejected
- Invalid commit SHA rejected

**Dependencies**: T1.4, T2.9

**Estimated Effort**: M (60 min)

---

### T2.11 — Implement Check Mode logic (CI-safe verification)

**Description**: Implement the Check Mode logic that verifies specs without writing files, returns exit status 0/1 based on validation, and reports all findings.

**Acceptance Criteria**:
- Criterion 6.6: Check Mode leaves files unmodified
- Criterion 6.7: Exit 0 for clean spec
- Criterion 6.8: Exit 1 for INVALID state
- Criterion 6.9: Exit 1 for ledger integrity failure
- Criterion 6.10: Exit 1 for recorded/effective mismatch
- Criterion 12.8: Strict Verifier leaves files unmodified

**Property Tests**:
- Check mode is side-effect free
- Exit status follows convention
- All violations reported
- Deterministic output

**Dependencies**: T2.7, T2.8

**Estimated Effort**: M (45 min)

---

### T2.12 — Implement Coverage validation

**Description**: Implement coverage validation: every criterion referenced by a task, every property cited by a task, reporting uncovered criteria and uncited properties. Used in PLAN_APPROVED transition.

**Acceptance Criteria**:
- Criterion 20.1: Uncovered criterion blocks plan approval
- Criterion 20.2: Uncited property blocks plan approval
- Criterion 20.6: Examination summary reported
- Criterion 20.7: INCONCLUSIVE for zero criteria
- Criterion 20.8: Optional-task coverage handling

**Property Tests**:
- Complete coverage passes
- Each uncovered criterion detected
- Each uncited property detected
- Optional-only coverage counted correctly

**Dependencies**: T2.2

**Estimated Effort**: M (60 min)

---

### T2.13 — Implement Determinism verification logic

**Description**: Implement the logic that ensures all findings are ordered by (file, line, rule), output is byte-identical for same input, and check results are consistent.

**Acceptance Criteria**:
- Criterion 15.1: Byte-identical output for same commit
- Criterion 15.2: Findings ordered by file, line, rule identifier

**Property Tests**:
- Two runs with same input produce identical output
- Finding order is deterministic
- Hash of output is stable

**Dependencies**: T1.6, T2.7

**Estimated Effort**: S (30 min)

---

### T2.14 — Implement Protocol Validator for Spec Folder contract

**Description**: Implement the protocol validator check for extra files in Spec Directory beyond the permitted entries and for Programme Spec tasks.md presence.

**Acceptance Criteria**:
- Criterion 23.1: Permitted entries validated
- Criterion 23.2: Extra files in Spec Directory reported
- Criterion 23.5: Machine Folder files validated against schema
- Criterion 23.6: Programme Spec with tasks.md reported
- Criterion 23.7: Programme Spec without requirements.md reported

**Property Tests**:
- Valid spec directory passes
- Each extra file type detected
- Programme spec violations detected
- Machine Folder extra files detected

**Dependencies**: T1.8, T2.2

**Estimated Effort**: M (45 min)

---

## Wave 3: Storage + Renderers

Tasks implement storage adapters (fs, git) and deterministic renderers for output.

### T3.1 — Implement File System adapter

**Description**: Implement atomic file operations: write with temp file + rename, read, section replace (in-place update of a line range), and file existence check.

**Acceptance Criteria**:
- Criterion 4.6: Ledger leaves existing entries byte-identical
- Criterion 4.12: Ledger modification only via Programmatic Interface
- Atomic writes (no partial writes on crash)

**Property Tests**:
- Write + read roundtrips
- Section replace preserves rest of file
- Concurrent write safety (mutex/lock)
- Temp file cleanup on failure

**Dependencies**: T1.4

**Estimated Effort**: M (60 min)

---

### T3.2 — Implement Ledger persistence

**Description**: Implement Ledger file read/write: parse entries, append entry, compute predecessor digest, write atomically, detect integrity issues on read.

**Acceptance Criteria**:
- Criterion 4.1: Record approvals, decisions, evidence, etc. in Ledger
- Criterion 4.3: Read/write only in Consumer Repository files
- Criterion 4.4: Write through Programmatic Interface
- Criterion 4.5: Append with predecessor digest
- Criterion 4.6: Existing entries byte-identical after append
- Criterion 4.12: Integrity failure leaves file unmodified

**Property Tests**:
- Append produces valid chain
- Predecessor digest computed correctly (SHA-256)
- Read after write succeeds
- Broken ledger detected on read
- Append is atomic

**Dependencies**: T3.1, T1.4, T2.6

**Estimated Effort**: L (90 min)

---

### T3.3 — Implement Git CLI adapter

**Description**: Implement thin adapter over `git` CLI: log, show, rev-parse, status, branch, commit (with signature), verify-commit, diff. No repository mutation except via Engine.

**Acceptance Criteria**:
- Criterion 4.2: Git log entry parsing
- Criterion 7.3: Commit signature verification
- Criterion 9.6: Working tree diff detection
- Criterion 9.9: Commit object existence check

**Property Tests**:
- Git operations succeed on valid repo
- Invalid commands handled gracefully
- Output parsing is correct
- Signature verification works

**Dependencies**: None (can start in Wave 2 but needed now)

**Estimated Effort**: L (90 min)

---

### T3.4 — Implement Spec Directory scanner

**Description**: Implement scanning of `.agents/specs/` for spec directories, detecting legacy vs. non-legacy specs, and reading artifacts.

**Acceptance Criteria**:
- Criterion 5.14: Legacy Spec detection based on frontmatter absence
- Criterion 23.1: Correct identification of spec directories
- Criterion 14.5: Adoption detection

**Property Tests**:
- Empty specs directory handled
- Multiple specs discovered
- Legacy vs. non-legacy correctly identified
- Spec ID extraction correct

**Dependencies**: T1.13, T1.3, T3.1

**Estimated Effort**: M (60 min)

---

### T3.5 — Implement Artifact reader/writer

**Description**: Implement reading and writing artifacts with frontmatter preservation, section updates, marker updates, and checksum computation.

**Acceptance Criteria**:
- Criterion 4.2: Artifact Version and Status in frontmatter
- Criterion 8.4: Only frontmatter change keeps approvals valid
- Criterion 8.5: Body change increments version on next write
- Criterion 10.2: Task Marker write leaves rest of line byte-identical

**Property Tests**:
- Frontmatter extracted correctly
- Body extracted correctly
- Checksum matches git blob hash
- Marker write preserves line content
- Section replace preserves rest

**Dependencies**: T3.1, T3.4, T1.3, T1.5

**Estimated Effort**: L (90 min)

---

### T3.6 — Implement Disposable Cache adapter

**Description**: Implement a disposable, content-addressed cache that stores computation results outside version control. Entries keyed by (content hash, version). Transparent to engine.

**Acceptance Criteria**:
- Criterion 16.9: Cache presence yields identical output to absence
- Criterion 16.10: Stale entries discarded
- Criterion 16.11: Unreadable entries discarded
- Criterion 16.12: Cache outside version control

**Property Tests**:
- Cache hit produces same result as compute
- Cache miss triggers compute
- Invalid version cache ignored
- Corrupt cache entry ignored
- Cache cleared on request

**Dependencies**: T3.1

**Estimated Effort**: M (60 min)

---

### T3.7 — Implement Forge API adapter (GitLab + GitHub)

**Description**: Implement minimal adapter for GitLab and GitHub APIs: merge request approval lookup, commit signature lookup, user identity verification. Used by Approval Verifier.

**Acceptance Criteria**:
- Criterion 7.3: Signature verification via API
- Criterion 7.9: Decision from record, signal, policy alone (API provides signal data)
- Criterion 7.10: Target branch policy evaluation

**Property Tests**:
- API responses parsed correctly
- Error handling for API failures
- Rate limiting handled
- Missing data handled gracefully

**Dependencies**: None

**Estimated Effort**: L (90 min)

---

### T3.8 — Implement Markdown renderer

**Description**: Render task markers, sections, rules blocks, and frontmatter deterministically. All output is pure given input.

**Acceptance Criteria**:
- Criterion 10.7: Task lines match Kiro Task Line Grammar
- Criterion 15.1: Deterministic output

**Property Tests**:
- Render is deterministic
- Output parses back to same structure
- Edge cases handled (empty, special chars)

**Dependencies**: T1.5

**Estimated Effort**: M (45 min)

---

### T3.9 — Implement JSON Report renderer

**Description**: Render machine-readable JSON output for status, lint, verify commands. Conforms to published schemas.

**Acceptance Criteria**:
- Criterion 3.5: JSON output to stdout
- Criterion 6.2: Status JSON conforms to schema
- Criterion 19.2: Examination summary in JSON

**Property Tests**:
- JSON is valid
- JSON conforms to schema
- Roundtrip: parse(render(x)) ≈ x

**Dependencies**: T1.9

**Estimated Effort**: M (45 min)

---

### T3.10 — Implement Assistant projection renderer

**Description**: Render agent and rule files in each assistant's frontmatter dialect (Kiro, Claude, OpenCode) with provenance markers.

**Acceptance Criteria**:
- Criterion 13.4: Generated files carry Provenance Marker
- Criterion 13.6: Per-entry relative links
- Criterion 13.7: Remove orphaned entries

**Property Tests**:
- Provenance marker preserved
- Frontmatter valid for target assistant
- Links resolve correctly
- Orphan removal works

**Dependencies**: T1.11

**Estimated Effort**: L (90 min)

---

### T3.11 — Implement Human-readable report renderer

**Description**: Render human-readable output for CLI: formatted status, lint findings, verification results, error messages.

**Acceptance Criteria**:
- Criterion 19.7: Not-Applicable Report labeled distinctly
- Criterion 15.2: Findings ordered by file, line, rule

**Property Tests**:
- Output is readable
- Alignment and formatting correct
- ANSI colors handled

**Dependencies**: T1.6

**Estimated Effort**: M (45 min)

---

## Wave 4: CLI + MCP

Tasks implement the command-line interface and MCP server.

### T4.1 — Implement CLI framework and command router

**Description**: Implement the CLI entry point, command routing, argument parsing, help generation, and version display. Only list implemented commands.

**Acceptance Criteria**:
- Criterion 3.1: Only implemented commands listed in help
- Criterion 3.4: Unknown command → exit 2 + list commands
- Criterion 3.5: Support --json for machine-readable output
- Criterion 3.6: Exit Status Convention enforced
- Criterion 15.3: Exit statuses 0, 1, 2

**Property Tests**:
- Help output includes all implemented commands
- Unknown command handled
- Exit status follows convention
- Arguments parsed correctly

**Dependencies**: T1.12

**Estimated Effort**: M (60 min)

---

### T4.2 — Implement `vellum lint` command

**Description**: Implement the lint command that runs Protocol Validator over spec artifacts and reports findings.

**Acceptance Criteria**:
- Criterion 11.1-11.9: Protocol Validator invoked
- Criterion 11.9: Artifact type filtering (--type option)

**Property Tests**:
- Lint finds violations in invalid fixtures
- Lint passes for valid fixtures
- Output sorted by (file, line, rule)
- JSON output valid

**Dependencies**: T4.1, T2.2, T3.9

**Estimated Effort**: M (60 min)

---

### T4.3 — Implement `vellum status` command

**Description**: Implement the status command that reports combined state for one or all specs.

**Acceptance Criteria**:
- Criterion 6.1: Combined state reported
- Criterion 6.2: JSON output with --json
- Criterion 6.3: Spec filtering by number/slug
- Criterion 6.4: Error on ambiguous/no match
- Criterion 6.5: Next permitted transition shown

**Property Tests**:
- Status output for each valid spec
- Error handling for invalid spec ID
- JSON schema conformance

**Dependencies**: T4.1, T2.7, T3.9

**Estimated Effort**: M (60 min)

---

### T4.4 — Implement `vellum check` command (CI-safe check mode)

**Description**: Implement the check command for CI: verifies all specs without writing files, exits with correct status.

**Acceptance Criteria**:
- Criterion 6.6-6.10: Check Mode behavior
- Criterion 6.7: Exit 0 for clean
- Criterion 6.8-6.10: Exit 1 for violations
- Criterion 12.8: Strict verification incorporated

**Property Tests**:
- Check is side-effect free
- Exit status follows convention
- JSON and human output work

**Dependencies**: T4.1, T2.11, T3.9

**Estimated Effort**: M (60 min)

---

### T4.5 — Implement `vellum verify` command

**Description**: Implement the verify command that runs Strict Verifier for one or all specs.

**Acceptance Criteria**:
- Criterion 12.1-12.9: Strict Verifier invoked
- Criterion 12.9: All IN_PROGRESS+ verified when no argument

**Property Tests**:
- Verification detects all failures
- Counts reported correctly
- Exit status follows convention

**Dependencies**: T4.1, T2.8, T3.9

**Estimated Effort**: M (60 min)

---

### T4.6 — Implement `vellum approve` command

**Description**: Implement the approve command with human-only enforcement. Must refuse in non-interactive sessions.

**Acceptance Criteria**:
- Criterion 7.5: Refuse outside Interactive Human Session
- Criterion 7.6: Refuse from Assistant Session
- Criterion 7.12: Write Approval Record
- Criterion 7.13: Support rejection with rationale

**Property Tests**:
- Approval succeeds in interactive session
- Approval refused in non-interactive
- Approval refused from assistant
- Ledger entry written

**Dependencies**: T4.1, T2.4, T3.2, T3.5

**Estimated Effort**: M (60 min)

---

### T4.7 — Implement `vellum doctor` command

**Description**: Implement the doctor command that runs diagnostics for Table 17.A categories.

**Acceptance Criteria**:
- Criterion 17.1: Table 17.A categories checked
- Criterion 17.2-17.12: Each diagnostic
- Criterion 17.3, 17.10, 17.12: Not-Applicable Reports

**Property Tests**:
- Each diagnostic fires on negative fixture
- Each diagnostic passes on near-miss
- Not-applicable reports correct

**Dependencies**: T4.1, T3.6

**Estimated Effort**: L (90 min)

---

### T4.8 — Implement `vellum adopt` command

**Description**: Implement the adopt command that brings a Legacy Spec under Vellum management.

**Acceptance Criteria**:
- Criterion 14.1: Add frontmatter, leave body byte-identical
- Criterion 14.2: Set state to in-review of latest artifact
- Criterion 14.3: Zero approval records
- Criterion 14.4: Only via adopt command
- Criterion 14.5: Refuse invalid legacy spec

**Property Tests**:
- Adoption produces correct frontmatter
- Original content preserved
- Invalid legacy spec rejected

**Dependencies**: T4.1, T2.1, T3.5

**Estimated Effort**: M (60 min)

---

### T4.9 — Implement `vellum task start` command

**Description**: Implement the task start command that runs Pre-Execution Check and records Task Binding.

**Acceptance Criteria**:
- Criterion 18.1-18.8: Pre-Execution Check
- Criterion 18.5: Task Binding recorded
- Criterion 18.6-18.7: Refusal handling

**Property Tests**:
- Valid task starts
- Invalid preconditions refuse
- Task Binding persisted

**Dependencies**: T4.1, T2.9, T3.2, T3.5

**Estimated Effort**: M (60 min)

---

### T4.10 — Implement `vellum task complete` command

**Description**: Implement the task complete command that records evidence and updates marker.

**Acceptance Criteria**:
- Criterion 9.1-9.8: Evidence recording
- Criterion 18.10-18.11: Checksum mismatch handling
- Criterion 18.12: Refuse without Task Binding

**Property Tests**:
- Evidence recorded correctly
- Non-zero exit status handled
- Checksum mismatch returns task to `[ ]`

**Dependencies**: T4.1, T2.10, T3.2, T3.5, T3.3

**Estimated Effort**: L (90 min)

---

### T4.11 — Implement `vellum sync` command

**Description**: Implement the sync command that projects .agents/ to assistant directories.

**Acceptance Criteria**:
- Criterion 13.1-13.13: All projection rules
- Criterion 13.5: Target filtering
- Criterion 13.8: Check mode

**Property Tests**:
- Sync produces correct output
- Check mode detects drift
- Orphan removal works

**Dependencies**: T4.1, T3.10

**Estimated Effort**: L (90 min)

---

## Wave 5: Integration + Testing

Tasks integrate packages, create fixtures, and ensure conformance.

### T5.1 — Create minimal valid spec fixture

**Description**: Create `fixtures/minimal/` — smallest valid spec repository with one empty spec.

**Acceptance Criteria**:
- Valid per Protocol Validator
- All lint/check/verify pass
- Usable as test baseline

**Dependencies**: T2.2, T2.8

**Estimated Effort**: S (30 min)

---

### T5.2 — Create complete lifecycle fixture

**Description**: Create `fixtures/complete/` — full spec lifecycle example from requirements to verified.

**Acceptance Criteria**:
- Demonstrates all Slice 1 states
- All approval types represented
- Evidence entries present

**Dependencies**: T5.1, T2.1

**Estimated Effort**: M (60 min)

---

### T5.3 — Create invalid spec fixtures for diagnostics

**Description**: Create `fixtures/invalid/` — invalid spec cases for testing each diagnostic code.

**Acceptance Criteria**:
- One fixture per Rule Identifier
- Each triggers specific diagnostic
- Covers all V001-V099 for Slice 1

**Dependencies**: T5.1, T1.6

**Estimated Effort**: L (90 min)

---

### T5.4 — Create negative fixtures for conformance tests

**Description**: Create `conformance/diagnostics/V*/negative/` for each Rule Identifier. Must fail with that diagnostic.

**Acceptance Criteria**:
- Criterion 21.2: One negative fixture per Rule Identifier
- Criterion 21.6: Negative fixture triggers its Rule Identifier

**Dependencies**: T5.3, T1.6

**Estimated Effort**: L (90 min)

---

### T5.5 — Create near-miss fixtures for conformance tests

**Description**: Create `conformance/diagnostics/V*/near-miss/` for each Rule Identifier. Must pass (edge case).

**Acceptance Criteria**:
- Criterion 21.3: One near-miss fixture per Rule Identifier
- Criterion 21.7: Near-miss does NOT trigger its Rule Identifier

**Dependencies**: T5.3, T1.6

**Estimated Effort**: L (90 min)

---

### T5.6 — Implement Parity Fixtures for basalt comparison

**Description**: Create `fixtures/basalt-parity/` at the Parity Commit with expected outputs from Legacy Tooling.

**Acceptance Criteria**:
- Criterion 22.1: Parity Commit recorded
- Criterion 22.2-22.4: Parity comparison works
- Criterion 22.8-22.9: Parity verification

**Dependencies**: T1.10, T2.2

**Estimated Effort**: L (90 min)

---

### T5.7 — Implement integration tests across packages

**Description**: Add end-to-end integration tests: CLI → Engine → Storage → Renderers → Output.

**Acceptance Criteria**:
- All Slice 1 commands tested
- Full lifecycle tested
- Error paths covered
- Coverage threshold met

**Dependencies**: T4.1-T4.11

**Estimated Effort**: L (90 min)

---

## Wave 6: Distribution + Documentation

Tasks prepare the package for distribution and documentation.

### T6.1 — Setup mutation testing with Stryker

**Description**: Configure Stryker mutation testing for engine and protocol packages. Define mutation threshold.

**Acceptance Criteria**:
- Criterion 21.8-21.11: Mutation testing runs
- Mutation threshold defined (≥85%)
- Surviving mutations reported

**Dependencies**: T5.1-T5.7

**Estimated Effort**: M (60 min)

---

### T6.2 — Implement Release Pipeline conformance gate

**Description**: Create CI pipeline that runs conformance tests and mutation testing as release gate.

**Acceptance Criteria**:
- Criterion 21.4-21.7: Conformance gate
- Criterion 21.9: Mutation threshold check
- Criterion 22.5: Legacy tooling rule identifier check
- Release blocked on failure

**Dependencies**: T6.1

**Estimated Effort**: M (60 min)

---

### T6.3 — Wire packages into @figentra/vellum bundle

**Description**: Configure @figentra/vellum to re-export CLI and MCP from dependency packages. Verify single-package distribution.

**Acceptance Criteria**:
- Criterion 1.1: One pinned version
- Criterion 1.2: Lockfile records version + integrity
- Criterion 3.3: CLI and programmatic API produce equal results
- `vellum --version` shows single version

**Dependencies**: T4.1-T4.11

**Estimated Effort**: M (45 min)

---

### T6.4 — Document CLI commands and exit statuses

**Description**: Write user documentation for each CLI command: usage, options, exit statuses, examples.

**Acceptance Criteria**:
- Criterion 3.6: Exit Status Convention documented
- Each command documented
- Examples for common workflows
- JSON output documented

**Dependencies**: T4.1-T4.11

**Estimated Effort**: M (60 min)

---

## Summary

| Wave | Tasks | Total Effort | Parallel Window |
|------|-------|--------------|-----------------|
| 1: Protocol + Setup | T1.1-T1.13 | 8-10 hours | 13 tasks, 4 parallel tracks |
| 2: Engine Core | T2.1-T2.14 | 14-16 hours | 14 tasks, 2 parallel tracks |
| 3: Storage + Renderers | T3.1-T3.11 | 11-13 hours | 11 tasks, 2 parallel tracks |
| 4: CLI + MCP | T4.1-T4.11 | 11-13 hours | 11 tasks, 2 parallel tracks |
| 5: Integration + Testing | T5.1-T5.7 | 9-11 hours | 7 tasks, 2 parallel tracks |
| 6: Distribution + Docs | T6.1-T6.4 | 4-5 hours | 4 tasks, sequential |

**Total estimated effort**: 57-68 hours (8-9 developer-days)

**Completion criteria for Slice 1**:
- [ ] All tasks in Waves 1-6 complete
- [ ] All property tests passing
- [ ] All conformance tests passing (negative + near-miss per Rule Identifier)
- [ ] Mutation score ≥85%
- [ ] Lint + typecheck clean
- [ ] Coverage ≥90% on engine package
- [ ] Parity tests pass against basalt at Parity Commit
- [ ] CLI commands functional and documented
- [ ] Integration tests pass for Pilot Spec adoption scenario
- [ ] Success criteria 1-8 from requirements.md verified on Pilot Spec

---

## Task Completion Checklist

Each task is complete when:

1. ✅ All acceptance criteria pass
2. ✅ Property tests pass (where applicable)
3. ✅ Mutation score threshold met (for engine tasks)
4. ✅ Lint clean
5. ✅ Typecheck clean
6. ✅ Coverage threshold met (≥80% per file)
7. ✅ No regressions in dependent packages