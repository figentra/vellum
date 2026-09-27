# @vellum/plugin-opencode

OpenCode V2 agents and commands for Vellum, generated from `@vellum/method`. `pnpm build`
writes them to `dist/`; nothing in `dist/` is edited by hand.

```text
dist/
  agents/<name>.md             OpenCode V2 dialect: description, mode, model, permissions list
  commands/vellum.md           /vellum: the router, loads the `spec` skill
  commands/spec-*.md           one command per stage skill, run as the skill's persona agent
  skills/<name>/SKILL.md       the method's skills, verbatim
  templates/*.md, ROSTER.md    verbatim; a skill falls back to ../../templates/
```

Copy `agents/` and `commands/` into `.opencode/`; OpenCode V2 also reads skills from
`.agents/skills/` natively.

OpenCode has no tool grant, so each agent's `tools` becomes a `permissions:` list that denies
every action the grant does not reach (`edit`, `shell`, `webfetch`, `websearch`, `subagent`).
`models.json` leaves every OpenCode tier `null`, so agents run on the consumer's configured model.

## No plugin module

OpenCode V2 documents plugins as a default export of `Plugin.define({ id, setup(ctx) })` from
`@opencode/plugin`, with hooks such as `execute.before` / `execute.after`. The page does not show
how a hook is registered from `setup`, and a module would add a runtime import of
`@opencode/plugin`. Until both are settled, this package ships agents and commands only.
