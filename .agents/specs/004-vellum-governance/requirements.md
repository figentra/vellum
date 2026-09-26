# Requirements Document

## Intake

**Problem:** Slices 1 and 2 (specs 002 and 003) make the lifecycle checkable and controllable. They do not check the content under review, or guard merges and releases:

- no check that requirements are well-formed EARS, that a design covers every criterion, or that a plan covers every property;
- no traceability graph from requirement to release;
- no review, merge or release gate bound to an artifact version;
- no amendment impact analysis, consumer CI pipeline, or fixture-tested Platform release.

Amendment 1 adds Context Metrics, the large-read hint, the advisory interface, and OpenCode's protection plugin and policies. The user's decision of 2026-09-25 adds one more gap. A critical Artifact written by one model family is reviewed, at best, by the same family, which shares that family's blind spots.

**Risk class:** critical. This slice decides **permissions** at the merge and release boundary. It holds the Release Confirmation before an irreversible step (Requirement 7). It governs **external model traffic**: the Advisor (Requirement 13) and the cross-family reviewer (Requirement 15). It fixes the **consumer CI contract** that other repositories' pipelines depend on (Requirement 9).

**Lifecycle path:** full spec, both review gates, no shortcut. This is **Slice 3, assurance**, of Programme Spec `001-vellum-platform`. It depends on spec 002 (Slice 1) and spec 003 (Slice 2): the Ledger, the Lifecycle Engine, the Policy Engine, the Gate Runner, the Session Manager and the Model Policy. It is designed after 003. It became a Child Spec on 2026-09-25, when the user applied Requirement 003:13 (old R41) to spec 001 (programme spec 001, Intake).

## Discovery

The programme's Discovery is canonical and is not repeated here: `.agents/specs/001-vellum-platform/requirements.md`, section `## Discovery`, including its Amendment 1 discovery. Everything below is only what this slice adds. It was read in this session, on 2026-09-25.

**Current behaviour (added for this slice):**

- **No review crosses a model family.** Nothing in the repository dispatches a reviewer by model family, and no file records a model's family. `.agents/models.json` maps Claude Code's three tiers to `haiku`, `sonnet` and `opus`, one vendor's models. It maps OpenCode's three tiers to one Bedrock-hosted model of a different vendor. So basalt can reach a second model family today, through OpenCode only.
- **Review agents are all one family in Claude Code.** Each review agent in `.agents/agents/` declares a tier, and Claude Code maps each tier to one vendor's model. A Claude Code review of a Claude Code-authored Artifact is therefore same-family today.

**Repository topology, Dependencies, Ownership and Constraints:** unchanged from the programme's Discovery, with specs 002 and 003 added as dependencies. `security-compliance-reviewer` also owns the Cross-Family Review's data egress, which Requirement 003:14 governs as for any External Model Provider.

**Sources (added for this slice):**

| Source                                                                                      | What it established                                                                                                                |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `.agents/specs/001-vellum-platform/requirements.md` at HEAD (`git show HEAD:…`), read in full | Every moved requirement's text and Delivery slice line                                                                             |
| `.agents/models.json`                                                                       | Claude Code tiers map to `haiku`, `sonnet` and `opus`; OpenCode's three tiers map to one `amazon-bedrock/…` model; no family field |
| `grep -h '^tier:' .agents/agents/*.md`                                                      | Each agent declares a tier, not a model                                                                                            |
| The coordinator's brief of 2026-09-25 (user decisions)                                      | Requirement 15                                                                                                                     |

## Introduction

This slice assures the content that Slices 1 and 2 track and control. It holds:

- requirements, design and planning quality checks, and the full traceability graph;
- review, merge and release gates bound to an Artifact Version;
- amendments with impact analysis, the consumer CI pipeline, and the Platform's own fixture-tested releases.

From Amendment 1 it adds Context Metrics, the large-read hint, the advisory interface, and the Slice 3 half of assistant packaging: the OpenCode Protection Plugin and the OpenCode Assistant Policy.

Requirement 15, decided on 2026-09-25, closes the slice. Before a critical Artifact is approved, an independent reviewer from a different Model Family records advisory Findings. The Findings are shown to the Approver. They never count as an approval, and never become a Gate input. So the review informs a human decision without becoming a second approver.

