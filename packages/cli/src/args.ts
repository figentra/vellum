/**
 * Argument parsing with a per-command option list: an option a command does
 * not declare is a usage error (exit 2), never silently ignored.
 */

/** Parsed command line. */
export interface ParsedArgs {
  /** Positional words, the command name first */
  readonly positional: readonly string[];
  /** Options given as `--name` (true) or `--name=value` / `--name value` */
  readonly options: ReadonlyMap<string, string | true>;
}

const SHORT: Readonly<Record<string, string>> = { h: "help", v: "version", j: "json" };

/** Options that never take a value, so `--json 016` keeps `016` positional. */
const BOOLEAN_OPTIONS = new Set(["help", "version", "json", "strict", "reject"]);

/** Parse `argv` (without the node and script entries). */
export function parseArgs(argv: readonly string[]): ParsedArgs {
  const positional: string[] = [];
  const options = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--") {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq !== -1) {
        options.set(arg.slice(2, eq), arg.slice(eq + 1));
        continue;
      }
      const name = arg.slice(2);
      const next = argv[i + 1];
      if (!BOOLEAN_OPTIONS.has(name) && next !== undefined && !next.startsWith("-")) {
        options.set(name, next);
        i++;
      } else {
        options.set(name, true);
      }
      continue;
    }
    if (arg.startsWith("-") && arg.length > 1) {
      for (const letter of arg.slice(1)) options.set(SHORT[letter] ?? letter, true);
      continue;
    }
    positional.push(arg);
  }
  return { positional, options };
}

/** The first option in `args` that `allowed` does not list, if any. */
export function unknownOption(args: ParsedArgs, allowed: readonly string[]): string | null {
  for (const name of args.options.keys()) {
    if (!allowed.includes(name)) return name;
  }
  return null;
}

/** A string option's value; undefined when absent; null when given without a value. */
export function stringOption(args: ParsedArgs, name: string): string | null | undefined {
  const value = args.options.get(name);
  if (value === undefined) return undefined;
  return value === true ? null : value;
}
