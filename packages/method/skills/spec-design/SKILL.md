---
name: spec-design
description: Turn an approved requirements.md into design.md for a spec — architecture with Mermaid diagrams, components, data model, error handling, testing strategy, and testable Correctness Properties derived from every EARS acceptance criterion with Validates back-references. Use after spec-new, when the user says "design this", "write the design", "spec-design", or asks how an already-specified feature should be built. Refuses if requirements.md is missing.
---

# spec-design — requirements into a design with correctness properties

You produce the second of three documents in a spec:
`requirements.md` -> **`design.md`** -> `tasks.md`.

You own `design.md` only. You do not touch `requirements.md`. You do not write
`tasks.md`. You do not write implementation code.

**Persona:** this contract is run by the `spec-author` agent (`agents/spec-author.md` in the method), on the **frontier** tier. Dispatch it as that agent rather than inline when the work is delegated — the pin is what makes the model choice deliberate instead of whatever the session happens to be running.

## Step 0 — locate the spec and refuse if requirements are absent

**Where specs live.** The stage detector resolves the specs root and reports it as
`root` in its JSON — `.agents/specs/` when it exists, otherwise `.claude/specs/`,
otherwise a root `specs/`, searching upward to the repository root so it works
from any directory. **Use the root it reports. Do not hardcode one.** Writing to
`.agents/specs/` in a repository that uses `.claude/specs/` creates a second root
the detector will not find, and the next invocation then opens a duplicate spec
for work that already has one.

Below, `<specs-root>` means the root the detector reported.

1. **Read the current state with the stage detector.** Do not `ls` and infer:

   ```bash
   vellum status --json          # every spec
   vellum status <NNN> --json    # one, by number
   ```

   Every skill reads the stage from this one command rather than from its own directory listing, so no two callers can disagree about where a spec is.

   It reports each spec's stage (`empty` · `requirements` · `design` · `tasks` · `invalid`)
   and the skill that produces the next document. If the user named a spec, resolve it by
   fragment. Otherwise use the one at stage `requirements` — that is exactly the set this
   skill acts on. If several are, list them and ask which; this is the only question you
   ask up front.

2. **Act on the reported stage:**

   | Stage          | Action                                                                                            |
   | -------------- | ------------------------------------------------------------------------------------------------- |
   | `requirements` | Proceed — this is the normal case.                                                                |
   | `design`       | A design exists. Revise rather than replace (step 4 below), preserving Property numbers.          |
   | `tasks`        | Warn first: `tasks.md` references Property numbers, so a renumbering here breaks it. Then revise. |
   | `empty`        | Refuse, per step 3.                                                                               |
   | `invalid`      | Stop and report the broken chain. Never auto-repair it.                                           |

3. **If `requirements.md` does not exist, refuse.** Say exactly this shape:

   > There is no `requirements.md` in `<specs-root>/<NNN>-<slug>/`. A design cannot be
   > derived from nothing, and I will not invent the requirements in order to
   > design against them. Run the `spec-new` skill first.

   Then stop. Do not create a stub `requirements.md`. Do not proceed from the
   user's verbal description instead. The requirements document is the input;
   without it there is nothing to trace a design to.

4. **If `design.md` already exists,** read it and tell the user you are revising
   rather than replacing. Preserve requirement numbering and existing Property
   numbers wherever the underlying criteria are unchanged — `tasks.md` and any
   review comments reference those numbers.

## Step 1 — read the requirements completely

Read the whole of `requirements.md`. Then produce, for your own use, an explicit
inventory before writing anything:

- every requirement number and title
- every criterion number, verbatim, with its EARS pattern identified
- every Glossary term

You will need the verbatim criteria in Step 3, and the inventory is what makes the
coverage guarantee checkable rather than aspirational.

If a criterion is ambiguous, malformed, or contradicts another, **do not silently
fix it.** Note it, design against the most defensible reading, and list it in
`## Open Questions` with the reading you chose.

## Step 2 — research, and summarise inline

**Start from `requirements.md`'s `## Discovery` section, and do not redo it.** `spec-new`
Step 3 has already established what the system does today: current behaviour, topology,
dependencies at their pinned versions, ownership, the ADRs and rules that constrain this
area, and the sources for all of it. Read it first. Re-deriving it wastes a pass and
produces a second, subtly different account of the same system, which is worse than no
account because now two documents disagree.

Two things you owe that section rather than ignore:

- **Verify the claims you are about to design against.** Discovery is evidence, not
  gospel — it was written before the design existed and may have missed what turns out
  to matter. Where you find it wrong, say so in `## Open Questions` naming the source
  that corrects it. Do not edit `requirements.md`; you do not own it.
