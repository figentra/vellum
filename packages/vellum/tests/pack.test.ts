/**
 * The package as a consumer gets it: `npm pack` this package, install the
 * tarball into a fresh directory under os.tmpdir() with `npm install
 * --offline` (it has no dependencies, so nothing needs the network), then run
 * the installed `vellum` and `vellum-mcp` bins.
 *
 * Needs `build` first (this package's turbo `test` depends on it).
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PACKAGE_DIR = join(__dirname, "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

describe("npm pack -> offline install -> run", () => {
  let base: string;
  let consumer: string;
  let repo: string;
  let env: NodeJS.ProcessEnv;
  const bin = (name: string) => join(consumer, "node_modules", ".bin", name);

  beforeAll(() => {
    base = mkdtempSync(join(tmpdir(), "vellum-pack-"));
    consumer = join(base, "consumer");
    repo = join(base, "repo");
    mkdirSync(consumer);
    mkdirSync(repo);
    const gitconfig = join(base, "gitconfig");
    writeFileSync(gitconfig, "");
    env = {
      ...process.env,
      GIT_CONFIG_GLOBAL: gitconfig,
      GIT_CONFIG_NOSYSTEM: "1",
      npm_config_cache: join(base, "npm-cache"),
      npm_config_update_notifier: "false",
    };

    const packed = JSON.parse(
      execFileSync(npm, ["pack", "--json", "--pack-destination", base], {
        cwd: PACKAGE_DIR,
        env,
        encoding: "utf8",
      }),
    ) as Array<{ filename: string }>;
    const tarball = join(base, packed[0]!.filename);

    writeFileSync(
      join(consumer, "package.json"),
      `${JSON.stringify({ name: "consumer", private: true }, null, 2)}\n`,
    );
    execFileSync(
      npm,
      ["install", "--offline", "--no-audit", "--no-fund", tarball],
      {
        cwd: consumer,
        env,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    execFileSync("git", ["init", "-q", repo], { env });
  }, 120_000);

  afterAll(() => {
    rmSync(base, { recursive: true, force: true });
  });

  it("installs only the package itself, with no dependency", () => {
    const installed = readdirSync(join(consumer, "node_modules")).filter(
      (n) => !n.startsWith("."),
    );
    expect(installed).toEqual(["@figentra"]);
    expect(readdirSync(join(consumer, "node_modules", "@figentra"))).toEqual([
      "vellum",
    ]);
    const files = readdirSync(
      join(consumer, "node_modules", "@figentra", "vellum", "dist"),
    );
    expect(files.some((f) => f.endsWith(".js.map"))).toBe(true);
    expect(
      existsSync(join(consumer, "node_modules", "@figentra", "vellum", "src")),
    ).toBe(false);
  });

  it("vellum --version and --help run", () => {
    const version = spawnSync(bin("vellum"), ["--version"], {
      cwd: repo,
      env,
      encoding: "utf8",
    });
    expect(version.status).toBe(0);
    expect(version.stdout).toMatch(/^vellum \d+\.\d+\.\d+\n$/);

    const help = spawnSync(bin("vellum"), ["--help"], {
      cwd: repo,
      env,
      encoding: "utf8",
    });
    expect(help.status).toBe(0);
    expect(help.stdout).toContain("doctor");
  });

  it("vellum doctor diagnoses a temp git repository", () => {
    const doctor = spawnSync(bin("vellum"), ["doctor", "--json"], {
      cwd: repo,
      env,
      encoding: "utf8",
    });
    expect(doctor.stderr).toBe("");
    expect(doctor.status).toBe(0);
    const report = JSON.parse(doctor.stdout) as { command: string };
    expect(report.command).toBe("doctor");
  });

  it("vellum-mcp answers the initialize handshake and lists its tools", async () => {
    const lines = await new Promise<string[]>((resolve, reject) => {
      const child = spawn(bin("vellum-mcp"), [], {
        cwd: repo,
        env,
        stdio: ["pipe", "pipe", "inherit"],
      });
      let out = "";
      child.stdout.on(
        "data",
        (chunk: Buffer) => (out += chunk.toString("utf8")),
      );
      child.on("error", reject);
      child.on("close", () => resolve(out.split("\n").filter((l) => l !== "")));
      const send = (m: object) => child.stdin.write(`${JSON.stringify(m)}\n`);
      send({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "pack-test", version: "0" },
        },
      });
      send({ jsonrpc: "2.0", method: "notifications/initialized" });
      send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
      send({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "vellum_status", arguments: {} },
      });
      child.stdin.end();
    });
    const [init, list, call] = lines.map(
      (l) => JSON.parse(l) as { id: number; result: Record<string, unknown> },
    );
    expect(lines).toHaveLength(3);
    expect(init!.result).toMatchObject({
      protocolVersion: "2025-06-18",
      serverInfo: { name: "vellum" },
    });
    expect(
      (list!.result.tools as Array<{ name: string }>).map((t) => t.name),
    ).toContain("vellum_status");
    const content = call!.result.content as Array<{ text: string }>;
    expect(JSON.parse(content[0]!.text)).toEqual({
      command: "status",
      policy: "missing",
      specs: [],
    });
  });

  it("the tarball's package.json has no dependencies and names both bins", () => {
    const pkg = JSON.parse(
      readFileSync(
        join(consumer, "node_modules", "@figentra", "vellum", "package.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    expect(pkg.dependencies).toBeUndefined();
    expect(Object.keys(pkg.bin as object).sort()).toEqual([
      "vellum",
      "vellum-mcp",
    ]);
  });
});
