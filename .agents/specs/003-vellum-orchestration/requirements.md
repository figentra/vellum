# Requirements Document

## Intake

**Problem:** Once Slice 1 makes state, approvals and evidence checkable (spec 002), the engine still cannot control the work. It holds no risk-class policy, typed task graph or execution control. It has no session claims, failure classification, Decision Contract or Prompt Catalog, and no schema migration or Doctor. So every run is steered by prose, an interrupted run resumes from memory, and a gate can be edited green. Amendment 1 adds that every stage reads whole documents, and that a model is a per-file pin rather than a policy. The user's decisions of 2026-09-25 add three more gaps. Nothing maps a tier to a model per assistant. Nothing retries or escalates a failed agent output on evidence. And a large Artifact can only be rewritten whole, so two sessions editing one document race on the whole file.

**Risk class:** critical. This slice decides **permissions**: which Agent Role may write, through the Model Tiers (Requirements 12 and 18), and which session may write a path or a Section (Requirements 4 and 20). It governs **data egress** to external model providers (Requirement 14). And it fixes **externally visible contracts**: the Decision Contract, the Prompt Catalog, the Schema and its migration, and the assistant packages (Requirements 6, 7, 9 and 17).

**Lifecycle path:** full spec, both review gates, no shortcut. This is **Slice 2, control**, of Programme Spec `001-vellum-platform`. It depends on spec 002 (Slice 1): the Ledger, the Lifecycle Engine, the Exit Status Convention, the Protocol Validator, Check Results and the Slice 1 half of the pre-execution check. It is designed and built after 002's Slice 1 is proven on the Pilot Spec. It became a Child Spec on 2026-09-25, when the user applied Requirement 13 of this spec (old R41) to spec 001 (programme spec 001, Intake).

## Discovery

The programme's Discovery is canonical and is not repeated here: `.agents/specs/001-vellum-platform/requirements.md`, section `## Discovery`, including its Amendment 1 discovery. Everything below is only what this slice adds. It was read in this session, on 2026-09-25.

**Current behaviour (added for this slice):**

- **Agent tiers and a model map already exist in the working tree, and have overtaken the programme's Discovery.** The programme's Amendment 1 discovery records a `model:` pin in each agent: 16 `opus` and 7 `sonnet`. The working tree now reads differently:
  - `.agents/models.json` declares `"tiers": ["economy", "standard", "frontier"]`, ordered cheapest first, "the order a failing output escalates in".
  - The same file maps each of `claude`, `kiro` and `opencode` to a model id per tier. `null` means "the assistant's own default model".
  - The 23 agent sources declare `tier:` and no `model:`: 16 `frontier`, 5 `standard` and 2 `economy`.
  - `tools/scripts/agents-sync.mjs` renders each agent's model from the map. It treats an agent's `model:` as an override, and prints each override as `OVERRIDE`. It exits 2 when the map lacks an entry.
  - An agent that declares no tier gets no model, so the assistant's default applies.

  The provenance of these edits is not established, and they are recorded as observed.
- **Five file-writing agents are below `frontier`.** `spec-executor`, `e2e-test-engineer`, `code-standards-steward`, `docs-adr-steward` and `docs-changesets-steward` are `standard` or `economy`, and each grants `Write` and `Edit`. Requirement 12 (old R40) makes a file-writing role a Frontier-Only Role and refuses the `reader` Model Tier for it. Criteria 18.4 and 18.5 fix how the three tiers meet Requirement 12's two, and Assumption 1 below records the consequence.
- **The map does not make escalation distinct on two assistants.** `kiro` maps `economy` and `standard` to the same id and `frontier` to its default. `opencode` maps all three tiers to one model.
- **Nothing escalates.** The word "escalates" appears in `agents-sync.mjs` only in a comment on the tier order. No tool retries an agent output or moves it up a tier.
- **Nothing writes part of a document.** Each Artifact is written whole. Requirement 4 (old R18) refuses a write when the Artifact Version read differs from the current one, which is whole-Artifact granularity.

**Repository topology:** unchanged from the programme's Discovery. Requirement 18 lands beside `.agents/models.json` and the Projector. The Legacy Tooling's copy of that logic is `tools/scripts/agents-sync.mjs`, which Requirement 002:2 retires.

**Dependencies:** spec 002 (Slice 1), as named under Intake. Otherwise unchanged from the programme's Discovery.

**Ownership:** as in the programme's Discovery. In addition, `architecture-guardian` owns the Tier Ladder's reconciliation with Requirement 12 (Assumption 1). `security-compliance-reviewer` owns the Model Override report.

**Constraints:** the programme's Constraints apply. [`.agents/rules/concurrent-sessions.md`](../../rules/concurrent-sessions.md) is the incident record behind Section Claims (Requirement 20), as it is for Requirement 4.

**Sources (added for this slice):**

| Source                                                                                      | What it established                                                                                                                     |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `.agents/specs/001-vellum-platform/requirements.md` at HEAD (`git show HEAD:…`), read in full | Every moved requirement's text and Delivery slice line; Requirement 12's (old R40) two Model Tiers and Frontier-Only Role rule          |
| `.agents/models.json`                                                                       | The tier order `economy`, `standard`, `frontier`; a model per tier for `claude`, `kiro` and `opencode`; `null` as the assistant default |
| `grep -h '^tier:' .agents/agents/*.md`; `grep '^tools:'` on the non-frontier agents         | 16 `frontier`, 5 `standard`, 2 `economy`; five non-frontier agents grant `Write` and `Edit`                                             |
| `tools/scripts/agents-sync.mjs` lines 335–370, 658–716, 1285–1292 (working tree)            | Tier and override frontmatter; the map loader exits 2 on a missing entry; overrides printed as `OVERRIDE`; no tier means no model       |
| `grep -rn escalat tools/`                                                                   | One comment, no implementation                                                                                                          |
| The coordinator's brief of 2026-09-25 (user decisions)                                      | Requirements 18, 19 and 20, and the instruction to reconcile Requirement 18 with Requirement 12                                         |

## Introduction

This slice gives the engine control over the work that Slice 1 made checkable. It holds:

- risk classes and a configurable Policy, and a typed task model with a validated dependency graph;
- execution control, and sessions and claims with a commit check against the index;
- failure classification, and the rule that a gate is never edited to make itself pass;
- the Decision Contract and the Prompt Catalog, skills that find their own files, versioned schema migration, and the Doctor.

From Amendment 1 it adds:

- Context Bundles, a Model Tier for each Agent Role, and spec-size limits with Programme Specs;
- the model data-egress policy and a derived workspace model;
- assistant packaging from one skill set, and the Slice 2 half of the pre-execution check.

Three requirements decided on 2026-09-25 close the slice:

- **Requirement 18** makes Requirement 12 concrete. A role declares a tier and never a model, and one map says which model each Assistant runs for that tier.
- **Requirement 19** verifies an agent's output with the engine's own Checks. It retries a failed output once at the same tier, then escalates one tier at a time, and stops for a human at the top.
- **Requirement 20** lets a large Artifact be written one Section at a time. Each Section Write is atomic, is refused if the Section changed since it was read, and can be claimed per Section. The Artifact stays the one file Kiro renders.

Requirements 1 to 17 are 001's R15–R24, R39, R40, R41, R42, the Slice 2 criteria of R46, R47 and the Slice 2 criteria of R48, renumbered in their original order. Criterion text is unchanged except where it references another requirement. The programme's Requirement map resolves each old reference.

**Users:** each role is as defined in the programme's Introduction. This slice serves the **Spec Author**, the **Executing Agent**, the **Orchestrating Agent**, the **Kiro Operator**, the **Consumer Maintainer**, the **Platform Maintainer** and the **Reviewer**.

**Business outcome:** execution resumes from recorded state and never from memory. A cheaper model is tried first, and a stronger one only when a Check has failed. No model judges its own output. And two sessions can edit different Sections of one large Artifact without either overwriting the other.

**In scope:** Requirements 1 to 20 below.

**Out of scope:**