Requirements 1 to 14 are 001's R25–R34, R43, R44, R45 and the Slice 3 criteria of R48, renumbered in their original order. Criterion text is unchanged except where it references another requirement. The programme's Requirement map resolves each old reference.

**Users:** each role is as defined in the programme's Introduction. This slice serves the **Spec Author**, the **Approver**, the **CI Pipeline**, the **Consumer Maintainer**, the **Platform Maintainer** and the **Reviewer**.

**Business outcome:** a merge or release happens only when the Gates bound to the reviewed Artifact Versions pass. A critical Artifact reaches its Approver with a second model family's Findings recorded beside it.

**In scope:** Requirements 1 to 15 below.

**Out of scope:**

- **Everything Slices 1, 2 and 4 hold** (specs 002, 003 and 005).
- **Letting a model decide a Gate or an approval.** A Cross-Family Review's Findings are advisory (criteria 15.8 to 15.10), as a Suggestion is (criteria 13.9 to 13.12).
- **Cross-family review below `critical`.** The user scoped it to critical-class Artifacts (criterion 15.12).
- The programme's Out of scope list applies unchanged.

**Measurable success:**

1. Each later slice's criteria hold against the Fixture Repositories (criterion **10.4**).
2. Each Fixture Repository produces equal outcomes with the Advisor enabled, disabled and unreachable (criteria **13.12** and **13.13**).
3. The report shows Context Metrics for the Pilot Spec (criterion **11.1**).
4. A critical Artifact cannot be approved without a bound Cross-Family Review Record (criterion **15.7**).
5. That record's Findings are rejected as a Gate input (criterion **15.10**).

## Glossary

The programme's Glossary, in `.agents/specs/001-vellum-platform/requirements.md`, is canonical for this spec. Terms added by spec 003, such as Role Tier and Attempt, are defined in `.agents/specs/003-vellum-orchestration/requirements.md`. Each `THE <subject>` used below is defined in one of those, or in the table below. This spec adds these terms.

| Term                       | Definition                                                                                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Model Family               | The model lineage the Model Policy records for a model, such as one vendor's model line. Two models are of different Model Families when the Model Policy records different Model Families for them.         |
| Authoring Model Family     | A Model Family the Ledger records, under criterion 15.1, for a Session that wrote the Artifact Version under review. An Artifact Version written only by Interactive Human Sessions has none.                |
| Cross-Family Review        | A review of one Artifact Version by an Agent Role whose model's Model Family differs from each Authoring Model Family, run in a Session that did not write that Artifact Version. It produces Findings only. |
| Cross-Family Review Record | A Ledger Entry recording one Cross-Family Review: the Artifact Version, the Artifact Checksum, the reviewing Agent Role, the model, the Model Family, the Findings and a UTC timestamp.                      |

## Requirements

### Requirement 1: Requirements quality checks

**Delivery slice:** 3

**User Story:** As an Approver, I want the mechanical quality rules checked before I read a requirements document, so that my review is spent on whether the requirements are right, not on whether they are well-formed.

#### Acceptance Criteria

1. IF an acceptance criterion matches none of the six EARS patterns, THEN THE Quality Checker SHALL report a Finding naming the criterion reference.
2. IF a complex-pattern criterion orders its clauses other than `WHERE`, `WHILE`, `WHEN` or `IF`, `THE`, `SHALL`, THEN THE Quality Checker SHALL report a Finding naming the criterion reference.
3. IF a criterion uses both `WHEN` and `IF`, THEN THE Quality Checker SHALL report a Finding naming the criterion reference.
4. IF a criterion's `THE` subject is not defined in the Glossary, THEN THE Quality Checker SHALL report a Finding naming the criterion reference and the subject.
5. IF a criterion contains a term from the published vague-term, escape-clause or absolute lists, THEN THE Quality Checker SHALL report a Finding naming the criterion reference and the term.
6. IF two criteria in one document have equal normalised text, THEN THE Quality Checker SHALL report a Finding naming both criterion references.
7. IF the Measurable success field cites a criterion reference the document does not define, THEN THE Quality Checker SHALL report a Finding naming the reference.
8. IF a user story names a role absent from the Users field, THEN THE Quality Checker SHALL report a Finding naming the role.
9. IF two criteria share a subject and a trigger and state different responses, THEN THE Quality Checker SHALL report a candidate-contradiction Finding naming both criterion references.
10. WHEN a requirements Artifact is submitted for review, THE Lifecycle Engine SHALL require a recorded Decision for the Risk Class and a recorded Decision for the lifecycle path.

