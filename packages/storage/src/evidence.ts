/**
 * @vellum/storage — Running a Verification Command (criterion 9.1)
 *
 * The Evidence Recorder runs the command itself; the caller never reports an
 * exit status. The output is captured to be hashed and to show its tail to
 * the person running the command — it is never written to the ledger
 * (criterion 9.3).
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";

/** What one run of a Verification Command produced. */
export interface VerificationRun {
  /** Exit status 0-255; 124 when stopped at the timeout, 125 when it could not start */
  readonly exitStatus: number;
  readonly timedOut: boolean;
  /** UTC ISO 8601 */
  readonly startedAt: string;
  /** UTC ISO 8601 */
  readonly finishedAt: string;
  readonly durationMs: number;
  /** SHA-256 of stdout followed by stderr */
  readonly outputSha256: string;
  /** The last bytes of stdout and stderr, for display only */
  readonly stdoutTail: string;
  readonly stderrTail: string;
}

/** Options for runVerificationCommand. */
export interface RunVerificationOptions {
  readonly cwd: string;
  /** Stop the command after this many milliseconds */
  readonly timeoutMs: number;
  /** Bytes of each stream kept for display */
  readonly tailBytes?: number;
}

/**
 * Run `command` through `/bin/sh -c` in `cwd`, wait for it, and report its
 * real exit status. A signal-terminated command reports 128 + signal number,
 * as a shell does.
 */
export function runVerificationCommand(
  command: string,
  options: RunVerificationOptions,
): Promise<VerificationRun> {
  const tailBytes = options.tailBytes ?? 4096;
  const started = Date.now();
  const startedAt = new Date(started).toISOString();

  return new Promise((resolve) => {
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let timedOut = false;
    let settled = false;

    const child = spawn("/bin/sh", ["-c", command], {
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
    });

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        // Kill the whole process group the shell started.
        if (child.pid !== undefined) process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    }, options.timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));

    const finish = (exitStatus: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const finished = Date.now();
      const out = Buffer.concat(stdout);
      const err = Buffer.concat(stderr);
      resolve({
        exitStatus: timedOut ? 124 : exitStatus,
        timedOut,
        startedAt,
        finishedAt: new Date(finished).toISOString(),
        durationMs: finished - started,
        outputSha256: createHash("sha256").update(out).update(err).digest("hex"),
        stdoutTail: out.subarray(Math.max(0, out.length - tailBytes)).toString("utf8"),
        stderrTail: err.subarray(Math.max(0, err.length - tailBytes)).toString("utf8"),
      });
    };

    child.on("error", () => finish(125));
    child.on("close", (code, signal) => {
      if (code !== null) finish(code & 0xff);
      else finish(128 + (signal ? signalNumber(signal) : 0));
    });
  });
}

function signalNumber(signal: NodeJS.Signals): number {
  const numbers: Partial<Record<NodeJS.Signals, number>> = {
    SIGHUP: 1,
    SIGINT: 2,
    SIGQUIT: 3,
    SIGKILL: 9,
    SIGTERM: 15,
  };
  return numbers[signal] ?? 0;
}
