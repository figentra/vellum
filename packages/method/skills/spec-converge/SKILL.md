---
name: spec-converge
description: Compare what was built against a spec's requirements.md, design.md and tasks.md, and turn every gap into a new task. Classifies each gap as missing, partial, contradicts, unrequested or unverified completion, reads task evidence only through the vellum CLI (a task ticked [x] without engine-recorded evidence is a gap, not a completion), and appends the resulting [ ] tasks under a dated Convergence section of tasks.md. Use after a spec's tasks are complete, when the user says "converge", "did we build what we specified", "spec-converge", or on demand mid-run. Never edits requirements or design, never marks a task done, never deletes a task.
---

# spec-converge — close the distance between the spec and the code

You run after implementation:
`requirements.md` -> `design.md` -> `tasks.md` -> implementation -> (**converge**).

`spec-verify` asks whether the three documents trace to each other. This skill asks the
question after it: **does the code do what the documents say?** You read the documents,
read the evidence the engine recorded, read the code, and turn every gap you can prove
into a new unchecked task. The gaps become work in the plan, where the same review, wave
and evidence rules apply to them as to every other task.

You write to `tasks.md` only, and only by appending. You never write `requirements.md`
or `design.md` — a gap that the documents are wrong is reported, and fixing it belongs to
the author and the human who approves it. You never write code. You never create a file:
the report goes to the user, not into the spec folder, which holds exactly three
documents and its hidden machine folder.

**Persona:** this contract is run by the `spec-planner` agent (`agents/spec-planner.md` in the method), on the **frontier** tier. Dispatch it as that agent rather than inline when the work is delegated — the pin is what makes the model choice deliberate instead of whatever the session happens to be running.

## The rule this skill exists for: a completion claim is not evidence

A task line reading `[x]` is a character someone wrote. **A `[x]` task counts as done only
when the engine has recorded passing evidence for it** — an Evidence Entry written by
`npx vellum task complete`, which ran the verification command itself and recorded its real
exit status. A `[x]` with no such entry is an **unverified completion**, and it is a gap
like any other, reported and turned into work.

You read that evidence through the CLI and nowhere else. Not from the checkbox, not from
the `## Execution Log` rows (they are written by the same executor whose claim is being
checked), not from a test you ran yourself, not from the code "looking done". If the CLI
cannot show evidence for a task, the task is unverified — even when you believe the work
is there.

## Step 0 — locate the spec and refuse if incomplete

1. **Read the state with the stage detector.** Do not `ls` and infer:

   ```bash
   npx vellum status <NNN> --json
   ```

   Every skill reads the stage from this one command rather than from its own directory listing, so no two callers can disagree about where a spec is.

   A fragment that matches more than one spec is a question: list the candidates and ask.

2. **Refuse unless all three documents exist.** Name the missing one and the skill that
   produces it (`spec-new`, `spec-design`, `spec-tasks`). Converging code against two of
   three documents reports gaps the missing one would have explained.

3. **Run the linter first**, because a malformed `tasks.md` makes every step below
   unreliable:

   ```bash
   npx vellum lint <NNN> --type=tasks --json
   ```

   This is the same validator the repository's CI runs through `npx vellum lint`, so the skill and the gate cannot disagree about a spec.

   Include its output in the report. A lint failure does not stop the convergence pass,
   but you append nothing to a `tasks.md` that fails lint for a reason you did not cause —
   report the gaps and route the lint failure to `spec-tasks`.

4. **Before all tasks are complete**, this skill still runs — on demand is a supported use.
   A gap already covered by a pending (`[ ]`, `[~]`, `[-]`) task is not new work: record it
   as **planned** in the report, naming the task, and append nothing for it.

## Step 1 — read the evidence through the CLI

```bash
npx vellum status <NNN> --json
npx vellum verify <NNN> --strict --json
```

`verify` is always strict; `--strict` is accepted and changes nothing, and is written
here so the intent is visible in the command. Its exit status is `0` PASS, `1` FAIL, `2`
INCONCLUSIVE. **A FAIL is the normal input to this skill, not an error** — it is the
verifier listing what is not proven, which is exactly what you are here to turn into work.

From the JSON, take:

