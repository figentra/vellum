# Getting Started with Vellum

This walks one spec through the loop Vellum implements today: approve, start a task,
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

## 2. A spec with Lifecycle Frontmatter

```
.agents/specs/001-my-feature/
├── requirements.md
├── design.md
├── tasks.md
└── .sdlc/
    └── ledger.jsonl      (empty; Vellum appends to it)
```

Each artifact starts with frontmatter whose `checksum` is the SHA-256 of the body's canonical
form (`computeChecksum` in `@vellum/protocol`):

```markdown
---
version: 1
checksum: <sha-256 of the body>
state: IN_PROGRESS
createdAt: 2026-09-26T10:00:00Z
updatedAt: 2026-09-26T10:00:00Z
---

# Requirements

...
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

`vellum check`, `vellum adopt` and `vellum sync` exit 2 (not implemented). `status` does not
compute the Effective Lifecycle State or the next transition. Recorded states in frontmatter are
not advanced by Vellum.