### Requirement 2: Design quality checks

**Delivery slice:** 3

**User Story:** As an Approver, I want a design's coverage and required sections checked mechanically, so that an uncovered criterion or a missing rollback strategy is caught before approval.

#### Acceptance Criteria

1. IF a criterion of `requirements.md` has no row in `design.md`'s coverage table, THEN THE Quality Checker SHALL report a Finding naming the criterion reference.
2. IF a property lacks a Validates line, or cites a criterion reference `requirements.md` does not define, THEN THE Quality Checker SHALL report a Finding naming the property.
3. IF property numbers are not contiguous from 1, THEN THE Quality Checker SHALL report a Finding naming the first gap.
4. IF a property has no Testing Strategy entry, THEN THE Quality Checker SHALL report a Finding naming the property.
5. IF `design.md` lacks a section for data model, API contracts, error model, security model, observability, idempotency, concurrency, migration strategy, rollback strategy or ADR consistency, and the section is not marked not applicable with a reason, THEN THE Quality Checker SHALL report a Finding naming the section.
6. IF `design.md` cites an ADR whose status is Superseded or whose file does not exist, THEN THE Quality Checker SHALL report a Finding naming the ADR.

### Requirement 3: Planning quality checks

**Delivery slice:** 3

**User Story:** As an Approver, I want a plan's coverage and missing task kinds checked mechanically, so that a plan with no test task, no migration task or no rollback task is caught at plan review.

#### Acceptance Criteria

1. IF a criterion is referenced by no task, THEN THE Quality Checker SHALL report a Finding naming the criterion reference.
2. IF a property is referenced by no test task, THEN THE Quality Checker SHALL report a Finding naming the property.
3. IF a task names no executor, THEN THE Quality Checker SHALL report a Finding naming the task.
4. IF a task declares more paths than the Policy's per-task maximum, THEN THE Quality Checker SHALL report a Finding naming the task and the count.
5. IF `design.md` declares a migration strategy and no task references the migration, THEN THE Quality Checker SHALL report a missing-migration-task Finding.
6. IF `design.md` declares a rollback strategy and no task references the rollback, THEN THE Quality Checker SHALL report a missing-rollback-task Finding.
7. IF the plan holds no documentation task while the change adds a published surface, THEN THE Quality Checker SHALL report a missing-documentation-task Finding.
8. IF the Policy requires a release for the Spec's Risk Class and the plan holds no release task, THEN THE Quality Checker SHALL report a missing-release-task Finding.

### Requirement 4: The traceability graph, from requirement to release

**Delivery slice:** 3

**User Story:** As a Reviewer, I want to follow any criterion, property or task through its tests, evidence, commits, gates, merge and release, so that the answer to "what proves this?" is a query rather than an investigation.

#### Acceptance Criteria

1. THE Trace Engine SHALL build a graph linking Requirement, criterion, property, task, test, Evidence Entry, commit, Gate Result, merge and release for each Spec.
2. WHEN a trace is requested for a Spec, THE Trace Engine SHALL report each node and edge of that Spec's graph.
3. WHEN a trace is requested for one criterion, property or task, THE Trace Engine SHALL report only the nodes reachable from that element.
4. WHEN a trace is requested with machine-readable output, THE Trace Engine SHALL write one JSON document conforming to the published trace Schema.
5. IF a trace names a criterion, property or task the Spec does not define, THEN THE Trace Engine SHALL exit with status 2 and name the element.
6. IF a property is linked to no test, THEN THE Strict Verifier SHALL report FAIL and name the property.
7. IF a required review Gate has no Gate Result of pass for the current Artifact Version, THEN THE Strict Verifier SHALL report FAIL and name the Gate.

