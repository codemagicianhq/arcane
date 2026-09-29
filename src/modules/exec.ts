import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { win32 } from "node:path";

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
  options: { env?: NodeJS.ProcessEnv } = {},
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
        ...(options.env ? { env: { ...process.env, ...options.env } } : {}),
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

export interface AzureCliLaunch {
  file: string;
  prefixArgs: string[];
  env?: NodeJS.ProcessEnv;
}

export interface AzureCliProbes {
  platform: NodeJS.Platform;
  pathEnv: string | undefined;
  readText(path: string): string | undefined;
  exists(path: string): boolean;
}

function defaultProbes(): AzureCliProbes {
  return {
    platform: process.platform,
    pathEnv: process.env["PATH"] ?? process.env["Path"],
    readText: (path) => {
      try {
        return readFileSync(path, "utf8");
      } catch {
        return undefined;
      }
    },
    exists: (path) => existsSync(path),
  };
}

// The one launcher line the Azure CLI MSI writes: its own interpreter, isolated, running its own module.
const MSI_LAUNCHER_LINE = /^\s*"%~dp0\\\.\.\\python\.exe"\s+-IBm\s+azure\.cli\s+%\*\s*$/im;

/**
 * How to start the Azure CLI without any shell reading text that came from a git remote.
 *
 * Node cannot spawn `az.cmd` directly on Windows (EINVAL), and the usual cure, a shell, hands `&`, `|`, `"`
 * and `%VAR%` in a remote's project or repository name to `cmd.exe`. So on Windows this reads the MSI
 * launcher, and only when it is exactly the recognised one, runs the interpreter it points at directly with
 * the same arguments. Anything else resolves to `null` and the caller reports "could not query", never a
 * shell fallback. Elsewhere `az` is a plain executable and is launched by name.
 */
export function resolveAzureCli(probes: AzureCliProbes = defaultProbes()): AzureCliLaunch | null {
  if (probes.platform !== "win32") return { file: "az", prefixArgs: [] };

  for (const raw of (probes.pathEnv ?? "").split(";")) {
    const dir = raw.trim().replace(/^"(.*)"$/, "$1");
    if (!dir) continue;
    const launcher = probes.readText(win32.join(dir, "az.cmd"));
    if (launcher === undefined) continue;
    if (!MSI_LAUNCHER_LINE.test(launcher)) return null;
    const interpreter = win32.resolve(dir, "..", "python.exe");
    if (!probes.exists(interpreter)) return null;
    return { file: interpreter, prefixArgs: ["-IBm", "azure.cli"], env: { AZ_INSTALLER: "MSI" } };
  }
  return null;
}
