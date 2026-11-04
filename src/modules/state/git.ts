/**
 * The git section (PRD ST-04, architecture D4). Every fact comes from
 * `runGit` with its per-call timeout; a read that times out or fails
 * unexpectedly yields null for its field and one `warnings[]` line, never a
 * non-zero exit (the EF-20 hazard: a Windows file lock must not hang the
 * export). A state that is simply absent -- no upstream, no remote, no
 * trunk, a detached HEAD -- is null without a warning, because it is an
 * answer, not a failure.
 *
 * The pull-request lookup is a network read and lives in `collectPullRequest`
 * (SE-11); `collectGit` always leaves `pull_request` null.
 */

import { resolveRealPath } from "../real-path.js";
import { runGit as defaultRunGit, type GitResult } from "../git.js";
import { toPosixRelative } from "./serialize.js";
import type { GitRemote, GitSection, GitWorktree, RemoteProvider } from "./types.js";

export type RunGitFn = (cwd: string, args: string[], options?: { commandClass?: "read" | "write" | "network" }) => Promise<GitResult>;

export interface CollectGitOptions {
  /** The git runner; tests inject one that times out on demand. */
  runGit?: RunGitFn;
}

export interface CollectGitResult {
  /** Null when `cwd` is not inside a git work tree. */
  git: GitSection | null;
  warnings: string[];
}

/** `github` for github.com, `ado` for dev.azure.com / *.visualstudio.com, `other` for everything else. */
export function remoteProvider(url: string): RemoteProvider {
  const host = remoteHost(url).toLowerCase();
  if (host === "github.com" || host.endsWith(".github.com")) return "github";
  if (host === "dev.azure.com" || host.endsWith(".dev.azure.com") || host.endsWith(".visualstudio.com")) return "ado";
  return "other";
}

function remoteHost(url: string): string {
  const scheme = /^[a-z][a-z0-9+.-]*:\/\/(?:[^@/]*@)?([^/:]+)/i.exec(url);
  if (scheme) return scheme[1];
  // scp-like: [user@]host:path
  const scp = /^(?:[^@/]+@)?([^:/]+):/.exec(url);
  return scp ? scp[1] : "";
}

/**
 * The URL without its userinfo. A token embedded as
 * `https://user:token@host/...` never reaches the document (ST-11). The
 * scp-like form's `git@` names the SSH account, not a credential, and is
 * kept.
 */
export function stripUserinfo(url: string): string {
  return url.replace(/^([a-z][a-z0-9+.-]*:\/\/)[^@/]*@/i, "$1");
}

