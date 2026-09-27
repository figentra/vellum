---
name: spec-new
description: Start a new spec. Creates <NNN>-<slug>/requirements.md under the repository's resolved specs root, with EARS-formatted acceptance criteria and an INCOSE-checked glossary, generating a complete first draft without asking clarifying questions first. Use when the user says "new spec", "spec this out", "write requirements for", "start a spec", or describes a feature to be built before any code exists. Supports --quick for small changes that do not warrant full EARS.
---

# spec-new — create a spec and write its requirements

You create the first of three documents in a spec:
`requirements.md` -> `design.md` -> `tasks.md`.

You own `requirements.md` only. Do not write design. Do not write tasks. Do not
write code.

**Persona:** this contract is run by the `spec-author` agent (`agents/spec-author.md` in the method), on the **frontier** tier. Dispatch it as that agent rather than inline when the work is delegated — the pin is what makes the model choice deliberate instead of whatever the session happens to be running.

## Operating rule: draft first, questions never

**Generate a complete first draft without asking the user any clarifying
questions.** Do not open with a questionnaire. Do not ask which of three
interpretations they meant. Make the best-supported interpretation, write the
whole document, and record every genuine ambiguity as an explicit assumption the
user can correct in one pass.

A reviewer correcting a concrete draft is fast. A user answering eight questions
before seeing anything is slow and produces a worse document.

### An unknown you cannot responsibly guess gets a marker, not a guess

Most gaps have a best-supported reading: take it, and record it as an assumption. A
few do not — nothing in the request or the repository favours one answer, and a wrong
guess changes what gets built: who may perform an action, what happens to personal
data, how long something is kept, a numeric target, whether a capability is in scope.
Guessing there writes a plausible-looking criterion that is wrong in the way nobody
checks.

For those, write the marker where the answer belongs — inside the criterion, Glossary
entry, Introduction field or assumption it blocks:

```markdown
3. WHEN an export completes, THE Export Service SHALL retain the export file for [NEEDS CLARIFICATION: how long is a completed export kept?]
```

The form is exact: `[NEEDS CLARIFICATION: <the question, ending in ?>]`. The
`spec-clarify` skill finds markers by that text and resolves them with the user, so a
variant spelling is a marker nobody will find.

- A marker does not excuse the rest of the draft. Write the whole criterion around it.
- A marker is for what you **cannot** find out. Read the repository first; asking the
  user what the code already says is a question you owed yourself.
- Keep them few. A draft with more markers than `spec-clarify` asks in one session
  (five) is a request that was not ready to specify — say so in Step 6 instead.
- A criterion carrying a marker cannot be tested as written. That is the point: it
  makes the gap impossible to approve by accident.

## Step 1 — intake: classify the work, then decide the mode

Before choosing a mode, state three things. They take one line each and they are what
makes "is this spec-sized?" an explicit decision rather than a silent judgement.

1. **Normalized problem statement.** The request restated as the problem, not the
   proposed solution. "Add a retry flag" is a solution; "a transient provider outage
   fails the whole batch" is the problem. If the user gave you a solution, say what
   problem it solves — and if you cannot, that is the first thing to surface.

2. **Risk class.** Pick one and say why:

   | Class        | Applies when                                                                                      |
   | ------------ | ------------------------------------------------------------------------------------------------- |
   | **critical** | money, credentials, personal data, permissions, data loss, or an externally visible contract      |
   | **standard** | multiple interacting behaviours, a new member, a published API, or work several people will touch |
   | **low**      | one behaviour, one obvious outcome, reversible in a single commit                                 |

3. **Lifecycle path**, following from the class:

   | Class    | Path                                                                                        |
   | -------- | ------------------------------------------------------------------------------------------- |
   | critical | Full spec. Both review gates. No shortcut for speed — this is the case the gates exist for. |
   | standard | Full spec. Both review gates.                                                               |
   | low      | `--quick` spec. `spec-design` and `spec-tasks` are usually skipped; say so when they are.   |

**A critical-class change never takes a lightweight path**, however small the diff. A
one-line change to a permission check is a one-line change to a permission check.

