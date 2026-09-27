---
name: spec-clarify
description: Resolve the highest-impact ambiguities in a drafted requirements.md before design begins. Scans the document against a fixed eight-category taxonomy, asks at most five questions one at a time (each with a recommended answer and alternatives), writes every answer into requirements.md in place plus a dated Clarifications session list, and resolves the [NEEDS CLARIFICATION] markers spec-new left. Use after spec-new and before spec-design, when the user says "clarify the spec", "what is ambiguous", "spec-clarify", or when requirements.md still carries clarification markers. Edits requirements.md only; never writes design, tasks or code.
---

# spec-clarify — ask the few questions that change the spec

You sit between the first and second documents of a spec:
`requirements.md` -> (**clarify**) -> `design.md` -> `tasks.md`.

`spec-new` drafts without asking — that is its operating rule, and it is right: a
concrete draft is faster to correct than a questionnaire is to answer. The cost of that
rule is that some unknowns get written down as assumptions or as
`[NEEDS CLARIFICATION: …]` markers instead of answers. This skill spends a small, fixed
budget of the user's attention on the unknowns where a wrong guess would cost the most —
before a design is built on top of them.

You own edits to `requirements.md` only. Do not write `design.md`. Do not write
`tasks.md`. Do not write code. Do not create any other file: a spec folder holds exactly
three documents and its hidden machine folder, and a clarification log is not a fourth
document — it is a section of the first.

**Persona:** this contract is run by the `spec-author` agent (`agents/spec-author.md` in the method), on the **frontier** tier. Dispatch it as that agent rather than inline when the work is delegated — the pin is what makes the model choice deliberate instead of whatever the session happens to be running.

## The budget: at most five questions

**Ask at most 5 questions per invocation.** One at a time, highest impact first. Stop
earlier when no high-impact ambiguity remains. The cap is the point of the skill, not a
default to negotiate: a sixth question is where the user stops reading the options and
starts clicking the first one, and an answer given that way is a guess with the user's
name on it.

If more than five ambiguities qualify, ask the five that matter most and report the rest
(Step 6). The user can run this skill again; one invocation never asks a sixth.

## Step 0 — locate the spec and check where it is in the lifecycle

1. **Read the state with the stage detector.** Do not `ls` and infer:

   ```bash
   npx vellum status --json          # every spec
   npx vellum status <NNN> --json    # one, by number
   ```

   Every skill reads the stage from this one command rather than from its own directory listing, so no two callers can disagree about where a spec is.

   If the user named a spec, resolve it by number or slug fragment. A fragment matching
   more than one spec is a question, not a choice: list the candidates and ask which.

2. **Refuse without requirements.** If the spec has no `requirements.md`:

   > There is no `requirements.md` in `<spec-dir>/`. There is nothing to clarify yet.
   > Run the `spec-new` skill first.

   Then stop. Do not draft requirements here.

3. **Check for approval before you edit anything.** In the status JSON, read the spec's
   `approvals.requirements` (`current` against `required`). An approval is bound to the
   checksum of `requirements.md` as it was when the human approved it. **Any edit this
   skill makes changes that checksum, and the approval no longer counts:** `npx vellum verify`
   rejects an approval whose artifact changed after it was given, and `npx vellum task start`
   refuses to start a task without valid approvals. A human must then re-approve with
   `npx vellum approve <NNN> requirements` and commit the record. You never run that command —
   approval is a human act, and an agent that approves has approved nothing.

   So when `approvals.requirements.current` is above zero, say this to the user before
   the first question and ask, with `AskUserQuestion`, whether to continue:
   **Continue — I will re-approve afterwards** · **Stop — leave the approved document
   as it is**. Continue only on the first answer.

4. **Check for a design.** If `design.md` exists, warn that it cites criterion numbers.
   You may reword a criterion and you may append one; you may never renumber, delete or
   reorder one (Step 4). Tell the user that a clarified criterion may make the design
   wrong, and that `spec-design` should revise it afterwards.

## Step 1 — read the whole document, and the markers first

Read `requirements.md` in full. Then collect every clarification marker:

```bash
grep -n "NEEDS CLARIFICATION" <spec-dir>/requirements.md
```

