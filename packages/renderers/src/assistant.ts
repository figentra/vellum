/**
 * @vellum/renderers — Assistant dialects
 *
 * One neutral agent source, one rendered frontmatter dialect per assistant. Pure functions:
 * the caller reads the files and passes their text in; nothing here touches the filesystem,
 * the clock or the environment, so the same input always renders the same bytes.
 *
 * Neutral agent frontmatter (the only frontmatter a method agent carries):
 *
 *   name: <string>                   optional; defaults to the file stem, must match it
 *   description: <string>            required
 *   tools: Read, Grep, Glob, Bash    optional; Claude Code tool names, comma-separated
 *   tier: <tier>                     optional; resolved per assistant by the model map
 *   model: <alias|provider/model>    optional override of the tier
 *   mode: primary|subagent|all       optional; OpenCode only, default subagent
 *   permissions:                     optional; explicit rules, overriding the ones OpenCode
 *     - action: shell                          would derive from `tools`
 *       resource: "git *"
 *       effect: allow|ask|deny
 *   skills: [a, b]                   optional; method skill names
 *
 *   | neutral     | Claude Code           | Kiro                            | OpenCode                     |
 *   | ----------- | --------------------- | ------------------------------- | ---------------------------- |
 *   | name        | name                  | name                            | (the filename is the name)   |
 *   | description | description           | description                     | description                  |
 *   | tools       | tools (verbatim)      | tools: [KIRO_TOOLS]             | permissions: denies derived  |
 *   | tier/model  | alias; else omitted   | Kiro id; else omitted           | provider/model; else omitted |
 *   | mode        | (none)                | (none)                          | mode                         |
 *   | permissions | (tools is the grant)  | permissions.rules[]             | permissions[] verbatim       |
 *   | skills      | skills                | resources: skill://...          | (skills load natively)       |
 *
 * A field an assistant cannot express is omitted, never guessed: an omitted model means "the
 * assistant's default", which is safer than a model id the assistant does not know.
 */

/** Supported assistant types */
export type AssistantType = "claude" | "kiro" | "opencode";

/** Every assistant with an agent dialect, in a stable order. */
export const ASSISTANT_TYPES: readonly AssistantType[] = ["claude", "kiro", "opencode"];

export type PermissionEffect = "allow" | "ask" | "deny";

export interface NeutralPermission {
  action: string;
  resource: string;
  effect: PermissionEffect;
}

export type AgentMode = "primary" | "subagent" | "all";

/** A validated neutral agent. */
export interface NeutralAgent {
  name: string;
  description: string;
  tools?: string[];
  tier?: string;
  model?: string;
  mode: AgentMode;
  permissions?: NeutralPermission[];
  skills?: string[];
}

/** Tier to model, per assistant. `null` means the assistant's own default. */
export interface ModelMap {
  tiers: string[];
  assistants: Record<AssistantType, Record<string, string | null>>;
}

/** Raised when a source document cannot be parsed or validated; lists every problem found. */
export class AssistantSourceError extends Error {
  readonly problems: readonly string[];
  constructor(label: string, problems: readonly string[]) {
    super(`${label}: ${problems.join("; ")}`);
    this.name = "AssistantSourceError";
    this.problems = problems;
  }
}

/**
 * Claude Code tool name → Kiro tool name. `null` = no Kiro equivalent, dropped deliberately.
 * A tool absent from this table is an error, so adding a tool to a source forces a decision
 * here instead of silently vanishing from Kiro.
 */
export const KIRO_TOOLS: Readonly<Record<string, string | null>> = {
  Read: "read",
  Grep: "read",
  Glob: "read",
  LS: "read",
  Write: "write",
  Edit: "write",
  MultiEdit: "write",
  NotebookEdit: "write",
  Bash: "shell",
  WebFetch: "web",
  WebSearch: "web",
  TodoWrite: "todo_list",
  Task: "subagent",
  Agent: "subagent",
  // Kiro loads skills through `resources: skill://…`, not a tool.
  Skill: null,
};

/**
 * Claude Code tool name → the OpenCode V2 permission action it needs. OpenCode has no tool
 * grant, so every action here that an agent's `tools` does not reach is denied for it.
 */
export const OPENCODE_ACTIONS: Readonly<Record<string, string>> = {
  Write: "edit",
  Edit: "edit",
  MultiEdit: "edit",
  NotebookEdit: "edit",
  Bash: "shell",
  WebFetch: "webfetch",
  WebSearch: "websearch",
  Task: "subagent",
  Agent: "subagent",
};