- **Say what it did not cover.** If discovery stopped short of something the design
  needs, that gap is itself a finding, and naming it is what stops the next spec
  stopping in the same place.

Your research answers the other question. Discovery asked _what does this system do_;
you are asking _what should this be built out of_. Investigate, as applicable:

- the existing code this feature extends or sits beside — real file paths, real
  signatures, read rather than assumed
- the repository's own conventions: `README.md`, `AGENTS.md`, `CLAUDE.md`, rules
  directories, existing modules that solve an analogous problem
- library and framework capabilities, at the version the repository actually
  pins — check the lockfile or manifest, not your memory
- protocol, provider, or regulatory constraints the requirements imply
- prior art: how this problem is normally solved, and why the normal solution
  does or does not fit here

**Summarise all findings inline, in `## Overview` under "Research summary", and in
the relevant `## Components` sections.** Include versions, file paths, and the
specific fact that mattered.

**Do not create a research document.** No `research.md`, no `notes.md`, no
`findings/` directory, no scratch file in the spec directory. A finding that is
not in `design.md` does not exist. The spec directory contains exactly three
documents.

## Step 3 — PREWORK: derive the correctness properties

Do this before you write any prose. It is the most valuable step in the system and
the one most likely to be skipped under time pressure. Do not skip it.

### 3a. Classify every criterion

Walk the criteria **one at a time, in order, all of them**. For each, decide:

- **EXAMPLE** — the criterion fixes one concrete case. It names a specific value,
  a specific input, a specific fixture, or one particular path through the system.
  `WHEN a 5MB file is uploaded, THE Uploader SHALL reject it with status 413`.
  An example becomes a **test case**, recorded under `## Testing Strategy`.

- **UNIVERSAL** — the criterion asserts something that must hold across a whole
  class of inputs, states, orderings, or histories. Tells: it constrains a
  relationship between values; it must survive retries, concurrency, or
  reordering; it describes a conservation, a bound, a monotonicity, a uniqueness,
  or a round-trip. `WHEN a request carries a previously seen idempotency key,
THE Service SHALL return the original response` is universal — it must hold for
  every key, every payload, and every arrival order.
  A universal becomes a **Property**.

A criterion phrased as an example is sometimes a universal wearing a specific
number. Ask: _is the number the point, or is it an illustration of a rule?_ If the
rule is the point, write the property over the rule and keep the number as an
example test case as well.

### 3b. Group and quantify

Several criteria often collapse into one property; one criterion can generate
several. Group by the invariant, not by the requirement they came from.

Write each property so that:

- the body begins with explicit quantification — **"For all…", "For any…",
  "For every…"**
- the **domain** being quantified over is named concretely: not "for all inputs"
  but "for all sequences of deposit and withdrawal operations applied to a single
  account", "for any two requests carrying the same idempotency key", "for every
  parent path in the folder tree"
- the condition that must hold is stated without exception, in terms a test could
  assert by recomputation or by comparison
- it is falsifiable: you can describe the counterexample that would break it

### 3c. Format exactly

```
Property N: <short noun-phrase title>
<body, universally quantified, no bullet list>
**Validates: Requirements 1.2, 3.4**
```

Numbering from 1, contiguous. Every property carries a `**Validates:**` line
listing every criterion it validates, by `<requirement>.<criterion>` number only.
No prose references, no quoted criterion text.

### 3d. Prove coverage

Fill the `### Requirement coverage` table in the template: one row per criterion,
every criterion from your Step 1 inventory present, each classified EXAMPLE or
UNIVERSAL and bound either to a Property number or to a named test case.

**You must cover every requirement.** Not the interesting ones, not the ones the
architecture happens to touch — every requirement, and every criterion within it.
If a criterion genuinely cannot be designed for in this spec, it appears in
`## Open Questions` with the reason and the decision that would unblock it. A
criterion that appears in neither the coverage table nor Open Questions is a
defect that fails review.

## Step 4 — write the design

