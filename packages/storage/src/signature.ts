/**
 * @vellum/storage — Approval Signal signature verification
 *
 * Establishes which key signed a commit, checking the signature ONLY against
 * the public keys an Approval Policy lists (criterion 7.3). The verifying
 * host's own trust — its GPG keyring, its `gpg.ssh.allowedSignersFile` — is
 * never consulted, so "some key this machine trusts signed it" can never
 * pass for "an Authorised Approver signed it".
 *
 * - SSH: a temporary allowed-signers file holding each policy SSH key with
 *   its identity as principal is passed to git; only a `G` (good, principal
 *   found) result names a signer.
 * - GPG: a temporary GNUPGHOME into which only the policy's GPG public keys
 *   are imported; `G` or `U` (good signature; ownertrust is not the policy's
 *   concern) names a signer.
 *
 * The engine then decides whether that signer is a key of the approving
 * identity (`signerIsApprovers`).
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ApprovalPolicy, CommitSigner, SigningKeyType } from "@vellum/protocol";

/** What checking a commit's signature against the policy's keys found. */
export type CommitSignatureCheck =
  /** The commit carries no signature. */
  | { readonly kind: "unsigned" }
  /** A signature is present but did not verify against any policy key. */
  | { readonly kind: "unverified"; readonly format: SigningKeyType; readonly reason: string }
  /** The signature verified against a policy key. */
  | { readonly kind: "verified"; readonly signer: CommitSigner };

/**
 * The OpenSSH fingerprint (`SHA256:<base64, unpadded>`) of a public key line
 * such as `ssh-ed25519 AAAA… comment`; null when the line is not one.
 */
export function sshPublicKeyFingerprint(publicKey: string): string | null {
  const blob = publicKey.trim().split(/\s+/)[1];
  if (blob === undefined || !/^[A-Za-z0-9+/]+={0,2}$/.test(blob)) return null;
  const digest = createHash("sha256").update(Buffer.from(blob, "base64")).digest("base64");
  return `SHA256:${digest.replace(/=+$/, "")}`;
}

/** Which signature format a raw commit object carries, if any. */
function signatureFormat(workingDir: string, sha: string): SigningKeyType | null {
  const raw = execFileSync("git", ["cat-file", "commit", sha], {
    cwd: workingDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const header = raw.split("\n\n")[0] ?? "";
  const sig = /^gpgsig(?:-sha256)? (.*)$/m.exec(header)?.[1] ?? "";
  if (sig.includes("BEGIN SSH SIGNATURE")) return "ssh";
  if (sig.includes("BEGIN PGP SIGNATURE")) return "gpg";
  return null;
}

/**
 * Check `sha`'s signature against the public keys `policy` lists. Throws
 * only when `sha` is not a commit in `workingDir`.
 */
export function verifyCommitSigner(
  workingDir: string,
  sha: string,
  policy: ApprovalPolicy,
): CommitSignatureCheck {
  const format = signatureFormat(workingDir, sha);
  if (format === null) return { kind: "unsigned" };

  const keys = policy.identities.flatMap((identity) =>
    identity.keys
      .filter((key) => key.type === format)
      .map((key) => ({ identity: identity.identity, key })),
  );
  if (keys.length === 0) {
    return {
      kind: "unverified",
      format,
      reason: `the Approval Policy lists no ${format.toUpperCase()} key`,
    };
  }

  const scratch = mkdtempSync(join(tmpdir(), "vellum-sig-"));
  try {
    return format === "ssh"
      ? verifySsh(workingDir, sha, scratch, keys)
      : verifyGpg(workingDir, sha, scratch, keys);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

type PolicyKey = {
  readonly identity: string;
  readonly key: { readonly fingerprint: string; readonly publicKey: string };
};

function verifySsh(
  workingDir: string,
  sha: string,
  scratch: string,
  keys: readonly PolicyKey[],
): CommitSignatureCheck {
  const allowed = join(scratch, "allowed_signers");
  const lines = keys.map(
    ({ identity, key }) => `${identity.trim()} namespaces="git" ${key.publicKey.trim()}`,
  );
  writeFileSync(allowed, `${lines.join("\n")}\n`);

  const [status = "", fingerprint = ""] = gitLogFormat(
    workingDir,
    sha,
    ["-c", `gpg.ssh.allowedSignersFile=${allowed}`],
    {},
  );
  if (status !== "G" || fingerprint === "") {
    return {
      kind: "unverified",
      format: "ssh",
      reason: `SSH signature did not verify against a policy key (git status ${status || "?"})`,
    };
  }
  return { kind: "verified", signer: { type: "ssh", fingerprint } };
}

function verifyGpg(
  workingDir: string,
  sha: string,
  scratch: string,
  keys: readonly PolicyKey[],
): CommitSignatureCheck {
  const home = join(scratch, "gnupg");
  // Under os.tmpdir() the gpg-agent socket path stays short enough.
  mkdirSync(home, { mode: 0o700 });
  const env = { ...process.env, GNUPGHOME: home };
  try {
    for (const { key } of keys) {
      const file = join(scratch, "key.asc");
      writeFileSync(file, key.publicKey);
      execFileSync("gpg", ["--batch", "--quiet", "--import", file], {
        env,
        stdio: ["ignore", "ignore", "ignore"],
      });
    }
  } catch (error) {
    return {
      kind: "unverified",
      format: "gpg",
      reason: `could not load the policy's GPG keys: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`,
    };
  }

  try {
    const [status = "", fingerprint = "", primary = ""] = gitLogFormat(workingDir, sha, [], env);
    if ((status !== "G" && status !== "U") || fingerprint === "") {
      return {
        kind: "unverified",
        format: "gpg",
        reason: `GPG signature did not verify against a policy key (git status ${status || "?"})`,
      };
    }
    return {
      kind: "verified",
      signer: {
        type: "gpg",
        fingerprint,
        ...(primary !== "" && primary !== fingerprint ? { primaryFingerprint: primary } : {}),
      },
    };
  } finally {
    try {
      execFileSync("gpgconf", ["--kill", "all"], { env, stdio: "ignore" });
    } catch {
      // No agent was started, or gpgconf is absent: nothing to stop.
    }
  }
}

/** `%G?`, `%GF`, `%GP` of one commit, with extra git config and environment. */
function gitLogFormat(
  workingDir: string,
  sha: string,
  config: readonly string[],
  env: NodeJS.ProcessEnv,
): string[] {
  try {
    const out = execFileSync(
      "git",
      [...config, "log", "-1", "--no-show-signature", "--format=%G?%x00%GF%x00%GP", sha],
      {
        cwd: workingDir,
        encoding: "utf8",
        env: Object.keys(env).length === 0 ? process.env : env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    return out.replace(/\n$/, "").split("\0");
  } catch {
    return [];
  }
}