### Requirement 5: Review gates bound to an artifact version

**Delivery slice:** 3

**User Story:** As a Reviewer, I want each review to be a gate result tied to the version I reviewed, so that a review of version 3 is not counted for version 4.

#### Acceptance Criteria

1. WHEN a review Gate completes, THE Gate Runner SHALL record a Gate Result holding the Gate identifier, a status of pass, fail or warn, the Findings, the evidence references and the Artifact Version reviewed.
2. IF an Artifact's current Artifact Version differs from the Artifact Version a Gate Result records, THEN THE Gate Runner SHALL report the Gate Result as stale.
3. THE Gate Runner SHALL require the review Gates the Policy names for the Spec's Risk Class.
4. IF a required Gate's latest Gate Result is fail or stale, THEN THE Lifecycle Engine SHALL reject the next transition and name the Gate.
5. WHERE the Policy treats warn as blocking for a Gate, IF that Gate's latest Gate Result is warn, THEN THE Lifecycle Engine SHALL reject the next transition and name the Gate.

### Requirement 6: The merge gate

**Delivery slice:** 3

**User Story:** As a Reviewer, I want a merge gate that checks the whole chain and treats the merge itself as a human authorisation, so that nothing merges on a green pipeline alone unless policy says automation may.

#### Acceptance Criteria

1. WHEN a merge request changing a Spec Directory is evaluated, THE Merge Gate SHALL require Valid Approvals for requirements, design and plan, each Required Task `succeeded` with evidence, a Strict Verifier PASS, each required Gate passing, and each Policy-required changeset and documentation check passing.
2. IF a Merge Gate requirement is unmet, THEN THE Merge Gate SHALL exit with status 1 and name each unmet requirement.
3. THE Merge Gate SHALL require a merge authorisation by an Authorised Approver.
4. WHERE the Policy permits automated merge for a Risk Class, THE Merge Gate SHALL accept a merge without an Authorised Approver's merge authorisation.
5. WHEN a merge of a Spec's changes is observed on the Hosting Platform, THE Platform SHALL record a merge Ledger Entry naming the merge commit.
6. IF a merge of a Spec's changes is observed without a passing Merge Gate result, THEN THE Doctor SHALL report the Spec and the merge commit.

### Requirement 7: The release gate, and an exact confirmation before an irreversible step

**Delivery slice:** 3

**User Story:** As a Platform Maintainer or Consumer Maintainer, I want the release gate to show exactly what will be tagged and pushed and to refuse if what runs differs, so that an irreversible release is confirmed against the real values rather than the intended ones.

#### Acceptance Criteria

1. WHEN a release is requested, THE Release Gate SHALL verify version correctness, changesets, migration safety, rollback path, observability, deployment readiness, security and the post-release verification plan, as the Policy requires for the Risk Class.
2. WHEN each Release Gate check passes, THE Release Gate SHALL present a Release Confirmation showing the exact package, version, commit, tag, environment and migration set.
3. IF the package, version, commit, tag, environment or migration set about to be executed differs from the values the Release Confirmation showed, THEN THE Release Gate SHALL abort before tagging or pushing and name each differing value.
4. IF the Release Confirmation is answered from an Assistant Session, THEN THE Release Gate SHALL abort and state that release confirmation requires a human.
5. WHERE the Spec's Risk Class is `critical`, IF the release declares no rollback path, THEN THE Release Gate SHALL refuse the release and name the missing rollback path.
6. WHEN a release completes, THE Platform SHALL record a release Ledger Entry naming the package, version, commit and tag.

### Requirement 8: Amendments with impact analysis and approval invalidation

**Delivery slice:** 3

**User Story:** As a Spec Author changing an approved requirement, I want the change recorded as an amendment with its impact computed before it is accepted, so that every approval, task and test the change touches is reopened rather than silently left standing.

#### Acceptance Criteria