/** OpenCode permission action → Kiro permission capability. Absent = error, not a guess. */
export const KIRO_CAPABILITIES: Readonly<Record<string, string>> = {
  "*": "all",
  read: "fs_read",
  glob: "fs_read",
  grep: "fs_read",
  edit: "fs_write",
  write: "fs_write",
  patch: "fs_write",
  shell: "shell",
  webfetch: "web_fetch",
  websearch: "web_search",
  mcp: "mcp",
  subagent: "subagent",
};

/** Neutral model aliases each assistant understands directly. */
const CLAUDE_MODELS: Readonly<Record<string, string>> = {
  opus: "opus",
  sonnet: "sonnet",
  haiku: "haiku",
  inherit: "inherit",
};
const KIRO_MODELS: Readonly<Record<string, string>> = { sonnet: "claude-sonnet-4" };

const AGENT_KEYS = new Set([
  "name",
  "description",
  "tools",
  "tier",
  "model",
  "mode",
  "permissions",
  "skills",
]);
const MODES: readonly AgentMode[] = ["primary", "subagent", "all"];
const EFFECTS: readonly PermissionEffect[] = ["allow", "ask", "deny"];

// ---------------------------------------------------------------------------
// Frontmatter parsing — the small YAML subset method sources use. Not a general YAML parser.
// ---------------------------------------------------------------------------

export type FrontmatterValue = string | boolean | string[] | Record<string, string>[];

export interface ParsedDocument {
  data: Record<string, FrontmatterValue>;
  body: string;
}

function unquote(s: string): string {
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
  return s;
}

function parseScalarOrArray(v: string): string | boolean | string[] {
  if (v === "true") return true;
  if (v === "false") return false;
  if (v.startsWith("[") && v.endsWith("]")) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    return inner
      .split(",")
      .map((s) => unquote(s.trim()))
      .filter((s) => s !== "");
  }
  return unquote(v);
}

const KEY_LINE = /^([A-Za-z_][\w-]*):(?:\s+(.*))?$/; // a YAML key needs ": " or ":" at end

/**
 * Split a Markdown document into top-level frontmatter and body. Supports scalars, inline
 * arrays, block sequences of scalars and block sequences of flat mappings. A nested mapping
 * below a key is not modelled: the key is recorded with an empty string.
 */
export function parseFrontmatter(raw: string, label: string): ParsedDocument {
  if (!raw.startsWith("---\n")) {
    throw new AssistantSourceError(label, ['missing frontmatter (must start with "---")']);
  }
  const closeIdx = raw.indexOf("\n---\n", 3);
  if (closeIdx === -1) {
    throw new AssistantSourceError(label, ['unterminated frontmatter (no closing "---")']);
  }
  const lines = raw.slice(4, closeIdx).split("\n");
  const body = raw.slice(closeIdx + 5);
  const data: Record<string, FrontmatterValue> = {};

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (/^\s/.test(line)) continue; // inside a nested block this parser does not model
    const m = line.match(KEY_LINE);
    if (!m) continue;
    const key = m[1] as string;
    const value = (m[2] ?? "").trim();
    if (value !== "") {
      data[key] = parseScalarOrArray(value);
      continue;
    }
    if (!/^\s+-\s+/.test(lines[i + 1] ?? "")) {
      data[key] = "";
      continue;
    }
    // Block sequence: of scalars, or of flat mappings.
    const scalars: string[] = [];
    const maps: Record<string, string>[] = [];
    while (i + 1 < lines.length && /^\s+-\s+/.test(lines[i + 1] ?? "")) {
      i += 1;
      const item = (lines[i] ?? "").trim().replace(/^-\s+/, "");
      const kv = item.match(KEY_LINE);
      if (!kv) {
        scalars.push(unquote(item));
        continue;
      }
      const entry: Record<string, string> = { [kv[1] as string]: unquote((kv[2] ?? "").trim()) };
      while (i + 1 < lines.length && /^\s+[A-Za-z_][\w-]*:(\s|$)/.test(lines[i + 1] ?? "")) {
        i += 1;
        const inner = (lines[i] ?? "").trim().match(KEY_LINE);
        if (inner) entry[inner[1] as string] = unquote((inner[2] ?? "").trim());
      }
      maps.push(entry);
    }
    data[key] = maps.length > 0 ? maps : scalars;
  }
  return { data, body };
}

