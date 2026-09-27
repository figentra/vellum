---
name: durable-findings
description: Use once a gate is green again, or once a review finding is fixed, to decide whether the finding outlives its own fix — and if it does, which artifact it becomes (a rule, an ADR, a skill, a check, or a requirement) and which agent writes it. Use when a finding has been raised before, when a check could have caught it and none exists, or when it touches secrets, generated artifacts, the CI gate, boundaries or published exports. The continuation of the `failure-loop` skill.
---

# Durable findings

> Origin: structural finding, first occurrence — the `failure-loop` skill handles a gate failing
> mid-run, and nothing converted a review finding into a rule, an ADR, a skill or a check.
> The instance that made it visible: an ADR was Accepted with its Follow-up section
> stating outright that no check enforced it, and it stayed that way, because no mechanism
> existed to turn "this needs enforcement" into an owner and an artifact. Promoted on first
> occurrence under trigger 3 — it concerns the CI gate.

the `failure-loop` skill covers a gate failing in front of you: classify it, route it, fix the
cause, re-run. That loop ends when the run goes green — and for most findings that is
correctly the end of it.

Some findings are not about the change they were raised on. They are about the system
that let the change be written that way, and fixing only the instance guarantees the
same finding on the next spec, raised by a different reviewer, costing the same review
time, and resolved the same way. This rule is the edge that closes: **when a finding
survives its own fix, it becomes an artifact.**

```text
Finding (review · incident · repeated failure · discovery)
   ↓
Fix the instance            ← always; this is not optional and not deferred
   ↓
Apply the durability test   ← three triggers, below
   ↓
Not durable → stop. Record nothing.
   ↓
Durable → name the class, write the artifact, name the check that will now catch it
```

## The durability test

A finding is durable when **any one** of these holds. One is enough; needing two is how
a rule never gets written.

1. **It has been raised before.** The _second_ occurrence is the trigger, not the third.
   Two independent reviewers reaching the same conclusion about different code is the
   strongest available evidence that the conclusion is about the repository, not the
   diff.

2. **A check could have caught it and none exists.** This is the highest-value trigger
   and the easiest to recognise: if you can state the finding as a predicate over files,
   it is a missing check that a human is currently standing in for. Humans are worse at
   this than scripts and get tired, and a standard nothing enforces is honoured until the
   first busy week. That ADR is the worked example — Accepted, unenforced for its whole
   life, and its own Follow-up section says so.

3. **It touches an area where the first occurrence is already too many.** Secrets,
   generated artefacts, the CI gate, tier and layer boundaries, a published export
   surface, or anything a `critical` risk class covers. Here the recurrence trigger is
   not affordable: the second occurrence is the incident.

Everything else is one-off. Fix it in the change, say so in review, write nothing.
**Promoting a one-off finding is a real cost**, not a harmless excess: every rule is read
by every agent on every session, and a rules directory padded with one-off findings is one
whose genuinely load-bearing rules get skimmed.

## Where each class of finding goes

The class is decided by _what was missing_, not by who found it or how annoying it was.

| What was missing                                                            | Destination                                                        | Who writes it           |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------- |
| A decision. The repository has no position on the question.                 | An **ADR** in the repository's ADR directory                                 | `architecture-guardian` |
| Enforcement. A decision exists; nothing fails when it is broken.            | A **check**, wired into `pnpm verify` and into the CI verify stage | `release-operations`    |
| Awareness. A decision exists and is enforceable only by a human reading.    | A **rule** in `.agents/rules/`                                     | `docs-governance`       |
| A procedure. Someone re-derived _how_ to do something already done twice.   | A **skill** in `.agents/skills/`                                   | `docs-governance`       |
| A behaviour. The code does the wrong thing, and the spec never said.        | A **requirement** in that spec's `requirements.md`                 | `spec-author`           |
| Coverage. The code was right but nothing would have noticed if it were not. | A **test**, at the level that would have caught it                 | `test-engineer`         |
| A version, advisory, or pin.                                                | A **catalog entry** in `pnpm-workspace.yaml`                       | `dependency-steward`    |
| A layout or export-surface mistake that will repeat per package.            | A **scaffold template** change                                     | `package-steward`       |

Two of these are frequently confused, and picking wrong wastes the promotion:

- **Enforcement beats awareness, always.** If the finding can be stated as a predicate
  over files, write the check — not a rule asking agents to remember. A rule is the
  destination only when the judgement genuinely cannot be mechanised.
  the method's `ROSTER.md` (`../../ROSTER.md` relative to this skill's directory) states the same thing as a roster-wide rule: _"A rule with no
  failing check is a comment."_
- **A decision and its enforcement are two artifacts, not one.** An ADR records what was
  decided and why; the check makes it true. Writing the ADR and stopping reproduces
  exactly the gap that ADR spent its whole life in. When the destination is an ADR,
  either the check ships with it or the ADR's Follow-up names the check and who owns it.

The reviewer who raised the finding **names the class and the destination**. The owning
agent **writes the artifact**. Separating those is deliberate: a reviewer who must also
write the rule quietly stops raising findings.

## What "promoted" means, and how anyone can tell

A promotion is finished when the artifact exists **and something already watches it**.
That second half is what the repository can actually check. The right-hand column is
the reference profile; name this repository's equivalent, and where it has none, say so —
that absence is itself a finding:

| Destination | What already fails if it is missing or stale                                    |
| ----------- | ------------------------------------------------------------------------------- |
| ADR         | the repository's docs validator — a stale ADR index or navigation entry         |
| Rule        | none yet — Vellum's projection check is not implemented; say so                 |
| Skill       | none yet — the same missing projection check                                    |
| Check       | the repository's verify gate, and the CI stage that runs it on every change     |
| Requirement | `npx vellum lint` — traceability trailers must reference a criterion that exists    |
| Test        | the repository's verify gate — its test task                                    |
| Catalog     | the repository's dependency check — a literal version where a catalog belongs   |

So: a promoted finding cannot be quietly forgotten afterwards. **It can still be quietly
never promoted** — nothing in this repository detects a finding that was raised, fixed in
place, and never classified. That gap is real and is not papered over here; the mitigation
is the provenance line below, which turns the set of rules and ADRs into the record that
makes the _second_ occurrence recognisable.

## Record where the artifact came from

Every artifact written by a promotion opens with one line naming the finding that caused
it — in the body, not the frontmatter:

```markdown
> Origin: review finding on <spec or change>, <first|second> occurrence — <the finding, in one line>.
```

This is the cheapest available substitute for a findings ledger, and it earns its place
three ways: it tells the next reader whether the rule came from a real failure or from
somebody's taste; it lets a reviewer searching `.agents/rules/` and the ADR directory
discover that a finding has been seen before; and it makes a rule whose origin nobody can
state a candidate for deletion. Nothing checks for this line. A reviewer does.

## Never

- **Never promote a finding by weakening the thing that caught it.** That is
  the `failure-loop` skill's rule and it applies with more force here: the whole point of a
  durable finding is that the signal was correct.
- **Never write the rule and skip the fix.** The instance is fixed first, in the change
  that raised it. A rule is not a way to defer work onto the next person.
- **Never open an ADR number that is already taken, and never renumber one.** Check the
  highest number on disk; ADR numbers are permanent once anything references them.
- **Never record a finding in a document the spec engine does not allow.** No
  `findings.md`, no `notes.md` — a spec has exactly three documents
  (`.agents/skills/README.md`). A finding lives in the artifact it produced, or in the
  review thread where it was fixed, and nowhere in between.