1. IF an approved Artifact Body changes without an Amendment recorded for that change, THEN THE Strict Verifier SHALL report FAIL and name the Artifact.
2. WHEN an Amendment is requested, THE Amendment Engine SHALL record the Artifact, the from-version, the to-version, the affected criteria, properties, tasks and tests, and the approvals invalidated.
3. WHEN impact is requested for a criterion, property or task, THE Amendment Engine SHALL report the Impact Graph of that element.
4. IF an Amendment is accepted without an Impact Graph computed for the Amendment's to-version, THEN THE Amendment Engine SHALL reject the acceptance and name the Amendment.
5. WHEN an Amendment is accepted, THE Amendment Engine SHALL set each affected task whose Task State is `succeeded` to `pending` and keep that task's Evidence Entries in the Ledger.
6. WHEN an Amendment is accepted, THE Amendment Engine SHALL report the approvals the Amendment invalidates as Invalidated Approvals.
7. IF an Amendment renumbers a criterion or property that another Artifact or the Ledger references, THEN THE Amendment Engine SHALL reject the Amendment and name each reference.

### Requirement 9: The consumer CI pipeline

**Delivery slice:** 3

**User Story:** As a CI Pipeline, I want a published sequence of Platform checks and merge-request checks keyed to what changed, so that every consumer enforces the same chain in the same order.

#### Acceptance Criteria

1. THE CI Integration SHALL run the Doctor, the Protocol Validator, Check Mode, the Trace Engine, the Strict Verifier and the Policy Engine's checks in that order, ahead of the Consumer Repository's own tests.
2. WHEN a merge request changes a requirements Artifact, THE CI Integration SHALL run impact analysis for the changed criteria.
3. WHEN a merge request changes a design Artifact, THE CI Integration SHALL verify the validity of the design approval.
4. WHEN a merge request changes a plan Artifact, THE CI Integration SHALL verify the validity of the plan approval.
5. THE CI Integration SHALL publish job definitions for GitLab CI and for GitHub Actions.
6. THE CI Integration SHALL run each check with read-only access to the Consumer Repository.
7. IF a CI Integration step exits with a non-zero status, THEN THE CI Integration SHALL fail the pipeline and name the step.

### Requirement 10: The Platform's own releases, tested against fixtures

**Delivery slice:** 3

**User Story:** As a Consumer Maintainer, I want every Platform release to have passed a conformance suite and a fixture repository for each assistant, so that an upgrade is safe to take without my repository being the test.

#### Acceptance Criteria

1. THE Platform Release Pipeline SHALL version each release according to Semantic Versioning 2.0.0.
2. WHEN a release is prepared, THE Platform Release Pipeline SHALL publish release notes, migration notes and a compatibility matrix naming the supported Schema Versions and Assistants.
3. WHEN a release is prepared, THE Platform Release Pipeline SHALL run the conformance suite.
4. WHEN a release is prepared, THE Platform Release Pipeline SHALL run each Fixture Repository.
5. IF a conformance case or a Fixture Repository fails, THEN THE Platform Release Pipeline SHALL refuse the release and name the failing case or Fixture Repository.
6. WHEN a release is prepared, THE Platform Release Pipeline SHALL require a recorded confirmation by a human that Kiro renders each task line of the Kiro Fixture.
7. WHEN a release is published, THE Platform Release Pipeline SHALL sign the release artifact.
8. IF a release's Schema Version changes, THEN THE Platform Release Pipeline SHALL require a migration step and a Conformance Case for that change.

## Requirements added by Amendment 1

Requirements 11 to 14 were added to spec 001 by Amendment 1 on 2026-09-25, as old R43 to R45 and R48 (Slice 3 criteria).

### Requirement 11: Context metrics

**Delivery slice:** 3

**User Story:** As a Consumer Maintainer, I want the report to show each context bundle's size against the documents it replaced, aggregated across the system, so that I can see whether context economy works without measuring any person.

#### Acceptance Criteria

