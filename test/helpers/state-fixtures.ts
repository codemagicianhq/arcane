import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runGit as fixtureGit, createFixtureDir } from "./git-fixture.js";

/**
 * Fixture repositories for the state export tests (features/state-export,
 * architecture "Testing Strategy"). Every git call goes through the hermetic
 * fixture runner (EF-34). Nothing here touches the network: upstreams are
 * bare repositories on disk.
 */

const AUTHOR_DATES = { authorDate: "2026-11-01T12:00:00Z", committerDate: "2026-11-01T12:00:00Z" };

/** `git init -b main` with a local identity; no commit yet. */
export function initRepo(dir: string): void {
  fixtureGit(dir, ["init", "-q", "-b", "main"]);
  fixtureGit(dir, ["config", "user.name", "Arcane Tests"]);
  fixtureGit(dir, ["config", "user.email", "arcane-tests@example.invalid"]);
  fixtureGit(dir, ["config", "commit.gpgsign", "false"]);
}

/** Writes `files` and commits them with a pinned date, so hashes are stable per fixture. */
export async function commitFiles(dir: string, message: string, files: Record<string, string>): Promise<void> {
  for (const [relativePath, content] of Object.entries(files)) {
    const target = join(dir, relativePath);
    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, content, "utf8");
  }
  fixtureGit(dir, ["add", "-A"]);
  fixtureGit(dir, ["commit", "-q", "-m", message], AUTHOR_DATES);
}

/** A fresh repository with one commit on `main` and no remote. */
export async function repoWithOneCommit(prefix: string): Promise<string> {
  const dir = await createFixtureDir(prefix);
  initRepo(dir);
  await commitFiles(dir, "test: seed", { "README.md": "# Fixture\n" });
  return dir;
}

export interface UpstreamOptions {
  /** Commits the fixture makes after the push, unpushed (ahead). */
  ahead: number;
  /** Commits another clone pushes to the bare upstream, then fetched (behind). */
  behind: number;
  /** The URL recorded for `origin`; defaults to the bare repository's path. */
  originUrl?: string;
}

/**
 * Gives `dir` a bare upstream under `parent`, pushes `main` with an upstream
 * set, then creates the requested ahead/behind divergence. When `originUrl`
 * is given, origin's URL is rewritten to it afterwards (for the
 * userinfo-stripping test), so the export reads that URL while the fixture
 * never fetched from anywhere but disk.
 */
export async function withUpstream(dir: string, parent: string, options: UpstreamOptions): Promise<void> {
  const bare = join(parent, "upstream.git");
  await mkdir(bare, { recursive: true });
  fixtureGit(bare, ["init", "-q", "--bare", "-b", "main"]);
  fixtureGit(dir, ["remote", "add", "origin", bare]);
  fixtureGit(dir, ["push", "-q", "-u", "origin", "main"]);

  if (options.behind > 0) {
    const other = join(parent, "other");
    fixtureGit(parent, ["clone", "-q", bare, other]);
    fixtureGit(other, ["config", "user.name", "Arcane Tests"]);
    fixtureGit(other, ["config", "user.email", "arcane-tests@example.invalid"]);
    fixtureGit(other, ["config", "commit.gpgsign", "false"]);
    for (let i = 1; i <= options.behind; i++) {
      await commitFiles(other, `test: upstream ${i}`, { [`upstream-${i}.txt`]: `${i}\n` });
    }
    fixtureGit(other, ["push", "-q", "origin", "main"]);
    fixtureGit(dir, ["fetch", "-q", "origin"]);
  }
  for (let i = 1; i <= options.ahead; i++) {
    await commitFiles(dir, `test: local ${i}`, { [`local-${i}.txt`]: `${i}\n` });
  }
  if (options.originUrl !== undefined) {
    fixtureGit(dir, ["remote", "set-url", "origin", options.originUrl]);
  }
}

/** Adds a linked worktree at `<parent>/<name>` on a new branch of that name. */
export function addWorktree(dir: string, parent: string, name: string): string {
  const path = join(parent, name);
  fixtureGit(dir, ["worktree", "add", "-q", "-b", name, path]);
  return path;
}

export function detachHead(dir: string): void {
  fixtureGit(dir, ["checkout", "-q", "--detach"]);
}
