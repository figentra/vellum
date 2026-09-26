# Requirements Document

## Intake

**Problem:** The rules that decide whether a spec may advance exist only as prose and as three hand-kept copies of two scripts, so no machine enforces them (programme spec 001, Intake). This child holds the part everything else rests on. Without it nothing records state or approvals, and nothing binds evidence to a task. A spec's stage is inferred from which files exist, an approval cannot be checked in CI, a ticked task proves nothing ran, and CI runs a different copy of the checks from the one the skills run.

**Risk class:** critical. This slice decides **permissions**: who may approve, and that an assistant never may (Requirements 7 and 8). It handles **credentials**: CI obtains the Platform without a stored secret, and evidence sits beside command lines that can carry a token (Requirements 1 and 9). And it fixes an **externally visible contract**: the Markdown Protocol, the Task Markers Kiro parses, the exit statuses, the spec folder contract (Requirement 23) and a Ledger format that is permanent once the first approval is written into it (Requirement 4).

**Lifecycle path:** full spec, both review gates, no shortcut. This is **Slice 1, the enforceable core**, of Programme Spec `001-vellum-platform`. It ships first. It depends on no other child, and 003, 004 and 005 each depend on it. It is proven end to end on the Pilot Spec before any later slice is built. It became a Child Spec on 2026-09-25, when the user applied Requirement 003:13 to spec 001 (programme spec 001, Intake).

## Discovery

The programme's Discovery is canonical and is not repeated here: `.agents/specs/001-vellum-platform/requirements.md`, section `## Discovery`, including its Amendment 1 discovery. Everything below is only what this slice adds. It was read in this session, on 2026-09-25.

**Current behaviour (added for this slice):**

- **The spec folder contract is decided but not enforced, and it leaves no room for a Ledger.** [ADR-0040](../../../apps/docs/src/adr/0040-spec-folder-structure.md) has status `Proposed`. It says each spec folder "MUST contain exactly three files", `requirements.md`, `design.md` and `tasks.md`. It prohibits notes, reports, backups and generated documentation. It assigns enforcement to `tools/scripts/validate-repository.mjs`, with a `SPEC_EXTRA_FILE` error. `SPEC_EXTRA_FILE` appears nowhere under `tools/`, `packages/` or `apps/docs/src/` except in ADR-0040 itself, so the check was never built.
- **A Ledger would be a fourth file.** The design hand-off for spec 001, as reported by the coordinator on 2026-09-25, found that the Ledger (Requirement 4) was going to be a fourth file in the Spec Directory. ADR-0040's "exactly three files" forbids that. Requirement 23 resolves the conflict with one hidden Machine Folder. That needs an amendment to ADR-0040.
- **The four children of this programme exist and are empty.** `node tools/spec/spec-status.mjs --json` reports `002-vellum-core` to `005-vellum-insight` at stage `empty`, and `001-vellum-platform` at stage `requirements`.

**Repository topology:** unchanged from the programme's Discovery. Slice 1 touches basalt's root `package.json` spec scripts, the `structure` job in `.gitlab-ci.yml`, `pnpm-workspace.yaml`, `tools/spec/`, `tools/scripts/agents-sync.mjs`, `.agents/templates/` and the Pilot Spec `.agents/specs/016-queue-capability/`. Requirement 23 adds the Machine Folder inside each Spec Directory.

**Dependencies:** unchanged from the programme's Discovery. This child depends on no other child spec.

**Ownership:** as in the programme's Discovery. In addition, `architecture-guardian` owns the ADR-0040 amendment that Requirement 23 needs, and can block on it. `docs-governance` owns ADR-0040's stale enforcement claim.

**Constraints:** the programme's Constraints apply. In addition, [ADR-0040](../../../apps/docs/src/adr/0040-spec-folder-structure.md) must be amended before Requirement 23 can hold, because it allows exactly three files. This spec records the need and does not write the amendment (programme spec 001, Out of scope).

**Sources (added for this slice):**

