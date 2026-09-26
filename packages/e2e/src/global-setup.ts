/**
 * Pack @figentra/vellum once per run and install the tarball offline into a
 * temp consumer directory; every scenario runs the bins installed there,
 * never the workspace sources. Needs `@figentra/vellum#build` first (this
 * package's turbo `test` depends on it).
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { TestProject } from "vitest/node";
import { packAndInstall } from "@vellum/vitest-config/pack";

const VELLUM_PACKAGE = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "vellum");

declare module "vitest" {
  export interface ProvidedContext {
    /** node_modules/.bin of the consumer the tarball is installed into */
    vellumBinDir: string;
    /** The installed package directory (node_modules/@figentra/vellum) */
    vellumPackageDir: string;
  }
}

export default function setup(project: TestProject): () => void {
  const base = mkdtempSync(join(tmpdir(), "vellum-e2e-pack-"));
  const { binDir, consumer } = packAndInstall(VELLUM_PACKAGE, base);
  project.provide("vellumBinDir", binDir);
  project.provide("vellumPackageDir", join(consumer, "node_modules", "@figentra", "vellum"));
  return () => rmSync(base, { recursive: true, force: true });
}
