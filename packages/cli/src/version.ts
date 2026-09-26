/**
 * The Vellum version, recorded in Evidence Entries as the platform version.
 * The @figentra/vellum bundle replaces __VELLUM_VERSION__ with its own
 * package.json version at build time; an unbundled build reports "0.0.0-dev".
 */
declare const __VELLUM_VERSION__: string | undefined;

export const VERSION: string =
  typeof __VELLUM_VERSION__ === "string" ? __VELLUM_VERSION__ : "0.0.0-dev";