1. WHEN a report is requested, THE Metrics Reporter SHALL report the Context Metrics of the Context Bundle for each task of each non-Legacy Spec in the requested Metrics Scope.
2. THE Metrics Reporter SHALL compute Context Metrics by recomputing each Context Bundle from the Consumer Repository's content.
3. THE Metrics Reporter SHALL aggregate Context Metrics by Metrics Scope.
4. THE Metrics Reporter SHALL produce Context Metrics that hold no identity of an individual or of a Session.
5. IF a Context Bundle cannot be computed for a task, THEN THE Metrics Reporter SHALL exclude the task from the aggregate and name the task and the reason.
6. WHEN the requested Metrics Scope holds no task, THE Metrics Reporter SHALL report a Context Bundle count of zero and report the size ratio as not applicable.
7. WHEN a report is requested, THE Metrics Reporter SHALL report the number of task starts that received full Artifacts in place of a Context Bundle (criterion 003:15.3).

### Requirement 12: An optional large-read hint

**Delivery slice:** 3

**User Story:** As a Consumer Maintainer, I want an assistant that is about to read a large file pointed at a context bundle or the reader tier, without the read ever being stopped, so that the cheaper path is visible where the assistant can show it and nothing changes where it cannot.

#### Acceptance Criteria

1. WHERE an Assistant supports a Pre-Read Hook, WHEN an Assistant Session reads a file larger than the Large-Read Threshold, THE Read Hint Hook SHALL show a Large-Read Hint naming the file and the file's size.
2. WHEN the Read Hint Hook shows a Large-Read Hint for an Artifact, THE Read Hint Hook SHALL name the command that produces a Context Bundle for that Artifact's Spec.
3. WHEN the Read Hint Hook shows a Large-Read Hint for a file other than an Artifact, THE Read Hint Hook SHALL suggest delegating the read to an Agent Role assigned the `reader` Model Tier.
4. WHEN the Read Hint Hook handles a read, THE Read Hint Hook SHALL let the read proceed.
5. IF the Read Hint Hook encounters an error, THEN THE Read Hint Hook SHALL exit with the status the Assistant treats as permitting the read.
6. WHEN a file read is at most the Large-Read Threshold, THE Read Hint Hook SHALL let the read proceed and show no Large-Read Hint.
7. WHERE the Policy declares no Large-Read Threshold, THE Read Hint Hook SHALL let each read proceed and show no Large-Read Hint.
8. WHERE an Assistant supports no Pre-Read Hook, THE Platform SHALL produce the same Artifacts, Ledger Entries and exit statuses that the Platform produces for an Assistant with the Read Hint Hook installed.

### Requirement 13: An optional advisory interface

**Delivery slice:** 3

**User Story:** As a Spec Author, I want an optional advisor to suggest a risk class, a failure class, a model tier, a possibly vague criterion or a near-duplicate spec, recorded as a suggestion and never as a decision, so that I get a useful first guess while every outcome stays identical with the advisor switched off.

**Table 13.A — Advisory Uses.**

| Advisory Use                                           | Suggestion type                    | Decided by                                              | Governing criteria |
| ------------------------------------------------------ | ---------------------------------- | ------------------------------------------------------- | ------------------ |
| Risk Class, before human confirmation                  | choice among the four Risk Classes | a human Decision                                        | 003:1.8, 1.10      |
| First-guess Failure Class                              | choice among the Failure Classes   | the Failure Classifier, or a human Decision             | 003:5.1, 003:5.4   |
| `reader` or `frontier` routing of a Read-Only Question | choice of Model Tier               | the Policy Engine                                       | 003:12.1–003:12.3  |
| Possibly vague criterion                               | score                              | the Quality Checker's published lists, and the Approver | 1.5                |
| Near-duplicate Spec                                    | probability per pair of Specs      | a human Decision                                        | —                  |

#### Acceptance Criteria