**Skipping the other two documents is a statement about who executes.** A spec with
requirements alone is run by a person, or by an agent handed the file, straight from
its acceptance checklist — `spec-run` refuses it. Step 5 says what to tell the user.

Record all three in the requirements document's `## Intake` section. Recording the path
_and the reason it is sufficient_ is the point — a reader six months later needs to know
whether a missing design document was a decision or an omission.

## Step 1a — decide the mode

The risk class above decides it. Confirm, and state it plainly:

**Full spec (default).** The change has multiple interacting behaviours, touches
money, permissions, data integrity, external contracts, concurrency, or state
machines; or several people will implement it; or it will outlive the memory of
whoever wrote it.

**Quick spec (`--quick`).** The user passed `--quick`, or the change is a single
small behaviour with an obvious correct outcome and no invariants worth stating.

Say this plainly to the user when you choose: **EARS is right for a ledger
ledger and absurd for a dark-mode toggle.** A spec whose ceremony exceeds its
subject gets ignored, and an ignored spec is worse than none. If the request
arrived without `--quick` but is clearly toggle-sized, write the quick spec and
say in one line why — do not ask permission first.

Go to Step 2 for either mode. Quick mode diverges at Step 5.

## Step 2 — derive the spec directory

**Where specs live.** Vellum reads specs from exactly one place: `.agents/specs/` at
the root of the git repository that contains the working directory — it finds that
root from any subdirectory. `vellum status --json` has no `root` field; below,
`<specs-root>` means `<repository root>/.agents/specs`. Do not write a spec anywhere
else: a spec in `.claude/specs/` or a root `specs/` is invisible to every `vellum`
command, and the next invocation opens a duplicate for work that already has one.

Where a repository projects `.agents/` into `.claude/` (one symlink per spec, via
its own sync tool), `.agents/` is the side Vellum reads and the side you read and
write — authoring the same spec into both trees makes that sync tool
report a permanent conflict and fails the repository's verify gate.

1. **Read the current state with the stage detector.** Do not `ls` and infer:

   ```bash
   vellum status --json
   ```

   Every skill reads the stage from this one command rather than from its own directory listing, so no two callers can disagree about where a spec is.

   Each entry's `specId` is `<NNN>-<slug>`; the documents that exist are the keys of
   its `artifacts` (or its `legacyStage`, for a legacy spec). The JSON has no `stage`
   field — the `/spec` skill's Step 1 gives the full field list and how the stage
   follows from the documents present.

2. **Determine `NNN`.** Highest existing number plus one, three digits, zero-padded,
   taking the numbers from the `specs[].number` values the detector just reported for
   `<specs-root>`. Never from an `ls` of a directory you picked yourself: a number
   derived from one root while the spec is written into another collides the moment
   the two are reconciled. No specs → `001`.

3. **Derive the slug.** From the feature's name, not the user's sentence: lowercase;
   spaces and underscores to hyphens; drop every character that is not `a-z`, `0-9`
   or `-`; collapse repeated hyphens; strip leading and trailing hyphens; two to four
   words. `"Add scheduled CSV exports"` → `scheduled-csv-exports`.

4. **Check for a collision — and route on the existing spec's stage.** If a spec with
   the same slug exists under any number, **do not create a second one.** Creating
   `002-<slug>` beside `001-<slug>` splits one piece of work across two specs and
   breaks every `<requirement>.<criterion>` back-reference. Instead, report which spec
   exists and use `AskUserQuestion` with the options for its stage:

   | Existing stage | Offer                                                                                                                                                                                    |
   | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `empty`        | **Write the requirements** (continue in this skill, into the existing directory) · **Delete the empty spec**                                                                             |
   | `requirements` | **Revise the requirements** (this skill) · **Clarify the requirements** (`spec-clarify`) · **Proceed to design** (`spec-design`) · **Start a genuinely different spec** under a new slug |
   | `design`       | **Proceed to tasks** (`spec-tasks`) · **Revise the requirements** (this skill — warn that design references criterion numbers) · **Revise the design** (`spec-design`)                   |
   | `tasks`        | **Run the spec** (`spec-run`) · **Audit traceability** (`spec-verify`) · **Revise an earlier document**, naming which                                                                    |
   | `invalid`      | Stop. Report the missing document and let the user decide — never auto-repair a broken chain.                                                                                            |

   Always include **"Start a genuinely different spec"** when the user may simply have
   reused a name. Only that answer creates a new `NNN`.

