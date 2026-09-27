# @vellum/plugin-kiro

A Kiro Power for Vellum, generated from `@vellum/method`. `pnpm build` writes it to `dist/`;
nothing in `dist/` is edited by hand.

```text
dist/
  plugin.json                    manifest: name, version, description, activation keywords
  mcp.json                       the Vellum MCP server
  skills/<name>/SKILL.md         the method's skills, verbatim
  templates/*.md, ROSTER.md      verbatim; a skill falls back to ../../templates/
  dev.kiro/steering/vellum.md    always-on steering: record task state through `vellum task`
  dev.kiro/agents/<name>.md      the method's agents in the Kiro dialect
```

The steering tells Kiro to start a task with `vellum task start` and to record completion only
through `vellum task complete <spec> <id> --command=…`, which runs the command itself.

## Open items

- **Kiro's `plugin.json` fields are unverified.** The manifest uses only `name`, `version`,
  `description` and `keywords` (the activation keywords). Confirm the field names Kiro reads
  for a Power before relying on activation.
- The `dev.kiro/` layout (steering and agents under a `.kiro/`-shaped directory) and the agents'
  `skill://.kiro/skills/<name>/SKILL.md` resource URIs assume the Power's skills end up in the
  workspace's `.kiro/skills/`. Unverified.
- `mcp.json` starts the server with `npx --no vellum-mcp`: the `vellum-mcp` bin of the
  project's own `@figentra/vellum` dev dependency. It never downloads, so no registry token
  is needed at runtime; without the dev dependency the server fails to start, naming the
  missing package. Install `@figentra/vellum` in the project first (root README, "Installing").
