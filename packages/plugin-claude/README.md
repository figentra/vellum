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

- `.mcp.json` starts the server with `npx --no vellum-mcp`: the `vellum-mcp` bin of the
  project's own `@figentra/vellum` dev dependency. It never downloads, so no registry token
  is needed at runtime; without the dev dependency the server fails to start, naming the
  missing package. Install `@figentra/vellum` in the project first (root README, "Installing").
