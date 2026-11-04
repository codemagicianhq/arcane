import { describe, it, expect, afterEach } from "vitest";
import { join } from "node:path";
import { GitTimeoutError, runGit } from "../src/modules/git.js";
import {
  collectGit,
  parseWorktreeList,
  remoteProvider,
  stripUserinfo,
  type RunGitFn,
} from "../src/modules/state/git.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { addWorktree, detachHead, initRepo, repoWithOneCommit, withUpstream } from "./helpers/state-fixtures.js";
import { HEAVY_TEST_TIMEOUT, VERY_HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";

const fixtures: string[] = [];

async function fixtureParent(prefix: string): Promise<string> {
  const dir = await createFixtureDir(prefix);
  fixtures.push(dir);
  return dir;
}

afterEach(async () => {
  for (const dir of fixtures.splice(0)) await removeFixtureDir(dir);
});

/** A runGit that times out on the first matching subcommand (and form), and runs everything else for real. */
function timingOutOn(subcommand: string, form?: string): RunGitFn {
  return async (cwd, args, options) => {
    if (args[0] === subcommand && (form === undefined || args[1] === form)) {
      throw new GitTimeoutError(`git ${args.join(" ")} timed out after 1ms (class: read)`);
    }
    return runGit(cwd, args, options);
  };
}

describe("remoteProvider / stripUserinfo (ST-04, ST-11)", () => {
  it("maps hosts to github, ado and other across URL forms", () => {
    expect(remoteProvider("https://github.com/ordovica/survey.git")).toBe("github");
    expect(remoteProvider("git@github.com:ordovica/survey.git")).toBe("github");
    expect(remoteProvider("ssh://git@github.com/ordovica/survey.git")).toBe("github");
    expect(remoteProvider("https://dev.azure.com/tidewright/platform/_git/repair")).toBe("ado");
    expect(remoteProvider("https://tidewright@dev.azure.com/tidewright/platform/_git/repair")).toBe("ado");
    expect(remoteProvider("git@ssh.dev.azure.com:v3/tidewright/platform/repair")).toBe("ado");
    expect(remoteProvider("https://tidewright.visualstudio.com/platform/_git/repair")).toBe("ado");
    expect(remoteProvider("https://gitlab.example/overshore/orbit.git")).toBe("other");
    expect(remoteProvider("/srv/git/orbit.git")).toBe("other");
  });

  it("strips userinfo from scheme URLs and leaves the scp-like account alone", () => {
    expect(stripUserinfo("https://user:secret-token@github.com/ordovica/survey.git")).toBe("https://github.com/ordovica/survey.git");
    expect(stripUserinfo("https://tidewright@dev.azure.com/tidewright/platform/_git/repair")).toBe("https://dev.azure.com/tidewright/platform/_git/repair");
    expect(stripUserinfo("git@github.com:ordovica/survey.git")).toBe("git@github.com:ordovica/survey.git");
    expect(stripUserinfo("https://github.com/ordovica/survey.git")).toBe("https://github.com/ordovica/survey.git");
  });
});

describe("parseWorktreeList", () => {
  it("reads porcelain blocks, strips refs/heads/, reports a detached worktree's branch as null and sorts by path", () => {
    const root = join("/", "r", "repo");
    const porcelain = [
      `worktree ${join("/", "r", "repo")}`,
      "HEAD 0123456789abcdef0123456789abcdef01234567",
      "branch refs/heads/main",
      "",
      `worktree ${join("/", "r", "wt-b")}`,
      "HEAD 0123456789abcdef0123456789abcdef01234567",
      "detached",
      "",
      `worktree ${join("/", "r", "wt-a")}`,
      "HEAD 0123456789abcdef0123456789abcdef01234567",
      "branch refs/heads/feature",
      "",
    ].join("\n");
    // Code-unit order: "." is a prefix of "../…", so the main worktree sorts first.
    expect(parseWorktreeList(porcelain, root)).toEqual([
      { path: ".", branch: "main" },
      { path: "../wt-a", branch: "feature" },
      { path: "../wt-b", branch: null },
    ]);
  });
});

describe("collectGit (ST-04)", () => {
  it("returns null with a warning outside a git repository", async () => {
    const dir = await fixtureParent("state-git-none");
    const result = await collectGit(dir, dir);
    expect(result.git).toBeNull();
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("not a git repository");
  }, HEAVY_TEST_TIMEOUT);

  it("reports a repository with no remote: branch main, trunk main, no upstream counts, one worktree", async () => {
    const dir = await fixtureParent("state-git-noremote");
    initRepo(dir);
    const { commitFiles } = await import("./helpers/state-fixtures.js");
    await commitFiles(dir, "test: seed", { "README.md": "# r\n", "TODO.md": "- [ ] x\n" });
    const result = await collectGit(dir, dir);
    expect(result.warnings).toEqual([]);
    expect(result.git).toEqual({
      branch: "main",
      detached: false,
      trunk: "main",
      ahead: null,
      behind: null,
      uncommitted: 0,
      remote: null,
      worktrees: [{ path: ".", branch: "main" }],
      pull_request: null,
    });
  }, HEAVY_TEST_TIMEOUT);

  it("reports a detached HEAD as the short commit id with detached true, and counts uncommitted changes", async () => {
    const dir = await fixtureParent("state-git-detached");
    initRepo(dir);
    const { commitFiles } = await import("./helpers/state-fixtures.js");
    await commitFiles(dir, "test: seed", { "README.md": "# r\n" });
    detachHead(dir);
    const { writeFile } = await import("node:fs/promises");
    await writeFile(join(dir, "dirty.txt"), "x\n", "utf8");
    await writeFile(join(dir, "README.md"), "changed\n", "utf8");
    const result = await collectGit(dir, dir);
    expect(result.warnings).toEqual([]);
    expect(result.git?.detached).toBe(true);
    expect(result.git?.branch).toMatch(/^[0-9a-f]{7,}$/);
    expect(result.git?.uncommitted).toBe(2);
    expect(result.git?.worktrees).toEqual([{ path: ".", branch: null }]);
  }, HEAVY_TEST_TIMEOUT);

  it("reports a second worktree, sorted by path, with its branch", async () => {
    const parent = await fixtureParent("state-git-wt");
    const dir = join(parent, "repo");
    await (await import("node:fs/promises")).mkdir(dir);
    initRepo(dir);
    const { commitFiles } = await import("./helpers/state-fixtures.js");
    await commitFiles(dir, "test: seed", { "README.md": "# r\n" });
    addWorktree(dir, parent, "wt-feature");
    const result = await collectGit(dir, dir);
    expect(result.warnings).toEqual([]);
    expect(result.git?.worktrees).toEqual([
      { path: ".", branch: "main" },
      { path: "../wt-feature", branch: "wt-feature" },
    ]);
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("reports ahead 3 / behind 2 against the upstream, the trunk from origin/HEAD, and a stripped remote URL", async () => {
    const parent = await fixtureParent("state-git-upstream");
    const dir = join(parent, "repo");
    await (await import("node:fs/promises")).mkdir(dir);
    initRepo(dir);
    const { commitFiles } = await import("./helpers/state-fixtures.js");
    await commitFiles(dir, "test: seed", { "README.md": "# r\n" });
    await withUpstream(dir, parent, {
      ahead: 3,
      behind: 2,
      originUrl: "https://ordovica:secret-token-value@github.com/ordovica/survey.git",
    });
    const result = await collectGit(dir, dir);
    expect(result.warnings).toEqual([]);
    expect(result.git?.ahead).toBe(3);
    expect(result.git?.behind).toBe(2);
    expect(result.git?.branch).toBe("main");
    expect(result.git?.trunk).toBe("main");
    expect(result.git?.remote).toEqual({ provider: "github", url: "https://github.com/ordovica/survey.git" });
    expect(JSON.stringify(result)).not.toContain("secret-token-value");
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("degrades one field to null with one warning when its read times out, and never throws", async () => {
    const dir = await repoWithOneCommit("state-git-timeout");
    fixtures.push(dir);

    const counts = await collectGit(dir, dir, { runGit: timingOutOn("rev-list") });
    expect(counts.git?.worktrees).toEqual([{ path: ".", branch: "main" }]);
    expect(counts.git?.uncommitted).toBe(0);
    // No upstream in this fixture, so rev-list never runs; the upstream probe is the one that can time out.
    expect(counts.warnings).toEqual([]);

    const upstream = await collectGit(dir, dir, { runGit: timingOutOn("rev-parse", "--abbrev-ref") });
    expect(upstream.git?.ahead).toBeNull();
    expect(upstream.warnings).toHaveLength(1);
    expect(upstream.warnings[0]).toContain("git.ahead/behind");

    const worktrees = await collectGit(dir, dir, { runGit: timingOutOn("worktree") });
    expect(worktrees.git?.worktrees).toBeNull();
    expect(worktrees.git?.branch).toBe("main");
    expect(worktrees.warnings).toHaveLength(1);
    expect(worktrees.warnings[0]).toContain("git.worktrees");

    const status = await collectGit(dir, dir, { runGit: timingOutOn("status") });
    expect(status.git?.uncommitted).toBeNull();
    expect(status.warnings).toHaveLength(1);
    expect(status.warnings[0]).toContain("git.uncommitted");

    const remotes = await collectGit(dir, dir, { runGit: timingOutOn("remote") });
    expect(remotes.git?.remote).toBeNull();
    expect(remotes.warnings).toHaveLength(1);
    expect(remotes.warnings[0]).toContain("git.remote");

    const head = await collectGit(dir, dir, { runGit: timingOutOn("symbolic-ref") });
    // symbolic-ref times out for HEAD and origin/HEAD alike: branch falls back to the short id, trunk to main.
    expect(head.git?.detached).toBe(true);
    expect(head.git?.trunk).toBe("main");

    const inside = await collectGit(dir, dir, { runGit: timingOutOn("rev-parse", "--is-inside-work-tree") });
    expect(inside.git).toBeNull();
    expect(inside.warnings[0]).toContain("timed out");
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("warns when HEAD cannot be read at all (unborn branch after a timeout on rev-parse)", async () => {
    const dir = await fixtureParent("state-git-unborn");
    initRepo(dir);
    const result = await collectGit(dir, dir);
    // An unborn main: symbolic-ref answers "main", nothing else is special.
    expect(result.git?.branch).toBe("main");
    expect(result.git?.trunk).toBeNull();
    const broken = await collectGit(dir, dir, { runGit: timingOutOn("symbolic-ref") });
    expect(broken.git?.branch).toBeNull();
    expect(broken.warnings.some((w) => w.includes("git.branch"))).toBe(true);
  }, HEAVY_TEST_TIMEOUT);
});
