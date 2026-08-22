import { execFile } from "node:child_process";

export type GitRepositoryState =
  | { status: "ready"; uncommittedChanges: number }
  | { status: "not-repository" }
  | { status: "no-commits" };

export type GitCommandClass = "read" | "write" | "network";

export interface RunGitOptions {
  /** Override auto-classification from the subcommand. */
  commandClass?: GitCommandClass;
  /** Override the command class's default timeout, in milliseconds. */
  timeoutMs?: number;
}

export interface GitResult {
  stdout: string;
  stderr: string;
}

/**
 * EF-20: thrown when a `git` subprocess is killed by runGit's own timeout,
 * distinguishing "git hung and we cut it off" from any other subprocess
 * failure (nonzero exit, missing binary, etc).
 */
export class GitTimeoutError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "GitTimeoutError";
  }
}

const NETWORK_SUBCOMMANDS = new Set(["fetch", "pull", "push", "clone", "ls-remote"]);

const WRITE_SUBCOMMANDS = new Set([
  "init",
  "commit",
  "add",
  "checkout",
  "switch",
  "merge",
  "rebase",
  "reset",
  "tag",
  "mv",
  "rm",
  "cherry-pick",
  "revert",
  "stash",
  "apply",
  "am",
]);

// These subcommands can be read-only (`branch --list`, `config --get`) or
// mutating (`branch -m`, `config user.name x`) depending on flags. Classified
// as "write" -- the safer over-estimate: a read given write's longer timeout
// just waits a little longer, while a write given read's shorter timeout
// risks being killed mid-operation.
const AMBIGUOUS_AS_WRITE = new Set(["branch", "config", "remote", "worktree"]);

const DEFAULT_TIMEOUTS_MS: Record<GitCommandClass, number> = {
  read: 15_000,
  write: 30_000,
  network: 120_000,
};

/** Classify a git invocation by its first non-flag argument. Exported for tests. */
export function classifyGitCommand(args: string[]): GitCommandClass {
  const subcommand = args.find((arg) => !arg.startsWith("-"));
  if (!subcommand) return "read";
  if (NETWORK_SUBCOMMANDS.has(subcommand)) return "network";
  if (WRITE_SUBCOMMANDS.has(subcommand) || AMBIGUOUS_AS_WRITE.has(subcommand)) return "write";
  return "read";
}

/**
 * EF-20/EF-13: the non-interactive execution environment applied to every
 * git invocation. GIT_TERMINAL_PROMPT and GCM_INTERACTIVE suppress credential
 * and terminal prompts; GIT_OPTIONAL_LOCKS disables git's speculative index
 * lock during `status` (git-config(1): "core.optionalLocks" affects only
 * status/update-index, so this is safe to apply blanket rather than per
 * command class) -- the mitigation for EF-13's stranded-lock report on
 * filesystems that reject unlink. Exported for tests.
 */
export function buildGitEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    GIT_TERMINAL_PROMPT: "0",
    GCM_INTERACTIVE: "Never",
    GIT_OPTIONAL_LOCKS: "0",
  };
}

/**
 * Single chokepoint for every production `git` invocation. Closes stdin
 * immediately (EF-20: an interactive prompt reading from stdin gets instant
 * EOF instead of hanging on an open, unwritten pipe) and enforces a
 * command-class-scoped timeout (EF-20: no git operation can block an
 * autonomous session indefinitely with no completion signal).
 */
export function runGit(cwd: string, args: string[], options: RunGitOptions = {}): Promise<GitResult> {
  const commandClass = options.commandClass ?? classifyGitCommand(args);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUTS_MS[commandClass];

  return new Promise((resolve, reject) => {
    const child = execFile(
      "git",
      args,
      {
        cwd,
        env: buildGitEnv(),
        timeout: timeoutMs,
        killSignal: "SIGKILL",
        windowsHide: true,
        encoding: "utf8",
      },
      (error, stdout, stderr) => {
        if (error) {
          if (error.killed) {
            reject(
              new GitTimeoutError(
                `git ${args.join(" ")} timed out after ${timeoutMs}ms (class: ${commandClass})`,
                { cause: error },
              ),
            );
            return;
          }
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      },
    );
    // EF-20: never leave stdin as an open, unread pipe -- see module doc.
    child.stdin?.end();
  });
}

/**
 * Returns the repository state required before a destructive managed update.
 */
export async function inspectGitRepository(cwd: string): Promise<GitRepositoryState> {
  try {
    const { stdout } = await runGit(cwd, ["rev-parse", "--is-inside-work-tree"]);
    if (stdout.trim() !== "true") {
      return { status: "not-repository" };
    }
  } catch {
    return { status: "not-repository" };
  }

  try {
    await runGit(cwd, ["rev-parse", "--verify", "HEAD"]);
  } catch {
    return { status: "no-commits" };
  }

  const { stdout } = await runGit(cwd, ["status", "--porcelain", "-uall"]);
  const lines = stdout.trim();
  return {
    status: "ready",
    uncommittedChanges: lines.length === 0 ? 0 : lines.split("\n").length,
  };
}

/**
 * Returns the number of uncommitted changes in the working tree, or 0
 * if the directory is not a git repo or git is not installed.
 */
export async function countUncommittedChanges(cwd: string): Promise<number> {
  try {
    const { stdout } = await runGit(cwd, ["status", "--porcelain", "-uall"]);
    const lines = stdout.trim();
    return lines.length === 0 ? 0 : lines.split("\n").length;
  } catch {
    return 0;
  }
}
