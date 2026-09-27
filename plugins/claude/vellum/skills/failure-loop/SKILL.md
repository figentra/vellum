---
name: failure-loop
description: Use whenever a gate fails — a test, a typecheck, a lint rule, a structural check, a review finding — to classify the failure before touching anything, route it to whoever owns that concern, fix the cause, and re-run the gate. Also use when tempted to change an assertion, loosen a matcher, add a skip, add `any` or `@ts-expect-error`, or disable a lint rule to make something pass. A failing test is never weakened without first proving the requirement was wrong.
---

# Failure loop

A gate exists to stop work that is not ready. The moment a gate is treated as an
obstacle rather than a signal, it stops protecting anything — and the cheapest way to
make a gate stop protecting is to adjust it until it passes.

```text
Gate failure
   ↓
Classify the failure
   ↓
Route to whoever owns that concern
   ↓
Fix the cause
   ↓
Re-run the affected gate
   ↓
Continue only when the evidence passes
```

## Classify before fixing

Name which of these it is, out loud, before touching anything:

| Class                  | Meaning                                                      | Fix                                                     |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------------------------- |
| **Implementation bug** | The code does not do what the requirement says.              | Fix the code.                                           |
| **Wrong test**         | The test asserts something the requirement never asked for.  | Fix the test — and say which criterion proves it wrong. |
| **Wrong requirement**  | The requirement itself is incorrect or contradictory.        | Stop. Route to the requirement's owner. Do not proceed. |
| **Wrong design**       | The design cannot satisfy the requirement as written.        | Stop. Route to the design's owner.                      |
| **Environment**        | Missing dependency, stale cache, wrong Node, absent fixture. | Fix the environment. Never adjust the assertion.        |
| **Flake**              | Passes and fails on identical input.                         | Fix the nondeterminism. A retry is not a fix.           |

Misclassification is the expensive error. An implementation bug diagnosed as a wrong
test produces a weakened suite that now certifies the bug.

## The rule that matters most

> **A failed test is not an invitation to weaken the test.**

Changing an assertion, loosening a matcher, widening a tolerance, adding a skip, or
deleting a case is permitted **only after** stating which acceptance criterion proves
the old assertion wrong. "The test was too strict" is not that proof. If no criterion
says the assertion was wrong, the assertion stands and the code is what changes.

The same applies to every other gate:

- **Typecheck.** Do not add `any`, `@ts-expect-error` or a cast to clear an error
  without saying what the type was actually wrong about.
- **Lint.** Do not add an inline disable without naming the rule and why this case is
  genuinely the exception. A disable with no reason is a finding.
- **Structural or validation check.** Do not exempt a path to make the check pass. The
  check encodes a decision; exempting it silently reverses that decision.
- **Review finding.** Do not resolve a finding by restating the code. Either fix it or
  argue it, and record which.

## Route to the owner

A failure belongs to whoever owns the concern, not to whoever happened to run the
gate. See the method's `ROSTER.md` (`../../ROSTER.md` relative to this skill's directory) for the roster, and prefer
this repository's own roster where it has one:

| Failure concerns                         | Owner                    |
| ---------------------------------------- | ------------------------ |
| tier or layer boundary, member placement | `architecture-guardian`  |
| test level, coverage, what green proves  | `test-engineer`          |
| package layout, barrels, export subpaths | `package-steward`        |
| catalogs, advisories, toolchain pins     | `dependency-steward`     |
| CI, release flow, pipeline pins          | `release-operations`     |
| docs and code disagreeing                | `docs-governance`        |
| correctness, simplicity, reuse           | `code-reviewer`          |
| WCAG on an app member                    | `accessibility-reviewer` |
| routing unclear, spans several of these  | `delivery-orchestrator`  |

Routing is not delegation of the fix — the owner decides what correct looks like; the
builder still implements it.

## Re-run the gate that failed

Re-run the specific gate, then the gates downstream of what changed. A green run of a
different gate is not evidence. If the fix touched a shared file, the blast radius is
larger than the gate that caught it — say so, and widen the re-run.

## When a gate is genuinely wrong

Gates are not sacred; they are decisions, and a decision can be wrong. Changing one is
allowed — through the mechanism that created it. A check introduced by an ADR changes
by amending that ADR. A test introduced by an acceptance criterion changes by changing
the criterion first. What is never allowed is changing the gate _in the same commit_
as the code that was failing it, with no record of why: that is indistinguishable from
suppressing the signal, including to the person reading the diff a month later.

## When the loop closes but the cause outlives it

A green re-run ends this loop. It does not end the finding if the finding was about the
repository rather than the diff — the same gate will fail the same way on the next spec,
for the next person. The `durable-findings` skill is the edge that closes: it gives the test for
whether a finding outlives its own fix, the destination for each class of finding, and the
agent who writes the artifact. Apply it once the gate is green, not instead of getting it
green.
