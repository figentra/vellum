# Requirements Document

## Intake

**Problem:** Once Slices 1 to 3 run, the Ledger and git history hold every lifecycle transition, gate result, failure and approval. Nothing turns them into a measure of how the system performs, so rework, retry and approval latency are anecdotes. A metric that ranks people would change the behaviour it measures.

**Risk class:** critical. The slice handles **personal data**: it must produce reports that identify no individual, and refuse to group by one (criteria 1.4 and 1.5). It is small, and it does not take a lighter path, because the programme is critical and a critical-class change never takes a lightweight path.

**Lifecycle path:** full spec, both review gates, no shortcut. This is **Slice 4, measurement**, of Programme Spec `001-vellum-platform`. It depends on spec 002 (the Ledger), spec 003 (Failure Classes, retries and Attempts) and spec 004 (Gate Results, Amendments, releases and the report command's Context Metrics, criterion 004:11.1). It is designed last. It became a Child Spec on 2026-09-25, when the user applied Requirement 003:13 (old R41) to spec 001 (programme spec 001, Intake).

## Discovery

The programme's Discovery is canonical: `.agents/specs/001-vellum-platform/requirements.md`, section `## Discovery`. This slice adds nothing to it. No metrics are computed from the spec lifecycle today, which the programme's Discovery already establishes by recording that no Ledger exists.

**Sources (added for this slice):**

| Source                                                                                      | What it established                                   |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `.agents/specs/001-vellum-platform/requirements.md` at HEAD (`git show HEAD:…`), read in full | Requirement 1's text (old R35) and its Delivery slice |

## Introduction

This slice measures the system, never the people in it. The Metrics Reporter computes twelve metrics from the Ledger and git history, and aggregates each by a Metrics Scope. It produces reports that hold no individual's identity, and refuses a report grouped by one.

Requirement 1 is 001's R35, renumbered. Criterion text is unchanged.

**Users:** each role is as defined in the programme's Introduction. This slice serves the **Consumer Maintainer**, the **Platform Maintainer** and the **Reviewer**.

**Business outcome:** lead time, rework, retries, approval latency and rollback rate are facts recomputable from git, not impressions.

**In scope:** Requirement 1 below.

**Out of scope:**

- **Everything Slices 1 to 3 hold** (specs 002, 003 and 004). Context Metrics ship earlier, in 004.
- **Any metric of an individual.** A metric that identifies a person changes what it measures (criteria 1.4 and 1.5).
- The programme's Out of scope list applies unchanged.

**Measurable success:** a report over the Pilot Spec computes each metric of criterion **1.1**, and holds no individual's identity (criterion **1.4**).

## Glossary

The programme's Glossary, in `.agents/specs/001-vellum-platform/requirements.md`, is canonical for this spec. Each `THE <subject>` used below is defined there. This spec adds no term.

## Requirements

### Requirement 1: Metrics that measure the system, not the people

**Delivery slice:** 4

**User Story:** As a Consumer Maintainer, I want lifecycle metrics computed from the ledger and git, aggregated over specs and stages, so that I can see where the process is slow or failing without the metrics becoming a ranking of individuals.

#### Acceptance Criteria

1. WHEN a report is requested, THE Metrics Reporter SHALL compute lead time, cycle time, time per lifecycle stage, rework rate, failed Gates, Failure Class counts, retry counts, traceability coverage, approval latency, Amendment rate, task completion rate and release rollback rate.
2. THE Metrics Reporter SHALL aggregate each metric by a Metrics Scope.
3. THE Metrics Reporter SHALL compute each metric from the Ledger and git history of the Consumer Repository.
4. THE Metrics Reporter SHALL produce reports that hold no identity of an individual.
5. IF a report is requested grouped by an individual's identity, THEN THE Metrics Reporter SHALL refuse with exit status 2 and state that metrics measure the system.

## Assumptions

The programme's Assumptions 1 to 53, in `.agents/specs/001-vellum-platform/requirements.md`, apply to this spec and keep their numbers there. Those that bear on this slice are 19 and 32. This spec adds one:

1. **"Retry counts" in criterion 1.1 include the retry and Escalated Attempts of Requirement 003:19**, counted from Attempt Records. Include them?

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

**Stated exceptions.** The exceptions recorded in the programme's Quality Rules section apply to this spec's Requirement 1, and name it in child numbering (`005:1.M`): criterion 1.1 lists the fields of one output, and criterion 1.4 states an absence as a property of the produced report.

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
