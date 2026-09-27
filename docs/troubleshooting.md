# Troubleshooting Guide

Start with `vellum doctor`. It evaluates Node.js, git, the repository, the Approval Policy and
its signing tools, each managed spec's ledger, and untracked spec documents; categories it does
not evaluate are printed as `NOT_CHECKED`.

## An approval does not count

`vellum verify <spec> --json` names the reason on the approval's ledger entry:

| Finding                             | Cause                                                                                   | Fix                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `not committed`                     | The record was written but no commit adds it yet                                        | Commit the ledger files, signed                                                  |
| `UNSIGNED_COMMIT`                   | The commit that added it is unsigned                                                    | Re-approve and commit with `git commit -S`                                       |
| `SIGNER_NOT_AUTHORIZED`             | The signature is by a key the policy does not list for that identity, or did not verify | Sign with the key in `.sdlc/policy.json`; check its fingerprint and `public_key` |
| `may change only the spec's ledger` | The signed commit also changed other files                                              | Commit the ledger files on their own                                             |
| `CHECKSUM_MISMATCH`                 | The artifact's text changed after approval                                              | Approve the current version again                                                |
| `NOT_AUTHORIZED`                    | The identity is not an approver for the artifact at the spec's risk class               | Change the policy (a human decision)                                             |
| `FROM_ASSISTANT`                    | The commit message marks an assistant session                                           | A human commits it                                                               |

Reformatting (line endings, trailing spaces, table padding) and task markers do not change the
checksum; a changed word does.

## `vellum approve` refuses

It refuses outside an interactive terminal, in CI, and when an assistant session is detected
(`CLAUDECODE`, `CLAUDE_CODE_ENTRYPOINT`, `ASSISTANT_SESSION`, `OPENCODE`, `KIRO_AGENT`). It also
refuses when the policy is missing, when `git config user.email` is not an authorised approver,
when the policy lists no key for you, and on a damaged ledger. The message names which.

## `vellum task start` refuses

The pre-execution check lists each failure: a missing artifact, an artifact without the valid
approvals the policy requires (or whose approval was invalidated by an edit), or a task that
cites a criterion or property the documents do not define. Nothing is written on refusal.

## `vellum task complete` does not set `[x]`

- `has no Task Binding` — run `vellum task start` first.
- `changed since task … started` — an artifact changed after the start; the marker was reset to
  `[ ]`. Start the task again.
- `matches secret pattern` — the command text looks like it contains a credential; pass it
  through the environment instead.
- `FAILED: exit status N` — the command failed; the attempt is recorded, the marker unchanged.
- `working tree differs from HEAD` — the command passed, but uncommitted changes outside the
  spec directory mean the evidence cannot name the commit it ran against. Commit and run again.
- exit status 124 — the command ran past `--timeout` (default 600 seconds) and was stopped.

## Ledger integrity failures

`.sdlc/ledger.jsonl` must never be edited by hand. `vellum lint`, `verify` and `doctor` report:

- an edited entry (the next entry's predecessor digest no longer matches it);
- a removed entry (an id gap) or reordered entries;
- a fork (two entries claiming the same predecessor);
- a mismatch with `.sdlc/ledger.head.json` — trailing entries removed, the last entry edited, or
  entries appended by something other than Vellum.

Recover from git history (`git log -p -- <spec>/.sdlc/`), not by editing the ledger. Vellum
refuses to append to a damaged ledger.

## A command exits 2

- `not implemented: …` — `sync` does not exist in this version.
- `no spec matches` / `matches more than one spec` — give a longer fragment or the full
  directory name.
- `has no option --…` — the command does not take that option (`task complete` has no `--exit`).
- `INCONCLUSIVE` — nothing was examined (for example only legacy specs), or an input could not
  be read: an artifact without valid frontmatter, an unparseable ledger line, an invalid policy.