5. **Never renumber or renumber-around.** A spec's number is permanent once any later
   document references it.

6. Create the directory under the resolved specs root, then project it if this
   repository projects:

   ```bash
   mkdir -p <specs-root>/<NNN>-<slug>
   ```

   If the repository has a sync tool that projects `.agents/` into `.claude/`
   (`pnpm agents:sync` and equivalents), run it after writing `requirements.md`
   so the spec is visible to every assistant, not only this one. If it has no
   such tool, there is nothing to project and nothing to run.

Tell the user the path you chose before writing into it.

## Step 3 — discovery: establish what the system does today

You cannot write a correct requirement about a system you have not read. A criterion
that says `WHEN a member is scaffolded, THE Validator SHALL reject a literal version`
is only checkable if you know what the validator does now — and if you guessed, the
criterion either restates existing behaviour or contradicts it, and nobody can tell
which until implementation.

So: **read first, then require.** Record what you read in the `## Discovery` section of
`requirements.md`, under these six headings:

| Heading                 | What it records                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Current behaviour**   | What happens today without this change. "Nothing does this yet" is a finding, not a blank.                                                    |
| **Repository topology** | Which members, directories and files this lands in or beside. Real paths.                                                                     |
| **Dependencies**        | Members, catalog entries at the version actually pinned, external services, generated artefacts.                                              |
| **Ownership**           | The roster agent (the method's `ROSTER.md` (`../../ROSTER.md` relative to this skill's directory)) or person who owns each thing named above. |
| **Constraints**         | The ADRs and rules already governing this area. Link them; never restate them.                                                                |
| **Sources**             | Every file, document and command the statements above rest on, each with the fact it established.                                             |

### Depth follows the risk class, and nothing else

The point of Step 1's risk class is that it decides how much of this is worth doing.
A product brief for a typo fix is the failure mode that makes people stop writing specs.

| Risk class | Discovery depth                                                                                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `low`      | **Current behaviour** and **Sources** only. Delete the other four headings from the document — do not leave them empty.                                                             |
| `standard` | All six, a line or two each, covering only what bears on this change.                                                                                                               |
| `critical` | All six, and every claim under **Current behaviour** carries a Sources row. An unretraceable claim about money, permissions or personal data is the one that turns out to be wrong. |

### What discovery is not

- **Not design.** You are recording what exists, not choosing what to build. The moment
  you write "we should use X", stop — that is `spec-design`'s Overview.
- **Not exhaustive.** Read what bears on this change. A discovery section that inventories
  the repository is one nobody reads, which is the same as not writing it.
- **Not recalled.** Every statement is something you read in this session. If you cannot
  name the source, do not write the statement.

### Why it lives here and not in a research document

the method's `README.md` allows a spec exactly three documents, and this is why the
rule survives contact with a stage that produces research: discovery goes into the
document that consumes it. Requirements are written _from_ discovery, so a criterion
and the evidence it rests on stay one scroll apart, and the reviewer checking whether a
criterion is true about the current system has the citation in front of them.

`design.md`'s "Research summary" is a different question and keeps its own section:
discovery asks **what does this system do**, design research asks **what should we build
it out of** — library capabilities, prior art, options rejected. Answering the second in
`requirements.md` is a solution leaking into requirements; answering the first in
`design.md` records it one stage after the stage that needed it.

## Step 3b — product definition: who it is for, and how anyone will know it worked

With the system understood, define the change in product terms. This fills the
`## Introduction` section: the prose, plus five labelled fields.

- **Users** — each role named exactly as the Glossary and the user stories will name it.
  A role that appears in a user story and nowhere else is a role nobody has checked.