1. THE Platform SHALL treat the Advisor Port as disabled unless the Consumer Configuration enables an Advisor.
2. WHERE the Consumer Configuration enables an Advisor, THE Advisor Port SHALL request Suggestions only for the Advisory Uses in Table 13.A.
3. IF an Advisor returns a Suggestion for a use outside Table 13.A, THEN THE Advisor Port SHALL discard the Suggestion and report a Finding naming the Advisor and the use.
4. IF a Suggestion fails the published Suggestion Schema for the Suggestion's Advisory Use, THEN THE Advisor Port SHALL discard the Suggestion and report a Finding naming the Advisor and the failing field.
5. WHEN the Advisor Port accepts a Suggestion, THE Advisor Port SHALL write a Suggestion Record.
6. WHEN a Decision presents a Suggestion, THE Decision Renderer SHALL label the Suggestion as suggested and name the Advisor.
7. WHEN a Decision presents a Suggestion, THE Decision Renderer SHALL keep the Prompt's recommended option first.
8. THE Platform SHALL take each decision an Advisory Use informs from the source Table 13.A names in the Decided by column.
9. IF a Gate input is a Suggestion, THEN THE Gate Runner SHALL reject the input and name the Suggestion Record.
10. IF an Approval Record cites a Suggestion, THEN THE Approval Verifier SHALL reject the Approval Record and name the record identifier.
11. IF an Evidence Entry cites a Suggestion, THEN THE Strict Verifier SHALL report FAIL and name the Evidence Entry.
12. WHEN a command runs with an Advisor enabled, THE Platform SHALL produce the same Effective Lifecycle States, Gate Results, Valid Approvals, Evidence Entries, Task States and exit statuses that the same command produces with the Advisor disabled.
13. IF the Advisor is unreachable or returns no Suggestion within the Advisor Timeout, THEN THE Advisor Port SHALL continue without a Suggestion and record the Advisor as unavailable.
14. WHEN the Advisor Port is about to send content to an Advisor, THE Advisor Port SHALL submit the send to the Egress Guard.
15. IF the Egress Guard refuses a send to an Advisor, THEN THE Advisor Port SHALL continue without a Suggestion and name the refusal.

### Requirement 14: Assistant packaging and distribution from one skill set — OpenCode protection and policies (Slice 3 criteria)

**Delivery slice:** 3. This requirement holds the Slice 3 criteria of assistant packaging: the OpenCode Protection Plugin and the OpenCode Assistant Policy (programme map: old criteria 48.18–48.22). Its Slice 2 criteria are Requirement 003:17, which this requirement depends on.

**User Story:** As a Consumer Maintainer, I want the Claude Code, Kiro and OpenCode packages built from one set of skills, each bundling the same read-only query server and each getting the same rules and protections, so that no assistant gets different lifecycle behaviour and a reviewer without a shell sees the same context as an executor with one.

#### Acceptance Criteria

1. IF an OpenCode session attempts to edit a file that carries a Provenance Marker, THEN THE OpenCode Protection Plugin SHALL refuse the edit and name the Canonical Source file.
2. IF an OpenCode session attempts to write content that matches a Secret Pattern, THEN THE OpenCode Protection Plugin SHALL refuse the write and name the Secret Pattern's name.
3. THE OpenCode Package SHALL provide an Assistant Policy that refuses the approve command to each OpenCode agent.
4. THE OpenCode Package SHALL provide an Assistant Policy whose provider allow-list admits only the External Model Providers the Egress Policy permits.
5. IF the OpenCode Assistant Policy's provider allow-list differs from the External Model Providers the Egress Policy permits, THEN THE Doctor SHALL report a Projection FAIL naming each differing External Model Provider.

## Requirements added on 2026-09-25 (programme restructure)

Requirement 15 was decided by the user on 2026-09-25, after the restructure of spec 001 into this programme. It carries no old `R<N>` number and has no row in the programme's Requirement map.

### Requirement 15: Cross-family review of a critical Artifact, advisory only

**Delivery slice:** 3

**User Story:** As an Approver of a critical-class spec, I want an independent reviewer running a different model family from the one that wrote the Artifact to record advisory findings before I approve, so that a blind spot one model family shares with itself is surfaced to me, while the findings never approve anything and never decide a gate.

#### Acceptance Criteria

