/**
 * @vellum/plugin-opencode — OpenCode agents and commands, generated from @vellum/method.
 * `pnpm build` writes them to dist/; nothing in dist/ is hand-edited.
 */

export { buildOpenCodePackage, COMMANDS, GENERATOR } from "./build.ts";
export type { BuildOptions, StageCommand } from "./build.ts";
export { readMethod, methodRoot } from "./method.ts";
export type { Method, MethodFile } from "./method.ts";
export { writeTree } from "./write.ts";
