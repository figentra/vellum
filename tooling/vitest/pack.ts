/**
 * Pack a workspace package the way `npm publish` would, and install the
 * tarball into a fresh consumer directory with `npm install --offline` —
 * the package as a consumer gets it, never the workspace sources.
 *
 * Shared by @figentra/vellum's pack test and the @vellum/e2e suite. Node
 * builtins only. Nothing contacts a registry: the tarball has no
 * dependencies, the install is offline, and npm reads an empty user config
 * (so no credential in the developer's ~/.npmrc is loaded) and a cache inside
 * `base`.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";

export interface PackedInstall {
  /** The .tgz `npm pack` wrote, inside `base` */
  readonly tarball: string;
  /** The consumer directory the tarball is installed into */
  readonly consumer: string;
  /** The consumer's node_modules/.bin, where the package's bins are linked */
  readonly binDir: string;
  /** The environment npm ran with (isolated cache and user config) */
  readonly npmEnv: NodeJS.ProcessEnv;
}

/**
 * `npm pack` `packageDir` into `base`, then install the tarball into
 * `<base>/consumer` offline. `base` must exist and be empty of a `consumer`.
 */
export function packAndInstall(
  packageDir: string,
  base: string,
  env: NodeJS.ProcessEnv = process.env,
): PackedInstall {
  const userconfig = join(base, "npmrc");
  writeFileSync(userconfig, "");
  const npmEnv: NodeJS.ProcessEnv = {
    ...env,
    npm_config_cache: join(base, "npm-cache"),
    npm_config_userconfig: userconfig,
    npm_config_update_notifier: "false",
    npm_config_fund: "false",
    npm_config_audit: "false",
  };

  const packed = JSON.parse(
    execFileSync(npm, ["pack", "--json", "--pack-destination", base], {
      cwd: packageDir,
      env: npmEnv,
      encoding: "utf8",
    }),
  ) as Array<{ filename: string }>;
  const tarball = join(base, packed[0]!.filename);

  const consumer = join(base, "consumer");
  mkdirSync(consumer);
  writeFileSync(
    join(consumer, "package.json"),
    `${JSON.stringify({ name: "consumer", private: true }, null, 2)}\n`,
  );
  execFileSync(npm, ["install", "--offline", "--no-audit", "--no-fund", tarball], {
    cwd: consumer,
    env: npmEnv,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return { tarball, consumer, binDir: join(consumer, "node_modules", ".bin"), npmEnv };
}
