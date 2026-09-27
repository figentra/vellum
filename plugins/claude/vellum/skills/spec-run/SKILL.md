---
name: spec-run
description: Orchestrate execution of an entire spec by reading the Task Dependency Graph in tasks.md and running its waves in order, dispatching each wave's ready tasks CONCURRENTLY as subagents (cap 5) that each run the spec-implement contract on exactly one task. Use when the user says "run the spec", "implement all of spec-run 007", "execute the tasks", or "resume the spec". Never writes code, runs tests, or implements anything itself — sequencing and status only.
---

# spec-run — wave orchestrator

**THE SINGLE MOST IMPORTANT CONSTRAINT IN THIS SKILL: you do not write code,
edit non-`tasks.md` files, run a build, or run a test yourself. Your only job
is reading the wave graph, dispatching subagents, and updating status.** Every
line of implementation and every verification command is `spec-implement`'s
job, executed inside a dispatched subagent — never inline in this skill. If
you find yourself about to open a source file to fix something, stop: that
work belongs to a subagent running `spec-implement`, and doing it here breaks
the audit trail (which subagent did what, verified how) that the rest of the
system depends on.

## Step 0 — locate the spec and read the graph

Resolve the spec directory the same way `spec-implement` does — `.agents/specs/`
first, then `.claude/specs/`, then a root `specs/` — and call it `<spec-dir>`.

```bash
ls <spec-dir>/requirements.md <spec-dir>/design.md <spec-dir>/tasks.md
```

If any is missing, refuse exactly as `spec-implement` does: there is nothing
to run without a plan. Do not invent a wave order from the task list's visual
order if the `## Task Dependency Graph` JSON block is missing or fails to
parse — stop and report that `tasks.md` needs `spec-tasks` (re)run to produce
a valid graph. Do not guess a schedule.

Run the mechanical linter first:

```bash
vellum lint <NNN> --type=tasks --json
```

This is the same validator the repository's CI runs through `vellum lint`, so the skill and the gate cannot disagree about a spec.

**Any diagnostic meaning the graph cannot be trusted to sequence work blocks
the run.** That is the rule; the list below is today's instance of it. Stop and
report rather than running against a broken graph:

`WAVE_GRAPH_INVALID` · `WAVE_TASK_UNDEFINED` · `WAVE_DEPENDENCY_CYCLE` ·
`TASK_GRAPH_INVALID` · `TASK_DEPENDENCY_CYCLE` · `TASK_DEPENDENCY_MISSING`

`WAVE_TASK_UNDEFINED` is the one that matters most to this skill: it means a
wave schedules a task id that is not a leaf task in the file, so an
orchestrator reading that graph dispatches a task that does not exist. A
diagnostic aimed at you is not an advisory. If the linter later grows another
diagnostic of this kind, treat it as blocking without waiting for this list to
be amended. Other diagnostic classes (checkbox formatting, missing trailers)
are worth surfacing but do not by themselves block a run.

## Step 0a — one task, or the whole spec?

`spec-run` orchestrates; `spec-implement` executes exactly one task. They are separate
contracts because they run in different places under different authority: `spec-run`
sequences from the main session and **never writes code**, while `spec-implement` runs as
a `spec-executor` subagent with full build and test access. Merging them would give the
orchestrator the authority to implement, and "I'll just do this one quickly" is precisely
the failure the separation prevents.

The user does not have to know which to call. If the invocation names a single task —
"do task 3.2", "implement the next one", a single task id — **hand off to `spec-implement`
for that task and stop.** Do not start a wave. Otherwise continue here and run the graph.

If the invocation is ambiguous, say which reading you took and why in one line, rather
than asking — the answer is recoverable either way, and a task executed is not a task
lost.

## Step 1 — build the resume state

Read every task line in `tasks.md`. For each leaf task (never a parent),
record its id and current checkbox state. Record every `Checkpoint` line's
position and checkbox state in a second list of its own: a checkpoint has no
entry in the wave graph, so it is never dispatched as part of a wave, but
Step 3.7 dispatches it between waves and needs to know which are still
outstanding. This is a **resume by default** system:

- `[x]` — already done. Skip it. Do not re-verify, do not re-implement.
- `[ ]`, `[~]`, or `[-]` — not done. `[-]` left over from an interrupted run
  means the task was never confirmed to finish; treat it exactly like `[ ]`.
  A fresh dispatch resets the checkbox, not the working tree: `spec-implement`
  Step 0 records the uncommitted changes already sitting on the files the task
  names and reports them, so a human can see what the interrupted attempt left
  behind. Nothing is reverted automatically, and you must not describe a
  re-dispatch as starting from a clean tree.