- **Business outcome** — what is different once this ships, in one sentence. The
  consequence, not the feature restated.
- **In scope** — the behaviours this spec covers.
- **Out of scope** — the non-goals. Each carries its one-line reason: the reason is what
  makes it a decision rather than an oversight, and it is the line that stops the same
  question being reopened in review.
- **Measurable success** — how anyone decides afterwards whether this worked, stated so
  the answer is a fact. Name the check, count or observation and its target. Where the
  measure is one of the acceptance criteria below, say which; the same statement in two
  places drifts into two different statements.

At `low` risk, keep the prose, **Users** and **Out of scope**; delete the other three.
A one-behaviour change has a business outcome, but writing it down costs more than it
returns.

### The overlap with acceptance criteria, resolved

Measurable success and the acceptance criteria answer the same question at two
altitudes, and letting both claim authority is how a spec ends up contradicting itself.
The rule: **the acceptance criteria are authoritative.** Measurable success names the one
or two criteria that constitute "this worked" and points at them by number. It never
states a measure that no criterion below enforces — if it does, that measure is a
missing requirement, so write the requirement instead.

## Step 3c — establish the vocabulary

Grep for the domain nouns in the request so your Glossary matches the names the codebase
already uses, and read the repository's own conventions (`README.md`, `AGENTS.md`,
`CLAUDE.md`, `.agents/rules/`). Discovery has already told you where the boundary sits;
this is about calling things what they are already called.

Do not design the solution. Do not read every file that might be touched.

## Step 4 — write the requirements (full mode)

