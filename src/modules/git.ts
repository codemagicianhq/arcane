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
  "show-ref",
  "for-each-ref",
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

export interface UnbornBranchCorrection {
  corrected: boolean;
  from?: string;
  to: "main";
  /**
   * Set when the correction was declined because the target ref could not be
   * read (a broken/unreadable `refs/heads/main`) rather than because it was
   * absent or already healthy. Callers should surface this: the repo has a
   * real integrity problem the operator will want to know about, but it is
   * not severe enough to abort an install over a cosmetic branch rename.
   */
  blockedReason?: "target-unreadable";
}

/**
 * EF-05: on an unborn repository (git init has run, no commit yet) whose
 * HEAD currently targets exactly "master" -- the reported Git for Windows
 * system-default leak (init.defaultBranch=master at the system config
 * level) -- repoint it to "main" via `symbolic-ref`. Safe because no commit
 * objects exist yet to conflict with; equivalent to what `git init -b main`
 * does internally. Any OTHER branch name, including one an operator
 * deliberately chose, is left untouched -- this corrects the specific
 * reported default-leak, not a general "Arcane requires main" policy.
 * No-op (not corrected) if `cwd` isn't an unborn repo at all.
 */
export async function correctUnbornMasterDefault(cwd: string): Promise<UnbornBranchCorrection> {
  let current: string;
  try {
    const { stdout } = await runGit(cwd, ["symbolic-ref", "--short", "HEAD"]);
    current = stdout.trim();
  } catch {
    return { corrected: false, to: "main" };
  }

  if (current !== "master") {
    return { corrected: false, to: "main" };
  }

  // Verify unborn-ness internally rather than trusting the caller: on a
  // BORN repo already on "master", `symbolic-ref HEAD refs/heads/main`
  // would detach HEAD's branch pointer from its commit history without
  // moving any commits -- `main` would exist as an empty ref while every
  // real commit stays reachable only via the abandoned `master` ref. This
  // check is the same one `inspectGitRepository` uses to distinguish
  // "no-commits" from "ready".
  try {
    await runGit(cwd, ["rev-parse", "--verify", "HEAD"]);
    return { corrected: false, to: "main" }; // HEAD resolves -- repo is born, don't touch it
  } catch {
    // rev-parse --verify HEAD failing IS the unborn signal -- proceed.
  }

  // Also verify the TARGET doesn't already exist with real history.
  // Confirming the source is unborn is not sufficient: if `refs/heads/main`
  // already resolves (e.g. created earlier in this repo, or shared across
  // git worktrees -- refs/heads/* is shared while HEAD is per-worktree, so
  // an unborn "master" HEAD in one worktree can coexist with a fully born
  // "main" from another), repointing HEAD onto it would silently attach
  // whatever's currently staged/uncommitted on the unborn HEAD to main's
  // real commit history -- a history splice, not a safe unborn-HEAD
  // repoint, and the next `git commit` an operator runs would commit it.
  // Distinguishing "absent" from "unreadable" needs stdout/stderr, not an
  // exit code. Verified empirically against git 2.x -- BOTH `rev-parse
  // --verify` and `show-ref --verify --quiet` return the same nonzero status
  // for a corrupt ref as for a missing one (128 and 1 respectively), so
  // either one behind a bare catch reads "this branch is broken" as "this
  // branch does not exist" and repoints HEAD onto real history anyway.
  //
  // `for-each-ref` separates all three states cleanly (it exits 0 throughout):
  //   healthy  -> stdout = the object id,  stderr empty
  //   corrupt  -> stdout empty,            stderr "warning: ignoring broken ref ..."
  //   absent   -> stdout empty,            stderr empty
  // Only the third is safe to treat as absence.
  const mainRef = await runGit(cwd, ["for-each-ref", "--format=%(objectname)", "refs/heads/main"]);

  if (mainRef.stdout.trim() !== "") {
    return { corrected: false, to: "main" }; // main already exists -- don't touch it
  }

  if (mainRef.stderr.trim() !== "") {
    // Broken ref: it may still hold real history we cannot see. Fail closed
    // -- decline the correction, and tell the caller why so it can warn.
    return { corrected: false, to: "main", blockedReason: "target-unreadable" };
  }

  await runGit(cwd, ["symbolic-ref", "HEAD", "refs/heads/main"]);
  return { corrected: true, from: current, to: "main" };
}

export type PullRebaseResult =
  | { action: "set" }
  | { action: "already-set" }
  | { action: "explicit-false-preserved" };

/**
 * EF-32: ensure `pull.rebase` is set at the repository-LOCAL level so the
 * mandated rebase-and-fast-forward workflow (git-conventions.md) doesn't
 * silently depend on the operator's machine-wide default (Git for Windows
 * ships pull.rebase=false at the system level). Distinguishes "unset
 * locally" (safe to set -- it was only ever inheriting a machine default)
 * from "explicitly set locally, even to false" (never silently overridden
 * -- the caller is expected to surface this as a warning instead).
 */
export async function ensureLocalPullRebase(cwd: string): Promise<PullRebaseResult> {
  let rawLocalValue: string | undefined;
  try {
    const { stdout } = await runGit(cwd, ["config", "--local", "--get", "pull.rebase"]);
    rawLocalValue = stdout.trim();
  } catch {
    rawLocalValue = undefined; // nothing set locally at all (may be inherited from global/system)
  }

  if (rawLocalValue === undefined) {
    await runGit(cwd, ["config", "--local", "pull.rebase", "true"]);
    return { action: "set" };
  }

  // Something IS set locally. Determine whether it's a falsy boolean via
  // git's own boolean parser (`--type=bool` normalizes any of git's valid
  // spellings -- true/yes/on/1 and false/no/off/0 -- to canonical
  // "true"/"false"), rather than hand-matching the literal string "false"
  // and missing every other valid spelling. A value `--type=bool` can't
  // coerce (e.g. "merges" or "interactive" -- both valid, deliberate
  // pull.rebase settings) means the operator explicitly chose something
  // else entirely; that's still an explicit local choice and must never be
  // overwritten, so it's treated the same as "already-set".
  try {
    const { stdout } = await runGit(cwd, ["config", "--local", "--type=bool", "--get", "pull.rebase"]);
    if (stdout.trim() === "false") {
      return { action: "explicit-false-preserved" };
    }
    return { action: "already-set" };
  } catch {
    return { action: "already-set" };
  }
}
