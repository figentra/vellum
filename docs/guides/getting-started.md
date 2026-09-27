# Getting Started with Vellum

This walks one spec through the loop Vellum implements today: adopt, approve, start a task,
complete it, verify. Every step below is exercised by `packages/cli`'s integration tests
against a real git repository. Nothing is published to npm yet; run the CLI from this
repository (`pnpm build`, then `node packages/cli/dist/cli.js …`, written `vellum` below).

## 1. An Approval Policy

Create `.sdlc/policy.json` at the repository root naming each approver and the public key
they sign commits with (see the [CLI reference](../cli/README.md#approval-policy) for the
format). For an SSH key, the fingerprint is what `ssh-keygen -lf ~/.ssh/id_ed25519.pub` prints.
Commit it; `vellum doctor` reports whether it loads.

The approver configures git to sign with that key:

```bash
git config gpg.format ssh
git config user.signingkey ~/.ssh/id_ed25519.pub
```

## 2. A spec, brought under management

Write each document as plain Markdown — the method's `spec-new`, `spec-design` and
`spec-tasks` skills do — and let the CLI add the Lifecycle Frontmatter. After
`requirements.md`:

```bash
vellum adopt 001
```

This adds a frontmatter block above the unchanged text, records the spec `IN_REVIEW`, and
creates `.sdlc/` with the ledger's first entry (`adoption`); it records no approval. After
writing `design.md`, `tasks.md`, or editing any of them:

```bash
vellum stamp 001
```

which gives a new document its frontmatter, records the next version and checksum of an
edited one, and raises the recorded state to the latest document's in-review state. Never
write the frontmatter by hand. It looks like this:

```markdown
---
version: 1
checksum: <sha-256 of the body's canonical form>
state: IN_REVIEW
createdAt: 2026-09-26T10:00:00.000Z
updatedAt: 2026-09-26T10:00:00.000Z
---

# Requirements

...
```

```
.agents/specs/001-my-feature/
├── requirements.md
├── design.md
├── tasks.md
└── .sdlc/
    ├── ledger.jsonl
    └── ledger.head.json
```

Correctness Properties in `design.md` are headed `Property N: Title` (the method's template form;
`**Property N: Title**` is read too). Tasks use the Kiro task-line grammar, with criterion and
property trailers, either in the form the method's tasks template writes or as HTML comments:

```markdown
- [ ] 1. Build the first thing _Requirements: 1.1_ _Properties: 1_
- [ ] 2. Build the second thing <!-- criteria: 1.2 --> <!-- properties: P2 -->
```

`vellum verify --strict` fails with `PROPERTY_NOT_CITED` for a property no task cites.

`vellum lint 001` validates the folder, the frontmatter and checksums, markers and references.

## 3. Approve (a human, then a signed commit)

```bash
vellum approve 001 requirements
git add .agents/specs/001-my-feature/.sdlc/ledger.jsonl .agents/specs/001-my-feature/.sdlc/ledger.head.json
git commit -S -m "approve: 001 requirements"
```

`vellum approve` refuses in a non-interactive or assistant session. The record it writes counts
only once this commit — changing nothing but the ledger files, signed with the key the policy
lists for you — exists. Repeat for `design` and `tasks`. `vellum status 001` shows the valid
approval counts.

## 4. Start and complete a task

```bash
vellum task start 001 1
# ... implement, commit the work ...
vellum task complete 001 1 --command="pnpm test"
```

`task start` refuses unless all three artifacts hold valid approvals of their current text.
`task complete` runs `pnpm test` itself and records the evidence; the marker becomes `[x]` only
if it exited 0 with the working tree matching HEAD outside the spec directory. A failure is
recorded as a failed attempt and leaves the marker alone.

Commit the ledger and `tasks.md` afterwards like any other change.

## 5. Verify

```bash
vellum verify 001
```

PASS requires an intact ledger, a valid signed approval of each artifact's current text, full
criterion coverage and property citation, and passing evidence for every required task at HEAD
or an ancestor. Exit 1 names each failure.

## What is not there yet

`vellum sync` exits 2 (not implemented). Vellum sets the Recorded Lifecycle State only when
`adopt` records, or `stamp` raises it to, an in-review state; an approved state is recorded by a
person.
