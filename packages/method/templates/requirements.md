# Requirements Document

<!--
  TEMPLATE — the Vellum method's spec engine, document 1 of 3.
  Produced by the `spec-new` skill. Consumed by the `spec-design` skill.

  Rules that govern this document:
    - Every acceptance criterion MUST match exactly one of the six EARS patterns.
    - Every system name used in a criterion MUST be defined in the Glossary first.
    - Criteria are numbered within their requirement, so `2.3` means
      Requirement 2, criterion 3. Design and tasks reference those numbers.
    - Replace every [bracketed placeholder]. Delete every HTML comment.
    - No implementation detail: state WHAT the system does, never HOW.
-->

## Intake

<!--
  Written by `spec-new` Step 1. Three lines, and the reason the chosen path is
  sufficient. A reader months later needs to know whether a missing design document
  was a decision or an omission.
-->

**Problem:** [the problem, not the proposed solution]

**Risk class:** [critical | standard | low] — [why]

**Lifecycle path:** [full spec, both review gates | quick spec, design and tasks skipped] — [why that is sufficient]

## Discovery

<!--
  Written by `spec-new` Step 3. What the system does TODAY, established by reading it,
  before anything is required of it. This is the only place that record exists: there is
  no research.md, and a finding that is not written here has to be re-derived by the next
  agent, from scratch, probably differently.

  DEPTH FOLLOWS THE RISK CLASS ABOVE — this is not optional ceremony to be performed at
  full weight on every change:

    low       Current behaviour and Sources only. Delete the other four sub-headings.
              Two or three sentences and a handful of file paths is a complete discovery
              for a change that is reversible in one commit.
    standard  All six. Brief — a line or two each, and only what bears on this change.
    critical  All six, and every claim in Current behaviour carries a Sources row. A
              claim about money, permissions or personal data that nobody can retrace
              is the claim that turns out to be wrong.

  "Read the code" is the method. A statement here that was recalled rather than read is
  the defect this section exists to prevent, so cite where you read it.
-->

**Current behaviour:** [What happens today, in the absence of this change — including
"nothing does this yet", which is a finding and not an empty answer. Describe the
observable behaviour, not the implementation, except where the implementation is the
constraint.]

**Repository topology:** [Which members, directories and files this change lands in or
next to. Real paths. If the work has no obvious home, say so here — placement is an
architecture question and belongs in design.md, but the ambiguity is discovered here.]

**Dependencies:** [What this work would rest on: workspace members, catalog entries with
the version actually pinned, external services, generated artefacts. Read the lockfile or
the manifest; do not recall a version.]

**Ownership:** [Who owns each thing above — the roster agent named in the Vellum
method's `ROSTER.md` for a repository concern, a named team or person for anything
outside it. An owner who would block this change is named here, not discovered at
review.]

**Constraints:** [What is already decided and therefore not open: the ADRs and rules that
govern this area, enforced limits, compatibility this change must keep. Link them; do not
restate them — a copied rule goes stale silently.]

**Sources:** [Every file, document and command the statements above rest on. This is the
list that makes discovery auditable rather than assertable.]

| Source                           | What it established                |
| -------------------------------- | ---------------------------------- |
| [path, document, or command run] | [the specific fact, not "context"] |

## Introduction

<!--
  Written by `spec-new` Step 3b — the product definition. Who has the problem, what
  changes for them, and how anyone would later know whether it worked. The five bold
  fields below are required at standard and critical risk; at low risk keep the prose,
  **Users** and **Out of scope**, and delete the rest.
-->

[Two to five paragraphs. State the problem this feature solves, who has the problem,
and what the world looks like once it is solved. Name the boundary of the work
explicitly — what is in scope and what is deliberately out of scope. Do not
describe a solution architecture here; that belongs in design.md.]