// ---------------------------------------------------------------------------
// Neutral agent validation
// ---------------------------------------------------------------------------

export interface AgentSourceContext {
  /** Model tiers and their per-assistant models (the method's models.json). */
  models: ModelMap;
  /** Skill names the method ships; an agent's `skills` must name only these. */
  skills: readonly string[];
}

/** Parse and validate one neutral agent source. Throws `AssistantSourceError` listing every problem. */
export function parseNeutralAgent(
  raw: string,
  fileName: string,
  context: AgentSourceContext,
): { agent: NeutralAgent; body: string } {
  const { data, body } = parseFrontmatter(raw, fileName);
  const stem = fileName.replace(/\.md$/, "");
  const errors: string[] = [];

  for (const key of Object.keys(data)) {
    if (!AGENT_KEYS.has(key)) errors.push(`unknown key '${key}'`);
  }
  if (data.name !== undefined && data.name !== stem) {
    errors.push(`'name' is '${String(data.name)}' but the file is ${fileName}; they must match`);
  }
  const description = data.description;
  if (typeof description !== "string" || description === "") {
    errors.push("missing or non-string 'description'");
  }
  if (data.model !== undefined && typeof data.model !== "string") {
    errors.push("'model' must be a string");
  }
  if (data.tier !== undefined && !context.models.tiers.includes(String(data.tier))) {
    errors.push(
      `'tier' is '${String(data.tier)}'; the model map defines: ${context.models.tiers.join(", ")}`,
    );
  }
  if (data.mode !== undefined && !MODES.includes(data.mode as AgentMode)) {
    errors.push(`'mode' must be one of: ${MODES.join(", ")}`);
  }

  let tools: string[] | undefined;
  if (data.tools !== undefined) {
    const list = Array.isArray(data.tools)
      ? (data.tools as unknown[]).map(String)
      : String(data.tools).split(",");
    tools = list.map((t) => t.trim()).filter(Boolean);
    const unmapped = tools.filter((t) => !(t in KIRO_TOOLS));
    if (unmapped.length) errors.push(`tool(s) ${unmapped.join(", ")} have no entry in KIRO_TOOLS`);
  }

  let skills: string[] | undefined;
  if (data.skills !== undefined) {
    if (!Array.isArray(data.skills)) {
      errors.push("'skills' must be an array of skill names");
    } else {
      skills = (data.skills as unknown[]).map(String);
      const missing = skills.filter((s) => !context.skills.includes(s));
      if (missing.length) errors.push(`skill(s) ${missing.join(", ")} are not method skills`);
    }
  }

  let permissions: NeutralPermission[] | undefined;
  if (data.permissions !== undefined) {
    if (!Array.isArray(data.permissions) || data.permissions.some((p) => typeof p !== "object")) {
      errors.push("'permissions' must be a list of action/resource/effect rules");
    } else {
      const rules = data.permissions as Record<string, string>[];
      permissions = rules.map((rule, i) => {
        const { action, resource, effect } = rule;
        if (action === undefined || !(action in KIRO_CAPABILITIES)) {
          errors.push(
            `'permissions[${i}].action' '${String(action)}' has no entry in KIRO_CAPABILITIES`,
          );
        }
        if (resource === undefined) errors.push(`'permissions[${i}].resource' is missing`);
        if (!EFFECTS.includes(effect as PermissionEffect)) {
          errors.push(`'permissions[${i}].effect' must be one of: ${EFFECTS.join(", ")}`);
        }
        return {
          action: String(action),
          resource: String(resource),
          effect: effect as PermissionEffect,
        };
      });
    }
  }

  if (errors.length) throw new AssistantSourceError(fileName, errors);

  const agent: NeutralAgent = {
    name: stem,
    description: description as string,
    mode: (data.mode as AgentMode | undefined) ?? "subagent",
  };
  if (tools) agent.tools = tools;
  if (typeof data.tier === "string") agent.tier = data.tier;
  if (typeof data.model === "string") agent.model = data.model;
  if (permissions) agent.permissions = permissions;
  if (skills) agent.skills = skills;
  return { agent, body };
}

// ---------------------------------------------------------------------------
// Dialect rendering
// ---------------------------------------------------------------------------

