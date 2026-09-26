---
name: spec-verify
description: Traceability audit for a spec — answers "did we build what we specified?" by cross-referencing requirements.md, design.md and tasks.md. Reports every acceptance criterion not referenced by a task, every design Property with no covering test task, and every _Requirements:_ reference that points at a criterion which does not exist. Use when the user says "verify the spec", "audit traceability", "did we cover everything", or before closing out a spec. Read-only — never edits any file.
---

# spec-verify — traceability audit

You answer one question: **did the plan and its execution actually cover what
was specified?** You read all three documents and report gaps. You never write
`requirements.md`, `design.md`, or `tasks.md`, and you never touch code. If a
gap needs fixing, that is a job for `spec-tasks` (missing coverage in the
plan), `spec-design` (an uncovered Property or requirement), or
`spec-implement` (a task that exists but was never actually done) — name which
one, and stop there.

## Step 0 — locate the spec and refuse if incomplete

Resolve the spec directory the same way `spec-implement` does — `.agents/specs/`
first, then `.claude/specs/`, then a root `specs/` — and call it `<spec-dir>`.

```bash
ls <spec-dir>/requirements.md <spec-dir>/design.md <spec-dir>/tasks.md
```

If any of the three is missing, refuse and say which one is absent and which
skill produces it. A traceability audit needs all three; auditing two of three
would silently under-report (nothing to check the third's references against).

Also run the mechanical linter first, since a malformed `tasks.md` makes every
diagnostic below unreliable:

```bash
vellum lint <NNN> --type=tasks --json
```

This is the same validator the repository's CI runs through `vellum check`, so the skill and the gate cannot disagree about a spec.

Include its output in your report as a preface, but do not let a lint failure
stop the traceability audit — report both.

## Step 1 — build three inventories

Read all three documents in full and extract:

1. **From `requirements.md`:** every `Requirement N` and every numbered
   acceptance criterion under it, as the set of `N.M` pairs that exist. This
   is the ground truth every other reference is checked against.

2. **From `design.md`:** every `Property N` in the Correctness Properties
   section, together with its `**Validates: Requirements …**` line parsed into
   a set of `N.M` references.

3. **From `tasks.md`:** every leaf task (never a parent, never a Checkpoint —
   those carry no trailer by design and are correctly excluded), its checkbox
   state, and its `_Requirements: n.m, …_` trailer parsed into a set of `N.M`
   references. Note optional (`*`) tasks separately — they still count as
   coverage (an optional task's `_Requirements:_` trailer is a real
   reference), but flag them as optional in the report so a reviewer can judge
   whether relying on an optional task for coverage is acceptable. That
   allowance is for criterion coverage in Step 2 only — Step 3 requires a `[x]`
   checkbox before a Property counts as covered, and an optional task that the
   run skipped is exactly the case it is guarding against.

## Step 2 — check 1: every criterion is referenced by a task

For every `N.M` in the requirements inventory, check whether at least one
task's trailer references it.

- **Covered**: one or more tasks reference it. Note whether the covering
  task(s) are done (`[x]`) or still pending — a criterion whose only covering
  task is incomplete is coverage on paper, not in practice; call this out
  distinctly from full coverage.
- **Orphaned**: no task references it. Report it by requirement and criterion
  number, with the criterion's own text (so the reviewer doesn't have to look
  it up) and which classification (example/universal) `design.md` gave it if
  the design document assigned one.

## Step 3 — check 2: every design Property has a covering test task

For every `Property N` in the design inventory, look for a task that covers
it: a task (commonly, but not necessarily, marked `*`) whose `_Requirements:_`
trailer includes at least one of that Property's own `Validates:` references,
AND whose task text indicates it is a test (mentions "test", "property",
"property-based", or names the property), **AND whose checkbox is `[x]`**.

The checkbox is part of the check, not a footnote to it. `spec-tasks` marks
every test sub-task optional, and `spec-run` skips optional tasks by default —
so a default run of a spec executes no test task at all. A Property counted as
covered because a covering test task merely *exists* lets this skill report
zero uncovered Properties for a spec on which not one test has ever run. Task
existence is a claim; `[x]` is the only evidence in these three documents that
the claim was acted on.

Report each Property as exactly one of:

- **Covered** — a covering test task exists and is `[x]`. Name the task id.
- **Covered on paper, not in practice** — a covering test task exists but is
  `[ ]`, or is optional and was skipped by the run. Name the task id and its
  checkbox state. **Count these separately from Covered**; they are nearer a
  gap than to coverage, because nothing was executed.