- **Everything Slices 1, 3 and 4 hold.** The enforceable core is spec 002. Quality checks and gates are 004, and metrics are 005.
- **Choosing concrete models.** Which model each Assistant runs per Role Tier is Assistant Model Map configuration, not a criterion. A model named in a criterion would go stale on the next release.
- **Splitting an Artifact into several files.** Requirement 20 writes Sections of one file, and Requirement 002:23 forbids document parts.
- The programme's Out of scope list applies unchanged.

**Measurable success:**

1. Context Bundles for each task of the Pilot Spec are byte-identical across two runs (criterion **11.11**).
2. No Egress Record in a Fixture Repository holds sent content (criterion **14.4**).
3. A Policy assigning the `reader` Model Tier to a Frontier-Only Role exits with status 2 (criterion **12.3**).
4. Each Assistant Package's Skill bodies match the Skill Set (criterion **17.2**).
5. A missing Assistant Model Map entry names the Agent Role and the Assistant (criterion **18.10**).
6. A failure at `frontier`, after a retry, stops for a human (criterion **19.6**).
7. A stale expected Section Checksum refuses the write and names the Section (criterion **20.5**).

## Glossary

The programme's Glossary, in `.agents/specs/001-vellum-platform/requirements.md`, is canonical for this spec. Each `THE <subject>` used below is defined there, or in the table below. This spec adds these terms.

| Term                    | Definition                                                                                                                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tier Ladder             | The ordered list `economy`, `standard`, `frontier`, from cheapest to strongest. "The next Role Tier up" means the next entry in this order.                                                                                  |
| Role Tier               | The Tier Ladder entry an Agent Role source declares. A Role Tier is not a model. Criteria 18.4 and 18.5 fix which Model Tier each Role Tier falls under.                                                                     |
| Assistant Model Map     | The part of the Model Policy, in one version-controlled file in the Consumer Repository, that gives each Assistant one entry per Role Tier: a model identifier, or Assistant Default.                                        |
| Assistant Default       | An Assistant Model Map entry meaning that the Assistant's own default model applies, so the Projector names no model.                                                                                                        |
| Model Override          | A model an Agent Role source names in place of the Assistant Model Map's model for that Agent Role's Role Tier.                                                                                                              |
| Override Notice         | A report line naming one Model Override. It is not a Finding, and it does not change the exit status.                                                                                                                        |
| Attempt                 | One run of an Agent Role to produce the output of one task, at one Role Tier and one model. A task's first Attempt runs at the Agent Role's Role Tier. A retry Attempt runs at the same Role Tier as the Attempt it retries. |
| Escalated Attempt       | An Attempt started at the next Role Tier up the Tier Ladder from the Attempt that failed (criterion 19.5).                                                                                                                   |
| Attempt Record          | A Ledger Entry recording one Attempt: the task, the Role Tier, the model, the Findings and the outcome.                                                                                                                      |
| Section                 | One addressable part of an Artifact Body, delimited by the Markdown Protocol's headings.                                                                                                                                     |
| Section Address         | The stable identifier of one Section within one Artifact.                                                                                                                                                                    |
| Section Checksum        | A cryptographic digest of one Section's content, with line endings normalised to LF.                                                                                                                                         |
| Section Write           | A write that replaces one Section's content, and carries that Section's Section Address and expected Section Checksum.                                                                                                       |
| Section Writer          | The part of the Platform that applies Section Writes to Artifacts.                                                                                                                                                           |
| Section Claim           | A Ledger Entry recording that one Session holds one Section of one Artifact.                                                                                                                                                 |
| Active Section Claim    | A Section Claim held by an Active Session and not released.                                                                                                                                                                  |
| Section Write Threshold | The Policy-configured Artifact Body size, in bytes, above which an Artifact is written by Section Write only.                                                                                                                |

## Requirements

### Requirement 1: Four risk classes, and controls from configurable policy

**Delivery slice:** 2

**User Story:** As a Consumer Maintainer, I want four risk classes whose controls come from policy I configure, so that a critical change gets dual approval and an explicit release while a low one is not buried in ceremony.