Then read the `## Execution Log` section of `tasks.md`, if the file has one.
Each row records one attempt at a leaf task — the criteria claimed, the command
run and its exit status. **A row whose `Exit` is non-zero is a failed attempt**,
and its `Commit` cell carries the diagnosis in place of a commit that never
happened. Those are the rows that matter here. **Do not re-dispatch a task whose
logged failure was diagnosed against a design that has not changed since.** A
fresh executor has no memory of that attempt and will reproduce the identical
failure at the cost of a full dispatch — which is exactly what the log exists
to prevent. Report those tasks instead, quoting the logged diagnosis, and say
that the code, the design, or the environment has to change before another
attempt is worth making.

A task whose logged failure names something since fixed — the design revised,
the missing dependency added — is dispatched normally. State in your first
status message which of the two you concluded for each logged task and on what
evidence, so a wrong call is visible rather than silent.

**Optional (`*`) tasks are skipped by default.** Only include them in
dispatch if the user explicitly opted in for this run (e.g. "run the spec
including optional tasks", or a `--include-optional` flag on the invocation).
State plainly in your first status message whether optional tasks are in or
out for this run.

## Step 2 — honour stop intent at the next wave boundary

If the user's instruction contains stop, cancel, abort, or halt — in any
phrasing — **start no new work**:

- Do not start a wave that hasn't started.
- Let subagents already dispatched for the _current_ wave finish naturally
  (killing a subagent mid-file-edit is more dangerous than letting it
  complete one task), but dispatch nothing further after them.
- Report exactly which tasks are `[x]`, which are mid-flight, and which
  remain `[ ]`, so the user has an accurate resume point.

**Be accurate about when this takes effect.** While you are blocked waiting on
a wave's concurrent dispatches, a message the user sends is not delivered into
that turn — you cannot read it and cannot act on it until every subagent in
the wave has reported. Stop intent is therefore honoured at the **next wave
boundary**, not mid-wave. Do not describe it as a live interrupt: a user who
believes a wave will halt on the word "stop" is being told something this
skill cannot do.

The user's one instrument for stopping sooner is a hard interrupt of the
session. That is safe but not clean — it can leave tasks marked `[~]` or `[-]`
with no executor behind them, and whatever those executors had written to disk
stays written. The next `spec-run` treats both marks as not-done and clears
them by re-dispatching (Step 1), and `spec-implement` Step 0 reports the
uncommitted work the interrupted attempt left.

Then stop the skill. Do not ask "are you sure" — stop intent is acted on at
the first boundary where acting is possible, and the user can always re-invoke
`spec-run` to resume.

## Step 3 — execute waves in order

Determine the wave order from the JSON's `waves[].id`, ascending. For each
wave, in order:

1. **Filter to ready tasks**: leaf tasks in this wave that are not `[x]`, and
   (per Step 1) are not optional unless opted in. If every task in a wave is
   already `[x]` or excluded-optional, skip dispatch for that wave entirely
   and move to the next.

2. **Mark each ready task `[~]`** (queued) before dispatching anything, one
   targeted edit per checkbox. This makes concurrent dispatch visible in the
   file immediately, rather than only after the first subagent reports back.

3. **Dispatch all ready tasks in this wave concurrently, capped at 5
   in-flight at a time.** If a wave has more than 5 ready tasks, run the first
   5, and as each finishes, dispatch the next queued one — never exceed 5
   concurrent subagents. Each dispatch:
   - Uses the `spec-executor` agent definition.
   - Instructs it to run the `spec-implement` skill contract for exactly one
     task id in `<spec-dir>`, passing `--include-optional` only if this run
     opted in and the task carries `*`.
   - Waits for that subagent's own report; does not pre-empt or duplicate its
     verification work.

4. **On each subagent success:** re-read the task's line in `tasks.md` and
   confirm the checkbox is `[x]` (the subagent sets it; do not set it yourself
   — a status update you write without having verified anything would be
   exactly the false-completion problem `spec-implement` exists to prevent).
   Record the task as done for this run's summary.

   **When that confirmation fails**, the executor reported success but the
   checkbox is not `[x]`. This is not a task failure and the run does not stop
   — the work was done and verified; only the write was lost. Up to five
   executors perform read-modify-write cycles on this one file with no lock,
   and a lost update reverts a sibling's checkbox without either executor
   noticing. Do this, in order:

   - **Re-read the file once more.** The first read may simply have raced the
     executor's write.
   - If it is still not `[x]`, **take the verification evidence from that
     executor's own report** — the commands it ran, what passed, which
     criteria it checked — and record the discrepancy in the final report as
     "verified by its executor, checkbox not persisted", naming the task and
     quoting that evidence.
   - **Do not re-dispatch the task** to force the mark. A second executor
     would redo verified work against a tree that already contains it.
   - **Do not write the `[x]` yourself.** The rule against it holds here for
     the same reason it holds everywhere else.
   - Say in the final report that the next resume **will** re-dispatch this
     task, because `tasks.md` — not your memory of this run — is the resume
     state, and it currently says the task is not done.

5. **On any task failure in this wave:** **stop the entire run.** Do not
   start the next wave, and do not dispatch further tasks from the current
   wave that haven't started yet (already-dispatched, already-running tasks
   in this wave may finish naturally; nothing new starts). Report:
   - which task failed and its subagent's own failure report verbatim
     (attempts made, error, diagnosis)
   - which tasks in this and prior waves are `[x]`
   - which tasks were left `[~]` or `[-]` and should be treated as not-done on
     the next resume
   - that the run stopped here and will not proceed until the failure is
     addressed (by fixing the task, the design, or re-invoking after a manual
     fix)

