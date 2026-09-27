/**
 * Tests for determinism helpers (criterion 15.1).
 */

import { describe, expect, it } from "vitest";
import { computeOutputHash, verifyReproducibility } from "../determinism";

describe("computeOutputHash", () => {
  it("is the SHA-256 of the output, hex-encoded", () => {
    // FIPS 180-2 test vector for "abc"
    expect(computeOutputHash("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("tells apart outputs a 32-bit string hash maps to one value", () => {
    // "Aa" and "BB" collide under a 31-multiplier 32-bit hash
    expect(computeOutputHash("Aa")).not.toBe(computeOutputHash("BB"));
  });
});

describe("verifyReproducibility", () => {
  it("reports two different outputs as not reproducible", () => {
    expect(verifyReproducibility(["Aa", "BB"]).reproducible).toBe(false);
  });

  it("reports identical outputs as reproducible", () => {
    expect(verifyReproducibility(["same", "same"]).reproducible).toBe(true);
  });
});