1. WHEN an Assistant Session writes an Artifact of a Spec whose Risk Class is `critical`, THE Session Manager SHALL record the Session's model and that model's Model Family in the Ledger.
2. WHEN an Artifact Version of a Spec whose Risk Class is `critical` enters `in-review`, THE Platform SHALL dispatch a Cross-Family Review of that Artifact Version to an Agent Role whose model's Model Family differs from each Authoring Model Family.
3. IF the Model Policy admits no model for the reviewing Agent Role whose Model Family differs from each Authoring Model Family, THEN THE Platform SHALL report INCONCLUSIVE, exit with status 2 and name the Artifact Version and the Authoring Model Families.
4. IF a review's model has a Model Family equal to an Authoring Model Family, THEN THE Platform SHALL refuse to record the review as a Cross-Family Review Record and name the Model Family.
5. IF a review ran in a Session that wrote the reviewed Artifact Version, THEN THE Platform SHALL refuse to record the review as a Cross-Family Review Record and name the Session.
6. WHEN a Cross-Family Review completes, THE Platform SHALL append a Cross-Family Review Record to the Ledger holding the Artifact Version, the Artifact Checksum, the reviewing Agent Role, the model, the Model Family, the Findings and a UTC timestamp.
7. WHILE an Artifact Version of a Spec whose Risk Class is `critical` has no Cross-Family Review Record bound to the Artifact's current Artifact Checksum, THE Lifecycle Engine SHALL reject the transition that approves that Artifact and name the missing Cross-Family Review.
8. THE Lifecycle Engine SHALL treat the Cross-Family Review precondition of criterion 15.7 as met by the existence of a bound Cross-Family Review Record, independent of the Findings the record holds.
9. IF a Cross-Family Review Record is cited as an Approval Signal, THEN THE Approval Verifier SHALL reject the citation and name the Cross-Family Review Record.
10. IF a Cross-Family Review Record's Findings are presented as a Gate input, THEN THE Gate Runner SHALL reject the input and name the Cross-Family Review Record.
11. WHEN status is requested for a Spec whose Risk Class is `critical`, THE Status Reporter SHALL report, for each Artifact in review, the Finding count of each Cross-Family Review Record bound to that Artifact's current Artifact Checksum.
12. WHILE a Spec's Risk Class is `low`, `standard` or `high`, THE Lifecycle Engine SHALL evaluate the Spec's approval transitions without the Cross-Family Review precondition of criterion 15.7.

## Assumptions

The programme's Assumptions 1 to 53, in `.agents/specs/001-vellum-platform/requirements.md`, apply to this spec and keep their numbers there. Those that bear on this slice are 2, 3, 9, 12, 18, 20, 32 to 37, 43, 44, 48, 49, 52 and 53. The assumptions below are added by this spec. Each can be answered in one word or one correction.

1. **The review is a precondition of approval; its Findings are not** (criteria 15.7 and 15.8). "Before approval" is read as a critical Artifact's approval transition waiting until a bound Cross-Family Review Record exists. The record's content never blocks. The alternative is a review that runs before approval but never holds approval up. Precondition?
2. **An Artifact Version written only by humans still gets a Cross-Family Review.** Its Authoring Model Families are empty, so any reviewing model qualifies. Correct?
3. **The Model Policy records each model's Model Family.** basalt's `.agents/models.json` carries no family field today, so design adds one or derives it. Recorded?
4. **The cross-family reviewer's sends are governed by the Egress Policy** (Requirement 003:14), like any External Model Provider's. A reviewer that the Egress Policy does not admit for the Artifact's Content Classification yields the INCONCLUSIVE of criterion 15.3. Correct?
5. **A Cross-Family Review Record is bound to one Artifact Checksum.** An edit to the Artifact after review needs a new review before approval, as an edit after approval voids the approval (Requirement 002:8). Correct?

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

**Stated exceptions.** The exceptions recorded in the programme's Quality Rules section apply to Requirements 1 to 14 of this spec, and name them in child numbering (`004:N.M`). The criterion text is unchanged, so the exceptions are unchanged. Requirement 15 adds these:

- **One thought per requirement.** Criterion 15.6 lists the fields of one record, tested as one assertion over a named set. Criterion 15.3's "report INCONCLUSIVE, exit with status 2" is one outcome under the Exit Status Convention, as in criterion 002:19.12.
- **Solution-free.** No model, vendor or family is named in any criterion. Model Families are Model Policy data.
- **Consistency without rewording.** Criterion 15.7 adds a Transition Precondition to Table 002:5.A's approval rows for critical Specs, as criterion 002:20.3 does for coverage. Table 002:5.A is not reworded.

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
