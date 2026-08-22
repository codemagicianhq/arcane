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
 * EF-20: thrown when a `git` subprocess exceeds its runGit-assigned timeout
 * and Node reports the resulting kill via `error.killed`. Note this reflects
 * "the child was killed by a signal Node sent it," which today only ever
 * happens through runGit's own timeout, since no caller retains the
 * underlying ChildProcess to kill it independently -- if a future caller
 * gains that ability, `error.killed` alone would no longer distinguish
 * runGit's timeout from an external kill of the same handle.
 */
export class GitTimeoutError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "GitTimeoutError";
  }
}

const NETWORK_SUBCOMMANDS = new Set(["fetch", "pull", "push", "clone", "ls-remote", "send-email"]);

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
  "restore",
  "submodule",
  "sparse-checkout",
  "maintenance",
  "notes",
]);

// These subcommands can be read-only (`branch --list`, `config --get`) or
// mutating (`branch -m`, `config user.name x`) depending on flags. Classified
// as "write" -- the safer over-estimate: a read given write's longer timeout
// just waits a little longer, while a write given read's shorter timeout
// risks being killed mid-operation.
const AMBIGUOUS_AS_WRITE = new Set(["branch", "config", "remote", "worktree"]);

// Known read-only subcommands get the fast 15s budget explicitly. Anything
// NOT in this list, NOT in WRITE_SUBCOMMANDS/AMBIGUOUS_AS_WRITE, and NOT in
// NETWORK_SUBCOMMANDS is a subcommand this module doesn't recognize at all --
// that case defaults to "write" (see classifyGitCommand), the safer
// over-estimate for a genuinely unknown operation.
const READ_SUBCOMMANDS = new Set([
  "status",
  "rev-parse",
  "log",
  "diff",
  "show",
  "describe",
  "cat-file",
  "ls-files",
  "ls-tree",
  "symbolic-ref",
  "merge-base",
  "blame",
  "shortlog",
  "grep",
  "reflog",
  "diff-tree",
  "rev-list",
  "name-rev",
  "count-objects",
  "verify-commit",
  "verify-tag",
  "help",
  "version",
]);

// Global options that take their value as a SEPARATE following token (not
// `--opt=value`). Without skipping the value too, `args.find(a =>
// !a.startsWith("-"))` would grab the value itself (e.g. "user.name=x" from
// `-c user.name=x commit`) and misclassify the real subcommand that follows.
const GLOBAL_FLAGS_WITH_SEPARATE_VALUE = new Set(["-c", "-C"]);

const DEFAULT_TIMEOUTS_MS: Record<GitCommandClass, number> = {
  read: 15_000,
  write: 30_000,
  network: 120_000,
};

/**
 * Classify a git invocation by its first real subcommand token, skipping any
 * leading global flags (and, for `-c`/`-C`, their separate-token values) to
 * find it. Exported for tests.
 */
export function classifyGitCommand(args: string[]): GitCommandClass {
  let subcommand: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (GLOBAL_FLAGS_WITH_SEPARATE_VALUE.has(arg)) {
      i++; // skip this flag's value token too
      continue;
    }
    if (arg.startsWith("-")) continue;
    subcommand = arg;
    break;
  }
  if (!subcommand) return "read";
  if (NETWORK_SUBCOMMANDS.has(subcommand)) return "network";
  if (WRITE_SUBCOMMANDS.has(subcommand) || AMBIGUOUS_AS_WRITE.has(subcommand)) return "write";
  if (READ_SUBCOMMANDS.has(subcommand)) return "read";
  // A subcommand this module doesn't recognize at all: default to "write"
  // (the safer over-estimate) rather than "read" -- see READ_SUBCOMMANDS.
  return "write";
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
  // Falls back to the "write" budget if commandClass ever reaches here as
  // something outside the GitCommandClass union (only reachable from an
  // untyped caller) -- an undefined timeoutMs would mean NO timeout at all,
  // silently defeating the one guarantee this module exists to provide.
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUTS_MS[commandClass] ?? DEFAULT_TIMEOUTS_MS.write;

  return new Promise((resolve, reject) => {
    const child = execFile(
      "git",
      args,
      {
        cwd,
        env: buildGitEnv(),
        timeout: timeoutMs,
        // SIGTERM (Node's default) rather than SIGKILL: gives git a chance
        // to run its own cleanup on POSIX, relevant to EF-20's own concern
        // about a killed operation leaving refs/locks in an uncertain state.
        // Moot on Windows -- Node docs: both map to an abrupt TerminateProcess
        // there -- but this module isn't Windows-gated.
        killSignal: "SIGTERM",
        windowsHide: true,
        encoding: "utf8",
      },
      (error, stdout, stderr) => {
        if (error) {
          if (error.killed) {
            reject(
              new GitTimeoutError(
                // NOTE: embeds the raw args, including any secrets a future
                // network-class caller might pass (e.g. a credentialed
                // clone URL). No current caller does; redact before one does.
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