| Source                                                                                      | What it established                                                                                                                                                 |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.agents/specs/001-vellum-platform/requirements.md` at HEAD (`git show HEAD:…`), read in full | Every moved requirement's text, its Delivery slice line, and the programme's Discovery this child references                                                        |
| `apps/docs/src/adr/0040-spec-folder-structure.md`                                           | Status `Proposed`; "exactly three files"; the prohibited-file list; `SPEC_EXTRA_FILE` and `SPEC_MISSING_FILE` assigned to `validate-repository.mjs`                 |
| `grep -rln SPEC_EXTRA_FILE tools packages apps/docs/src`                                    | The only match is ADR-0040 itself, so the check was never built                                                                                                     |
| `ls tools/scripts/`                                                                         | `validate-repository.mjs` exists                                                                                                                                    |
| `node tools/spec/spec-status.mjs --json`                                                    | 002 to 005 are at stage `empty`; 001 is at stage `requirements`                                                                                                     |
| The coordinator's message of 2026-09-25 relaying the user's decision on the folder contract | Requirement 23's content, the ADR-0040 amendment it needs, and the design hand-off finding that the Ledger was going to be a fourth file (reported, not re-derived) |

## Introduction

This is the enforceable core of the SDLC Platform. It holds the part of the programme that every later slice builds on:

- one pinned, offline-capable installation, and one canonical implementation replacing basalt's three duplicated tools;
- the hash-chained Ledger and the lifecycle state machine;
- human-only approvals that CI can verify, each bound to an exact version;
- evidence the engine writes, and completion without evidence as its own state;
- protocol validation, strict verification, projection, and adopting a Legacy Spec.

From Amendment 1 it adds:

- the rule that the engine decides what it can compute from repository content alone;
- Doctor categories for recorded incidents;
- the Slice 1 half of the pre-execution check;
- the four check-integrity requirements.

It closes with the spec folder contract decided on 2026-09-25.

The folder contract matters because of the Ledger. The Ledger is what makes approvals and evidence checkable, and it has to live somewhere a reviewer sees as a diff. ADR-0040 allows three files and no more. So this child puts the Ledger in one hidden Machine Folder that only the engine writes and Kiro does not render. Any other file in a Spec Directory is reported by name. A spec too large to review is split into a Programme Spec with Child Specs, as 001 itself now is, and never into document parts.

Requirements 1 to 22 are 001's R1–R14, R36, R37, R38, the Slice 1 criteria of R46, and R49–R52, renumbered in their original order. Criterion text is unchanged except where it references another requirement. The programme's Requirement map resolves each old reference.

**Users:** each role is as defined in the programme's Introduction. This slice serves the **Spec Author**, the **Approver**, the **Executing Agent**, the **Kiro Operator**, the **CI Pipeline**, the **Consumer Maintainer**, the **Platform Maintainer** and the **Reviewer**.

**Business outcome:** on the Pilot Spec, an artifact counts as approved only when CI can verify that a human approved it. A task counts as done only when CI can verify that the engine watched its Verification Command pass. Both are computed by the one implementation that the skills and CI both run.

**In scope:** Requirements 1 to 23 below.

**Out of scope:**

- **Everything Slices 2 to 4 hold.** That is policy and execution control (003), quality checks and gates (004), and metrics (005). Each is its own Child Spec with its own approval.
- **Writing the ADR-0040 amendment.** That is `architecture-guardian` and `docs-governance` work. This spec records the need.
- The programme's Out of scope list applies unchanged.

**Measurable success:** Slice 1 is done when the Pilot Spec holds all of the following at once:

1. Criterion **14.1**, criterion **7.1**, criterion **10.4** and criterion **12.1** hold.
2. Criteria **2.2** to **2.4** hold, and basalt holds zero copies of the Legacy Tooling.
3. The Doctor reports each Table 17.A category (criterion **17.1**).
4. Each Slice 1 command's output is byte-identical with the Disposable Cache present and absent (criterion **16.9**).
5. A task start after an approved Artifact is edited is refused (criteria **18.6** and **18.7**).
6. A completion recorded after such an edit returns the task to `[ ]` (criterion **18.11**).
7. The check-integrity criteria hold:
   - an unparseable input yields INCONCLUSIVE (criterion **19.3**);
   - an uncovered criterion blocks plan approval (criterion **20.1**);
   - each Rule Identifier has passing fixtures (criteria **21.4** to **21.7**);
   - parity is measured at the Parity Commit (criteria **22.2** to **22.4**).
8. No Spec Directory in basalt holds an entry that criterion **23.2** reports.

## Glossary

The programme's Glossary, in `.agents/specs/001-vellum-platform/requirements.md`, is canonical for this spec. Each `THE <subject>` used below is defined there, or in the table below. This spec adds one term.

| Term           | Definition                                                                                                                                                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Machine Folder | The one hidden folder, `.sdlc/`, inside a Spec Directory. Only the Platform writes it. It holds the Spec's Ledger, and each other file of the Spec's Platform State that is not an Artifact. Kiro renders the Artifacts and does not render the Machine Folder. |

## Requirements

### Requirement 1: One pinned version, obtainable by CI without a stored secret, runnable offline

**Delivery slice:** 1

**User Story:** As a Consumer Maintainer, I want exactly one Platform version installed per repository, visible in the Lockfile and runnable without network or plugins, so that an upgrade is a reviewed diff and CI runs the same bytes a developer ran.

#### Acceptance Criteria

1. THE Platform SHALL be installable into a Consumer Repository as one Pinned Version.
2. WHEN a Consumer Repository installs the Platform, THE Platform SHALL be recorded in the Lockfile with the Pinned Version and an integrity digest.
3. THE Platform SHALL publish each release under a distinct version identifier.
4. IF the Platform version executing a command differs from the Pinned Version the Lockfile records, THEN THE Command Line SHALL exit with status 1 and name both versions.
5. WHERE the Platform Source is access-restricted, WHEN a CI Pipeline obtains the Platform, THE Platform SHALL be obtainable with a read-only credential the CI Pipeline receives from the Vault through OIDC.
6. THE Platform SHALL be obtainable by a CI Pipeline that stores no secret as a CI variable.
7. WHILE the host running the Platform has no network access, THE Command Line SHALL complete each command the installed version implements.
8. WHILE no Assistant plugin is installed on the host, THE Command Line SHALL complete each command the installed version implements.
9. THE Platform SHALL run each Command Line command in a CI Pipeline hosted on GitLab and in a CI Pipeline hosted on GitHub.

### Requirement 2: One canonical implementation, and checked vendoring

**Delivery slice:** 1

**User Story:** As a Reviewer, I want the checks CI runs to be the same code the Skills and a developer run, with no hand-kept copy anywhere, so that a spec cannot pass locally and fail in CI, or the reverse, because two copies disagree.

#### Acceptance Criteria

1. THE Platform SHALL provide protocol validation, stage status and assistant projection through one implementation that the Command Line, the Skills and the CI Integration invoke.
2. WHEN the Protocol Validator runs over the Consumer Repository's specs at the Baseline Commit, THE Protocol Validator SHALL accept each `tasks.md` the Legacy Tooling accepts.
3. WHEN the Protocol Validator runs over the Consumer Repository's specs at the Baseline Commit, THE Protocol Validator SHALL reject each `tasks.md` the Legacy Tooling rejects, with a Finding at each line the Legacy Tooling reports.
4. WHEN the Status Reporter runs at the Baseline Commit, THE Status Reporter SHALL report for each Legacy Spec the Legacy Stage the Legacy Tooling reports.
5. WHEN the Projector runs at the Baseline Commit, THE Projector SHALL produce the same set of projected paths, symlink targets and generated-file bytes that the Legacy Tooling produces.
6. THE Platform SHALL carry one Conformance Case for each test case of the Legacy Tooling's test suites.
7. WHERE a Consumer Repository holds a Vendored Copy, THE Platform SHALL record in that Vendored Copy the Platform version and the content checksum the Vendored Copy was produced from.
8. IF a Vendored Copy's content differs from the content checksum the Vendored Copy records, THEN THE Command Line SHALL exit with status 1 and name the file.
9. IF a Vendored Copy records a Platform version different from the Pinned Version, THEN THE Command Line SHALL exit with status 1 and name the file and both versions.

### Requirement 3: A thin command surface

**Delivery slice:** 1

**User Story:** As a Platform Maintainer, I want each command to exist only when its capability exists, and to be a thin entry into the engine, so that the command surface never advertises a behaviour nobody built and no logic lives only inside a command handler.

#### Acceptance Criteria

1. THE Command Line SHALL list in the Command Line's help output only commands whose capability the installed Platform version implements.
2. THE Platform SHALL expose each capability the Command Line invokes through the Programmatic Interface.
3. WHEN a Command Line command and the corresponding Programmatic Interface call receive equal inputs over the same repository state, THE Platform SHALL produce equal results from both.
4. IF the Command Line is invoked with a command name the installed Platform version does not implement, THEN THE Command Line SHALL exit with status 2 and list the implemented commands.
5. WHERE a command supports machine-readable output, THE Command Line SHALL write that output to standard output as one JSON document and write diagnostics to standard error.
6. THE Command Line SHALL set each command's exit status according to the Exit Status Convention.

### Requirement 4: Git is the database — a hash-chained ledger inside each spec

**Delivery slice:** 1

**User Story:** As a Reviewer, I want every approval, decision, piece of evidence, claim and amendment to live in git beside the spec it concerns, in a record whose tampering is detectable, so that a state change is a diff I can read and CI can recompute every claim from the commit alone.

#### Acceptance Criteria

1. THE Platform SHALL record approvals, rejections, decisions, evidence, claims, failures, amendments, Gate Results, merges and releases as Ledger Entries in the Ledger inside the Spec Directory each entry concerns.
2. THE Platform SHALL record each Artifact's Artifact Version and Artifact Status in that Artifact's Lifecycle Frontmatter.
3. THE Platform SHALL read and write Lifecycle Frontmatter and Ledger Entries only within files of the Consumer Repository.
4. THE Platform SHALL write each Ledger Entry through the Programmatic Interface.
5. THE Ledger SHALL record in each Ledger Entry after the first a digest of the preceding Ledger Entry.
6. WHEN the Platform appends a Ledger Entry, THE Ledger SHALL leave each existing Ledger Entry byte-identical.
7. IF a Ledger Entry's content differs from the content its successor's recorded predecessor digest covers, THEN THE Ledger SHALL report a Ledger Integrity Failure naming the Spec Directory and that Ledger Entry's identifier.
8. IF a Ledger Entry has been removed from a Ledger, THEN THE Ledger SHALL report a Ledger Integrity Failure naming the identifier of the entry whose recorded predecessor digest has no matching entry.
9. IF two Ledger Entries appear in an order different from the order their digests chain, THEN THE Ledger SHALL report a Ledger Integrity Failure naming both entry identifiers.
10. IF two Ledger Entries record the same predecessor digest, THEN THE Ledger SHALL report a Ledger Fork naming both entry identifiers.
11. IF a Ledger Entry fails the Schema for the Ledger Entry's kind, THEN THE Ledger SHALL report a Finding naming the entry identifier and the failing field.
12. WHEN the Ledger reports a Ledger Integrity Failure or a Ledger Fork, THE Ledger SHALL leave the Ledger file unmodified.

### Requirement 5: A lifecycle state machine, recorded rather than inferred

**Delivery slice:** 1 (transitions up to `VERIFIED` and the off-path states); 3 (transitions to `MERGED`, `RELEASED` and `DONE`)

**User Story:** As a Spec Author, I want a spec's lifecycle state to be recorded and every transition to check its preconditions, so that a spec cannot reach design without approved requirements, and an invalid state is reported rather than silently carried forward.

**Table 5.A — Transition Preconditions.** Each precondition in a row is required for that transition.

| From → To                                                        | Transition Preconditions                                                                                                                                 | Slice |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `DRAFT` → `IN_REVIEW`                                            | `requirements.md` exists; the Protocol Validator reports no Finding for `requirements.md`                                                                | 1     |
| `IN_REVIEW` → `REQUIREMENTS_APPROVED`                            | the number of Valid Approvals the Policy requires for the requirements Artifact at its current Artifact Checksum; no unresolved blocking Decision        | 1     |
| `REQUIREMENTS_APPROVED` → `DESIGN_IN_REVIEW`                     | `design.md` exists; the Protocol Validator reports no Finding for `design.md`                                                                            | 1     |
| `DESIGN_IN_REVIEW` → `DESIGN_APPROVED`                           | the requirements approvals remain Valid Approvals; the required Valid Approvals for the design Artifact; no Open Question marked blocking in `design.md` | 1     |
| `DESIGN_APPROVED` → `PLAN_IN_REVIEW`                             | `tasks.md` exists; the Protocol Validator reports no Finding for `tasks.md`                                                                              | 1     |
| `PLAN_IN_REVIEW` → `PLAN_APPROVED`                               | the requirements and design approvals remain Valid Approvals; the required Valid Approvals for the plan Artifact; the task graph passes validation       | 1     |
| `PLAN_APPROVED` → `IN_PROGRESS`                                  | a task has been dispatched or recorded as started                                                                                                        | 1     |
| `IN_PROGRESS` → `VERIFICATION`                                   | each Required Task has an Evidence Entry with exit status 0; no unresolved blocking failure                                                              | 1     |
| `VERIFICATION` → `VERIFIED`                                      | the Strict Verifier reports PASS                                                                                                                         | 1     |
| `VERIFIED` → `MERGED`                                            | the Merge Gate passes; the merge is observed on the Hosting Platform                                                                                     | 3     |
| `MERGED` → `RELEASED`                                            | the Release Gate passes                                                                                                                                  | 3     |
| `RELEASED` → `DONE`                                              | post-release verification is recorded                                                                                                                    | 3     |
| any non-Terminal State → `BLOCKED`                               | a recorded blocking reason                                                                                                                               | 1     |
| `BLOCKED` → the state `BLOCKED` was entered from                 | a recorded unblocking Decision                                                                                                                           | 1     |
| any non-Terminal State → `REJECTED`, `SUPERSEDED` or `ABANDONED` | a recorded rationale; for `SUPERSEDED`, the superseding Spec's identifier                                                                                | 1     |

#### Acceptance Criteria

1. THE Lifecycle Engine SHALL assign each non-Legacy Spec one Effective Lifecycle State from the Lifecycle State Set.
2. THE Lifecycle Engine SHALL record each non-Legacy Spec's Recorded Lifecycle State in Lifecycle Frontmatter within that Spec's Spec Directory.
3. WHEN a transition listed in Table 5.A is requested and each Transition Precondition in that row holds, THE Lifecycle Engine SHALL update the Recorded Lifecycle State to the transition's target state.
4. IF a requested transition has a Transition Precondition that does not hold, THEN THE Lifecycle Engine SHALL reject the transition with exit status 1 and name each unmet Transition Precondition.
5. IF a requested transition is absent from Table 5.A, THEN THE Lifecycle Engine SHALL reject the transition with exit status 1 and name the source and target states.
6. WHILE a Spec is in a Terminal State, THE Lifecycle Engine SHALL reject each transition requested for that Spec, naming the Terminal State.
7. WHEN a Spec enters `BLOCKED`, THE Lifecycle Engine SHALL record in the Ledger the blocking reason and the state `BLOCKED` was entered from.
8. WHEN a Spec enters `REJECTED`, `SUPERSEDED` or `ABANDONED`, THE Lifecycle Engine SHALL record the rationale in the Ledger.
9. WHEN a Spec enters `SUPERSEDED`, THE Lifecycle Engine SHALL record the superseding Spec's identifier in the Ledger.
10. WHILE a Spec's Recorded Lifecycle State is one whose Transition Preconditions no longer hold, THE Lifecycle Engine SHALL compute the Spec's Effective Lifecycle State as the latest state in Table 5.A whose Transition Preconditions hold, and name the failed precondition.
11. IF a Spec's Lifecycle Frontmatter records a Lifecycle State outside the Lifecycle State Set, THEN THE Lifecycle Engine SHALL compute the Spec's Effective Lifecycle State as `INVALID` and name the recorded value.
12. IF a Spec Directory holds a later Artifact without an earlier Artifact, THEN THE Lifecycle Engine SHALL compute the Spec's Effective Lifecycle State as `INVALID` and name the missing Artifact.
13. WHEN the Lifecycle Engine computes an Effective Lifecycle State of `INVALID`, THE Lifecycle Engine SHALL leave each file in the Spec Directory unmodified.
14. WHILE a Spec is a Legacy Spec, THE Lifecycle Engine SHALL derive the Spec's Legacy Stage from the Artifacts present.

### Requirement 6: Status computed from combined state, with a CI-safe check

**Delivery slice:** 1

**User Story:** As a CI Pipeline, I want one command that reports each spec's combined state and fails on an invalid one without writing anything, so that a broken lifecycle blocks the merge request that introduced it.

#### Acceptance Criteria

1. WHEN status is requested, THE Status Reporter SHALL report for each Spec the Effective Lifecycle State, the Recorded Lifecycle State, each Artifact's Artifact Version and Artifact Status, the approval state, the Decision state, the validation state, the execution state and the verification state.
2. WHEN status is requested with machine-readable output, THE Status Reporter SHALL write one JSON document conforming to the published status Schema.
3. WHEN status is requested for a Spec number or slug fragment, THE Status Reporter SHALL report only the Spec that fragment matches.
4. IF a requested Spec fragment matches no Spec, or matches more than one Spec, THEN THE Status Reporter SHALL exit with status 2 and name the fragment and each match.
5. WHEN the Status Reporter reports a non-Legacy Spec, THE Status Reporter SHALL name the next permitted transition and each of its unmet Transition Preconditions.
6. WHILE running in Check Mode, THE Status Reporter SHALL leave each file in the Consumer Repository unmodified.
7. WHEN Check Mode finds no Spec with an Effective Lifecycle State of `INVALID`, no Ledger Integrity Failure, no Ledger Fork and no Spec whose Recorded Lifecycle State differs from its Effective Lifecycle State, THE Status Reporter SHALL exit with status 0.
8. IF Check Mode finds a Spec with an Effective Lifecycle State of `INVALID`, THEN THE Status Reporter SHALL exit with status 1 and name that Spec and the reason.
9. IF Check Mode finds a Ledger Integrity Failure or a Ledger Fork, THEN THE Status Reporter SHALL exit with status 1 and name the Spec and the Ledger Entry identifiers.
10. IF Check Mode finds a Spec whose Recorded Lifecycle State differs from its Effective Lifecycle State, THEN THE Status Reporter SHALL exit with status 1 and name both states and the failed precondition.
11. WHILE a Spec is a Legacy Spec whose Legacy Stage is not `invalid`, THE Status Reporter SHALL label the Spec legacy and count the Spec as passing in Check Mode.
12. WHILE a Spec is a Legacy Spec whose Legacy Stage is `invalid`, THE Status Reporter SHALL count the Spec as failing in Check Mode.

### Requirement 7: Approvals only a human can give, verifiable in CI

**Delivery slice:** 1

**User Story:** As an Approver, I want an approval to count only when CI can prove an authorised human gave it, so that no assistant can approve anything, including its own work, and a forged name in a commit approves nothing.

#### Acceptance Criteria

1. WHEN an Approval Record is backed by an Approval Signal from an identity the Approval Policy authorises for the Artifact and the Spec's Risk Class, THE Approval Verifier SHALL count the Approval Record as a Valid Approval.
2. IF the only identity evidence for an Approval Record is a git author or committer name or email address, THEN THE Approval Verifier SHALL reject the Approval Record and name the record identifier.
3. IF an Approval Signal's commit signature does not verify against a key the Approval Policy lists for the approving identity, THEN THE Approval Verifier SHALL reject the Approval Record and name the record identifier and the approving identity.
4. IF the Consumer Repository holds no Approval Policy, THEN THE Approval Verifier SHALL refuse the approval with exit status 1 and report that the Approval Policy is missing.
5. IF the Approval Policy names no Authorised Approver for the Artifact at the Spec's Risk Class, THEN THE Approval Verifier SHALL refuse the approval with exit status 1 and name the Artifact and the Risk Class.
6. IF the approve command is invoked outside an Interactive Human Session, THEN THE Command Line SHALL refuse the approval with exit status 1 and state that an approval requires a human.
7. IF the approve command is invoked from an Assistant Session, THEN THE Command Line SHALL refuse the approval with exit status 1, including where that Assistant Session produced the Artifact Version.
8. IF an Approval Signal originates from an Assistant Session, THEN THE Approval Verifier SHALL reject the Approval Record and name the record identifier.
9. WHEN the Approval Verifier runs in a CI Pipeline, THE Approval Verifier SHALL decide validity from the Approval Record, the Approval Signal and the Approval Policy alone.
10. IF the Approval Policy at the commit under verification differs from the Approval Policy on the merge request's target branch, THEN THE Approval Verifier SHALL evaluate the Approval Signal against the target branch's Approval Policy.
11. WHERE the Policy requires N approvals for an Artifact at a Risk Class, THE Approval Verifier SHALL count the Artifact approved when N Valid Approvals from N distinct Authorised Approvers exist.
12. WHEN an approval is recorded, THE Platform SHALL write an Approval Record holding the approving identity, the Artifact path, the Artifact Version, the Artifact Checksum, the stage, the decision, a UTC timestamp and a reference to the Approval Signal.
13. WHEN an Authorised Approver rejects an Artifact Version, THE Platform SHALL record the rejection and the Approver's rationale in the Ledger.
14. WHEN an Authorised Approver rejects an Artifact Version, THE Lifecycle Engine SHALL keep the Spec's Recorded Lifecycle State at the in-review state of that Artifact's stage.

### Requirement 8: An approval binds to one exact version, and a change voids it

**Delivery slice:** 1

**User Story:** As a Reviewer, I want an approval to cover exactly the text that was approved, so that editing the approved text after the approval cannot ride on the old approval.

#### Acceptance Criteria

1. THE Approval Verifier SHALL bind each Approval Record to one Artifact Version and one Artifact Checksum.
2. IF an Artifact's current Artifact Checksum differs from the Artifact Checksum an Approval Record binds, THEN THE Approval Verifier SHALL report the Approval Record as an Invalidated Approval and name the Artifact and both checksums.
3. WHEN an Approval Record becomes an Invalidated Approval, THE Lifecycle Engine SHALL compute the Spec's Effective Lifecycle State as the in-review state of that Artifact's stage.
4. WHEN only an Artifact's Lifecycle Frontmatter changes, THE Approval Verifier SHALL keep each Valid Approval of that Artifact valid.
5. WHEN an Artifact Body changes while the Artifact has an Approval Record, THE Lifecycle Engine SHALL increment the Artifact Version on the next Platform write to that Artifact's Lifecycle Frontmatter.
6. WHEN the requirements Artifact's approval becomes an Invalidated Approval, THE Approval Verifier SHALL report the design and plan Artifacts' approvals of that Spec as Invalidated Approvals.
7. WHEN the design Artifact's approval becomes an Invalidated Approval, THE Approval Verifier SHALL report the plan Artifact's approval of that Spec as an Invalidated Approval.

### Requirement 9: Evidence the engine writes, with no command output

**Delivery slice:** 1

**User Story:** As a Reviewer, I want a task's evidence to be written by the engine that ran its command, with the output left out, so that "tests passed" means a command exited zero at a known commit, and no credential printed by a command lands in git.

#### Acceptance Criteria

1. WHEN an Executing Agent requests evidence for a task, THE Evidence Recorder SHALL run the task's Verification Command itself.
2. WHEN a Verification Command run by the Evidence Recorder exits, THE Evidence Recorder SHALL append an Evidence Entry holding the task identifier, the command text, the exit status, the start and finish timestamps in UTC, the HEAD commit identifier, the Affected Paths and the Environment Versions.
3. THE Evidence Recorder SHALL write Evidence Entries that hold no standard output or standard error content.
4. IF a Verification Command's text matches a Secret Pattern, THEN THE Evidence Recorder SHALL refuse to record with exit status 1 and name the task and the Secret Pattern's name.
5. IF the Consumer Repository's secret-scan configuration excludes the Ledger's path, THEN THE Evidence Recorder SHALL refuse to record with exit status 1 and name the exclusion.
6. IF the working tree differs from HEAD in a path the task declares when the Verification Command starts, THEN THE Evidence Recorder SHALL record the Evidence Entry as uncommitted.
7. WHEN a Verification Command exits with status 0 and the Evidence Entry is not recorded as uncommitted, THE Evidence Recorder SHALL set the task's Task Marker to `[x]`.
8. IF a Verification Command exits with a non-zero status, THEN THE Evidence Recorder SHALL leave the task's Task Marker at a value other than `[x]` and record the exit status in the Evidence Entry.
9. IF an Evidence Entry records a commit identifier that is not an object in the Consumer Repository, THEN THE Strict Verifier SHALL reject the Evidence Entry and name the entry identifier.

### Requirement 10: Completion without evidence is its own state, and Kiro still renders tasks

**Delivery slice:** 1

**User Story:** As a Kiro Operator, I want Kiro to keep rendering task state and to keep its own task controls, while a task Kiro ticked without evidence is reported for what it is, so that Kiro stays usable and a tick is never mistaken for a verified result.

#### Acceptance Criteria

1. THE Platform SHALL represent task state in `tasks.md` using only the four Task Markers.
2. WHEN the Platform writes a Task Marker, THE Platform SHALL leave the rest of the task line byte-identical.
3. WHILE a task is an Unverified Completion, THE Status Reporter SHALL report the task as an Unverified Completion and count the task as not complete in the Spec's execution state.
4. IF a Required Task is an Unverified Completion, THEN THE Strict Verifier SHALL report FAIL with exit status 1 and name the task.
5. IF a task line carries a checkbox marker other than the four Task Markers, THEN THE Protocol Validator SHALL report a Finding naming the file, the line and the marker.
6. THE Protocol Validator SHALL accept a task line only when the task line matches the Kiro Task Line Grammar.
7. WHEN the Platform writes `tasks.md`, THE Platform SHALL produce task lines that match the Kiro Task Line Grammar.

### Requirement 11: Protocol validation over one parsed model

**Delivery slice:** 1

**User Story:** As a Spec Author, I want lint to validate each document against the protocol and report each violation by file, line and rule, so that a malformed spec is caught before review and the same parse feeds status and verification.

#### Acceptance Criteria

1. WHEN lint runs, THE Protocol Validator SHALL validate each Artifact's Lifecycle Frontmatter against the Schema for the Artifact's Schema Version.
2. WHEN lint runs, THE Protocol Validator SHALL validate each Artifact against the Markdown Protocol for the Artifact's type.
3. WHEN lint runs, THE Protocol Validator SHALL validate task-line syntax, task numbering and optional-task marking in `tasks.md`.
4. IF a requirements trailer on a task names a criterion reference that `requirements.md` does not define, THEN THE Protocol Validator SHALL report a Finding naming the task and the reference.
5. IF a checkpoint or an Execution Log row violates the Markdown Protocol, THEN THE Protocol Validator SHALL report a Finding naming the file and the line.
6. IF a wave graph names a task that `tasks.md` does not define, THEN THE Protocol Validator SHALL report a Finding naming the wave and the task.
7. WHEN the Protocol Validator reports a Finding, THE Protocol Validator SHALL include the file path, the line, the Rule Identifier and a message.
8. IF an Artifact cannot be parsed, THEN THE Protocol Validator SHALL report a Finding at the first unparseable line and continue validating the remaining Artifacts.
9. WHEN lint runs with an Artifact type argument, THE Protocol Validator SHALL validate only Artifacts of that type.
10. WHEN the Protocol Validator, the Status Reporter and the Strict Verifier read the same Artifact, THE Platform SHALL derive equal task identifiers, criterion references and dependencies for each of the three readers.

### Requirement 12: Strict verification as a CI gate

**Delivery slice:** 1 (criteria, properties, tasks, evidence, approvals); 3 (tests and review gates, via Requirement 004:4)

**User Story:** As a CI Pipeline, I want one strict verification that fails when any link from criterion to evidence is missing, so that "done" is decided by the chain, not by a status line.

#### Acceptance Criteria

1. WHEN strict verification runs for a Spec, THE Strict Verifier SHALL report the satisfied and total counts for criteria, properties, tasks, Evidence Entries and approvals, and a PASS or FAIL result.
2. IF a criterion is bound to neither a property nor an example test case in `design.md`'s coverage table, THEN THE Strict Verifier SHALL report FAIL and name the criterion.
3. IF a property is cited by no task, THEN THE Strict Verifier SHALL report FAIL and name the property.
4. IF a Required Task has no Evidence Entry with exit status 0 at a commit that is the verified commit or an ancestor of the verified commit, THEN THE Strict Verifier SHALL report FAIL and name the task.
5. IF an Approval Record the Policy requires is not a Valid Approval, THEN THE Strict Verifier SHALL report FAIL and name the Artifact and the reason.
6. IF the Spec's Ledger has a Ledger Integrity Failure or a Ledger Fork, THEN THE Strict Verifier SHALL report FAIL and name the Ledger Entry identifiers.
7. WHEN the Strict Verifier reports FAIL, THE Strict Verifier SHALL exit with status 1.
8. WHILE running, THE Strict Verifier SHALL leave each file in the Consumer Repository unmodified.
9. WHEN strict verification runs with no Spec argument, THE Strict Verifier SHALL verify each non-Legacy Spec whose Effective Lifecycle State is `IN_PROGRESS` or later in Table 5.A.

### Requirement 13: Projection that never becomes a second source

**Delivery slice:** 1

**User Story:** As a Consumer Maintainer, I want the canonical `.agents/` tree projected into each assistant's directory in that assistant's own format, with drift and hand edits caught, so that three assistants read one source and none can fork it.

#### Acceptance Criteria

1. THE Projector SHALL read specs, templates, skills, agents, rules and hooks only from the Canonical Source.
2. THE Projector SHALL project into each Assistant Target the Consumer Configuration names.
3. WHEN sync runs, THE Projector SHALL link each spec, skill, template and hook entry in each Assistant Target to that entry's path in the Canonical Source by a per-entry relative link.
4. WHEN sync runs, THE Projector SHALL generate each agent and rule for each Assistant Target in that Assistant Target's Frontmatter Dialect, carrying a Provenance Marker.
5. WHEN sync runs with a target argument, THE Projector SHALL project only the named Assistant Target.
6. WHEN sync runs twice with no change to the Canonical Source, THE Projector SHALL write no file on the second run.
7. WHEN an entry is removed from the Canonical Source, THE Projector SHALL remove that entry's projection from each Assistant Target on the next sync.
8. WHEN sync runs in check mode and each projection is current, THE Projector SHALL exit with status 0 and write no file.
9. IF sync in check mode finds a projected entry missing, stale or orphaned, THEN THE Projector SHALL exit with status 1 and name each entry.
10. IF a path the Projector would write holds a file that carries no Provenance Marker and is not a link into the Canonical Source, THEN THE Projector SHALL leave the file unmodified, exit with status 1 and name the path.
11. IF an agent source cites a repository path that does not exist, THEN THE Projector SHALL report a Reference Integrity Finding naming the agent and the path.
12. IF an agent source instructs a shell command while that agent's tool grant includes no shell, THEN THE Projector SHALL report a Reference Integrity Finding naming the agent and the command.
13. IF an agent or rule source fails the Neutral Frontmatter Schema, THEN THE Projector SHALL exit with status 2 and name the file and the field.

### Requirement 14: Adopting a legacy spec, proven on the Pilot Spec

**Delivery slice:** 1

**User Story:** As a Consumer Maintainer, I want to bring one existing spec under the Platform without rewriting its content or inventing approvals it never had, so that Slice 1 is proven on live work rather than on a fixture.

#### Acceptance Criteria

1. WHEN adoption of a Legacy Spec is requested, THE Lifecycle Engine SHALL add Lifecycle Frontmatter to each Artifact present and leave each Artifact Body byte-identical.
2. WHEN the Lifecycle Engine adopts a Legacy Spec, THE Lifecycle Engine SHALL set the Recorded Lifecycle State to the in-review state of the latest Artifact present.
3. WHEN the Lifecycle Engine adopts a Legacy Spec, THE Lifecycle Engine SHALL record zero Approval Records for that Spec.
4. THE Lifecycle Engine SHALL adopt a Legacy Spec only when an adopt command names that Spec.
5. IF adoption is requested for a Legacy Spec whose Legacy Stage is `invalid`, THEN THE Lifecycle Engine SHALL refuse with exit status 1 and name the missing Artifact.
6. WHEN a merge request in the Consumer Repository changes a file in the Spec Directory of an adopted Spec, THE CI Integration SHALL run Check Mode, the Approval Verifier and the Strict Verifier for that Spec.
7. WHILE the Pilot Spec is adopted, THE CI Integration SHALL run in the Consumer Repository's CI Pipeline with no Assistant installed.

## Non-Functional Requirements

### Requirement 15: Determinism, exit statuses, speed and zero-secret testing

**Delivery slice:** 1

**User Story:** As a CI Pipeline, I want the Platform's output to be identical for identical input, its exit statuses to follow one convention, its check to finish within a bound and its tests to need no secret, so that a CI result is comparable across runs and reproducible on a fork.

#### Acceptance Criteria

1. WHEN a command that writes no file runs twice against the same commit, THE Platform SHALL produce byte-identical standard output both times.
2. WHEN the Platform reports Findings, THE Platform SHALL order the Findings by file path, then line, then Rule Identifier.
3. THE Command Line SHALL use exit status 0, 1 and 2 as the Exit Status Convention defines.
4. WHEN Check Mode runs over a Consumer Repository holding 100 Specs, THE Status Reporter SHALL complete within 5 seconds at the 95th percentile on the Consumer Repository's CI runner.
5. THE Platform SHALL run the Platform's own test suite with zero secrets.
6. IF a Platform test requires a credential or a network service, THEN THE Platform Release Pipeline SHALL report that test as a design Finding rather than as a passing test.

## Requirements added by Amendment 1

Requirements 16 to 22 were added to spec 001 by Amendment 1 on 2026-09-25, as old R37, R38, R46 (Slice 1 criteria) and R49 to R52.

### Requirement 16: The engine decides what it can compute, from repository content alone

**Delivery slice:** 1 (criteria 16.1–16.12, applied to each Table 16.A row as that row's owning requirement lands)

**User Story:** As a Reviewer, I want each decision the engine can compute to be computed from the repository and the pinned version, never delegated to a model and never held in a store outside git, so that a gate's result reproduces on any clone and cannot vary with which model or which cache answered.

**Table 16.A — Computable Decisions.**

| Computable Decision                                                             | Computed by           | Criteria                            | Slice |
| ------------------------------------------------------------------------------- | --------------------- | ----------------------------------- | ----- |
| Effective Lifecycle State and Legacy Stage                                      | Lifecycle Engine      | 5.1, 5.10–5.14                      | 1     |
| Ledger integrity                                                                | Ledger                | 4.7–4.10                            | 1     |
| Approval validity                                                               | Approval Verifier     | 7.1–7.3, 8.2                        | 1     |
| Coverage of criteria by properties or example tests, and of properties by tasks | Strict Verifier       | 12.2, 12.3                          | 1     |
| Pre-Execution Check outcome                                                     | Pre-Execution Checker | 18.1–18.4                           | 1     |
| Task graph validity                                                             | Task Engine           | 003:2.5–003:2.7, 003:2.11, 003:2.12 | 2     |
| Spec size against the Spec Size Limit                                           | Quality Checker       | 003:13.1                            | 2     |
| EARS pattern and clause order                                                   | Quality Checker       | 004:1.1–004:1.3                     | 3     |
| Vague-term, escape-clause and absolute detection                                | Quality Checker       | 004:1.5                             | 3     |
| Coverage-table completeness                                                     | Quality Checker       | 004:2.1, 004:3.1                    | 3     |

#### Acceptance Criteria

1. THE Platform SHALL compute each Computable Decision in Table 16.A from the Consumer Repository's content and the Pinned Version.
2. THE Gate Runner SHALL compute each Gate Result's status and Findings from the Consumer Repository's content at the evaluated commit and the Pinned Version.
3. WHEN a Gate is evaluated twice against the same commit with the same Pinned Version, THE Gate Runner SHALL produce equal statuses and equal Findings on both evaluations.
4. WHEN a Skill requires the result of a Computable Decision, THE Skill SHALL obtain the result from the Command Line.
5. IF a Skill or agent source instructs an Assistant to determine a Computable Decision other than through the Command Line, THEN THE Platform Release Pipeline SHALL fail with exit status 1 and name the file and the line.
6. IF a Gate Definition names a model's output as an input to the Gate's status, THEN THE Gate Runner SHALL exit with status 2 and name the Gate and the Gate Definition file.
7. THE Platform SHALL hold Platform State only as content of files in the Consumer Repository.
8. THE Platform SHALL complete each command on a host that holds no Persistent Store.
9. WHERE a Disposable Cache is present, THE Platform SHALL produce standard output, written files and an exit status byte-identical to those the same command produces with the Disposable Cache absent.
10. IF a Disposable Cache entry was produced from content other than the current content, or by a Platform version other than the executing version, THEN THE Platform SHALL discard the entry and recompute the result from the Consumer Repository's content.
11. IF a Disposable Cache entry cannot be read, THEN THE Platform SHALL discard the entry and recompute the result from the Consumer Repository's content.
12. THE Platform SHALL keep each Disposable Cache outside the paths the Consumer Repository's version control tracks.

### Requirement 17: Doctor diagnostics for the incidents this repository has had

**Delivery slice:** 1 (Table 17.A; the Doctor ships in Slice 1 with these categories, and Table 003:10.A's categories follow in Slice 2)

**User Story:** As a Consumer Maintainer, I want the doctor to report a drifted plugin, a hook tool that cannot run, an orphaned in-progress marker, an untracked spec document and a half-finished ADR supersession, so that each incident of 2026-09-25 is found by a diagnostic before it costs another session.

**Table 17.A — Added Doctor Categories for recorded incidents.**

| Added Doctor Category    | What is checked                                                                      | Incident                                                 |
| ------------------------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Assistant plugin version | each installed Assistant Plugin's Installed Plugin Version equals the Pinned Version | an installed plugin at 0.1.0 while the brief cited 0.2.0 |
| Repository hooks         | no Hook Tool the Repository Hook Configuration invokes has a Hook Tool Failure       | a commit-message checker failing with a missing module   |
| Stale markers            | no task line carries a Stale Marker                                                  | spec 010's `[-]` left by an interrupted run              |
| Untracked spec documents | no Spec Directory holds an Untracked Spec Document                                   | a spec document another session's commit could sweep up  |
| ADR supersession         | each Superseded ADR's status line names the Superseding ADR                          | ADR-0030 left `Accepted` after ADR-0054 superseded it    |
| Disposable cache         | no Disposable Cache path is tracked by version control                               | criterion 16.12                                          |

#### Acceptance Criteria

1. THE Doctor SHALL include each Added Doctor Category in the Doctor Categories that criteria 003:10.1, 003:10.2, 003:10.3 and 003:10.5 evaluate.
2. IF an installed Assistant Plugin's Installed Plugin Version differs from the Pinned Version, THEN THE Doctor SHALL report an Assistant plugin version FAIL naming the Assistant and both versions.
3. WHILE no Assistant Plugin is installed on the host, THE Doctor SHALL report the Assistant plugin version category as PASS and state that no Assistant Plugin is installed.
4. IF a Hook Tool the Repository Hook Configuration invokes has a Hook Tool Failure, THEN THE Doctor SHALL report a Repository hooks FAIL naming the hook, the Hook Tool and the missing executable or module.
5. WHEN the Doctor checks a Hook Tool, THE Doctor SHALL leave the index, HEAD and each file in the Consumer Repository unmodified.
6. IF a task line carries a Stale Marker, THEN THE Doctor SHALL report a Stale markers FAIL naming the Spec, the line and the Task Marker.
7. IF a Spec Directory holds an Untracked Spec Document, THEN THE Doctor SHALL report an Untracked spec documents FAIL naming each Untracked Spec Document's path.
8. IF a Superseding ADR names a Superseded ADR whose status line does not name the Superseding ADR, THEN THE Doctor SHALL report an ADR supersession FAIL naming both ADRs.
9. IF a Superseding ADR names an ADR that does not exist, THEN THE Doctor SHALL report an ADR supersession FAIL naming the Superseding ADR and the missing identifier.
10. WHERE the Consumer Configuration names no ADR directory, THE Doctor SHALL report the ADR supersession category as PASS and state that no ADR directory is configured.
11. IF a path under a Disposable Cache is tracked by the Consumer Repository's version control, THEN THE Doctor SHALL report a Disposable cache FAIL naming the path.
12. WHILE the Consumer Repository holds no Spec Directory, THE Doctor SHALL report the Stale markers and Untracked spec documents categories as PASS.

### Requirement 18: A pre-execution check before each task, and completion bound to the same versions (Slice 1 criteria)

**Delivery slice:** 1. This requirement holds the Slice 1 criteria of the pre-execution check (programme map: old criteria 46.1–46.8 and 46.14–46.17). Its Slice 2 criteria, bundle delivery to the Executing Agent (old 46.9–46.13), are Requirement 003:15.

**User Story:** As an Executing Agent, I want each task to start only after its requirements, design and plan are confirmed present, approved and unchanged since approval, and every reference it cites resolves, and I want its completion checked against those same versions, so that I never implement against text nobody approved or finish against text that changed under me.

#### Acceptance Criteria

1. WHEN a task start is requested, THE Pre-Execution Checker SHALL confirm that the requirements, design and plan Artifacts of the task's Spec exist.
2. WHEN a task start is requested, THE Pre-Execution Checker SHALL confirm that each of the three Artifacts holds the Valid Approvals the Policy requires.
3. WHEN a task start is requested, THE Pre-Execution Checker SHALL confirm that each Artifact's current Artifact Checksum equals the Artifact Checksum the Artifact's Valid Approvals bind.
4. WHEN a task start is requested, THE Pre-Execution Checker SHALL resolve each criterion reference and property reference the task cites to text that `requirements.md` or `design.md` defines.
5. WHEN each Pre-Execution Check passes, THE Pre-Execution Checker SHALL record a Task Binding for the task attempt before the task's Task Marker changes.
6. IF a Pre-Execution Check fails, THEN THE Pre-Execution Checker SHALL refuse the task start with exit status 1 and name the failing Artifact or reference.
7. IF a Pre-Execution Check fails, THEN THE Pre-Execution Checker SHALL leave the task's Task Marker and Task State unmodified.
8. WHILE a Spec is a Legacy Spec, THE Pre-Execution Checker SHALL refuse each task start for that Spec with exit status 1 and name the adoption step.
9. WHEN the Strict Verifier verifies a task, THE Strict Verifier SHALL check the task against the criteria and properties the task's Task Binding resolved, at the Artifact Versions the Task Binding records.
10. IF an Artifact's current Artifact Checksum differs from the Artifact Checksum the task's Task Binding records when the task's completion is recorded, THEN THE Evidence Recorder SHALL refuse the completion with exit status 1 and name the Artifact and both checksums.
11. IF an Artifact's current Artifact Checksum differs from the Artifact Checksum the task's Task Binding records when the task's completion is recorded, THEN THE Evidence Recorder SHALL set the task's Task Marker to `[ ]` in place of the `[x]` criterion 9.7 sets.
12. IF evidence is requested for a task attempt that has no Task Binding, THEN THE Evidence Recorder SHALL refuse with exit status 1 and name the task.

### Requirement 19: "Could not check" is never reported as "clean"

**Delivery slice:** 1

**User Story:** As a CI Pipeline, I want every check to say PASS, FAIL or INCONCLUSIVE, and every PASS to say what it examined, so that a check that read nothing can never be mistaken for one that found nothing wrong.

#### Acceptance Criteria

1. THE Platform SHALL report the outcome of each Check as one Check Result.
2. WHEN a Check reports PASS, THE Platform SHALL include an Examination Summary naming each kind of item the Check examined and the count of each kind.
3. IF a Check's input exists and yields zero items of the kind the Check examines, THEN THE Platform SHALL report INCONCLUSIVE for that Check, exit with status 2 and name the input.
4. IF a Check's input exists and cannot be read or parsed, THEN THE Platform SHALL report INCONCLUSIVE for that Check, exit with status 2 and name the input.
5. WHERE a Check's input is absent and the absence is a Permitted Absence, THE Platform SHALL issue a Not-Applicable Report naming the absent input in place of a Check Result.
6. IF a Check's input is absent and the absence is not a Permitted Absence, THEN THE Platform SHALL report FAIL for that Check and name the absent input.
7. THE Platform SHALL label a Not-Applicable Report distinctly from PASS in human-readable output and in machine-readable output.
8. THE Command Line SHALL treat an INCONCLUSIVE Check Result as the case the Exit Status Convention's status 2, "could not evaluate", covers.
9. WHEN a command's Check Results include INCONCLUSIVE, THE Command Line SHALL exit with status 2, whether or not the command's other Check Results include FAIL.
10. WHEN each Check of a command reports PASS or issues a Not-Applicable Report, THE Command Line SHALL exit with status 0.
11. IF a CI Integration step reports an INCONCLUSIVE Check Result, THEN THE CI Integration SHALL fail the pipeline and name the Check and the input.
12. WHERE criterion 6.7, 12.1, 003:10.1, 003:10.2 or 004:5.1 would report PASS or exit with status 0, IF criterion 19.3 or 19.4 applies to one of that command's Checks, THEN THE Platform SHALL report INCONCLUSIVE and exit with status 2 in place of that PASS or status 0.
13. WHERE criterion 17.3, 17.10 or 17.12 reports PASS for an absent input, THE Doctor SHALL issue a Not-Applicable Report naming the absent input in place of that PASS.

### Requirement 20: Coverage gates plan approval

**Delivery slice:** 1

**User Story:** As an Approver, I want a plan that leaves any criterion or property without a task to be unapprovable, and each gap named, so that "every criterion is covered" is a gate from Slice 1 rather than a Slice 3 warning, as basalt's current tool already reports it.

#### Acceptance Criteria

1. IF a criterion `requirements.md` defines is referenced by no task's requirements trailer, THEN THE Lifecycle Engine SHALL reject the transition from `PLAN_IN_REVIEW` to `PLAN_APPROVED` with exit status 1 and name each Uncovered Criterion.
2. IF a property `design.md` defines is cited by no task, THEN THE Lifecycle Engine SHALL reject the transition from `PLAN_IN_REVIEW` to `PLAN_APPROVED` with exit status 1 and name each uncited property.
3. THE Lifecycle Engine SHALL treat the conditions of criteria 20.1 and 20.2 as Transition Preconditions of Table 5.A's `PLAN_IN_REVIEW` → `PLAN_APPROVED` row, in addition to the preconditions the row lists.
4. IF approval of a `tasks.md` Artifact Version is requested while that version leaves an Uncovered Criterion or an uncited property, THEN THE Command Line SHALL refuse the approval with exit status 1 and name each Uncovered Criterion and each uncited property.
5. IF an Approval Record approves a `tasks.md` Artifact Version that leaves an Uncovered Criterion or an uncited property, THEN THE Approval Verifier SHALL report the Approval Record as not a Valid Approval and name each Uncovered Criterion and each uncited property.
6. WHEN the coverage preconditions of criteria 20.1 and 20.2 hold, THE Lifecycle Engine SHALL report an Examination Summary naming the counts of criteria, properties and tasks examined.
7. IF `requirements.md` yields zero criteria when coverage is evaluated, THEN THE Lifecycle Engine SHALL report the coverage precondition as INCONCLUSIVE, reject the transition and name `requirements.md`.
8. WHILE a criterion is referenced only by optional tasks, THE Lifecycle Engine SHALL count the criterion as covered and name the criterion as covered by optional tasks only.
9. THE Quality Checker SHALL report the Finding of criterion 004:3.1 in addition to the transition rejection of criterion 20.1.

### Requirement 21: Each check proves it can fail

**Delivery slice:** 1

**User Story:** As a Platform Maintainer, I want every diagnostic proven to fire on a case it must catch and to stay silent on a case it must not, and the validators mutation-tested before release, so that a check weaker than it claims is found by the release gate rather than by a spec it waved through.

#### Acceptance Criteria

1. THE Platform SHALL publish, for each Platform version, the set of Rule Identifiers that version emits.
2. THE Platform SHALL carry at least one Negative Fixture for each Rule Identifier the Platform emits.
3. THE Platform SHALL carry at least one Near-Miss Fixture for each Rule Identifier the Platform emits.
4. IF a Rule Identifier the Platform emits has no Negative Fixture, THEN THE Platform Release Pipeline SHALL fail the conformance suite with exit status 1 and name the Rule Identifier.
5. IF a Rule Identifier the Platform emits has no Near-Miss Fixture, THEN THE Platform Release Pipeline SHALL fail the conformance suite with exit status 1 and name the Rule Identifier.
6. IF a Negative Fixture does not trigger the Negative Fixture's Rule Identifier, THEN THE Platform Release Pipeline SHALL fail the conformance suite with exit status 1 and name the fixture and the Rule Identifier.
7. IF a Near-Miss Fixture triggers the Near-Miss Fixture's Rule Identifier, THEN THE Platform Release Pipeline SHALL fail the conformance suite with exit status 1 and name the fixture and the Rule Identifier.
8. WHEN a release is prepared, THE Platform Release Pipeline SHALL run mutation testing over the Protocol Validator, the Quality Checker, the Strict Verifier, the Approval Verifier, the Ledger's integrity checks and the Doctor.
9. IF the Mutation Score is below the Mutation Threshold, THEN THE Platform Release Pipeline SHALL refuse the release and name the Mutation Score and the Mutation Threshold.
10. WHEN mutation testing completes, THE Platform Release Pipeline SHALL report each Surviving Mutation with the Check and the Rule Identifier whose fixtures the mutation survived.
11. IF the Platform repository declares no Mutation Threshold, THEN THE Platform Release Pipeline SHALL refuse the release and report that the Mutation Threshold is missing.

### Requirement 22: The parity baseline is pinned to one commit

**Delivery slice:** 1

**User Story:** As a Platform Maintainer, I want Slice 1's parity with basalt's spec tools measured against one pinned commit, and every later basalt diagnostic brought in by a recorded parity update, so that parity is a fixed target and basalt's newest coverage diagnostics are part of it.

#### Acceptance Criteria

1. THE Platform SHALL record one Parity Commit of the Consumer Repository in the Parity Fixtures.
2. WHEN criteria 2.2 to 2.6 compare the Platform with the Legacy Tooling, THE Platform SHALL compare against the Legacy Tooling at the Parity Commit in place of the Baseline Commit.
3. WHEN the Protocol Validator validates a `tasks.md` that the Legacy Tooling at the Parity Commit reports with Rule Identifier `CRITERIA_NOT_COVERED`, THE Protocol Validator SHALL report `CRITERIA_NOT_COVERED` naming the same criteria.
4. WHEN the Protocol Validator validates a `tasks.md` that the Legacy Tooling at the Parity Commit reports with Rule Identifier `CRITERIA_SOURCE_UNREADABLE`, THE Protocol Validator SHALL report `CRITERIA_SOURCE_UNREADABLE` with an INCONCLUSIVE Check Result.
5. IF the Legacy Tooling at the Parity Commit lacks `CRITERIA_NOT_COVERED` or lacks `CRITERIA_SOURCE_UNREADABLE`, THEN THE Platform Release Pipeline SHALL fail with exit status 1 and name each missing Rule Identifier.
6. WHEN the Legacy Tooling emits a Rule Identifier added after the Parity Commit, THE Platform SHALL adopt that Rule Identifier only through a Parity Update.
7. WHEN a Parity Update is made, THE Platform SHALL record in the Parity Fixtures the previous Parity Commit, the new Parity Commit and each Rule Identifier added, changed or removed between the two.
8. IF the Parity Commit is not an object in the Consumer Repository, THEN THE Platform Release Pipeline SHALL exit with status 2 and name the Parity Commit.
9. IF a Parity Fixture's recorded expected output differs from the Legacy Tooling's output at the Parity Commit, THEN THE Platform Release Pipeline SHALL fail with exit status 1 and name the Parity Fixture.

## Requirements added on 2026-09-25 (programme restructure)

Requirement 23 was decided by the user on 2026-09-25, after the restructure of spec 001 into this programme. It carries no old `R<N>` number and has no row in the programme's Requirement map.

### Requirement 23: The spec folder contract — three documents and one machine folder

**Delivery slice:** 1

**User Story:** As a Reviewer, I want a Spec Directory to hold at most the three protocol documents and one machine folder that only the engine writes, with any other file reported by name, so that part files, notes and research documents never become a fourth source of truth, and the Ledger has one fixed home that Kiro does not render.

A document too large for one write is written section by section (Requirement 003:20) and is still stored as one file. A Spec whose criteria exceed the Spec Size Limit is split into a Programme Spec with Child Specs (Requirement 003:13), and never into document parts.

#### Acceptance Criteria

1. WHEN lint runs, THE Protocol Validator SHALL treat `requirements.md`, `design.md`, `tasks.md` and one Machine Folder as the permitted entries of a Spec Directory.
2. IF a Spec Directory holds an entry other than `requirements.md`, `design.md`, `tasks.md` and the Machine Folder, THEN THE Protocol Validator SHALL report a Finding naming the entry.
3. THE Platform SHALL hold each Spec's Ledger inside that Spec's Machine Folder.
4. THE Platform SHALL write each file of a Spec's Platform State that is not an Artifact inside that Spec's Machine Folder.
5. IF a Machine Folder holds a file that no Schema the Platform publishes defines, THEN THE Protocol Validator SHALL report a Finding naming the file.
6. IF a Programme Spec's Spec Directory holds a `tasks.md`, THEN THE Protocol Validator SHALL report a Finding naming the Programme Spec and the `tasks.md` path.
7. IF a Programme Spec's Spec Directory holds no `requirements.md`, THEN THE Protocol Validator SHALL report a Finding naming the Programme Spec.

## Assumptions

The programme's Assumptions 1 to 53, in `.agents/specs/001-vellum-platform/requirements.md`, apply to this spec and keep their numbers there. Those that bear on this slice are 1 to 5, 7 to 14, 16, 17, 19, 22, 23, 30, 38, 39 and 46 to 53. The assumptions below are added by this spec. Each can be answered in one word or one correction.

1. **The Machine Folder is named `.sdlc/`** in every Spec Directory, a Programme Spec's included. Correct?
2. **Kiro does not render a hidden folder inside a Spec Directory.** This is unverified, as programme Assumption 9 is for Lifecycle Frontmatter. The Kiro Fixture (criterion 004:10.6) is where it gets confirmed. If Kiro does render it, design moves the Machine Folder's content, and criterion 23.3 still holds wherever the Machine Folder is. Confirm?
3. **The files inside the Machine Folder are design's.** Their number, names and format are design's choice, including whether the Ledger is one file or one file per entry. Criterion 23.5 requires only that a published Schema defines each one. Design decides?
4. **ADR-0040 is amended before Requirement 23 is implemented.** ADR-0040 allows exactly three files, and the Machine Folder is a fourth entry. This is **blocking for the design of Requirement 23**, not for the rest of this spec. Amend first?
5. **ADR-0040's `SPEC_MISSING_FILE` is not carried over.** A Spec at stage `requirements` lacks `design.md` and `tasks.md` legitimately, and Requirement 6 already reports each Spec's stage. Correct?
6. **A Legacy Spec's extra files are reported like any other Spec's** (criterion 23.2). Criteria 2.2 to 2.4 compare the Platform with the Legacy Tooling on what the Legacy Tooling checks. A new Finding that the Legacy Tooling never emitted is therefore an addition, not a parity difference. Correct?
7. **A Programme Spec's `design.md` holds cross-child architecture and no coverage table of its own**, since a Programme Spec defines no criteria. Design decides what the Markdown Protocol requires of it. Correct?

## Quality Rules Applied To This Document

Every criterion above was checked against the INCOSE rules:

| Rule                        | Meaning                                                                         |
| --------------------------- | ------------------------------------------------------------------------------- |
| Active voice                | The system is the subject and it acts. Not "the record is updated".             |
| No vague terms              | No "quickly", "adequate", "reasonable", "user-friendly", "robust", "efficient". |
| No pronouns                 | Repeat the noun. "it", "they", "this" are ambiguous under review.               |
| Consistent terminology      | One name per concept, matching the Glossary, every time.                        |
| Explicit conditions         | Triggers and states are stated, never implied.                                  |
| Measurable criteria         | A tester can determine pass or fail without asking a question.                  |
| One thought per requirement | No compound behaviour behind a single number.                                   |
| No escape clauses           | No "where possible", "if feasible", "as appropriate", "if practical".           |
| No absolutes                | No "never", "always", "all", "100%", "every conceivable".                       |
| Solution-free               | What the system does, not the class, table, queue or library that does it.      |
| Prefer positive statements  | Say what the system does rather than `SHALL NOT`.                               |

**Stated exceptions.** The exceptions recorded in the programme's Quality Rules section apply to Requirements 1 to 22 of this spec, and name them in child numbering (`002:N.M`). The criterion text is unchanged, so the exceptions are unchanged. Requirement 23 adds two more:

- **Solution-free.** `requirements.md`, `design.md` and `tasks.md` are named in criteria 23.1, 23.2, 23.6 and 23.7 because the document names are the externally fixed contract Kiro renders, as in the programme's first exception. The Machine Folder's name, `.sdlc/`, appears only in the Glossary.
- **Consistency without rewording.** Criterion 23.3 fixes where the Ledger lives inside the Spec Directory, which the Glossary entries for Ledger and Spec Directory already require. No moved criterion is reworded.

### Worked examples

### Worked examples

| Defect           | Rejected                                                                                            | Accepted                                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Vague            | The system shall quickly process requests                                                           | WHEN a request is received, THE System SHALL process it within 200ms                                                                    |
| Vague            | The interface shall be user-friendly                                                                | WHEN a validation error occurs, THE Console SHALL display the failing field name and the correction required                            |
| Passive          | Records shall be archived nightly                                                                   | WHILE the archive window is open, THE Archiver SHALL move records older than 90 days to cold storage                                    |
| Pronoun          | WHEN the job finishes, THE Runner SHALL notify it                                                   | WHEN a job finishes, THE Runner SHALL publish a `job.completed` event to the Notification Service                                       |
| Escape clause    | THE System SHALL retry the payment where possible                                                   | IF a payment attempt returns a retryable error, THEN THE Payment Service SHALL retry the attempt up to 3 times with exponential backoff |
| Absolute         | THE System SHALL never lose a message                                                               | IF the broker acknowledgement is not received within 5s, THEN THE Publisher SHALL re-enqueue the message with the same idempotency key  |
| Compound         | WHEN a user signs up, THE System SHALL create an account and send a welcome email and start a trial | Three criteria, one per behaviour                                                                                                       |
| Solution-bearing | THE System SHALL store sessions in Redis with a 30-minute TTL                                       | WHILE a session has been idle for less than 30 minutes, THE Session Service SHALL treat the session as active                           |
| Negative         | THE System SHALL NOT accept an expired token                                                        | IF a presented token has passed its expiry timestamp, THEN THE Gateway SHALL reject the request with status 401                         |
| Clause order     | WHEN a payout is requested, WHERE Connect is enabled, THE Ledger SHALL …                            | WHERE Connect is enabled, WHEN a payout is requested, THE Ledger SHALL …                                                                |