- **No covering test task** — nothing matches. A criterion covered by an
  _implementation_ task is not the same as the Property being covered by a
  _test_ task; report this as a gap even where Step 2 shows its underlying
  criteria as "covered".

**The match is a keyword heuristic and it is not sound.** A task whose text
mentions "test" and whose trailer overlaps the Property's `Validates:` list can
still test a single example rather than the universal claim the Property makes
— which is exactly the distinction a Property exists to draw. So for every
Property you report as Covered, say that the match was textual and that a human
has to read the named test and confirm it exercises the universal claim. Do not
present the heuristic's output as verification.

## Step 4 — check 3: every `_Requirements:_` reference resolves

For every `N.M` reference found in any task's trailer (from the Step 1
inventory), check that requirement `N` exists in `requirements.md` and that it
has a criterion numbered `M`. Any reference that does not resolve — a
requirement that does not exist, or a criterion number past the last one
under an existing requirement — is a **dangling reference**. Report the task
id, the exact dangling reference text, and the closest plausible match if one
is obvious (e.g. a likely off-by-one, `2.4` when Requirement 2 only has three
criteria) — as a hint only, never as a silent auto-correction.

## Step 5 — report as a coverage table, then stop

Produce one table, ordered by requirement then criterion:

| Requirement | Criterion | Referenced by | Task state   | Property   | Status                      |
| ----------- | --------- | ------------- | ------------ | ---------- | --------------------------- |
| 1           | 1.1       | 1.1           | `[x]`        | —          | Covered                     |
| 1           | 1.2       | 1.1, 1.3      | `[x]`, `[ ]` | Property 1 | Covered (partially pending) |
| 2           | 2.1       | —             | —            | Property 2 | **Orphaned**                |

Follow it with four short lists:

1. **Orphaned criteria** (Step 2) — count and the list, each with a pointer to
   `spec-tasks` as the fix.
2. **Properties with no covering test task** (Step 3) — count and the list,
   each with a pointer to `spec-tasks` (add the missing test task) as the fix.
3. **Properties covered on paper, not in practice** (Step 3) — count and the
   list, each with its test task id and checkbox state, and the fix: run that
   task (`spec-implement`, with `--include-optional` where the task is `*`).
   Keep this count out of the covered count; a reader who sees them merged is
   being told tests ran that did not.
4. **Dangling `_Requirements:_` references** (Step 4) — count, the task id and
   bad reference for each, with a pointer to whichever of `spec-tasks` (fix the
   trailer) or `spec-new`/`spec-design` (the requirement really is missing) is
   the more likely fix.

End with one line that **leads with the strict number**: the percent of
criteria covered by a completed (`[x]`) task. Then, after it: total criteria,
percent covered at all, and the count of Properties covered on paper but not in
practice. The strict number goes first because it is the one that can be low
while every other number on the page reads finished, and a number reported last
is a number read as a caveat.

**If that percentage is below 100, the line must not say the spec is clear to
consider done, in any wording.** Say what is outstanding instead. At 100 it says
only that coverage is complete and executed: you are still not asserting the
code is correct, which is what the tests themselves are for.

**Traceability is not review, and this report must not be read as one.** A spec can
be 100% covered by completed tasks and still cross a tier boundary, ship a test that
asserts nothing, or contradict an ADR. Those are found by the standing role agents
(the method's `ROSTER.md` (`../../ROSTER.md` relative to this skill's directory)), dispatched by `spec-run` Step 3a. If the spec has not
been through that step, say so in this report: "traceability complete; review gates
not yet run" is an honest closing line, and "clear to consider done" alone is not.

**Then stop.** Do not edit any of the three documents to close a gap you
found, even a one-line fix. Reporting the gap accurately is the deliverable;
closing it belongs to a different skill so the change goes through that
skill's own review gate.

## Never

- Never edit `requirements.md`, `design.md`, or `tasks.md`.
- Never write or run code, tests, or a build — this is a document
  cross-reference audit, not a test run.
- Never silently "fix" a dangling reference or add a missing trailer — report
  it and name the skill that should fix it.
- Never count a task as coverage for a Property unless it is actually a test
  task, even if its `_Requirements:_` trailer matches.
- Never report a Property as covered on the strength of a task that is not
  `[x]` — that is "covered on paper, not in practice", and it is counted
  separately.
- Never present a keyword match as confirmation that a test exercises the
  Property's universal claim; say a human has to read it.
- Never lead the closing line with a number kinder than the percent covered by
  completed tasks, and never write "clear to consider done" while that number
  is below 100.
- Never treat an incomplete task's reference as full coverage without flagging
  that the coverage is not yet real.