/** Quote a YAML scalar deterministically. */
export function yamlScalar(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ")}"`;
}

function resolveModel(
  model: string,
  aliases: Readonly<Record<string, string>>,
  passProvider: string | null,
): string | undefined {
  const alias = aliases[model];
  if (alias !== undefined) return alias;
  if (!model.includes("/")) return undefined;
  if (passProvider === "*") return model;
  const [provider, ...rest] = model.split("/");
  return provider === passProvider ? rest.join("/") : undefined;
}

/** The model an assistant renders for an agent: an explicit override, else its tier's mapping. */
export function modelFor(
  agent: NeutralAgent,
  assistant: AssistantType,
  models: ModelMap,
): string | undefined {
  if (agent.model !== undefined) {
    if (assistant === "claude") return resolveModel(agent.model, CLAUDE_MODELS, "anthropic");
    if (assistant === "kiro") return resolveModel(agent.model, KIRO_MODELS, null);
    return resolveModel(agent.model, {}, "*");
  }
  if (agent.tier !== undefined) return models.assistants[assistant][agent.tier] ?? undefined;
  return undefined;
}

export interface RenderAgentOptions {
  models: ModelMap;
  /** Where the source lives, for the provenance comment (e.g. `@vellum/method/agents/x.md`). */
  source: string;
  /** Who generated the file, for the provenance comment. */
  generator: string;
  /**
   * Claude Code only: plugin namespace for the agent's `skills`. Skills shipped inside a plugin
   * are addressed as `<plugin>:<skill>`; leave unset for skills installed in `.claude/skills`.
   */
  claudeSkillNamespace?: string;
  /** Kiro only: directory a skill resource resolves under. Default `.kiro/skills`. */
  kiroSkillRoot?: string;
}

function claudeAgentFrontmatter(agent: NeutralAgent, options: RenderAgentOptions): string[] {
  const lines = [`name: ${agent.name}`, `description: ${yamlScalar(agent.description)}`];
  if (agent.tools) lines.push(`tools: ${agent.tools.join(", ")}`);
  const model = modelFor(agent, "claude", options.models);
  if (model) lines.push(`model: ${model}`);
  if (agent.skills?.length) {
    const prefix = options.claudeSkillNamespace ? `${options.claudeSkillNamespace}:` : "";
    lines.push("skills:", ...agent.skills.map((s) => `  - ${prefix}${s}`));
  }
  return lines;
}

function kiroAgentFrontmatter(agent: NeutralAgent, options: RenderAgentOptions): string[] {
  const lines = [`name: ${agent.name}`, `description: ${yamlScalar(agent.description)}`];
  const model = modelFor(agent, "kiro", options.models);
  if (model) lines.push(`model: ${model}`);
  if (agent.tools) {
    const mapped = agent.tools.map((t) => KIRO_TOOLS[t]).filter((t): t is string => Boolean(t));
    lines.push(`tools: [${[...new Set(mapped)].map(yamlScalar).join(", ")}]`);
  }
  if (agent.skills?.length) {
    const root = options.kiroSkillRoot ?? ".kiro/skills";
    lines.push("resources:");
    for (const s of agent.skills) lines.push(`  - ${yamlScalar(`skill://${root}/${s}/SKILL.md`)}`);
  }
  if (agent.permissions?.length) {
    lines.push("permissions:", "  rules:");
    for (const p of agent.permissions) {
      lines.push(`    - capability: ${KIRO_CAPABILITIES[p.action] ?? p.action}`);
      lines.push(`      match: [${yamlScalar(p.resource)}]`);
      lines.push(`      effect: ${p.effect}`);
    }
  }
  return lines;
}

/** OpenCode has no tool grant, only permissions — so a tool the agent lacks becomes a deny. */
export function deriveOpenCodePermissions(
  tools: readonly string[] | undefined,
): NeutralPermission[] | undefined {
  if (!tools) return undefined;
  const granted = new Set(tools.map((t) => OPENCODE_ACTIONS[t]).filter(Boolean));
  const denied = [...new Set(Object.values(OPENCODE_ACTIONS))]
    .filter((action) => !granted.has(action))
    .map((action): NeutralPermission => ({ action, resource: "*", effect: "deny" }));
  return denied.length ? denied : [{ action: "*", resource: "*", effect: "allow" }];
}

function openCodeAgentFrontmatter(agent: NeutralAgent, options: RenderAgentOptions): string[] {
  const lines = [`description: ${yamlScalar(agent.description)}`, `mode: ${agent.mode}`];
  const model = modelFor(agent, "opencode", options.models);
  if (model) lines.push(`model: ${yamlScalar(model)}`);
  const permissions = agent.permissions ?? deriveOpenCodePermissions(agent.tools);
  if (permissions?.length) {
    lines.push("permissions:");
    for (const p of permissions) {
      lines.push(`  - action: ${yamlScalar(p.action)}`);
      lines.push(`    resource: ${yamlScalar(p.resource)}`);
      lines.push(`    effect: ${p.effect}`);
    }
  }
  return lines;
}

const AGENT_DIALECTS: Record<
  AssistantType,
  (agent: NeutralAgent, options: RenderAgentOptions) => string[]
> = {
  claude: claudeAgentFrontmatter,
  kiro: kiroAgentFrontmatter,
  opencode: openCodeAgentFrontmatter,
};

/** The provenance comment every generated file carries after its frontmatter. */
export function provenanceLine(source: string, generator: string): string {
  return `<!-- generated from ${source} by ${generator}; edit the source, not this file -->`;
}

function assemble(frontmatter: string[], provenance: string, body: string): string {
  const trimmedBody = body.replace(/^\n+/, "").replace(/\s+$/, "\n");
  return [`---\n${frontmatter.join("\n")}\n---`, provenance, trimmedBody].join("\n\n");
}

/** Render one agent file in an assistant's dialect. */
export function renderAgent(
  assistant: AssistantType,
  agent: NeutralAgent,
  body: string,
  options: RenderAgentOptions,
): string {
  return assemble(
    AGENT_DIALECTS[assistant](agent, options),
    provenanceLine(options.source, options.generator),
    body,
  );
}

/** Render an OpenCode command file (`commands/<name>.md`). */
export function renderOpenCodeCommand(
  command: { description: string; agent?: string },
  template: string,
  provenance: { source: string; generator: string },
): string {
  const lines = [`description: ${yamlScalar(command.description)}`];
  if (command.agent) lines.push(`agent: ${command.agent}`);
  return assemble(lines, provenanceLine(provenance.source, provenance.generator), template);
}

// ---------------------------------------------------------------------------
// Frontmatter checks on rendered output
// ---------------------------------------------------------------------------

const RENDERED_AGENT_KEYS: Record<AssistantType, { required: string[]; allowed: string[] }> = {
  claude: {
    required: ["name", "description"],
    allowed: ["name", "description", "tools", "model", "skills"],
  },
  kiro: {
    required: ["name", "description"],
    allowed: ["name", "description", "model", "tools", "resources", "permissions"],
  },
  opencode: {
    required: ["description", "mode"],
    allowed: ["description", "mode", "model", "permissions"],
  },
};

const CLAUDE_TOOL_NAMES = new Set(Object.keys(KIRO_TOOLS));
const KIRO_TOOL_NAMES = new Set(Object.values(KIRO_TOOLS).filter((t): t is string => Boolean(t)));
/** OpenCode V2 permission actions (opencode.ai/v2/docs/agents), plus the `*` wildcard. */
const OPENCODE_PERMISSION_ACTIONS = new Set([
  "*",
  "read",
  "glob",
  "grep",
  "edit",
  "shell",
  "subagent",
  "webfetch",
  "websearch",
  "skill",
]);
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function frontmatterOf(
  rendered: string,
  label: string,
): { data: Record<string, FrontmatterValue> } | { problems: string[] } {
  try {
    return { data: parseFrontmatter(rendered, label).data };
  } catch (error) {
    return {
      problems: error instanceof AssistantSourceError ? [...error.problems] : [String(error)],
    };
  }
}

function checkClaude(data: Record<string, FrontmatterValue>, problems: string[]): void {
  if (typeof data.name === "string" && !KEBAB.test(data.name)) {
    problems.push(`name '${data.name}' is not kebab-case`);
  }
  if (data.tools !== undefined) {
    for (const t of String(data.tools)
      .split(",")
      .map((s) => s.trim())) {
      if (!CLAUDE_TOOL_NAMES.has(t)) problems.push(`unknown Claude Code tool '${t}'`);
    }
  }
  if (data.model !== undefined) {
    const model = String(data.model);
    if (!(model in CLAUDE_MODELS) && !model.startsWith("claude-")) {
      problems.push(`model '${model}' is not a Claude Code alias or id`);
    }
  }
}

function checkKiro(data: Record<string, FrontmatterValue>, problems: string[]): void {
  if (typeof data.name === "string" && !KEBAB.test(data.name)) {
    problems.push(`name '${data.name}' is not kebab-case`);
  }
  if (data.tools !== undefined) {
    if (!Array.isArray(data.tools)) problems.push("'tools' must be an array");
    else {
      for (const t of data.tools.map(String)) {
        if (!KIRO_TOOL_NAMES.has(t)) problems.push(`unknown Kiro tool '${t}'`);
      }
    }
  }
  if (data.resources !== undefined) {
    if (!Array.isArray(data.resources)) problems.push("'resources' must be a list");
    else {
      for (const r of data.resources.map(String)) {
        if (!r.startsWith("skill://")) problems.push(`resource '${r}' is not a skill:// URI`);
      }
    }
  }
}