6. **Between waves**, when a wave completes fully and cleanly, report a short
   status line (wave id, tasks completed) before moving to the next wave —
   this is status reporting, not a pause for approval; proceed automatically
   unless stop intent (Step 2) has been given.

7. **Dispatch every checkpoint that has come due**, after that status line and
   before the next wave starts. A checkpoint is a top-level
   `Checkpoint: …` line; `spec-tasks` gives it no entry in the wave graph by
   design, because it depends on everything preceding it rather than on one
   wave. Nothing else in this run will ever dispatch it, so it is dispatched
   here or not at all.

   Take the highest-numbered top-level task just completed. For every
   checkpoint whose position in the task list falls at or before that task and
   whose checkbox is not `[x]`, dispatch it to `spec-implement` exactly as
   Step 3.3 dispatches a task — one `spec-executor` subagent, one id.
   `spec-implement` Step 2's Checkpoint branch runs the workspace-wide
   verification through `vellum task complete`, which records the evidence
   `vellum verify` requires and marks the line only if that run is green. Treat a failed
   checkpoint exactly as Step 3.5 treats a failed task: the run stops, and the
   next wave does not start.

   This is not bookkeeping. **A wave proves each of its tasks in isolation; a
   checkpoint is the only thing in the run that proves them together.** Each
   task verified itself with the narrowest `--filter` covering its own package,
   which is correct for speed and says nothing about whether the packages still
   work with each other. Skip this step and a spec can complete every wave with
   `pnpm verify` never having run once across the workspace.

   After the **final** wave there is no next wave, and this step still runs —
   before Step 3a. Every remaining checkpoint is due by then, and a reviewer
   handed a workspace that was never verified as a whole is reviewing something
   nobody has seen work.

## Step 3a — review gates, after the last wave completes cleanly

Traceability is not review. `spec-verify` proves every criterion is referenced by a
task; it cannot tell you the boundary was crossed, the test proves nothing, or the
package layout is wrong. Those are owned by standing role agents
(the method's `ROSTER.md` (`../../ROSTER.md` relative to this skill's directory)), and nothing dispatches them unless this step does.

**Run this only when every wave finished cleanly.** A run that stopped on a failure
goes to Step 4 instead — reviewing a half-implemented spec wastes the reviewer's pass
and produces findings that the remaining tasks would have resolved anyway.