**Users:** [Who acts on this or is acted upon — each role named as it appears in the
Glossary and in the user stories below. "Developers" is a defect; "the agent running
`spec-design`", "a reviewer on a fork MR" are users.]

**Business outcome:** [What is different for this repository or its users once this
ships, in one sentence. Not the feature restated — the consequence of having it.]

**In scope:** [bulleted or comma-separated list of the behaviours this spec covers]

**Out of scope:** [the adjacent things a reader would reasonably assume are included
but are not, each with a one-line reason. These are non-goals: a decision, not an
oversight, and the difference is what the reason records.]

**Measurable success:** [How anyone decides afterwards whether this worked, stated so
that the answer is a fact rather than an opinion. Name the check, count, or observation
and its target. "A newly scaffolded member passes `pnpm validate` with no manual edit"
is measurable; "better documentation" is not. Where the measure is an acceptance
criterion below, say which — it is the same statement, and it should not drift into two.]

## Glossary

<!--
  Every `THE <system> SHALL` subject below must appear here, plus every domain
  noun a reader could interpret two ways. Define the term, not the implementation.
  A term with no definition is a defect: reviewers reject the document.
-->

| Term             | Definition                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| [System Name]    | [What this named system is and what it is responsible for. This is the exact string that appears after `THE` in the criteria below.] |
| [Subsystem Name] | [A component named separately because criteria address it directly.]                                                                 |
| [Domain Noun]    | [A business term with a precise meaning in this spec — e.g. "Settled Transaction", "Active Session".]                                |
| [Actor Name]     | [A human or external system role referenced by triggers.]                                                                            |

## Requirements

### Requirement 1: [Short imperative title — the capability, not the mechanism]

**User Story:** As a [role], I want [feature], so that [benefit]

#### Acceptance Criteria

<!--
  The six EARS patterns. Pick exactly one per criterion.

    1. Ubiquitous     THE <system> SHALL <response>
    2. Event-driven   WHEN <trigger>, THE <system> SHALL <response>
    3. State-driven   WHILE <condition>, THE <system> SHALL <response>
    4. Unwanted event IF <condition>, THEN THE <system> SHALL <response>
    5. Optional       WHERE <option>, THE <system> SHALL <response>
    6. Complex        [WHERE …] [WHILE …] [WHEN/IF …] THE <system> SHALL <response>
                      Clause order is fixed: WHERE -> WHILE -> WHEN/IF -> THE -> SHALL

  One thought per criterion. If a criterion contains "and" joining two
  independently testable behaviours, split it into two criteria.
-->

1. THE [System Name] SHALL [observable, measurable response]
2. WHEN [a discrete trigger occurs], THE [System Name] SHALL [response, with a measurable bound]
3. WHILE [a continuous state holds], THE [System Name] SHALL [response]
4. IF [an unwanted condition occurs], THEN THE [System Name] SHALL [the recovery or rejection behaviour]
5. WHERE [an optional feature is enabled], THE [System Name] SHALL [response]
6. WHERE [option], WHILE [state], WHEN [trigger], THE [System Name] SHALL [response]

### Requirement 2: [Short imperative title]

**User Story:** As a [role], I want [feature], so that [benefit]

#### Acceptance Criteria

1. WHEN [trigger], THE [System Name] SHALL [response]
2. IF [unwanted condition], THEN THE [System Name] SHALL [response]

<!-- Add further `### Requirement N` sections in the same shape. -->

## Non-Functional Requirements

<!--
  Optional section. Keep it only if there are real, measurable constraints.
  Every entry is still EARS, and still measurable — "fast" is a defect,
  "within 200ms at the 95th percentile" is a requirement.
-->

### Requirement N: [Performance | Security | Availability | Compliance | …]

**User Story:** As a [role], I want [constraint], so that [benefit]

#### Acceptance Criteria

1. WHEN [trigger], THE [System Name] SHALL [response] within [N] [unit] at the [Nth] percentile
2. IF [failure condition], THEN THE [System Name] SHALL [degraded but defined behaviour]

## Quality Rules Applied To This Document

<!--
  Keep this section. It is the checklist a reviewer runs, and the rules the
  authoring model was held to. Do not replace it with prose.
-->

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