/** Parses `git worktree list --porcelain` output into worktrees sorted by path relative to `root`. */
export function parseWorktreeList(porcelain: string, root: string): GitWorktree[] {
  const worktrees: GitWorktree[] = [];
  for (const block of porcelain.replace(/\r\n/g, "\n").split(/\n\n+/)) {
    const lines = block.split("\n").filter((line) => line.length > 0);
    const pathLine = lines.find((line) => line.startsWith("worktree "));
    if (!pathLine) continue;
    const branchLine = lines.find((line) => line.startsWith("branch "));
    const branch = branchLine ? branchLine.slice("branch ".length).replace(/^refs\/heads\//, "") : null;
    const absolute = resolveRealPath(pathLine.slice("worktree ".length));
    worktrees.push({ path: toPosixRelative(root, absolute), branch });
  }
  return worktrees.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

type Probe<T> = { ok: true; value: T } | { ok: false; error: unknown };

async function probe<T>(read: () => Promise<T>): Promise<Probe<T>> {
  try {
    return { ok: true, value: await read() };
  } catch (error) {
    return { ok: false, error };
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function collectGit(cwd: string, root: string, options: CollectGitOptions = {}): Promise<CollectGitResult> {
  const git = options.runGit ?? defaultRunGit;
  const warnings: string[] = [];

  const inside = await probe(() => git(cwd, ["rev-parse", "--is-inside-work-tree"]));
  if (!inside.ok || inside.value.stdout.trim() !== "true") {
    warnings.push(
      inside.ok
        ? "git: not a git repository; the git section is null"
        : `git: could not determine whether this is a git repository (${describe(inside.error)}); the git section is null`,
    );
    return { git: null, warnings };
  }

  // branch / detached
  let branch: string | null = null;
  let detached = false;
  const symbolic = await probe(() => git(cwd, ["symbolic-ref", "--short", "-q", "HEAD"]));
  if (symbolic.ok && symbolic.value.stdout.trim() !== "") {
    branch = symbolic.value.stdout.trim();
  } else {
    const head = await probe(() => git(cwd, ["rev-parse", "--short", "HEAD"]));
    if (head.ok) {
      branch = head.value.stdout.trim();
      detached = true;
    } else {
      warnings.push(`git.branch: HEAD could not be read (${describe(head.error)})`);
    }
  }

  // trunk
  let trunk: string | null = null;
  const originHead = await probe(() => git(cwd, ["symbolic-ref", "--short", "-q", "refs/remotes/origin/HEAD"]));
  if (originHead.ok && originHead.value.stdout.trim() !== "") {
    trunk = originHead.value.stdout.trim().replace(/^origin\//, "");
  } else {
    for (const candidate of ["main", "master"]) {
      const exists = await probe(() => git(cwd, ["rev-parse", "--verify", "--quiet", `refs/heads/${candidate}`]));
      if (exists.ok) {
        trunk = candidate;
        break;
      }
    }
  }

  // ahead / behind
  let ahead: number | null = null;
  let behind: number | null = null;
  const upstream = await probe(() => git(cwd, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]));
  if (upstream.ok) {
    const counts = await probe(() => git(cwd, ["rev-list", "--left-right", "--count", "@{upstream}...HEAD"]));
    if (counts.ok) {
      const [left, right] = counts.value.stdout.trim().split(/\s+/);
      behind = Number.parseInt(left, 10);
      ahead = Number.parseInt(right, 10);
      if (Number.isNaN(ahead) || Number.isNaN(behind)) {
        ahead = behind = null;
        warnings.push(`git.ahead/behind: unexpected rev-list output "${counts.value.stdout.trim()}"`);
      }
    } else {
      warnings.push(`git.ahead/behind: rev-list failed (${describe(counts.error)})`);
    }
  } else if (isTimeout(upstream.error)) {
    warnings.push(`git.ahead/behind: ${describe(upstream.error)}`);
  }

  // uncommitted: the same count `countUncommittedChanges` computes, but null
  // (with a warning) rather than 0 when the read fails, so a timeout is not
  // reported as a clean tree.
  let uncommitted: number | null = null;
  const status = await probe(() => git(cwd, ["status", "--porcelain", "-uall"]));
  if (status.ok) {
    const lines = status.value.stdout.trim();
    uncommitted = lines.length === 0 ? 0 : lines.split("\n").length;
  } else {
    warnings.push(`git.uncommitted: status failed (${describe(status.error)})`);
  }

  // remote
  let remote: GitRemote | null = null;
  const remotes = await probe(() => git(cwd, ["remote"], { commandClass: "read" }));
  if (!remotes.ok) {
    warnings.push(`git.remote: remote list failed (${describe(remotes.error)})`);
  } else if (remotes.value.stdout.split(/\r?\n/).includes("origin")) {
    const url = await probe(() => git(cwd, ["remote", "get-url", "origin"]));
    if (url.ok) {
      const raw = url.value.stdout.trim();
      remote = { provider: remoteProvider(raw), url: stripUserinfo(raw) };
    } else {
      warnings.push(`git.remote: remote get-url failed (${describe(url.error)})`);
    }
  }

  // worktrees
  let worktrees: GitWorktree[] | null = null;
  const list = await probe(() => git(cwd, ["worktree", "list", "--porcelain"]));
  if (list.ok) {
    worktrees = parseWorktreeList(list.value.stdout, root);
  } else {
    warnings.push(`git.worktrees: worktree list failed (${describe(list.error)})`);
  }

  return {
    git: { branch, detached, trunk, ahead, behind, uncommitted, remote, worktrees, pull_request: null },
    warnings,
  };
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && error.name === "GitTimeoutError";
}