Copy the `requirements.md` template (`.agents/templates/requirements.md` in the repository when it has one, otherwise `../../templates/requirements.md` relative to this skill's directory) into `<specs-root>/<NNN>-<slug>/requirements.md`
and fill it in completely. The template holds the document skeleton; the rules
below are what you are held to.

### The Glossary comes first

Write the Glossary **before** the criteria. Every `THE <system>` subject that
appears in any criterion must already be defined there, as the exact string used.
A criterion whose subject is undefined is a defect. Define the domain nouns too —
any term a reader could interpret two ways.

### The six EARS patterns

Every acceptance criterion must match **exactly one** of these:

1. **Ubiquitous** — `THE <system> SHALL <response>`
   An always-true behaviour with no trigger and no precondition.
2. **Event-driven** — `WHEN <trigger>, THE <system> SHALL <response>`
   A discrete event occurs and the system responds.
3. **State-driven** — `WHILE <condition>, THE <system> SHALL <response>`
   A condition holds continuously and the behaviour applies throughout.
4. **Unwanted event** — `IF <condition>, THEN THE <system> SHALL <response>`
   An error, abuse, or failure case. Note the mandatory `THEN`.
5. **Optional feature** — `WHERE <option>, THE <system> SHALL <response>`
   The behaviour exists only when a feature or configuration is present.
6. **Complex** — `[WHERE <option>] [WHILE <condition>] [WHEN/IF <trigger>] THE <system> SHALL <response>`
   Two or more clauses combined. **Clause order is fixed and mandatory:**
   `WHERE` -> `WHILE` -> `WHEN`/`IF` -> `THE` -> `SHALL`. Any other order is
   a defect even when the sentence reads fine.

Use `WHEN` for an event that is expected, `IF`/`THEN` for one that is not. Do not
use both in a single criterion.

### The INCOSE quality rules

Check every criterion against all eleven before you finish:

1. **Active voice.** The system is the grammatical subject and it acts.
2. **No vague terms.** Banned: quickly, fast, adequate, reasonable, sufficient,
   user-friendly, intuitive, robust, efficient, scalable, seamless, appropriate,
   minimal, several, various.
3. **No pronouns.** Repeat the noun. `it`, `they`, `this`, `that`, `those` are
   ambiguous the moment the document is reordered.
4. **Consistent terminology.** One name per concept, matching the Glossary, in
   every criterion. Never alternate between synonyms.
5. **Explicit conditions.** State the trigger or state; never leave it implied by
   the surrounding requirement's title.
6. **Measurable criteria.** A tester determines pass or fail without asking a
   question. Numbers carry units and, for latency, a percentile.
7. **One thought per requirement.** An `and` joining two independently testable
   behaviours means two criteria.
8. **No escape clauses.** Banned: where possible, if feasible, as appropriate,
   if practical, to the extent possible, best effort.
9. **No absolutes.** Banned: never, always, all, every conceivable, 100%,
   completely, totally. Replace with a bounded, checkable statement.
10. **Solution-free.** What the system does, not the table, queue, library, or
    class that does it. Naming a technology in a criterion is a defect unless the
    technology is itself the externally fixed contract.
11. **Prefer positive statements.** Say what the system does rather than
    `SHALL NOT`. A prohibition is usually a rejection behaviour in disguise:
    `IF <bad input>, THEN THE <system> SHALL reject <…> with <…>`.

### Worked examples to hold yourself to

| Defect           | Rejected                                                                                            | Accepted                                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Vague            | The system shall quickly process requests                                                           | WHEN a request is received, THE System SHALL process it within 200ms                                                                    |
| Vague            | The interface shall be user-friendly                                                                | WHEN a validation error occurs, THE Console SHALL display the failing field name and the correction required                            |
| Passive          | Records shall be archived nightly                                                                   | WHILE the archive window is open, THE Archiver SHALL move records older than 90 days to cold storage                                    |
| Pronoun          | WHEN the job finishes, THE Runner SHALL notify it                                                   | WHEN a job finishes, THE Runner SHALL publish a `job.completed` event to the Notification Service                                       |
| Escape clause    | THE System SHALL retry the payment where possible                                                   | IF a payment attempt returns a retryable error, THEN THE Payment Service SHALL retry the attempt up to 3 times with exponential backoff |
| Absolute         | THE System SHALL never lose a message                                                               | IF the broker acknowledgement is not received within 5s, THEN THE Publisher SHALL re-enqueue the message with the same idempotency key  |
| Compound         | WHEN a user signs up, THE System SHALL create an account and send a welcome email and start a trial | Three separate criteria                                                                                                                 |
| Solution-bearing | THE System SHALL store sessions in Redis with a 30-minute TTL                                       | WHILE a session has been idle for less than 30 minutes, THE Session Service SHALL treat the session as active                           |
| Negative         | THE System SHALL NOT accept an expired token                                                        | IF a presented token has passed its expiry timestamp, THEN THE Gateway SHALL reject the request with status 401                         |
| Clause order     | WHEN a payout is requested, WHERE Connect is enabled, THE Ledger SHALL …                            | WHERE Connect is enabled, WHEN a payout is requested, THE Ledger SHALL …                                                                |

### Numbering

Requirements are `### Requirement N` with N from 1. Criteria are a numbered list
within each requirement, from 1. The reference `2.3` therefore means Requirement 2,
criterion 3 — and that is the only reference form `design.md` and `tasks.md` use.
Never renumber a requirement after the design document exists.

### Coverage

Cover the happy path, the unwanted-event path, and the boundary for every
capability in scope. A requirement with only `WHEN` criteria and no `IF`/`THEN`
criteria is almost always incomplete.

## Step 5 — quick mode instead

In `--quick` mode, write `<specs-root>/<NNN>-<slug>/requirements.md` as a short document.
No EARS. No Glossary table unless a term is genuinely ambiguous. No INCOSE
checklist section.

```markdown
# Requirements Document (quick)

## Intake

**Problem:** [the problem, not the solution]
**Risk class:** low — [why]
**Lifecycle path:** quick spec; design and tasks skipped — [why sufficient]

## Discovery

**Current behaviour:** [what happens today, in two or three sentences]

**Sources:** [the files you read, as a comma-separated list of paths]

## Intent

[Two to four sentences: what changes, for whom, and why. Name the files or
surfaces affected if they are already obvious.]

## Acceptance

- [ ] [Observable outcome a reviewer can check in under a minute]
- [ ] [Observable outcome]
- [ ] [Observable outcome]

## Out of scope

- the adjacent thing someone will otherwise assume is included

## Assumptions

- each decision you made in place of asking
```

Then add one line at the top of the file:

```markdown
> Quick spec. EARS and correctness properties were skipped deliberately: this
> change is [N] behaviours with no invariants worth formalising. Promote to a
> full spec with `spec-new` if the scope grows.
```

### How a quick spec is executed — say this to the user

A quick spec is a **checklist, not a plan**. The `## Acceptance` boxes are the
whole specification of done: a person, or an agent handed the file, makes the
change and ticks them. That is the intended path, and for a one- or two-file
change it is the right one.

**Nothing in the orchestration path will run it, and that is by design.**
`spec-implement`, `spec-run` and `spec-verify` each read `requirements.md`,
`design.md` and `tasks.md`, and each refuses when one is absent — there is no
task list to dispatch and no criterion numbering to trace against.
`vellum status` reports a requirements-only spec as stage `requirements`, whose
next step is `spec-design`; there is no quick stage. So recommending the skip is
recommending that a human or a directly-invoked agent do the work, and you must
say that in the same breath, not leave the user to discover it when `spec-run`
refuses.

**Promotion is what makes a quick spec orchestratable.** Run `spec-design` and
then `spec-tasks` against the _same_ spec directory — never a second one — and
it becomes an ordinary spec that `spec-run` dispatches and `spec-verify` audits.
Offer that when the scope grew past what one reviewer can check in a minute.

## Step 6 — record your assumptions, then stop

End your turn with:

1. **The path** you created.
2. **A three-to-six-line summary** of the requirements you wrote — the
   capabilities, not a restatement of every criterion.
3. **Every assumption you made**, as a numbered list, each phrased so the user can
   answer it with one word or one correction. These are the questions you did not
   ask, surfaced after the draft instead of before it.
4. **Every `[NEEDS CLARIFICATION: …]` marker you wrote**, with its location — the
   criterion number, Glossary term or field. Say "none" when there are none.
5. **Ask the user how to proceed**, with `AskUserQuestion`. Offer exactly these
   options, in this order:

   - **Revise the requirements** — the user has corrections to the draft, or answers to
     the assumptions above. Apply them, rewrite `requirements.md`, and ask again.
   - **Clarify the requirements** — run the `spec-clarify` skill: at most five
     questions, highest impact first, each answer written into `requirements.md`.
     **Recommend this option whenever the draft carries a marker**; design cannot test
     a criterion that still asks a question.
   - **Proceed to design** — run the `spec-design` skill to produce `design.md`, then
     stop for review before tasks.
   - **Proceed to design and tasks** — run `spec-design` and then `spec-tasks` without
     stopping between, so `tasks.md` exists for review in one pass. **Offer this option
     only for a `--quick` spec.** A full spec keeps both gates: the method's `README.md`
     requires a human to approve all three documents, and collapsing the design gate on a
     spec large enough to warrant EARS is how a wrong design reaches a task plan.

   Asking here does not violate the operating rule at the top of this skill. That rule
   forbids a questionnaire **before** the draft; this is one routing question **after**
   it, which the user answers having read something concrete.

**Then act on the answer.** On _revise_, stay in this skill. On _clarify_ or either
_proceed_ option, hand off to the named skill in the same turn. Until the user answers, do not create
`design.md` or `tasks.md`, do not start implementing, and do not write placeholder
documents — the user's approval of the requirements is the gate, and only the user can
pass it.

## Never

- Never ask clarifying questions before producing a draft.
- Never guess where the answer changes permissions, personal data, retention, a numeric
  target or scope and nothing supports a reading — write a `[NEEDS CLARIFICATION: …]`
  marker instead.
- Never write a criterion whose subject is absent from the Glossary.
- Never mix EARS patterns in one criterion or reorder the complex-pattern clauses.
- Never put implementation detail, file paths, or library names in a criterion.
- Never create `design.md`, `tasks.md`, or any research file in this skill.
- Never write code, run a build, or modify anything outside the new spec directory.
