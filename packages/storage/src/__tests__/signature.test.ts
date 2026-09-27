/**
 * verifyCommitSigner checks a commit's signature only against the Approval
 * Policy's keys (criterion 7.3), and the engine binds the signer to the
 * approving identity. Keys are throwaway keys generated per run inside
 * os.tmpdir(); no key material is committed.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ApprovalPolicy } from "@vellum/protocol";
import { signerIsApprovers } from "@vellum/engine";
import { sshPublicKeyFingerprint, verifyCommitSigner } from "../signature.ts";
import { toApprovalPolicy } from "../policy.ts";
import type { ConsumerConfiguration } from "../domain/policy/types.ts";

function has(command: string, args: readonly string[]): boolean {
  try {
    execFileSync(command, [...args], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const HAS_SSH_KEYGEN = has("ssh-keygen", ["-?"]) || has("which", ["ssh-keygen"]);
const HAS_GPG = has("gpg", ["--version"]);
if (!HAS_SSH_KEYGEN)
  console.warn("signature.test: SKIPPING SSH cases — ssh-keygen is not installed");
if (!HAS_GPG) console.warn("signature.test: SKIPPING GPG cases — gpg is not installed");

/** git with an isolated config: no global or system settings leak in. */
function git(repo: string, args: readonly string[], env: NodeJS.ProcessEnv = {}): string {
  return execFileSync("git", [...args], {
    cwd: repo,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: join(repo, "..", "gitconfig"),
      GIT_CONFIG_NOSYSTEM: "1",
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function newRepo(root: string): string {
  const repo = join(root, "repo");
  writeFileSync(join(root, "gitconfig"), "");
  execFileSync("git", ["init", "-q", repo]);
  git(repo, ["config", "user.name", "Alice"]);
  git(repo, ["config", "user.email", "alice@example.com"]);
  return repo;
}

function head(repo: string): string {
  return git(repo, ["rev-parse", "HEAD"]).trim();
}

function config(approvers: ConsumerConfiguration["approval"]["approvers"]): ConsumerConfiguration {
  return {
    schema_version: "1.0",
    repository: "test",
    approval: {
      schema_version: "1.0",
      approvers,
      requirements: { standard: { count: 1 } },
    },
  };
}

describe.skipIf(!HAS_SSH_KEYGEN)("SSH-signed Approval Signals", () => {
  let root: string;
  let repo: string;
  let policy: ApprovalPolicy;
  const key = (name: string) => join(root, name);

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "vellum-ssh-"));
    for (const name of ["alice", "bob", "mallory"]) {
      execFileSync("ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-C", name, "-f", key(name)]);
    }
    repo = newRepo(root);
    const pub = (name: string) => readFileSync(`${key(name)}.pub`, "utf8").trim();
    policy = toApprovalPolicy(
      config([
        {
          email: "alice@example.com",
          authorised_for: ["standard"],
          keys: [
            {
              type: "ssh",
              fingerprint: sshPublicKeyFingerprint(pub("alice"))!,
              public_key: pub("alice"),
            },
          ],
        },
        {
          email: "bob@example.com",
          authorised_for: ["standard"],
          keys: [
            {
              type: "ssh",
              fingerprint: sshPublicKeyFingerprint(pub("bob"))!,
              public_key: pub("bob"),
            },
          ],
        },
      ]),
    );
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function commitSignedBy(name: string, message: string): string {
    git(repo, [
      "-c",
      "gpg.format=ssh",
      "-c",
      `user.signingkey=${key(name)}`,
      "commit",
      "-q",
      "-S",
      "--allow-empty",
      "-m",
      message,
    ]);
    return head(repo);
  }

  it("fingerprints a public key as ssh-keygen does", () => {
    const printed = execFileSync("ssh-keygen", ["-lf", `${key("alice")}.pub`], {
      encoding: "utf8",
    });
    expect(printed.split(" ")[1]).toBe(
      sshPublicKeyFingerprint(readFileSync(`${key("alice")}.pub`, "utf8")),
    );
  });

  it("names the policy key that signed, and the engine binds it to that approver", () => {
    const sha = commitSignedBy("alice", "approve: requirements");
    const check = verifyCommitSigner(repo, sha, policy);
    expect(check.kind).toBe("verified");
    if (check.kind !== "verified") return;
    expect(check.signer).toEqual({
      type: "ssh",
      fingerprint: policy.identities[0]!.keys[0]!.fingerprint,
    });
    expect(signerIsApprovers(policy, "alice@example.com", check.signer)).toBe(true);
  });

  it("does not let one approver's key count for another approver", () => {
    const sha = commitSignedBy("bob", "approve: requirements");
    const check = verifyCommitSigner(repo, sha, policy);
    expect(check.kind).toBe("verified");
    if (check.kind !== "verified") return;
    expect(signerIsApprovers(policy, "bob@example.com", check.signer)).toBe(true);
    expect(signerIsApprovers(policy, "alice@example.com", check.signer)).toBe(false);
  });

  it("rejects a key the policy does not list, even one the host's git trusts", () => {
    const sha = commitSignedBy("mallory", "approve: requirements");
    // The host trusts mallory for alice's email; the policy does not list her key.
    const hostAllowed = join(root, "host_allowed_signers");
    writeFileSync(
      hostAllowed,
      `alice@example.com namespaces="git" ${readFileSync(`${key("mallory")}.pub`, "utf8")}`,
    );
    git(repo, ["config", "gpg.ssh.allowedSignersFile", hostAllowed]);
    expect(git(repo, ["log", "-1", "--format=%G?", sha]).trim()).toBe("G");

    const check = verifyCommitSigner(repo, sha, policy);
    expect(check.kind).toBe("unverified");
    git(repo, ["config", "--unset", "gpg.ssh.allowedSignersFile"]);
  });

  it("reports an unsigned commit as unsigned", () => {
    git(repo, [
      "-c",
      "commit.gpgsign=false",
      "commit",
      "-q",
      "--allow-empty",
      "-m",
      "no signature",
    ]);
    expect(verifyCommitSigner(repo, head(repo), policy)).toEqual({ kind: "unsigned" });
  });

  it("refuses a policy whose SSH fingerprint does not match its public key", () => {
    const pub = readFileSync(`${key("alice")}.pub`, "utf8").trim();
    const bobFingerprint = sshPublicKeyFingerprint(readFileSync(`${key("bob")}.pub`, "utf8"))!;
    expect(() =>
      toApprovalPolicy(
        config([
          {
            email: "alice@example.com",
            authorised_for: ["standard"],
            keys: [{ type: "ssh", fingerprint: bobFingerprint, public_key: pub }],
          },
        ]),
      ),
    ).toThrow(expect.objectContaining({ code: "POLICY_INVALID" }));
  });

  it("refuses a policy key with no public key", () => {
    expect(() =>
      toApprovalPolicy(
        config([
          {
            email: "alice@example.com",
            authorised_for: ["standard"],
            key_type: "ssh",
            key_fingerprint: "SHA256:x",
          },
        ]),
      ),
    ).toThrow(expect.objectContaining({ code: "POLICY_INVALID" }));
  });
});

