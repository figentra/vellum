# @vellum/method

The Vellum method as data: Markdown and JSON only. Nothing in this package is imported as code;
the assistant packages (`@vellum/plugin-claude`, `@vellum/plugin-kiro`, `@vellum/plugin-opencode`)
read these files at build time and render them into each assistant's layout.

| Path          | What it holds                                                                     |
| ------------- | --------------------------------------------------------------------------------- |
| `skills/`     | Nine skills, one `SKILL.md` each: `spec`, `spec-new`, `spec-design`, `spec-tasks`, `spec-implement`, `spec-run`, `spec-verify`, `failure-loop`, `durable-findings` |
| `agents/`     | Twelve agents with neutral frontmatter (`name`, `description`, `tools`, `tier`, optional `skills`) |
| `templates/`  | `requirements.md`, `design.md`, `tasks.md`: the three documents of a spec          |
| `models.json` | Tier to model, per assistant                                                      |
| `ROSTER.md`   | What each agent owns and whether it blocks                                        |

## Conventions

- **Tiers, not models.** An agent names `tier: economy | standard | frontier`; `models.json`
  resolves it per assistant.
- **No assistant-specific paths.** Skills call the `vellum` CLI (`status`, `lint`, `check`,
  `verify`, `approve`, `task`, `adopt`, `sync`, `doctor`) instead of plugin-relative scripts,
  and read a template from the consumer's `.agents/templates/` first, falling back to
  `../../templates/` relative to the skill's own directory.
- **Product-neutral.** No product names, no ADR numbers, no paths from any one repository.

## Tests

`pnpm --filter @vellum/method test` runs `node --test` over `test/`. It fails when a method file
contains the Claude Code plugin-root variable, names a `vellum` subcommand the CLI does not define (the list is
read from `packages/cli/src/cli.ts` at test time), carries a product-specific string, or has
agent frontmatter outside the neutral schema. The tests are not shipped (`files` lists only the
data).

## Origin

Brought in from the `sdlc` plugin 0.2.0 (skills). Agents, templates and `models.json` follow the
newer neutral-frontmatter convention (`tier:`), generalised to remove one repository's
specifics.