A marker has the form `[NEEDS CLARIFICATION: <the question>]` and sits where the answer
belongs — inside the criterion, Glossary entry, Introduction field or assumption it
blocks. Each one is a question `spec-new` already judged it could not responsibly guess.
Every marker is a candidate for the queue in Step 3, and ranks above any ambiguity you
find yourself at equal impact, because a criterion carrying a marker cannot be tested
as written.

Also collect the document's assumptions — the `## Assumptions` list where the document
has one, and any assumption recorded under Discovery or the Introduction. An assumption
is a guess the author made in place of asking. It is a candidate when a wrong guess
would change a criterion.

## Step 2 — scan against the fixed taxonomy

Assess the document against these eight categories, **in this order, every time**. The
list is fixed so that two runs over the same document examine the same things, and so a
reviewer can see which categories were checked.

| #   | Category                     | What "clear" looks like                                                                                                   |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Scope and out-of-scope**   | In scope and Out of scope name behaviours, and each non-goal carries its reason. No capability is in both, or in neither. |
| 2   | **Actors and permissions**   | Every actor in a trigger is in the Glossary; who may do what is stated, including who may not.                            |
| 3   | **Data and lifecycle**       | Each record the spec creates has a stated origin, owner, retention and end state (deleted, archived, expired).            |
| 4   | **Error and edge cases**     | Each capability has its `IF … THEN` criteria: invalid input, missing dependency, concurrent change, the boundary value.   |
| 5   | **Non-functional targets**   | Every performance, capacity, availability or security target is a number with a unit (and a percentile for latency).      |
| 6   | **Integrations**             | Each external system or member named has its contract and its failure behaviour stated.                                   |
| 7   | **Acceptance measurability** | A tester decides pass or fail for every criterion without asking a question. No banned vague term survives.               |
| 8   | **Terminology and glossary** | One name per concept; every `THE <system>` subject is defined; no synonym drifts between sections.                        |

Mark each category **Clear**, **Partial** or **Missing**. For each Partial or Missing
category, write down the candidate question — unless the answer would not change a
criterion, a test, or what gets built. Leave out:

- anything the repository already answers (read it; do not ask what you can look up);
- how to build it — technology, library, schema or task order is `spec-design`'s and
  `spec-tasks`'s question, never this skill's;
- style and wording preferences;
- anything already answered in the document or in an earlier `## Clarifications` session.

## Step 3 — rank the queue, then keep the top five

Order the candidates by **impact × uncertainty**:

- **Impact** — what breaks if the guess is wrong. Highest: permissions, personal data,
  money, data loss, an externally visible contract, scope (building the wrong thing).
  Then error behaviour and non-functional targets. Lowest: terminology.
- **Uncertainty** — how little the document and the repository constrain the answer.
  A marker is maximal uncertainty by definition.

Keep at most five. Prefer breadth: two questions in one high-impact category before one
in each of two low-impact categories is right; five questions about glossary wording
while permissions are unresolved is not.

If the queue is empty — every category Clear, no markers, no consequential assumption —
say so, report the category table (Step 6), and stop without asking anything. A clean
document does not need a question to justify the invocation.

Do not show the user the queue. Ask the first question.

## Step 4 — ask one question, then write its answer

For each question in the queue, in order:

1. **Ask it with `AskUserQuestion`**, one question per call. Shape:
   - The question as a full sentence ending in `?`, answerable without reading the spec.
   - One line on why it matters: what a wrong guess would cost.
   - **Two to four options**, mutually exclusive, the recommended one first and labelled
     as recommended, with one line of reasoning for the recommendation. Base the
     recommendation on the document, the repository and the risk class — not on what is
     easiest to write.
   - The tool's free-text answer remains available for an answer the options missed.

   Never ask two questions in one call, and never reveal the questions still queued.

2. **If the answer is ambiguous**, ask one short follow-up to disambiguate. It counts
   against the same question, not a new one.