Copy the `design.md` template (`.agents/templates/design.md` in the repository when it has one, otherwise `../../templates/design.md` relative to this skill's directory) to `<specs-root>/<NNN>-<slug>/design.md` and fill
every section. Rules beyond the template:

**Diagrams are Mermaid,** in fenced ` ```mermaid ` blocks — `graph`/`flowchart`
for structure, `sequenceDiagram` for anything with ordering or failure timing,
`erDiagram` for the data model, `stateDiagram-v2` for a lifecycle. No ASCII art,
no external images. One diagram that shows the real mechanism beats three that
restate the section headings.

**Use the repository's language when the repository has one.** Pseudocode is the
fallback for a genuinely language-neutral algorithm, not the default. In a
TypeScript workspace, a TypeScript component's interfaces are written as real
`typescript`-fenced declarations with TSDoc — signature, parameters, return type,
thrown errors. A reader should be able to start implementing from the design
without inventing the public API first. Reserve pseudocode for the _body_ of a
non-obvious algorithm, where the logic matters and the syntax does not. Never
paste code purporting to come from a file you have not read.

**Applicable Standards are references, never restatements.** Fill the table with the
ADR and rule _paths_ that govern this change, what each governs here, and the check
that enforces it. Do not copy a standard's content into the design: a spec is frozen
work product and a standard is living, so a copied rule goes stale with nothing to
detect it. Where the table would say "review" for something mechanically checkable,
raise it in Open Questions and name the check that should exist — an agent asked to
remember twenty rules will drop one.

**Every module the design creates gets a complete folder structure.** A fenced
tree naming every file to be written, annotated where a path is not
self-explanatory — subpath entry points, generated files, test locations. This is
the section `spec-tasks` turns into tasks; a design that says "a service, a
repository and some types" produces a task plan that says the same thing and an
implementation that invents the rest.

```
packages/<tier>/<name>/
├── src/
│   ├── <subject>/
│   │   ├── <symbol>.interface.ts
│   │   └── index.ts
│   ├── index.ts              ← public barrel
│   └── <entry>.ts            ← ./<entry> subpath
└── test/
```

**Data models are declarations, not descriptions.** Give the concrete shape —
fields, types, optionality — in the repository's language, plus the table stating
each field's meaning and whether it is mutable after write. An `erDiagram` shows
the relationships; it does not replace the declarations.

**Errors are a hierarchy, not a list.** Where the design introduces more than two
error kinds, show the type hierarchy and the code or discriminant each carries, so
a caller can branch on them.

**Name placements, not abstractions.** Each component says which directory or
module it lives in and why that placement is right under this repository's own
boundary rules.

**Worked examples earn their place.** Where a public API's intended use is not
obvious from its signature — a builder, a factory, a decorator, a hook — include a
short usage example. One example per genuinely non-obvious surface; a design that
exemplifies every getter is padding.

**Error handling is a table of decisions,** not a paragraph of intentions: the
failure, how it is detected, the response, what the caller sees, whether it
retries. Include the partial-failure ordering — the sequence of side effects such
that any prefix leaves a reconcilable state.

**Testing Strategy maps back to Step 3:** every Property gets a generator and an
assertion; every EXAMPLE criterion gets a case. The strategy is how correctness is
checked, not a task list — task ordering belongs to `spec-tasks`.

**Open Questions are real unknowns only,** each with who resolves it, whether it
blocks, and what the design assumes meanwhile. A question you could have answered
by reading the code is a defect, not a question.

## Step 5 — self-check, then stop

Before ending your turn, verify all of these and state the result:

- [ ] `requirements.md` was read in full; every requirement number is accounted for
- [ ] every criterion appears exactly once in the coverage table
- [ ] every UNIVERSAL criterion is bound to a Property; every EXAMPLE to a test case
- [ ] every Property is universally quantified over a named domain and is falsifiable
- [ ] every Property carries a `**Validates: Requirements …**` line with numeric refs
- [ ] Property numbering is contiguous from 1
- [ ] no Glossary term is used before it is defined; no term contradicts `requirements.md`
- [ ] every diagram is Mermaid and renders as valid Mermaid syntax
- [ ] every algorithm without a fixed language is pseudocode
- [ ] research findings are inline; no separate research file was created
- [ ] `requirements.md` was not modified

Then end with the path written, a short summary, the count of properties and of
example-level cases, and any Open Questions that block.

Finally, **ask the user how to proceed**, with `AskUserQuestion`. Offer exactly these
options, in this order:

- **Revise the design** — the user has corrections, or answers to the Open Questions.
  Apply them, rewrite `design.md`, and ask again.
- **Proceed to tasks** — run the `spec-tasks` skill to produce `tasks.md`, then stop for
  review before implementation.
- **Revise the requirements instead** — the design surfaced a defect in `requirements.md`.
  This skill never edits that file, so hand back to `spec-new` with the defect named.

**Then act on the answer.** On _revise_, stay in this skill. On _proceed_, hand off to
`spec-tasks` in the same turn. Until the user answers, do not write `tasks.md` and do not
begin implementing — the user's approval of the design is the gate.

## Never

- Never proceed without `requirements.md`; never reconstruct it from conversation.
- Never modify `requirements.md` — including renumbering it. Report defects instead.
- Never create a separate research, notes, or findings file.
- Never leave a criterion unclassified, uncovered, and unmentioned.
- Never write a Property without explicit quantification or without `**Validates:**`.
- Never write `tasks.md` or implementation code in this skill.