| Source                        | Field                                           | What it tells you                                                     |
| ----------------------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| `status` — `specs[]`          | `verification.required`, `completed`, `failed`  | how many required tasks have passing evidence; failed attempts        |
| `status` — `specs[]`          | `artifacts.<kind>.checksumCurrent`, `approvals` | whether the documents you are comparing against are the approved ones |
| `verify` — `specs[].findings` | `rule` `TASK_NOT_VERIFIED`, with `line`         | each task with no Evidence Entry that exited 0                        |
| `verify` — `specs[].findings` | `rule` `CRITERIA_NOT_COVERED`                   | a criterion no task references                                        |
| `verify` — `specs[].findings` | `rule` `PROPERTY_NOT_CITED`                     | a design Property no task cites                                       |

Report the verifier's findings as it reports them. Do not filter them down to the ones you
think it should have counted, and do not add tasks to its count that it did not name.

**If `verify` is INCONCLUSIVE** — the spec is not under Vellum management, or a document or
the ledger could not be read — there is no engine evidence for any task. Say so, include the
problems it printed, and treat **every** `[x]` task as an unverified completion. Do not
substitute your own judgement of which ones are "probably fine".

**If a document's `checksumCurrent` is false, or its approvals are incomplete,** say so at
the top of the report: you are converging against a document that is not the approved
one, and every gap you find is provisional until a human settles which text is authoritative.

## Step 2 — build the intent inventory

Read all three documents in full and list:

1. Every criterion `N.M` in `requirements.md`, with its text.
2. Every `Property N` in `design.md` and its `**Validates:**` references.
3. Every component in `design.md` with the files or modules it names.
4. Every task in `tasks.md`: id, checkbox state, optional or not, and its
   `_Requirements:_` trailer.

This is the list the code is checked against. A gap that does not trace to an entry here,
or to an unexplained piece of code in Step 3, is not a gap.

## Step 3 — compare the code, and classify every gap

For each criterion and component, read the code the design places it in, and the tests.
Classify every gap as exactly one of:

| Class                     | Meaning                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| **contradicts**           | The code does something the criterion or design says it must not — a different result, rule or contract. |
| **missing**               | Nothing in the code implements the criterion or component.                                               |
| **unverified completion** | A task is `[x]` and the verifier reports `TASK_NOT_VERIFIED` for it (or verify was INCONCLUSIVE).        |
| **partial**               | Implemented for some cases and not others — typically the `IF … THEN` path or the boundary is absent.    |
| **unrequested**           | Behaviour in the spec's footprint that no criterion and no design element asks for.                      |

Every gap carries its evidence: the file and line you read in this session, or the
verifier finding it came from. **A gap you cannot point at is not reported.** "The error
path is probably missing" is a hunch; "`src/export.ts:88` returns the partial file when the
upload fails, where 3.2 requires a rejection" is a gap.

An optional (`*`) task is not required by the verifier, so its evidence is not reported
either way. Never count an optional `[x]` task as proof that the criteria in its trailer
are met; judge those criteria from the code.

For **contradicts**, the documents are the claim under test. Do not decide the code is
right and the criterion wrong: the gap becomes a task that brings the code into line, and
if the user believes the document is what is wrong, that is a revision through `spec-new`
or `spec-design` and a new human approval — never an edit here.

For **unrequested**, append no task. Removing it is a decision, and so is specifying it;
report each with both routes — remove it (a task the user can ask for) or specify it
(`spec-new`, then approval) — and let the user choose.

## Step 4 — append the convergence tasks

If there are no gaps other than **planned** and **unrequested** ones, append nothing and go
to Step 5: the spec has converged, and the report says so in exactly those terms — with the
verifier's result beside it, because converged code with unrecorded evidence is not done.

Otherwise, append to `tasks.md`:

1. **Where.** A new section, `## Convergence YYYY-MM-DD` (today's date, ISO form), placed
   immediately before `## Task Dependency Graph`, after the last task and after any earlier
   Convergence section. Never write into, reorder or renumber an earlier section.

2. **Numbering.** Take the highest top-level task number in the file, `M`. The new tasks
   are one or more top-level parents from `M+1`, with sub-tasks `M+1.1`, `M+1.2`, …, three
   to six leaves per parent. Never reuse an id.

3. **Format.** Exactly the `spec-tasks` shape — the same parser reads these lines:

   ```markdown
   ## Convergence 2026-01-15

   - [ ] 9. Converge scheduled exports on the approved spec
     - [ ] 9.1 (contradicts) Reject an export whose upload fails instead of returning the partial file — `src/export.ts` _Requirements: 3.2_
     - [ ] 9.2 (missing) Enforce the 30-day retention on completed exports — `src/retention.ts` _Requirements: 3.5_
     - [ ] 9.3 (unverified completion) Prove the behaviour task 4.2 claimed; task 4.2 is `[x]` with no Evidence Entry — `test/cancel.test.ts` _Requirements: 2.4_
     - [ ] 9.4* Property test for retention across time zones _Requirements: 3.5_
   - [ ] 10. Checkpoint: ensure all tests pass
   ```

   - Every new task is `[ ]`. Every leaf names the gap class, the files it writes, and ends
     with a `_Requirements:_` trailer of numeric criterion references that exist in
     `requirements.md` — the criteria the task serves. A gap that serves no criterion is
     unrequested, and gets no task (Step 3).
   - An **unverified completion** task names the original task id and carries that task's
     trailer. It does not replace the original: task `4.2` keeps its `[x]` and keeps its
     `TASK_NOT_VERIFIED` finding until evidence is recorded for `4.2` itself, which only
     `npx vellum task start` and `npx vellum task complete` on `4.2` can do. Say this in the report.
   - Test sub-tasks are optional (`*`), as `spec-tasks` requires; a top-level task never is.
   - End the section with a `Checkpoint: ensure all tests pass` top-level task.
   - No forbidden task type — the `spec-tasks` list applies here unchanged.

4. **The graph.** Add the new incomplete leaves to the JSON block under
   `## Task Dependency Graph` as new waves after the last existing one, ids contiguous. Apply
   the `spec-tasks` wave rules: two tasks writing one file go in different waves; a task sits
   above anything it depends on. `spec-run` dispatches only what the graph lists — a task
   left out of it is a task no run will execute.

5. **Stamp and validate** — `stamp` records the appended plan's new version and checksum:

   ```bash
   npx vellum stamp <NNN>
   npx vellum lint <NNN> --type=tasks --json
   ```

   Fix a diagnostic your appended lines caused, in those lines only.

## Step 5 — report, then stop

**Appending changes `tasks.md`, so its checksum changes and the plan approval no longer
counts.** `npx vellum task start` refuses every task — the new ones and any still pending —
until a human re-approves the plan with `npx vellum approve <NNN> tasks` and commits the record.
You never run that command. If `npx vellum approve` refuses because the frontmatter checksum of the document is
stale (the body changed after its last stamp), the human runs `npx vellum stamp <NNN>`
first, reviews the result, then approves. Say this first in the report when you appended anything, not
last.

Then report:

1. **Evidence** — the verifier's overall result, `verification.completed` of
   `verification.required`, and the count of `TASK_NOT_VERIFIED` findings.
2. **Gaps by class** — for each of contradicts, missing, unverified completion, partial and
   unrequested: the count and every gap with its evidence (`file:line` or verifier finding)
   and the task id appended for it, or "no task: unrequested" with its two routes.
3. **Planned** — gaps already covered by a pending task, with that task's id.
4. **Suspected document defects** — places where the code may be right and the document
   wrong. Route each to `spec-new` or `spec-design`; none was edited.
5. **Appended** — the section heading, the new task ids and the waves added, and the lint
   result after appending. Or: "nothing appended; the spec has converged".
6. **Next** — a human re-approves `tasks.md`; then `spec-run` executes the new waves, and
   this skill runs again afterwards. A converged spec whose verifier result is not PASS is
   not done; say what is outstanding instead.

**Then stop.** Do not implement a convergence task, even a one-line one.

## Never

- Never mark a task done, and never write `[x]`, `[-]` or `[~]` on any task.
- Never treat `[x]` as evidence; only an Evidence Entry the CLI reports is.
- Never count an Execution Log row, your own test run or your reading of the code as evidence for a task.
- Never edit `requirements.md` or `design.md`, even to fix a defect you are certain of.
- Never delete, reorder, renumber or reword an existing task, or edit the `## Execution Log`.
- Never append a task without a `_Requirements:_` trailer that resolves.
- Never report a gap without the file and line, or the verifier finding, it rests on.
- Never create a file in the spec folder.
- Never run `npx vellum approve`, and never describe an appended plan as still approved.
- Never implement anything.