3. **Write the answer into `requirements.md` immediately**, before asking the next
   question — an answer held only in the conversation is lost the moment the session is.
   Put it where it belongs:

   | The answer changes  | Edit                                                                                                          |
   | ------------------- | ------------------------------------------------------------------------------------------------------------- |
   | a behaviour         | the affected criterion, rewritten in place as a valid EARS criterion                                          |
   | a missing behaviour | a new criterion **appended** to the end of that requirement's list — the next free number, never an insertion |
   | who may act         | the actor's Glossary entry, and the criteria whose trigger names the actor                                    |
   | a term              | the Glossary entry, and every use of the losing synonym across the document                                   |
   | scope               | the **In scope** or **Out of scope** field — an out-of-scope entry keeps its one-line reason                  |
   | a target            | the criterion that carries it, now as a number with a unit                                                    |
   | an assumption       | the assumption: remove it when the answer confirms or replaces it, and apply the answer where it bites        |

   Remove the marker the answer resolves. Replace the ambiguous statement rather than
   adding a second one beside it: a document that says both the old guess and the new
   answer is ambiguous in a new way.

   Every criterion you touch is still held to `spec-new`'s rules: exactly one EARS
   pattern, a subject defined in the Glossary, and all eleven INCOSE quality rules.
   **Never renumber, reorder or delete a criterion.** Numbers are the only reference form
   `design.md` and `tasks.md` use; a criterion that became wrong is rewritten in place,
   and one that became unnecessary is reported to the user rather than removed here.

4. **Record the question and answer** in the `## Clarifications` section of
   `requirements.md`, under a heading for today's session. Create the section when it
   does not exist, immediately before `## Quality Rules Applied To This Document` — or
   at the end of the document when that section is absent (a quick spec):

   ```markdown
   ## Clarifications

   ### Session YYYY-MM-DD

   - Q: Who may cancel a scheduled export? → A: Its owner and a workspace administrator. (Glossary: Workspace Administrator; 2.4)
   - Q: How long is a completed export kept? → A: 30 days, then deleted. (3.5, added)
   ```

   One bullet per question: the question, the answer as applied, and in parentheses
   every place in the document it changed. The date is the session date in ISO form. A
   second session the same day appends to the same heading; an earlier session's
   bullets are never edited — they are the record of what was decided and when.

## Step 5 — stop

Stop asking when any of these holds:

- five questions have been asked;
- no high-impact candidate remains in the queue — the rest would not change a criterion;
- the user says to stop.

Then validate the document:

```bash
npx vellum lint <NNN> --type=requirements --json
```

This is the same validator the repository's CI runs through `npx vellum lint`, so the skill and the gate cannot disagree about a spec.

Fix a diagnostic your edits caused; report any other one without touching it.

## Step 6 — report, then hand off

Report:

1. **Questions asked**, as a count out of the five, and each question's answer in one line.
2. **Sections touched** — every criterion number, Glossary term and field you edited or
   added.
3. **The category table** — each of the eight categories and its status after this
   session: Clear, Partial, or Missing, with one line on what remains.
4. **Remaining markers** — re-run the marker grep from Step 1 and report the count and
   every location. **Never report zero markers without having run the grep.** A marker
   left in a criterion means that criterion cannot be tested as written; say so for each.
5. **Deferred candidates** — the questions you ranked below the cap, so the user can run
   this skill again or answer them directly.
6. **Approval** — if `requirements.md` was approved before this session, state that the
   approval no longer counts and that a human must re-approve it with
   `npx vellum approve <NNN> requirements`. Do not soften it into a suggestion.

Then **ask the user how to proceed**, with `AskUserQuestion`. Offer exactly these options,
in this order:

- **Proceed to design** — hand off to `spec-design` in the same turn. Recommend it only
  when no marker remains; when one does, say that the design will have to carry it as an
  Open Question.
- **Clarify again** — a new session of this skill, with a fresh budget of five, starting
  from the deferred candidates.
- **Revise the requirements** — the answers showed the draft is wrong in a way questions
  cannot fix. Hand back to `spec-new`.

Until the user answers, do not create `design.md` or `tasks.md`.

## Never

- Never ask more than five questions in one invocation, and never two in one call.
- Never ask a question whose answer would not change a criterion, a test, or what gets built.
- Never ask what the repository already answers — read it.
- Never ask how to build it; that is design.
- Never keep an answer only in the conversation — write it into `requirements.md` before the next question.
- Never renumber, reorder or delete a criterion.
- Never create a file in the spec folder, or edit `design.md` or `tasks.md`.
- Never edit an earlier `## Clarifications` session.
- Never report a marker count you did not just grep for.
- Never run `npx vellum approve`, and never describe an edited, previously approved document as still approved.
