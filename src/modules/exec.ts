import { execFile } from "node:child_process";

/**
 * Budget for an external CLI that may reach the network (`gh api`, `az repos`).
 * Long enough for a real API round trip, short enough that an unauthenticated
 * or wedged CLI cannot hold a `spell doctor` run open indefinitely.
 */
export const EXTERNAL_CLI_TIMEOUT_MS = 10_000;

export interface ExecResult {
  stdout: string;
  stderr: string;
}

/**
 * Runs a child process under a hard timeout, with stdin closed.
 *
 * Mirrors the option set `runGit` already uses (src/modules/git.ts) minus
 * git's own environment, rather than inventing a second mechanism: Node's
 * native `timeout` instead of an AbortController, SIGTERM so a POSIX child
 * can still clean up after itself, `windowsHide` so no console window
 * flashes, and stdin ended immediately so a child that reads it gets EOF
 * instead of blocking on an open, unwritten pipe (EF-20).
 *
 * A timed-out child rejects with Node's own error carrying `killed: true`;
 * callers that only care whether a command answered can treat every rejection
 * the same way.
 *
 * The callers are the `gh` and `az` invocations behind `spell doctor`'s
 * platform-policy checks, which reach the network and previously had no
 * timeout at all -- an unauthenticated or wedged CLI could hold a doctor run
 * open with nothing to stop it.
 */
export function execFileWithTimeout(
  file: string,
  args: string[],
  timeoutMs: number,
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      file,
      args,
      {
        timeout: timeoutMs,
        killSignal: "SIGTERM",
        windowsHide: true,
        encoding: "utf8",
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      },
    );
    child.stdin?.end();
  });
}