describe.skipIf(!HAS_GPG)("GPG-signed Approval Signals", () => {
  let root: string;
  let repo: string;
  let signingHome: string;
  let aliceFingerprint: string;
  let malloryFingerprint: string;
  let policy: ApprovalPolicy;

  function gpg(args: readonly string[]): string {
    return execFileSync("gpg", ["--batch", "--quiet", ...args], {
      encoding: "utf8",
      env: { ...process.env, GNUPGHOME: signingHome },
      stdio: ["ignore", "pipe", "ignore"],
    });
  }

  function fingerprintOf(uid: string): string {
    const line = gpg(["--with-colons", "--list-keys", uid])
      .split("\n")
      .find((l) => l.startsWith("fpr:"));
    return line!.split(":")[9]!;
  }

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "vellum-gpg-"));
    // A short path: the gpg-agent socket lives in GNUPGHOME.
    signingHome = mkdtempSync(join(tmpdir(), "vg-"));
    for (const uid of ["Alice <alice@example.com>", "Mallory <mallory@example.com>"]) {
      gpg(["--passphrase", "", "--quick-gen-key", uid, "ed25519", "sign", "never"]);
    }
    aliceFingerprint = fingerprintOf("alice@example.com");
    malloryFingerprint = fingerprintOf("mallory@example.com");
    repo = newRepo(root);
    policy = toApprovalPolicy(
      config([
        {
          email: "alice@example.com",
          authorised_for: ["standard"],
          keys: [
            {
              type: "gpg",
              fingerprint: aliceFingerprint,
              public_key: gpg(["--armor", "--export", aliceFingerprint]),
            },
          ],
        },
      ]),
    );
  }, 60_000);

  afterAll(() => {
    try {
      execFileSync("gpgconf", ["--kill", "all"], {
        env: { ...process.env, GNUPGHOME: signingHome },
        stdio: "ignore",
      });
    } catch {
      // No agent to stop.
    }
    rmSync(signingHome, { recursive: true, force: true });
    rmSync(root, { recursive: true, force: true });
  });

  // Each GPG case signs a commit through gpg-agent and verifies it by importing
  // the policy's keys into a fresh temporary keyring — several gpg process
  // starts and a key import per test. On a loaded machine that alone has
  // exceeded vitest's 5 s default, so each case gets the budget the keygen in
  // beforeAll already has reason to need. The assertions are unchanged.
  const GPG_TEST_TIMEOUT_MS = 30_000;

  function commitSignedBy(fingerprint: string): string {
    git(
      repo,
      [
        "-c",
        `user.signingkey=${fingerprint}`,
        "commit",
        "-q",
        "-S",
        "--allow-empty",
        "-m",
        "approve",
      ],
      { GNUPGHOME: signingHome },
    );
    return head(repo);
  }

  it("names the policy key that signed", () => {
    const check = verifyCommitSigner(repo, commitSignedBy(aliceFingerprint), policy);
    expect(check.kind).toBe("verified");
    if (check.kind !== "verified") return;
    expect(check.signer.type).toBe("gpg");
    expect(signerIsApprovers(policy, "alice@example.com", check.signer)).toBe(true);
  }, GPG_TEST_TIMEOUT_MS);

  it("rejects a key the host keyring holds but the policy does not list", () => {
    const sha = commitSignedBy(malloryFingerprint);
    // The signing host's keyring verifies it; the policy's keys do not.
    expect(
      git(repo, ["log", "-1", "--format=%G?", sha], { GNUPGHOME: signingHome }).trim(),
    ).toMatch(/[GU]/);
    expect(verifyCommitSigner(repo, sha, policy).kind).toBe("unverified");
  }, GPG_TEST_TIMEOUT_MS);
});