function checkOpenCode(data: Record<string, FrontmatterValue>, problems: string[]): void {
  if (!MODES.includes(data.mode as AgentMode)) {
    problems.push(`mode '${String(data.mode)}' is not one of ${MODES.join(", ")}`);
  }
  if (data.model !== undefined && !String(data.model).includes("/")) {
    problems.push(`model '${String(data.model)}' is not provider/model`);
  }
  if (data.permissions === undefined) return;
  if (!Array.isArray(data.permissions) || data.permissions.some((p) => typeof p !== "object")) {
    problems.push("'permissions' must be a list of rules");
    return;
  }
  (data.permissions as Record<string, string>[]).forEach((p, i) => {
    if (!OPENCODE_PERMISSION_ACTIONS.has(p.action ?? "")) {
      problems.push(`permissions[${i}].action '${String(p.action)}' is not an OpenCode action`);
    }
    if (p.resource === undefined) problems.push(`permissions[${i}].resource is missing`);
    if (!EFFECTS.includes(p.effect as PermissionEffect)) {
      problems.push(`permissions[${i}].effect '${String(p.effect)}' is not allow, ask or deny`);
    }
  });
}

/**
 * Check a rendered agent file against its assistant's frontmatter dialect. Returns every
 * problem found; an empty list means the file passes.
 */