1. **Determine which reviewers apply**, from what the run actually changed — not from
   a fixed list. Read the changed paths and dispatch accordingly:

   | Changed                                                          | Dispatch                 | Blocks                                        |
   | ---------------------------------------------------------------- | ------------------------ | --------------------------------------------- |
   | a new member, a tier crossing, anything an ADR governs           | `architecture-guardian`  | yes                                           |
   | `package.json` exports, barrels, package layout                  | `package-steward`        | only on a new package or a new export subpath |
   | `pnpm-workspace.yaml` catalogs, a new dependency, toolchain pins | `dependency-steward`     | only on an open critical advisory             |
   | CI, release flow, pipeline pins                                  | `release-operations`     | yes                                           |
   | any test added or changed                                        | `test-engineer`          | on a red suite, or an untested failure path   |
   | any non-trivial implementation                                   | `code-reviewer`          | no                                            |
   | user-facing UI in an app member                                  | `accessibility-reviewer` | on a critical or serious finding              |
   | documentation, ADRs, rules, or code that contradicts them        | `docs-governance`        | no                                            |

   When the routing is genuinely unclear, or more than three of these apply at once,
   dispatch `delivery-orchestrator` and let it route.

2. **Dispatch concurrently**, same cap of 5 in-flight as Step 3. Reviewers are
   independent — a reviewer that waits on another reviewer's opinion is not
   independent, and two agreeing reviewers who saw each other's findings are one
   reviewer.

3. **Give each reviewer the evidence, not the conclusion**: the spec directory, the
   changed paths, and the wave summary. Do not tell a reviewer what you think it will
   find; do not pre-filter what you consider unimportant.

4. **Reviewers report; they never edit.** Collect findings and classify each by the
   failure loop (the `failure-loop` skill): implementation bug · wrong test ·
   wrong requirement · wrong design · environment · flake.

5. **A blocking finding stops the run** exactly as a failed task does. Report it,
   route it to the owning agent named in the table, and do not mark the spec complete.
   A non-blocking finding is reported and recorded, and does not stop anything.

6. **Never resolve a finding by editing the spec to match the code.** If a reviewer
   says the implementation diverges from the design, the design is the claim under
   test — changing it to agree with what was built is how a review becomes a
   formality.

## Step 4 — final report

When every wave has been attempted (either completed or the run stopped on a
failure per Step 3.5), report:

1. Total tasks completed this run, and total remaining.
2. Every checkpoint dispatched (Step 3.7) and its result, and every checkpoint
   still `[ ]`. A run that completed its waves but never dispatched a due
   checkpoint has not been verified across the workspace — say that in those
   words rather than reporting the waves alone.
3. Any tasks skipped as optional, named explicitly.
4. Any task recorded as "verified by its executor, checkbox not persisted"
   (Step 3.4), and any task not dispatched because the `## Execution Log`
   showed it failing against an unchanged design (Step 1).
5. The stop reason if the run did not finish (failure, or user stop intent).
6. **Review status** — which reviewers ran, which blocked, and every finding with
   its failure-loop classification. If Step 3a was skipped because the run stopped on
   a failure, say so explicitly: an unreviewed spec must never read as a reviewed one.
7. The exact resume command: re-invoking `spec-run` on the same spec picks up
   from the current checkbox state with no extra arguments needed.
8. **The next step, when every wave finished and review did not block:**
   `spec-verify` for traceability, then `spec-converge`, which compares the code
   with the three documents, counts a task as done only where `vellum verify`
   shows recorded evidence for it, and appends a task for every gap it can prove.
   Name both; run neither — this skill's job ends with the report.

## Never

- Never write application code, tests, config, or any file other than the
  `[ ]`/`[~]`/`[-]`/`[x]` checkbox transitions in `tasks.md` described above.
- Never run a build, a test, `pnpm verify`, or any language toolchain command
  yourself — that is `spec-implement`'s job inside its own subagent.
- Never mark a task `[x]` yourself. Only a `spec-implement` subagent that
  actually verified the task may do that.
- Never dispatch more than 5 subagents concurrently.
- Never start a new wave while the previous wave has an unresolved failure.
- Never start a new wave while a checkpoint that came due at the end of the
  previous one is still unrun (Step 3.7). Waves prove tasks in isolation;
  checkpoints are the only thing that proves them together.
- Never write a task's `[x]` yourself when an executor reported success but the
  checkbox is missing — re-read, then record the discrepancy (Step 3.4).
- Never dispatch an optional (`*`) task unless this run was explicitly told to
  include optional tasks.
- Never invent a wave order when the Task Dependency Graph is missing or
  invalid — stop and say `spec-tasks` needs to (re)run.
- Never continue dispatching new work after the user has signalled stop,
  cancel, abort, or halt.
- Never tell the user a running wave can be stopped mid-flight. Stop intent is
  honoured at the next wave boundary (Step 2).
- Never re-dispatch a task the `## Execution Log` records as having failed
  against a design that has not changed since — report it instead.