**Table 1.A — Default Policy** (from the plan's §11; each value is overridable by the Policy).

| Risk Class | Requirements review | Design review | Security gate                      | Approvals per Artifact | Release gate                 | Quick path    |
| ---------- | ------------------- | ------------- | ---------------------------------- | ---------------------- | ---------------------------- | ------------- |
| `low`      | required            | optional      | optional                           | 1                      | standard                     | permitted     |
| `standard` | required            | required      | when the Policy's conditions match | 1                      | standard                     | not permitted |
| `high`     | required            | required      | required                           | 1                      | explicit                     | not permitted |
| `critical` | required            | required      | required                           | 2                      | explicit, with rollback path | not permitted |

#### Acceptance Criteria

1. THE Policy Engine SHALL recognise the Risk Classes `low`, `standard`, `high` and `critical`.
2. THE Policy Engine SHALL read Controls from the Policy in the Consumer Repository.
3. WHERE the Policy declares no value for a Control, THE Policy Engine SHALL apply the value Table 1.A gives, except for Authorised Approvers, for which Table 1.A gives no default.
4. WHERE the Policy scopes a Control by Risk Class, Artifact, path, change type or environment, THE Policy Engine SHALL apply the most specific matching rule.
5. IF two Policy rules of equal specificity assign different values to one Control, THEN THE Policy Engine SHALL exit with status 2 and name both rules.
6. IF the Policy fails the Policy Schema, THEN THE Policy Engine SHALL exit with status 2 and name the file and the field.
7. IF a Spec declares a Risk Class outside the four, THEN THE Lifecycle Engine SHALL compute the Spec's Effective Lifecycle State as `INVALID` and name the declared value.
8. WHEN a Spec's Risk Class changes, THE Policy Engine SHALL record the change as a Decision in the Ledger.
9. WHEN a Spec's Risk Class changes, THE Policy Engine SHALL re-evaluate the Controls for each subsequent transition of that Spec.
10. WHERE the Policy permits the quick path for a Spec's Risk Class, THE Lifecycle Engine SHALL permit the transition from `REQUIREMENTS_APPROVED` to `IN_PROGRESS`.
11. WHERE the Policy requires distinct author and approver, IF the approving identity authored the Artifact Version, THEN THE Approval Verifier SHALL reject the Approval Record and name the identity.

### Requirement 2: A typed task model and a validated dependency graph

**Delivery slice:** 2

**User Story:** As an Orchestrating Agent, I want waves derived from declared dependencies and the graph validated before dispatch, so that no task runs before what it depends on and no two parallel tasks write one file.

**Table 2.A — Task State to Task Marker projection.**

| Task State                                             | Task Marker |
| ------------------------------------------------------ | ----------- |
| `pending`, `failed`, `blocked`, `skipped`, `cancelled` | `[ ]`       |
| `queued`                                               | `[~]`       |
| `claimed`, `running`                                   | `[-]`       |
| `succeeded`                                            | `[x]`       |

#### Acceptance Criteria

1. THE Task Engine SHALL parse each task in `tasks.md` into a Task Record.
2. THE Task Engine SHALL project each Task Record's Task State to the Task Marker Table 2.A gives.
3. WHEN the Task Engine derives Waves, THE Task Engine SHALL place each task in a Wave after each Wave holding a task that task depends on.
4. WHEN the Task Engine derives Waves, THE Task Engine SHALL place two tasks in one Wave only when the two tasks declare no common path.
5. IF a task declares a dependency on a task identifier that `tasks.md` does not define, THEN THE Task Engine SHALL report a Finding naming both identifiers.
6. IF the dependency graph contains a cycle, THEN THE Task Engine SHALL report a Finding naming the cycle's tasks in dependency order.
7. IF a Required Task depends on an optional task, THEN THE Task Engine SHALL report a Finding naming both tasks.
8. WHILE a task depends on a task whose Task State is `failed`, THE Task Engine SHALL report the dependent task as blocked and name the failed task.
9. IF a cross-spec dependency names a Spec or task that does not exist, THEN THE Task Engine SHALL report a Finding naming the dependency.
10. WHILE a cross-spec dependency's task lacks an Evidence Entry with exit status 0, THE Task Engine SHALL report the dependent task as blocked and name the cross-spec task.
11. IF a wave graph written in `tasks.md` places two tasks declaring a common path in one Wave, THEN THE Task Engine SHALL report an unsafe-parallelism Finding naming both tasks and the path.
12. IF a wave graph written in `tasks.md` differs from the Waves the Task Engine derives, THEN THE Task Engine SHALL report a Finding naming each differing task.
13. WHERE a task line carries Dependency Notation, THE Task Engine SHALL keep the task line matching the Kiro Task Line Grammar.
14. THE Platform SHALL carry in the Kiro Fixture one task line for each Dependency Notation form.

### Requirement 3: Execution control

**Delivery slice:** 2

**User Story:** As an Orchestrating Agent, I want to run a whole spec, a wave or a task, and to rehearse, pause, resume, retry, skip, block or cancel, so that execution is controllable and an interrupted run resumes from recorded state rather than from memory.

#### Acceptance Criteria

1. WHEN a run is requested for a Spec, THE Execution Controller SHALL dispatch each Wave in order until each Required Task has reached `succeeded` or the run stops.
2. WHEN a run is requested for one Wave, THE Execution Controller SHALL dispatch only the tasks of that Wave.
3. WHEN a run is requested for one task, THE Execution Controller SHALL dispatch only that task.
4. WHEN a dry run is requested, THE Execution Controller SHALL report the Waves and tasks the Execution Controller would dispatch and write no file.
5. WHEN a pause is requested, THE Execution Controller SHALL dispatch no further task and let each running task finish.
6. WHEN a resume is requested, THE Execution Controller SHALL continue from the Task States the Ledger records.
7. WHEN a resume is requested, THE Execution Controller SHALL treat each Stale Marker's task as `pending`.
8. WHEN a retry is requested for a `failed` task whose attempt count is below the task's retry-policy maximum, THE Execution Controller SHALL dispatch the task again and increment the attempt count.
9. IF a retry is requested for a task whose attempt count has reached the task's retry-policy maximum, THEN THE Execution Controller SHALL set the task to `blocked` and name the attempt count.
10. WHEN a skip is requested for an optional task, THE Execution Controller SHALL set the task to `skipped`.
11. IF a skip is requested for a Required Task, THEN THE Execution Controller SHALL refuse with exit status 1 and name the task.
12. WHEN a block is requested for a task, THE Execution Controller SHALL set the task to `blocked` and record the reason in the Ledger.
13. WHEN a cancel is requested, THE Execution Controller SHALL dispatch no further task, set each queued task to `cancelled` and release each Claim the run holds.
14. IF a run is requested for a Spec whose Effective Lifecycle State precedes `PLAN_APPROVED` in Table 002:5.A, THEN THE Execution Controller SHALL refuse with exit status 1 and name the Effective Lifecycle State.
15. WHEN a dispatched task fails, THE Execution Controller SHALL obtain a Failure Class from the Failure Classifier before dispatching remediation.

### Requirement 4: Sessions, claims and commit ownership

**Delivery slice:** 2

**User Story:** As an Executing Agent sharing a clone with another session, I want claims, conflict checks and a commit check against the index, so that no session silently overwrites another's work and a commit holds only paths the committing session produced.

#### Acceptance Criteria

1. WHEN a Session starts, THE Session Manager SHALL record the Session's identifier, actor kind, start timestamp and first heartbeat.
2. WHEN a task is claimed, THE Session Manager SHALL record a Claim naming the task, the Session and the task's declared paths.
3. IF a task is claimed while another Active Session holds an Active Claim on that task, THEN THE Session Manager SHALL refuse the claim with exit status 1 and name the holding Session.
4. WHEN a Claim is released, THE Session Manager SHALL append a claim-release Ledger Entry naming the Claim.
5. WHILE a Session's last heartbeat is older than the Heartbeat Timeout, THE Session Manager SHALL report that Session's Claims as stale.
6. IF a Session writes a path that another Active Session's Active Claim declares, THEN THE Session Manager SHALL refuse the write with exit status 1 and name the path and the holding Session.
7. IF the Artifact Version a Session read differs from the current Artifact Version when the Session writes that Artifact, THEN THE Session Manager SHALL refuse the write with exit status 1 and name both versions.
8. IF the index at pre-commit time holds a staged path whose staged content the committing Session did not produce, THEN THE Session Manager SHALL refuse the commit with exit status 1 and name the path.
9. WHEN conflicts are requested for a task, THE Session Manager SHALL report each Active Session whose Active Claims declare a path the task declares.
10. WHILE a task line carries a Stale Marker, THE Status Reporter SHALL report the task as a Stale Marker and name the Spec and the line.
11. WHEN session status is requested, THE Session Manager SHALL report each Session, its Active Claims and its heartbeat age.

### Requirement 5: Failures are classified before remediation, and a gate is never changed to make itself pass

**Delivery slice:** 2

**User Story:** As a Reviewer, I want each failure classified before anyone fixes it, and a change that weakens a gate in the same change that makes the gate pass to be refused, so that a red gate is never turned green by editing the gate.

#### Acceptance Criteria

1. WHEN a task fails, THE Failure Classifier SHALL assign one Failure Class to the failure before any remediation is dispatched.
2. WHEN the Failure Classifier assigns a Failure Class, THE Failure Classifier SHALL record in the Ledger the task, the Failure Class, the severity, the owner, the attempt count and the remediation route.
3. WHEN the Failure Classifier assigns a Failure Class, THE Failure Classifier SHALL route the failure to the remediation the Policy names for that Failure Class.
4. IF the Failure Classifier cannot assign a Failure Class, THEN THE Failure Classifier SHALL set the task to `blocked` and present a Decision to a human.
5. IF a change modifies a Gate Definition and the same change turns that Gate's result from fail to pass, THEN THE Gate Runner SHALL report a Gate Integrity Violation with exit status 1 and name the Gate and the modified Gate Definition file.
6. THE Gate Runner SHALL evaluate a Gate Integrity Violation by comparing the Gate's result at the change's base commit with the Gate's result at the change's head commit.

### Requirement 6: One Decision Contract for every human interaction

**Delivery slice:** 2

**User Story:** As a Spec Author working in any of the three assistants, I want each lifecycle question asked the same way, recorded the same way and with the same effects, so that no assistant invents its own question or its own semantics for the same decision.

#### Acceptance Criteria

1. THE Platform SHALL represent each human interaction as a Decision Contract.
2. THE Decision Renderer SHALL support the Interaction Types `decision`, `checklist`, `confirmation`, `input`, `approval` and `automatic gate`.
3. WHEN a Decision is answered, THE Decision Renderer SHALL record in the Ledger the actor, a UTC timestamp, the selection and the rationale.
4. WHEN the Decision Renderer renders options, THE Decision Renderer SHALL place the recommended option first.
5. WHEN the Decision Renderer renders for Claude Code, THE Decision Renderer SHALL produce questions within the Question Tool Limits.
6. WHERE OpenCode offers a question capability, THE Decision Renderer SHALL render for OpenCode through that capability.
7. WHERE an Assistant offers no question capability, THE Decision Renderer SHALL render the Numbered Fallback.
8. WHEN an option of a Decision is selected, THE Decision Renderer SHALL apply the effects the Decision Contract defines for that option, irrespective of the Assistant that rendered the Decision.
9. WHERE a Decision's Interaction Type is `approval`, THE Decision Renderer SHALL render instructions for giving an Approval Signal and accept no answer from within the Assistant Session.
10. WHERE a Decision's Interaction Type is `confirmation`, THE Decision Renderer SHALL show the exact values of the action to be confirmed.
11. WHERE a Decision's Interaction Type is `confirmation`, IF the answer is other than the explicit confirming option, THEN THE Decision Renderer SHALL abort the action and record the abort.
12. WHERE a Decision's Interaction Type is `automatic gate`, THE Decision Renderer SHALL continue on a pass result and block on a fail result without presenting a question.
13. WHEN a Skill produces an Artifact draft, THE Decision Renderer SHALL present the first Decision of that stage after the draft is written.
14. IF a Decision's prerequisite chain is broken, THEN THE Decision Renderer SHALL present the broken chain to a human and leave the chain unmodified.

### Requirement 7: A versioned Prompt Catalog, tested like an API

**Delivery slice:** 2

**User Story:** As a Platform Maintainer, I want every prompt to be one versioned catalog entry with automated conformance tests, so that a prompt that breaks the question tool or loses its effects fails a check instead of a user.

#### Acceptance Criteria

1. THE Prompt Catalog SHALL hold each Prompt as one entry with an identifier, a Schema Version, an Interaction Type, a stage, a trigger, a question, options, a recommended option, required states, effects and recorded fields.
2. THE Platform SHALL render each Assistant's prompts from the Prompt Catalog alone.
3. WHEN the Prompt Conformance Check runs, THE Prompt Catalog SHALL verify for each Prompt that the Prompt renders for Claude Code, renders as a Numbered Fallback, has 2 to 4 options where the Interaction Type is `decision` or `checklist`, names a recommended option, records actor and timestamp, defines effects for each option and has a deterministic trigger.
4. IF a Prompt fails a Prompt Conformance Check assertion, THEN THE Prompt Catalog SHALL exit with status 1 and name the Prompt and the assertion.
5. IF a Prompt's content changes without an increment of the Prompt's version, THEN THE Prompt Catalog SHALL exit with status 1 and name the Prompt.
6. IF a Skill presents a question bound to no Prompt identifier, THEN THE Prompt Catalog SHALL report a Finding naming the Skill and the line.
7. WHERE the Prompt Catalog holds a translation for a locale, THE Decision Renderer SHALL render the Prompt in that locale.

### Requirement 8: Skills find their own files in any assistant

**Delivery slice:** 2

**User Story:** As an Executing Agent in any assistant, I want the skills to find their templates and commands without an assistant-only variable, so that no skill resolves to a missing path or hunts through a plugin cache for a stale copy.

#### Acceptance Criteria

1. THE Platform SHALL provide Skills that locate templates, Schemas and commands without reading an Assistant-Only Variable.
2. IF a Skill or agent source references an Assistant-Only Variable, THEN THE Platform Release Pipeline SHALL fail with exit status 1 and name the file and the line.
3. WHEN a Skill runs in Claude Code, Kiro or OpenCode against one Consumer Repository, THE Skill SHALL resolve the same template bytes in each Assistant.
4. THE Skill SHALL change Lifecycle Frontmatter, Ledger Entries and Task Markers only through the Command Line.
5. IF a Skill runs where the Command Line is not installed, THEN THE Skill SHALL stop and name the missing Command Line and the installation step.

### Requirement 9: Versioned schema and deterministic, never-silent migration

**Delivery slice:** 2

**User Story:** As a Consumer Maintainer, I want every spec to carry a schema version and every migration to be deterministic, explicit and checkable, so that an upgrade never rewrites a spec behind a reviewer's back.

#### Acceptance Criteria

1. THE Platform SHALL record a Schema Version in each non-Legacy Spec's Lifecycle Frontmatter.
2. WHEN migration runs in check mode, THE Migrator SHALL exit with status 1, name each Spec that needs migration and its from and to Schema Versions, and write no file.
3. WHEN migration runs in write mode, THE Migrator SHALL apply the migration and report each changed file and field.
4. WHEN the Migrator migrates equal input twice, THE Migrator SHALL produce byte-identical output.
5. WHEN migration is requested with a from-version and a to-version, THE Migrator SHALL apply only the migration steps within that range.
6. IF an input Artifact cannot be parsed during migration, THEN THE Migrator SHALL exit with status 2, name the Artifact and write no file.
7. IF a Spec's Schema Version is newer than the installed Platform version supports, THEN THE Migrator SHALL exit with status 2 and name both Schema Versions.
8. WHEN the Migrator migrates a Spec that declares a three-class Risk Class, THE Migrator SHALL map `low` to `low`, `standard` to `standard` and `critical` to `critical`.
9. WHEN the Migrator reads a Risk Class declaration, THE Migrator SHALL recognise the `**Risk class:** <class>` form and the `**Risk class: <class>.**` form.
10. IF the Migrator cannot recognise a Spec's Risk Class declaration, THEN THE Migrator SHALL report the Spec and leave the Spec's files unmodified.
11. WHEN a migration would change the Artifact Body of an Artifact holding a Valid Approval, THE Migrator SHALL report the approvals the change would invalidate before writing.
12. THE Platform SHALL carry one Conformance Case for each migration step.

### Requirement 10: A doctor that diagnoses the failures this repository has had

**Delivery slice:** 2

**User Story:** As a Consumer Maintainer, I want one command that checks repository health across every category that has caused an incident, so that a missing file, a drifted copy or an unverified tick is found by a diagnostic rather than by the next agent that trips on it.

**Table 10.A — Doctor Categories.**

| Doctor Category          | What is checked                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| Engine                   | the executing version equals the Pinned Version                                                  |
| Schema                   | each Spec's Schema Version is supported                                                          |
| Templates                | each Vendored Copy matches its recorded checksum and version                                     |
| Spec discovery           | one specs root; no duplicate Spec numbers or slugs                                               |
| Lifecycle                | no Recorded/Effective Lifecycle State mismatch; no `INVALID` Spec                                |
| Task protocol            | no Protocol Validator Finding in `tasks.md`                                                      |
| Task graph               | no dependency Finding                                                                            |
| Execution evidence       | no Unverified Completion; no Stale Marker                                                        |
| Ledger                   | no Ledger Integrity Failure or Ledger Fork; the Ledger path is not excluded from the secret scan |
| Approvals                | an Approval Policy exists and names an Authorised Approver for each Risk Class in use            |
| Concurrent claims        | no stale Claim                                                                                   |
| Agent references         | no Reference Integrity Finding                                                                   |
| Projection               | each Assistant Target is current                                                                 |
| Assistant adapters       | no Skill or agent references an Assistant-Only Variable                                          |
| Duplicate implementation | no file in the Consumer Repository reimplements a Platform command                               |

#### Acceptance Criteria

1. WHEN the Doctor runs, THE Doctor SHALL report a PASS or FAIL result for each Doctor Category in Table 10.A.
2. WHEN each Doctor Category passes, THE Doctor SHALL report `READY` and exit with status 0.
3. IF a Doctor Category fails, THEN THE Doctor SHALL report `NOT READY`, name each failing Doctor Category and its Findings, and exit with status 1.
4. WHILE running, THE Doctor SHALL leave each file in the Consumer Repository unmodified.
5. WHEN the Doctor runs with machine-readable output, THE Doctor SHALL write one JSON document conforming to the published doctor Schema.
6. IF the Consumer Repository's secret-scan configuration excludes the Ledger's path, THEN THE Doctor SHALL report a Ledger FAIL naming the exclusion.
7. IF the Consumer Repository holds a file whose script invokes a Legacy Tooling path in place of the Command Line, THEN THE Doctor SHALL report a Duplicate implementation FAIL naming the file.

## Requirements added by Amendment 1

Requirements 11 to 17 were added to spec 001 by Amendment 1 on 2026-09-25, as old R39 to R42, R46 (Slice 2 criteria), R47 and R48 (Slice 2 criteria).

### Requirement 11: Context bundles — the exact text a task needs, and nothing else

**Delivery slice:** 2

**User Story:** As an Executing Agent, I want the criteria, properties, design sections, paths and standards linked to one task, criterion or property, verbatim and within a declared size, so that I work from the approved text at a fraction of a whole-document read and never from a paraphrase.

#### Acceptance Criteria

1. WHEN a Context Bundle is requested for a Spec and a Bundle Target, THE Context Bundler SHALL produce a Context Bundle holding the Bundle Target's Linked Content.
2. THE Context Bundler SHALL include in a Context Bundle only the Bundle Target's Linked Content, the source path and line range of each item, and the Omission Notice.
3. THE Context Bundler SHALL reproduce each criterion, property and Referenced Design Section in a Context Bundle byte-identical to the item's text in the source Artifact.
4. WHERE a Context Budget is declared, THE Context Bundler SHALL produce Context Bundles whose size is at most the Context Budget.
5. WHEN the Context Bundler cuts Linked Content to fit a Context Budget, THE Context Bundler SHALL name each cut item in the Omission Notice with the item's source path and line range.
6. WHEN the Context Bundler cuts Linked Content to fit a Context Budget, THE Context Bundler SHALL retain the Bundle Target's own text in full.
7. WHEN the Context Bundler cuts Linked Content to fit a Context Budget, THE Context Bundler SHALL cut whole items in the order the published bundle Schema defines.
8. IF the Bundle Target's own text is larger than the Context Budget, THEN THE Context Bundler SHALL exit with status 1 and name the Bundle Target, the Bundle Target's size and the Context Budget.
9. IF a Bundle Target names a task, criterion or property that the Spec does not define, THEN THE Context Bundler SHALL exit with status 2 and name the Bundle Target.
10. IF an Artifact holding Linked Content cannot be parsed, THEN THE Context Bundler SHALL exit with status 2 and name the Artifact and the first unparseable line.
11. WHEN a Context Bundle is requested twice over the same Consumer Repository content with the same Bundle Target and Context Budget, THE Context Bundler SHALL produce byte-identical Context Bundles.
12. WHEN a Context Bundle is requested with machine-readable output, THE Context Bundler SHALL write one JSON document conforming to the published bundle Schema.
13. WHEN a Skill requires the criteria, properties or design sections for one task, criterion or property, THE Skill SHALL obtain the criteria, properties or design sections from a Context Bundle.
14. IF a Skill instructs a whole-Artifact read to obtain content for one task, criterion or property, THEN THE Platform Release Pipeline SHALL fail with exit status 1 and name the Skill and the line.

### Requirement 12: A model tier for each agent role

**Delivery slice:** 2

**User Story:** As a Consumer Maintainer, I want the policy to assign each agent role a model tier, with every editing, reviewing, designing and gate-deciding role on the frontier tier, so that a cheaper model answers read-only questions and none of its output becomes evidence or decides a gate.

#### Acceptance Criteria

1. THE Policy Engine SHALL assign each Agent Role one Model Tier from the Model Policy.
2. WHERE the Model Policy assigns an Agent Role no Model Tier, THE Policy Engine SHALL assign that Agent Role the `frontier` Model Tier.
3. IF the Model Policy assigns the `reader` Model Tier to a Frontier-Only Role, THEN THE Policy Engine SHALL exit with status 2 and name the Agent Role and the reason the Agent Role is a Frontier-Only Role.
4. IF the Model Policy names a Model Tier other than `reader` or `frontier`, THEN THE Policy Engine SHALL exit with status 2 and name the value.
5. WHEN sync runs, THE Projector SHALL generate each agent with a model the Model Policy admits for that Agent Role's Model Tier.
6. IF an agent source pins a model that the Model Policy does not admit for that Agent Role's Model Tier, THEN THE Projector SHALL report a Finding naming the agent, the pinned model and the Model Tier.
7. IF a Reader-Tier Result is presented as a Gate input, THEN THE Gate Runner SHALL reject the input and name the Agent Role.
8. IF an Evidence Entry, an Approval Record or a Decision answer cites a Reader-Tier Result, THEN THE Strict Verifier SHALL report FAIL and name the Ledger Entry.
9. IF an Agent Role assigned the `reader` Model Tier requests a Command Line command that writes a file, THEN THE Command Line SHALL refuse with exit status 1 and name the Agent Role and the command.
10. WHEN the Platform records a Gate Result or a Decision that an Agent Role produced, THE Platform SHALL record the Agent Role and the Agent Role's Model Tier in the Ledger Entry.

### Requirement 13: Spec-size limits and programme specs

**Delivery slice:** 2 (criterion 13.15 lands with Requirement 004:4, in Slice 3)

**User Story:** As an Approver, I want a spec that grows past a configured size flagged with a proposed split, and a programme spec that rolls up its children's status, so that no single document outgrows one review and a split never breaks a trace.

#### Acceptance Criteria

1. IF a Spec's acceptance-criterion count exceeds the Spec Size Limit, THEN THE Quality Checker SHALL report a warn-level Finding naming the Spec, the criterion count and the Spec Size Limit.
2. WHEN the Quality Checker reports a Spec Size Limit Finding, THE Quality Checker SHALL produce a Split Proposal that assigns each Requirement of the Spec to one proposed Child Spec.
3. WHERE a Spec's Requirements carry Delivery slice lines, THE Quality Checker SHALL assign each Requirement in the Split Proposal to the proposed Child Spec for the first Delivery slice the Requirement names.
4. WHILE a Spec's acceptance-criterion count is at most the Spec Size Limit, THE Quality Checker SHALL report the Spec as within the Spec Size Limit.
5. WHILE a Spec Size Limit Finding is the only Finding for a Spec, THE Lifecycle Engine SHALL permit each transition of that Spec whose Transition Preconditions hold.
6. WHERE the Policy declares no Spec Size Limit, THE Policy Engine SHALL apply a Spec Size Limit of 80 acceptance criteria.
7. IF the Policy declares a Spec Size Limit that is not a positive integer, THEN THE Policy Engine SHALL exit with status 2 and name the declared value.
8. WHEN status is requested for a Programme Spec, THE Status Reporter SHALL report the Programme Spec's Rolled-Up State and each Child Spec's Effective Lifecycle State.
9. THE Lifecycle Engine SHALL compute a Programme Spec's Rolled-Up State as the earliest state in Table 002:5.A among the Effective Lifecycle States of the Child Specs whose Effective Lifecycle State is not `REJECTED`, `SUPERSEDED` or `ABANDONED`.
10. IF a Child Spec's Effective Lifecycle State is `INVALID`, THEN THE Lifecycle Engine SHALL compute the Programme Spec's Rolled-Up State as `INVALID` and name the Child Spec.
11. WHILE a Child Spec's Effective Lifecycle State is `BLOCKED` and no Child Spec's Effective Lifecycle State is `INVALID`, THE Lifecycle Engine SHALL compute the Programme Spec's Rolled-Up State as `BLOCKED` and name the Child Spec.
12. IF a Programme Spec links a Child Spec that does not exist, THEN THE Lifecycle Engine SHALL compute the Programme Spec's Rolled-Up State as `INVALID` and name the missing Spec identifier.
13. IF two Programme Specs link one Child Spec, THEN THE Protocol Validator SHALL report a Finding naming both Programme Specs and the Child Spec.
14. IF Programme Spec links form a cycle, THEN THE Protocol Validator SHALL report a Finding naming each Spec in the cycle.
15. WHEN a Cross-Spec Reference names a criterion or property that the referenced Spec defines, THE Trace Engine SHALL link the reference to that criterion or property in the traceability graph.
16. IF a Cross-Spec Reference names a Spec, criterion or property that does not exist, THEN THE Protocol Validator SHALL report a Finding naming the reference.

### Requirement 14: A model data-egress policy

**Delivery slice:** 2

**User Story:** As a Consumer Maintainer, I want a policy stating which classifications of content may go to which external model provider, enforced before each send and recorded without the content, so that routing work to a gateway, a worker model or an advisor never sends content the repository has not cleared.

#### Acceptance Criteria

1. WHEN the Platform is about to send content to an External Model Provider, THE Egress Guard SHALL determine each content item's Content Classification from the Egress Policy.
2. WHEN the Egress Policy permits each content item's Content Classification for the External Model Provider, THE Egress Guard SHALL release the content to that External Model Provider.
3. WHEN the Egress Guard releases content, THE Egress Guard SHALL write an Egress Record naming the External Model Provider, each Content Classification sent and a UTC timestamp.
4. THE Egress Guard SHALL write Egress Records that hold none of the content sent.
5. IF the Egress Policy does not permit a content item's Content Classification for the External Model Provider, THEN THE Egress Guard SHALL refuse the send with exit status 1 and name the External Model Provider, the item's path and the Content Classification.
6. IF the Egress Policy assigns a content item no Content Classification, THEN THE Egress Guard SHALL refuse the send with exit status 1 and name the item's path.
7. IF the Egress Policy holds no entry for the External Model Provider, THEN THE Egress Guard SHALL refuse the send with exit status 1 and name the External Model Provider.
8. IF the Consumer Repository holds no Egress Policy, THEN THE Egress Guard SHALL refuse the send with exit status 1 and report that the Egress Policy is missing.
9. IF content about to be sent matches a Secret Pattern, THEN THE Egress Guard SHALL refuse the send with exit status 1 and name the Secret Pattern's name.

### Requirement 15: A pre-execution check before each task, and completion bound to the same versions — bundle delivery (Slice 2 criteria)

**Delivery slice:** 2. This requirement holds the Slice 2 criteria of the pre-execution check: bundle delivery to the Executing Agent (programme map: old criteria 46.9–46.13). Its Slice 1 criteria are Requirement 002:18, which this requirement depends on.

**User Story:** As an Executing Agent, I want each task to start only after its requirements, design and plan are confirmed present, approved and unchanged since approval, and every reference it cites resolves, and I want its completion checked against those same versions, so that I never implement against text nobody approved or finish against text that changed under me.

#### Acceptance Criteria

1. WHEN each Pre-Execution Check passes, THE Execution Controller SHALL deliver the task's Context Bundle to the Executing Agent.
2. THE Context Bundler SHALL include in a task's Context Bundle each criterion the task references verbatim, each property the task references and each `design.md` section the task cites.
3. IF the Context Bundler cannot fit each item criterion 15.2 names within the Context Budget, THEN THE Execution Controller SHALL deliver the full requirements, design and plan Artifacts to the Executing Agent in place of the Context Bundle.
4. WHEN the Execution Controller delivers full Artifacts in place of a Context Bundle, THE Execution Controller SHALL record the fallback in the Ledger naming the task and the Context Budget.
5. WHERE the Spec took the quick path the Policy permits for the Spec's Risk Class, THE Pre-Execution Checker SHALL apply criteria 002:18.1 to 002:18.3 only to the Artifacts the Spec holds.

### Requirement 16: A derived workspace model, with only non-derivable facts declared

**Delivery slice:** 2

**User Story:** As a Consumer Maintainer, I want the Platform to derive the member map from the manifests the repository already has, and to ask me to declare only what no manifest holds, in one place per member, so that no fact about a member is written twice and allowed to drift.

**Table 16.A — Added Doctor Categories for the workspace.**

| Added Doctor Category | What is checked                                                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Member declarations   | each Member Declaration Block passes its Schema, names an archetype in the Archetype Set, an Agent Role the Canonical Source defines and existing governing Specs |
| Single declaration    | no Member declares archetype, owning Agent Role or governing Specs outside its package manifest                                                                   |
| Member guidance       | no Member Guidance Document holds Placeholder Text or a statement contradicting a Derived Fact                                                                    |

#### Acceptance Criteria

1. WHEN a command requires Member information, THE Workspace Modeler SHALL derive the Workspace Model from the Workspace Manifests in the Consumer Repository's content.
2. THE Workspace Modeler SHALL record in the Workspace Model each Member's name, path, declared dependencies and tier tags.
3. THE Workspace Modeler SHALL include in the Workspace Model each Member that a JavaScript, Go or Python Workspace Manifest declares.
4. THE Workspace Modeler SHALL hold the Workspace Model only in the memory of the command that derived the Workspace Model.
5. THE Platform SHALL obtain Member information for each capability that reports Members, including Context Bundles and Affected Members, from the Workspace Model.
6. WHEN a Spec's Affected Members are requested, THE Workspace Modeler SHALL derive the Affected Members from the repository paths the Spec's Artifacts cite and the paths the Spec's tasks declare.
7. WHEN a Spec cites a repository path that lies inside no Member, THE Workspace Modeler SHALL report the path as belonging to no Member.
8. IF a Spec Directory holds a file that declares the Spec's referenced paths or Members, THEN THE Protocol Validator SHALL report a Finding naming the file.
9. IF a Workspace Manifest cannot be parsed, THEN THE Workspace Modeler SHALL exit with status 2 and name the file and the first unparseable line.
10. IF two Members declare the same name, THEN THE Workspace Modeler SHALL report a Finding naming both Member paths.
11. THE Workspace Modeler SHALL read each Member's archetype, owning Agent Role and governing Specs from the Member Declaration Block in that Member's package manifest.
12. IF a Member Declaration Block fails the published Member Declaration Schema, THEN THE Doctor SHALL report a Member declarations FAIL naming the Member and the failing field.
13. IF a Member Declaration Block names an archetype outside the Archetype Set, THEN THE Doctor SHALL report a Member declarations FAIL naming the Member and the archetype.
14. IF a Member Declaration Block names an owning Agent Role that the Canonical Source does not define, THEN THE Doctor SHALL report a Member declarations FAIL naming the Member and the Agent Role.
15. IF a Member Declaration Block names a governing Spec that does not exist, THEN THE Doctor SHALL report a Member declarations FAIL naming the Member and the Spec identifier.
16. WHERE the Consumer Configuration requires a Member Declaration Block, IF a Member holds no Member Declaration Block, THEN THE Doctor SHALL report a Member declarations FAIL naming the Member.
17. WHERE the Consumer Configuration marks the Member Declaration Block optional, THE Doctor SHALL report the Member declarations category as PASS and name each Member without a Member Declaration Block as undeclared.
18. IF a Member holds a file other than the Member's package manifest that declares the Member's archetype, owning Agent Role or governing Specs, THEN THE Doctor SHALL report a Single declaration FAIL naming the file.
19. WHERE the Consumer Configuration enables guidance generation for a Member Guidance Document, WHEN guidance generation runs, THE Workspace Modeler SHALL write the Member's Derived Facts into that Member Guidance Document between Provenance Markers.
20. WHEN guidance generation runs, THE Workspace Modeler SHALL leave each part of a Member Guidance Document outside the Provenance Markers byte-identical.
21. WHEN guidance generation runs twice with no change to the Workspace Model, THE Workspace Modeler SHALL write no file on the second run.
22. IF a Member Guidance Document holds Placeholder Text, THEN THE Doctor SHALL report a Member guidance FAIL naming the file and the line.
23. IF a Member Guidance Document states a value that contradicts a Derived Fact for that Member, THEN THE Doctor SHALL report a Member guidance FAIL naming the file, the line and the Derived Fact.

### Requirement 17: Assistant packaging and distribution from one skill set (Slice 2 criteria)

**Delivery slice:** 2. This requirement holds the Slice 2 criteria of assistant packaging (programme map: old criteria 48.1–48.17). Its Slice 3 criteria, the OpenCode Protection Plugin and the OpenCode Assistant Policy (old 48.18–48.22), are Requirement 004:14.

**User Story:** As a Consumer Maintainer, I want the Claude Code, Kiro and OpenCode packages built from one set of skills, each bundling the same read-only query server and each getting the same rules and protections, so that no assistant gets different lifecycle behaviour and a reviewer without a shell sees the same context as an executor with one.

#### Acceptance Criteria

1. THE Platform Release Pipeline SHALL build the Claude Code Plugin, the Kiro Power and the OpenCode Package from the one Skill Set.
2. IF an Assistant Package holds a Skill whose body differs from that Skill's body in the Skill Set, THEN THE Platform Release Pipeline SHALL fail with exit status 1 and name the Assistant Package and the Skill.
3. WHEN one lifecycle stage runs against one Consumer Repository state in Claude Code, in Kiro and in OpenCode, THE Platform SHALL produce equal Lifecycle Frontmatter, equal Ledger Entries apart from timestamps and Session identifiers, and equal exit statuses in each Assistant.
4. THE Platform Release Pipeline SHALL build the Kiro Power in Kiro's Agent Plugins layout, with a manifest, a skills directory, Kiro extensions and activation keywords.
5. THE Platform Release Pipeline SHALL bundle the Platform MCP Server in each Assistant Package.
6. THE Kiro Power SHALL instruct Kiro to record each task completion through the Evidence Recorder.
7. THE Platform MCP Server SHALL expose status, Context Bundles, traceability and the Workspace Model as read-only tools.
8. WHEN a Platform MCP Server tool is called, THE Platform MCP Server SHALL return the result the Command Line returns for equal inputs over the same repository state.
9. IF a Platform MCP Server tool call would make a State-Changing Call, THEN THE Platform MCP Server SHALL refuse the call and name the tool.
10. THE Platform MCP Server SHALL leave approval recording and evidence recording to the Command Line.
11. THE OpenCode Package SHALL provide a Lifecycle Command for each lifecycle entry point the Claude Code Plugin provides.
12. WHERE a Lifecycle Command inlines Platform status, THE Lifecycle Command SHALL obtain the status by running the Command Line.
13. WHEN sync runs for OpenCode, THE Projector SHALL render each Always-On Rule into the Rules Block of the Root Instructions File.
14. WHEN the Projector writes the Rules Block, THE Projector SHALL leave each byte of the Root Instructions File outside the Rules Block markers unmodified.
15. IF the Root Instructions File holds a Rules Block start marker without a matching end marker, THEN THE Projector SHALL exit with status 1, leave the file unmodified and name the file and the line.
16. WHILE an Assistant searches a Native Skill Path that holds the Skill Set, THE Projector SHALL expose each Skill to that Assistant through the Native Skill Path alone.
17. IF sync in check mode finds a copy of a Skill in an Assistant Target whose Assistant searches a Native Skill Path, THEN THE Projector SHALL exit with status 1 and name the copy.

## Requirements added on 2026-09-25 (programme restructure)

Requirements 18 to 20 were decided by the user on 2026-09-25, after the restructure of spec 001 into this programme. They carry no old `R<N>` number and have no row in the programme's Requirement map.

### Requirement 18: A model tier per role, mapped to a model per assistant

**Delivery slice:** 2

**User Story:** As a Consumer Maintainer, I want each agent role to declare a tier rather than a model, and one version-controlled map to say which model each assistant runs for each tier, so that changing a model is one edit in one file and Requirement 12's Model Tiers become concrete models in Claude Code, Kiro and OpenCode.

This requirement is what makes Requirement 12 concrete. Requirement 12 assigns each Agent Role a Model Tier and requires the Model Policy to name the models each Model Tier admits. The Assistant Model Map is the part of the Model Policy that names those models per Assistant, and criteria 18.4 and 18.5 fix how the three Role Tiers fall under the two Model Tiers.

#### Acceptance Criteria

1. THE Policy Engine SHALL read each Agent Role's Role Tier from that Agent Role's source in the Canonical Source.
2. IF an Agent Role source declares a Role Tier outside the Tier Ladder, THEN THE Policy Engine SHALL exit with status 2 and name the Agent Role and the declared value.
3. WHERE an Agent Role source declares no Role Tier, THE Policy Engine SHALL assign that Agent Role the `frontier` Role Tier.
4. THE Policy Engine SHALL assign the `frontier` Model Tier to each Agent Role whose Role Tier is `frontier`.
5. THE Policy Engine SHALL assign the `reader` Model Tier to each Agent Role whose Role Tier is `standard` or `economy`.
6. THE Policy Engine SHALL take each Assistant's model for each Role Tier from the Assistant Model Map only.
7. IF the Assistant Model Map names a Role Tier outside the Tier Ladder, THEN THE Policy Engine SHALL exit with status 2 and name the value.
8. WHEN sync runs, THE Projector SHALL render each generated agent's model for each Assistant from the Assistant Model Map entry for that Assistant and that Agent Role's Role Tier.
9. WHERE the Assistant Model Map entry for an Assistant and a Role Tier is Assistant Default, THE Projector SHALL generate that Assistant's agents of that Role Tier with no model named.
10. IF the Assistant Model Map holds no entry for an Agent Role's Role Tier and an Assistant, THEN THE Projector SHALL exit with status 1 and name the Agent Role, the Assistant and the Role Tier.
11. WHERE an Agent Role source declares a Model Override, THE Projector SHALL render the Model Override in place of the Assistant Model Map's model for that Agent Role.
12. WHEN the Projector renders a Model Override, THE Projector SHALL report an Override Notice naming the Agent Role, the Assistant, the Model Override and the model the Assistant Model Map gives for that Agent Role's Role Tier.

### Requirement 19: Verify, retry once, then escalate one tier

**Delivery slice:** 2

**User Story:** As an Orchestrating Agent, I want an agent output that fails the engine's checks retried once at the same tier with the findings, then escalated one tier at a time, and stopped for a human at the top tier, so that a cheaper model is tried first, a stronger model is used only when the evidence says so, and no model decides whether its own output passed.

This requirement applies Requirement 002:16 to agent output: pass or fail is a Check Result the Platform computes, never a verdict a model states.

#### Acceptance Criteria

1. THE Execution Controller SHALL decide each Attempt's outcome from the Check Results the Platform computes over that Attempt's output.
2. IF an Attempt's output states a pass or fail verdict on that output, THEN THE Execution Controller SHALL exclude the stated verdict from the Attempt's outcome.
3. WHEN an Attempt fails a Check, THE Execution Controller SHALL obtain a Failure Class from the Failure Classifier before starting the next Attempt.
4. IF a task's first Attempt fails a Check, THEN THE Execution Controller SHALL start one retry Attempt at the same Role Tier and give the Executing Agent the first Attempt's Findings.
5. IF a retry Attempt or an Escalated Attempt fails a Check at a Role Tier below `frontier`, THEN THE Execution Controller SHALL start one Escalated Attempt at the next Role Tier up the Tier Ladder and give the Executing Agent the failed Attempt's Findings.
6. IF an Attempt other than a task's first Attempt fails a Check at the `frontier` Role Tier, THEN THE Execution Controller SHALL set the task to `blocked` and present a Decision to a human naming the Findings of each Attempt.
7. WHEN an Attempt's output passes each Check, THE Execution Controller SHALL start no further Attempt for that task.
8. WHEN an Attempt ends, THE Execution Controller SHALL append an Attempt Record to the Ledger naming the task, the Role Tier, the model, the Findings and the outcome.

### Requirement 20: Section-scoped writes to a large Artifact

**Delivery slice:** 2

**User Story:** As a Spec Author, I want a large Artifact written one addressable section at a time, each write atomic, checked against the section's expected checksum and claimable per section by one session, so that no reader ever sees a half-written file, a concurrent edit to the same section is refused by name, and the Artifact stays the single file Kiro renders.

The single file is a Markdown Protocol constraint: Kiro renders `requirements.md`, `design.md` and `tasks.md` as files, and Requirement 002:23 forbids document parts in a Spec Directory.

#### Acceptance Criteria

1. WHEN a Section Write is requested, THE Section Writer SHALL replace the content of the one Section that the Section Write's Section Address names.
2. WHEN a Section Write completes, THE Section Writer SHALL leave the bytes of each other Section of the Artifact unchanged.
3. WHILE a Section Write is in progress, THE Section Writer SHALL present each reader of the Artifact with the Artifact's complete content from before the Section Write.
4. IF a Section Write is interrupted before the Section Write completes, THEN THE Section Writer SHALL leave the Artifact's complete content from before the Section Write.
5. IF the current Section Checksum of the addressed Section differs from the expected Section Checksum the Section Write carries, THEN THE Section Writer SHALL refuse the Section Write with exit status 1 and name the Section.
6. IF a Section Write carries no expected Section Checksum, THEN THE Section Writer SHALL refuse the Section Write with exit status 2 and name the Section.
7. IF a Section Address names no Section of the Artifact, THEN THE Section Writer SHALL refuse the Section Write with exit status 2 and name the Section Address.
8. WHEN a Section Write completes, THE Section Writer SHALL report the Section's new Section Checksum.
9. WHEN a Session requests a Section Claim on a Section that no Active Section Claim holds, THE Session Manager SHALL record a Section Claim naming the Session, the Artifact and the Section Address.
10. IF a Session requests a Section Claim on a Section that another Session's Active Section Claim holds, THEN THE Session Manager SHALL refuse the Section Claim with exit status 1 and name the holding Session.
11. IF a Section Write targets a Section that another Session's Active Section Claim holds, THEN THE Section Writer SHALL refuse the Section Write with exit status 1 and name the Section and the holding Session.
12. WHILE a Session writes an Artifact by Section Write, THE Session Manager SHALL apply the Section Checksum comparison of criterion 20.5 in place of the Artifact Version comparison of criterion 4.7.
13. THE Section Writer SHALL store each Artifact as one file in the Spec Directory.
14. IF the Artifact a Section Write would produce violates the Markdown Protocol, THEN THE Section Writer SHALL refuse the Section Write with exit status 1 and name the Section and the Rule Identifier.
15. WHEN two Section Writes to different Sections of one Artifact are applied to the same starting content in either order, THE Section Writer SHALL produce byte-identical Artifact Bodies.
16. IF a whole-Artifact write is requested for an Artifact whose Artifact Body exceeds the Section Write Threshold, THEN THE Section Writer SHALL refuse the write with exit status 1 and name the Artifact and the Section Write Threshold.
17. WHERE the Policy declares no Section Write Threshold, THE Policy Engine SHALL apply a Section Write Threshold of 65,536 bytes.

## Assumptions

The programme's Assumptions 1 to 53, in `.agents/specs/001-vellum-platform/requirements.md`, apply to this spec and keep their numbers there. Those that bear on this slice are 2, 6, 11, 12, 15, 18, 22 to 31, 35 to 38, 40 to 46. The assumptions below are added by this spec. Each can be answered in one word or one correction.

1. **Role Tiers `standard` and `economy` fall under Requirement 12's `reader` Model Tier, and `frontier` under `frontier`** (criteria 18.4 and 18.5). This is the reading that leaves Requirement 12 unchanged. Its consequence is that criterion 12.3 exits with status 2 for each file-writing Agent Role below `frontier`: `spec-executor`, `e2e-test-engineer`, `code-standards-steward`, `docs-adr-steward` and `docs-changesets-steward` in basalt today. Criterion 12.9 also refuses those roles' file-writing commands. The alternative is an amendment of Requirement 12 to three Model Tiers, with the Frontier-Only Role rule relaxed. This is **blocking for design**. Keep Requirement 12 and re-tier those five roles, or amend Requirement 12?
2. **Escalation applies to every Failure Class.** Criterion 19.3 classifies each failed Attempt before the next one, and criterion 5.3 routes remediation by Failure Class. Criteria 19.4 and 19.5 do not narrow which classes escalate. The alternative is to escalate only `IMPLEMENTATION_ERROR` and `TEST_ERROR`, since a stronger model does not fix an `ENVIRONMENT_ERROR`. Every class?
3. **Retry and Escalated Attempts count toward the task's attempt count** under criteria 3.8 and 3.9. A retry-policy maximum below the Attempts the Tier Ladder needs therefore blocks the task before `frontier` is reached. Count them?
4. **An escalation to a Role Tier whose model, for the executing Assistant, equals the failed Attempt's model still runs as an Escalated Attempt.** basalt's map gives OpenCode one model for all three tiers, and Kiro one model for `economy` and `standard`. The alternative is to skip to the next Role Tier up whose model differs. Run it?
5. **An Escalated Attempt at `frontier`, for an Agent Role whose Role Tier is below `frontier`, runs under that Agent Role's own Model Tier.** So criterion 12.9's refusal still applies to it. Correct?
6. **The Section Write Threshold defaults to 65,536 bytes** (criterion 20.17). This spec's own `requirements.md` is far above it. 64 KiB?
7. **A Section is a heading-delimited part of an Artifact Body**, and its Section Address is stable across edits of other Sections. Design fixes the heading level and the address form. Correct?
8. **Section Claims expire as Claims do**, when the holding Session's last heartbeat passes the Heartbeat Timeout. Correct?
9. **Requirement 13 stays whole in this spec, criterion 13.15 included.** The old R41 Delivery slice line assigns the requirement to Slice 2 and says criterion 13.15 "lands with Requirement 004:4, in Slice 3". The user named only old R46 and R48 as split by criterion. So 13.15 is specified here and implemented once 004's Trace Engine exists. Keep it here?
10. **This spec, at 233 criteria, is itself over the default Spec Size Limit of 80** (programme Assumption 28, criterion 13.6). Criterion 13.1 would therefore report a warn-level Finding for it. The Finding does not block a transition (criterion 13.5). Accept the warning, or split again?

## Quality Rules Applied To This Document

Every criterion above was checked against the INCOSE rules:

| Rule                        | Meaning                                                                         |
| --------------------------- | ------------------------------------------------------------------------------- |
| Active voice                | The system is the subject and it acts. Not "the record is updated".             |
| No vague terms              | No "quickly", "adequate", "reasonable", "user-friendly", "robust", "efficient". |
| No pronouns                 | Repeat the noun. "it", "they", "this" are ambiguous under review.               |
| Consistent terminology      | One name per concept, matching the Glossary, every time.                        |
| Explicit conditions         | Triggers and states are stated, never implied.                                  |
| Measurable criteria         | A tester can determine pass or fail without asking a question.                  |
| One thought per requirement | No compound behaviour behind a single number.                                   |
| No escape clauses           | No "where possible", "if feasible", "as appropriate", "if practical".           |
| No absolutes                | No "never", "always", "all", "100%", "every conceivable".                       |
| Solution-free               | What the system does, not the class, table, queue or library that does it.      |
| Prefer positive statements  | Say what the system does rather than `SHALL NOT`.                               |

**Stated exceptions.** The exceptions recorded in the programme's Quality Rules section apply to Requirements 1 to 17 of this spec, and name them in child numbering (`003:N.M`). The criterion text is unchanged, so the exceptions are unchanged. Requirements 18 to 20 add these:

- **Solution-free.**
  - `economy`, `standard` and `frontier` are defined values of Role Tier, as `reader` and `frontier` are of Model Tier. No model, vendor or file format is named in any criterion.
  - Criterion 20.13's "one file" is the externally fixed contract: Kiro renders each Artifact as one file.
  - The 65,536-byte default in criterion 20.17 is a value, with its unit, following criterion 13.6's precedent.
- **One thought per requirement.** Criteria 19.8 and 20.9 each list the fields of one record, tested as one assertion over a named set, as in the programme's exception for criterion 002:6.1.
- **Consistency without rewording.**
  - Criteria 18.4 and 18.5 refine Requirement 12 by fixing how the three Role Tiers fall under the two Model Tiers. Requirement 12 is not reworded.
  - Criterion 20.12 names its precedence over criterion 4.7 for Section Writes, as criterion 002:18.11 names its precedence over 002:9.7.
  - Criterion 19.3 applies criterion 3.15 to each Attempt.
- **Prefer positive statements.** Criterion 19.7 ("start no further Attempt") states when an Attempt sequence ends. It is tested by inspecting the Ledger's Attempt Records.

### Worked examples

### Worked examples

| Defect           | Rejected                                                                                            | Accepted                                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Vague            | The system shall quickly process requests                                                           | WHEN a request is received, THE System SHALL process it within 200ms                                                                    |
| Vague            | The interface shall be user-friendly                                                                | WHEN a validation error occurs, THE Console SHALL display the failing field name and the correction required                            |
| Passive          | Records shall be archived nightly                                                                   | WHILE the archive window is open, THE Archiver SHALL move records older than 90 days to cold storage                                    |
| Pronoun          | WHEN the job finishes, THE Runner SHALL notify it                                                   | WHEN a job finishes, THE Runner SHALL publish a `job.completed` event to the Notification Service                                       |
| Escape clause    | THE System SHALL retry the payment where possible                                                   | IF a payment attempt returns a retryable error, THEN THE Payment Service SHALL retry the attempt up to 3 times with exponential backoff |
| Absolute         | THE System SHALL never lose a message                                                               | IF the broker acknowledgement is not received within 5s, THEN THE Publisher SHALL re-enqueue the message with the same idempotency key  |
| Compound         | WHEN a user signs up, THE System SHALL create an account and send a welcome email and start a trial | Three criteria, one per behaviour                                                                                                       |
| Solution-bearing | THE System SHALL store sessions in Redis with a 30-minute TTL                                       | WHILE a session has been idle for less than 30 minutes, THE Session Service SHALL treat the session as active                           |
| Negative         | THE System SHALL NOT accept an expired token                                                        | IF a presented token has passed its expiry timestamp, THEN THE Gateway SHALL reject the request with status 401                         |
| Clause order     | WHEN a payout is requested, WHERE Connect is enabled, THE Ledger SHALL …                            | WHERE Connect is enabled, WHEN a payout is requested, THE Ledger SHALL …                                                                |