export function checkAgentFrontmatter(
  assistant: AssistantType,
  rendered: string,
  label: string,
): string[] {
  const parsed = frontmatterOf(rendered, label);
  if ("problems" in parsed) return parsed.problems;
  const { data } = parsed;
  const problems: string[] = [];
  const { required, allowed } = RENDERED_AGENT_KEYS[assistant];
  for (const key of required) {
    if (data[key] === undefined || data[key] === "") problems.push(`missing '${key}'`);
  }
  for (const key of Object.keys(data)) {
    if (!allowed.includes(key)) problems.push(`'${key}' is not a ${assistant} agent key`);
  }
  if (!rendered.includes("<!-- generated from ")) problems.push("missing provenance comment");
  if (assistant === "claude") checkClaude(data, problems);
  if (assistant === "kiro") checkKiro(data, problems);
  if (assistant === "opencode") checkOpenCode(data, problems);
  return problems;
}

/**
 * Check a skill's `SKILL.md`: the Agent Skills frontmatter every assistant reads — `name`
 * equal to its directory, kebab-case, and a `description`.
 */
export function checkSkillFrontmatter(raw: string, directoryName: string): string[] {
  const parsed = frontmatterOf(raw, `${directoryName}/SKILL.md`);
  if ("problems" in parsed) return parsed.problems;
  const { data } = parsed;
  const problems: string[] = [];
  if (data.name !== directoryName) {
    problems.push(`name '${String(data.name)}' must equal its directory '${directoryName}'`);
  }
  if (typeof data.name === "string" && !KEBAB.test(data.name)) {
    problems.push(`name '${data.name}' is not kebab-case`);
  }
  if (typeof data.description !== "string" || data.description === "") {
    problems.push("missing 'description'");
  }
  return problems;
}

/** Check a rendered OpenCode command file (opencode.ai/v2/docs/commands). */
export function checkOpenCodeCommand(rendered: string, label: string): string[] {
  const parsed = frontmatterOf(rendered, label);
  if ("problems" in parsed) return parsed.problems;
  const { data } = parsed;
  const problems: string[] = [];
  const allowed = ["description", "agent", "model", "subagent"];
  for (const key of Object.keys(data)) {
    if (!allowed.includes(key)) problems.push(`'${key}' is not an OpenCode command key`);
  }
  if (typeof data.description !== "string" || data.description === "") {
    problems.push("missing 'description'");
  }
  return problems;
}
