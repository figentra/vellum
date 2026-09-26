# @vellum/plugin-claude

The Claude Code plugin `vellum`, generated from `@vellum/method`. `pnpm build` writes it to
`dist/`; nothing in `dist/` is edited by hand.

```text
dist/
  .claude-plugin/plugin.json   manifest (name `vellum`)
  .mcp.json                    the Vellum MCP server
  skills/<name>/SKILL.md       the method's skills, verbatim (`/vellum:spec` is the entry point)
  agents/<name>.md             the method's agents in the Claude Code dialect
  templates/*.md, ROSTER.md    verbatim; a skill falls back to ../../templates/
```

Agents are rendered by `renderAgent("claude", …)` from `@vellum/renderers`: each `tier:` becomes
the model `models.json` names, and an agent's `skills` are namespaced `vellum:<skill>`.

Validate the output with `claude plugin validate --strict dist`.

## Open items

- `.mcp.json` starts the server with `npx -y --package=@figentra/vellum vellum-mcp`.
  `@figentra/vellum` is published only to the private registry `https://npm.figentra.com/`,
  so `npx` resolves it only when the user's `~/.npmrc` routes the `@figentra` scope there and
  authenticates (see the root README, "Installing"). Until the first release tag is pushed the
  package is unpublished and the command fails.
