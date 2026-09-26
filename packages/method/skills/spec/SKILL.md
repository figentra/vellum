---
name: spec
description: Enter the spec lifecycle. Detects which stage a spec is at and asks which step to run next, instead of you having to remember whether it needs spec-new, spec-clarify, spec-design, spec-tasks, spec-run, spec-verify or spec-converge.
argument-hint: [spec number, slug fragment, or a description of something new]
allowed-tools: Bash(vellum:*), Bash(npx vellum:*), Bash(ls:*), Bash(rmdir:*), Read, AskUserQuestion, Skill
---

# /spec — the one entry point

The lifecycle has five skills in a strict order, and two that sit between them:

```
spec-new → spec-design → spec-tasks → spec-run → spec-verify
requirements.md   design.md   tasks.md   implementation   audit

spec-clarify    after spec-new, before design: at most five questions, answers written into requirements.md
spec-converge   after spec-run: code against the documents; every gap appended to tasks.md as a new task
```

Neither adds a document: clarify edits `requirements.md`, converge appends to
`tasks.md`. Both change a checksum, so an approval given before them no longer
counts and a human re-approves.

Nobody should have to remember which one is next. **You work that out from the
files on disk and ask.** This command never guesses and never skips a stage.

## Step 1 — read the state, do not infer it

```bash
vellum status --json
```

Every skill reads the stage from this one command rather than from its own directory listing, so no two callers can disagree about where a spec is.

`vellum status --json` prints one document, `{ "command": "status", "policy", "specs": [...] }`,
with one entry per directory under `.agents/specs/`. It has no `stage` or `root`
field; read these instead:

- a spec under Vellum management: `specId` (the directory name, `<NNN>-<slug>`),
  `artifacts` with one key for each of `requirements`, `design`, `tasks` that exists
  (its `version`, `state`, `checksum`, `checksumCurrent`), `recordedState`,
  `effectiveState`, `effective` (the precondition that failed), `approvals`,
  `verification` and `ledger`;
- a legacy spec (no lifecycle frontmatter and no machine folder): `specId`, `legacy: true` and
  `legacyStage` — `empty` (no requirements), `design` (requirements only), `tasks`
  (requirements and design), `in-progress` (all three) or `invalid` (tasks without
  requirements);
- a spec it could not read: `specId`, `result: "INCONCLUSIVE"` and `problems`.

The **stage** this method uses is derived from which documents exist — the keys of
`artifacts`, or `legacyStage` for a legacy spec:

| Documents present                        | Stage          | `legacyStage` |
| ---------------------------------------- | -------------- | ------------- |
| none                                     | `empty`        | `empty`       |
| requirements                             | `requirements` | `design`      |
| requirements, design                     | `design`       | `tasks`       |
| requirements, design, tasks              | `tasks`        | `in-progress` |
| a later document without an earlier one  | `invalid`      | `invalid`     |

The skill that produces the next document follows from the stage (Step 3's table).
Run `npx vellum` where `vellum` is not on the PATH. Do not `ls` and reason about the
documents yourself; five callers reimplementing the detection is how they drift apart.

## Step 2 — work out what the argument means

`$ARGUMENTS` is whatever the user typed after `/spec`. Three cases:

| The argument                                        | What it means                       |
| --------------------------------------------------- | ----------------------------------- |
| empty                                               | show the board, ask what to work on |
| matches an existing spec (number or slug fragment)  | continue that spec                  |
| matches nothing, and reads as a feature description | probably a new spec                 |

A fragment that matches **more than one** spec is not a choice you make. List the
candidates and ask which — silently picking one is how a skill edits the wrong
spec.

An argument that reads as a description but could also be a slug fragment is
ambiguous in the direction that matters: creating a duplicate spec for work that
already has one is expensive, continuing the wrong one is worse. Ask.

## Step 3 — ask, with `AskUserQuestion`

Always ask. Never auto-run a skill, even when the next stage is unambiguous —
this command exists to make the stage visible, and a command that silently
starts writing a design document has hidden exactly the thing it was for.

Offer the options for the detected stage, **in this order**, recommending the
first:

| Stage          | Offer                                                                                                                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| no such spec   | **Start a new spec** (`spec-new`) · **Start a quick spec** (`spec-new --quick`, for toggle-sized work) · **Continue an existing spec**, naming the closest match                                           |
| `empty`        | **Write the requirements** (`spec-new`, into the existing directory) · **Delete the empty spec**                                                                                                           |
| `requirements` | **Design it** (`spec-design`) · **Clarify the requirements** (`spec-clarify`) · **Revise the requirements** (`spec-new`)                                                                                   |
| `design`       | **Plan the tasks** (`spec-tasks`) · **Revise the design** (`spec-design`) · **Revise the requirements** (`spec-new` — warn that the design cites criterion numbers)                                        |
| `tasks`        | **Run the spec** (`spec-run`) · **Run one task** (`spec-implement`) · **Audit traceability** (`spec-verify`) · **Converge code and spec** (`spec-converge`) · **Revise an earlier document**, naming which |
| `invalid`      | Nothing. Report which document is missing beneath an existing later one and let the user decide. Never auto-repair a broken chain.                                                                         |

When the stage is `tasks`, read `tasks.md` and say in the question's context how
many leaf tasks are `[x]` against the total, so "run the spec" and "run one task"
are a real choice rather than a guess.

For a spec at `tasks` whose leaves are **all** `[x]`, the recommendation is
`spec-verify`, not `spec-run` — there is nothing left to dispatch, and
traceability is the thing that has not been checked. Offer it as an audit, not
as a finish line: `spec-verify` reports whether the three documents trace to
each other, and reports separately how many design Properties have a covering
test task that was never run. A full board plus a clean audit is not a
statement that the spec is done, and the question's context must not word it as
one. After the audit, `spec-converge` is the next question: it checks the code
against the documents and reads task evidence through `vellum verify`, where a
`[x]` with no recorded evidence is a gap rather than a completion.

For a spec at `requirements` whose `requirements.md` still contains a
`[NEEDS CLARIFICATION: …]` marker, recommend **Clarify the requirements** first
instead of **Design it**, and say how many markers remain.

## Step 4 — hand off

Invoke the chosen skill **in the same turn**, passing the resolved spec
identifier. Do not restate the skill's own procedure, do not pre-empt its
questions, and do not do any of its work here: this command routes, it does not
author, plan, implement or verify.

If the user picked **Delete the empty spec**, remove that directory with
`rmdir` and nothing else — `rmdir` is the only write this command is granted
(see `allowed-tools`), and it is granted deliberately: it refuses on a
non-empty directory, so the option cannot destroy a spec that turned out to
have a document in it. Name the exact path before running it. If `rmdir`
refuses, the directory was not empty and the detector was wrong about the
stage: report what it contains and stop. Do not reach for `rm -rf`, and do not
route the deletion through another skill to get around the grant.

## Never

- Never pick a stage the detector did not report.
- Never skip a stage because it "obviously" would pass. The gates exist because a
  design that traces to nothing and a task plan that traces to no design are both
  documents nobody reviewed.
- Never create a second spec for work that already has one — that is what the
  collision check in Step 2 is for.
- Never run a skill without asking, even when only one option applies.
