# Agent roster

The agents the Vellum method ships, and what each one is allowed to do. Every agent declares a
`tier:` (`economy`, `standard` or `frontier`), never a model; `models.json` maps each tier to a
model per assistant.

## Spec agents: `spec-*`

Personas that run a spec skill contract. `spec-author` writes requirements and design, and
clarifies requirements with the user before design; `spec-planner` writes the task plan, and
after implementation appends a task for every gap between the code and the spec;
`spec-executor` implements exactly one task. None of them approves a document: approval is a
human's `vellum approve`. Each is a tool
grant and a persona, not a procedure; the procedure is the skill.

| Agent           | Runs the skill(s)                         | Tier     |
| --------------- | ----------------------------------------- | -------- |
| `spec-author`   | `spec-new`, `spec-clarify`, `spec-design` | frontier |
| `spec-planner`  | `spec-tasks`, `spec-converge`             | frontier |
| `spec-executor` | `spec-implement`                          | standard |

## Role agents: everything else

Standing roles: what each one owns and whether it can block a merge.

| Agent                    | Owns                                                     | Blocks                                   |
| ------------------------ | -------------------------------------------------------- | ---------------------------------------- |
| `architecture-guardian`  | Tier and layer boundaries, placement, recorded decisions | Yes                                      |
| `release-operations`     | CI, the release flow, the pins CI depends on             | Yes                                      |
| `package-steward`        | Package layout, barrels, export subpaths                 | A new package or subpath only            |
| `test-engineer`          | What is tested, at what level, and what green proves     | A red suite, or an untested failure path |
| `accessibility-reviewer` | WCAG 2.2 AA for app members                              | Critical or serious findings             |
| `code-reviewer`          | Correctness, simplicity, reuse, altitude                 | No: reports                              |
| `dependency-steward`     | Catalogs, advisories, toolchain pins                     | Open critical advisory only              |
| `docs-governance`        | ADRs, rules, `CLAUDE.md`, this roster                    | No: reports                              |
| `delivery-orchestrator`  | Classification, routing, gate order                      | No: sequences                            |

## Two rules that apply to all of them

**Where enforcement and prose disagree, the enforcement is the fact.** A rule is real when
something fails when it is broken: the repository's verify gate, its lint configuration, its
boundary checks, `vellum lint` and `vellum verify`. If an agent's charter and a check disagree, the charter is the
bug. A rule with no failing check is a comment.

**Never report a stage complete on the strength of a gate that could not have observed it.** A
unit-test run does not start a service, exercise the CI runner image, or reach a secret store.
Say what you ran, and record task completion through `vellum task complete` with the command
and its exit status.

## The reference profile

Every role agent opens with a section telling it to read the repository first, and that section
is load-bearing. These agents carry the role (what the concern is, what a finding looks like,
what blocks), but the paths, commands and thresholds in them describe one concrete shape: a
pnpm + Turborepo + Changesets monorepo with tier tags, catalogs and an ADR directory.

A repository that differs is not wrong; the agent is, for that repository. Each agent reads
`CLAUDE.md`, `AGENTS.md`, the rules directory and the ADR directory first, lets them override,
and names in its report which profile it actually applied. **A finding derived from a rule this
repository does not have is not a finding.**
