import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { buildGitEnv, classifyGitCommand, runGit } from "../src/modules/git.js";
import { createFixtureDir, removeFixtureDir, runGit as fixtureGit } from "./helpers/git-fixture.js";

const tempDirs: string[] = [];

async function createTempDir() {
  const dir = await createFixtureDir("git-execution-contract-test");
  tempDirs.push(dir);
  return dir;
}

async function createCommittedRepo() {
  const dir = await createTempDir();
  fixtureGit(dir, ["init"]);
  fixtureGit(dir, ["config", "user.name", "Arcane Tests"]);
  fixtureGit(dir, ["config", "user.email", "arcane-tests@example.invalid"]);
  await fs.writeFile(join(dir, "tracked.txt"), "baseline");
  fixtureGit(dir, ["add", "-A"]);
  fixtureGit(dir, ["commit", "-m", "test: seed baseline"]);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => removeFixtureDir(dir)),
  );
});

describe("classifyGitCommand", () => {
  it("classifies known network subcommands", () => {
    expect(classifyGitCommand(["fetch", "origin"])).toBe("network");
    expect(classifyGitCommand(["push", "origin", "main"])).toBe("network");
    expect(classifyGitCommand(["clone", "url"])).toBe("network");
  });

  it("classifies known write subcommands", () => {
    expect(classifyGitCommand(["commit", "-m", "x"])).toBe("write");
    expect(classifyGitCommand(["init"])).toBe("write");
    expect(classifyGitCommand(["restore", "file.txt"])).toBe("write");
  });

  it("classifies ambiguous subcommands as write (the safer over-estimate)", () => {
    expect(classifyGitCommand(["branch", "--list"])).toBe("write");
    expect(classifyGitCommand(["branch", "-m", "old", "new"])).toBe("write");
    expect(classifyGitCommand(["config", "--get", "user.name"])).toBe("write");
  });

  it("classifies known read subcommands as read", () => {
    expect(classifyGitCommand(["status", "--porcelain"])).toBe("read");
    expect(classifyGitCommand(["rev-parse", "--verify", "HEAD"])).toBe("read");
    expect(classifyGitCommand(["log", "-1"])).toBe("read");
  });

  it("defaults an unrecognized subcommand to write, not read", () => {
    // Neither a real nor plausible git subcommand -- exercises the fallback
    // path directly, proving an unenumerated (mutating, for all this module
    // knows) operation gets the longer budget rather than the short one.
    expect(classifyGitCommand(["totally-unknown-subcommand"])).toBe("write");
  });

  it("defaults to read when there is no subcommand at all", () => {
    // `git --version` / `git --help` with no subcommand: always trivially
    // read-only, distinct from "a real subcommand this module doesn't know".
    expect(classifyGitCommand(["--version"])).toBe("read");
    expect(classifyGitCommand([])).toBe("read");
  });

  it("skips leading global flags that take a separate-token value before finding the subcommand", () => {
    // Regression: args.find(a => !a.startsWith("-")) would previously grab
    // "user.name=x" / "/some/path" themselves (neither starts with "-"),
    // misclassifying a write/network command as read.
    expect(classifyGitCommand(["-c", "user.name=x", "commit", "-m", "y"])).toBe("write");
    expect(classifyGitCommand(["-C", "/some/path", "push", "origin", "main"])).toBe(
      "network",
    );
    expect(classifyGitCommand(["-c", "core.pager=cat", "-C", "/repo", "status"])).toBe(
      "read",
    );
  });
});

describe("buildGitEnv", () => {
  it("sets the non-interactive contract env vars (R1/R2)", () => {
    const env = buildGitEnv();
    expect(env.GIT_TERMINAL_PROMPT).toBe("0");
    expect(env.GCM_INTERACTIVE).toBe("Never");
    expect(env.GIT_OPTIONAL_LOCKS).toBe("0");
  });

  it("preserves the surrounding process environment", () => {
    const env = buildGitEnv();
    expect(env.PATH ?? env.Path).toBeTruthy();
  });
});

describe("runGit — timeout contract (R4)", () => {
  it("does not throw GitTimeoutError for a command that finishes within budget", async () => {
    const dir = await createCommittedRepo();

    await expect(runGit(dir, ["status", "--porcelain"])).resolves.toMatchObject({
      stdout: expect.any(String),
    });
  });

  // The "does a real command that exceeds a tiny timeout actually get
  // rejected as GitTimeoutError" and "does an explicit commandClass
  // override change the effective timeout" claims moved to
  // test/git-timeout-mapping.test.ts, which asserts them deterministically
  // against a mocked node:child_process rather than racing a real `git`
  // process against an artificially tiny millisecond value. That race was
  // flaky by construction -- a fast enough machine (confirmed: this repo's
  // Linux CI runner) can complete a real `git status` in under 1ms, which
  // isn't a timeout bug, just a timing assumption that didn't hold.
});

describe("runGit — stdin closure (R3)", () => {
  it("does not hang reading credential input from an open stdin pipe", async () => {
    const dir = await createCommittedRepo();

    // `git credential fill` reads a protocol request from stdin until EOF.
    // Before this fix, execFile's default stdio left stdin as an open pipe
    // nothing wrote to or closed, so this call would hang indefinitely --
    // exactly EF-20's reported failure class. With stdin closed immediately
    // (child.stdin.end()), git sees EOF at once and the promise settles
    // (successfully or with a git-level error) well inside a short bound.
    const start = Date.now();
    await runGit(dir, ["credential", "fill"], { timeoutMs: 5_000 }).catch(() => {
      // A git-level error (e.g. "fatal: ... could not read") is an
      // acceptable settlement here -- the property under test is that it
      // settles at all, not what it resolves to.
    });
    expect(Date.now() - start).toBeLessThan(3_000);
  });
});

describe("runGit — optional locks (EF-13 / R2 regression)", () => {
  it("still completes a real commit with GIT_OPTIONAL_LOCKS=0 in effect", async () => {
    const dir = await createTempDir();
    fixtureGit(dir, ["init"]);
    fixtureGit(dir, ["config", "user.name", "Arcane Tests"]);
    fixtureGit(dir, ["config", "user.email", "arcane-tests@example.invalid"]);
    await fs.writeFile(join(dir, "file.txt"), "content");

    await runGit(dir, ["add", "-A"]);
    await runGit(dir, ["commit", "-m", "test: optional-locks regression"]);

    const log = fixtureGit(dir, ["log", "--oneline"]);
    expect(log).toContain("optional-locks regression");
  });

  // A prior version of this test simulated "a filesystem that rejects
  // unlink" via `fs.chmod(gitDir, 0o444)` and asserted `git status` still
  // succeeded. That assertion passed for the wrong reason: verified directly
  // against this environment, chmod-444 on a Windows directory does not
  // actually block file creation inside it (Windows' read-only directory
  // attribute isn't the POSIX write-bit), so the assertion held identically
  // against the pre-fix code -- it provided no real regression protection.
  // Reproducing genuine unlink-denial reliably needs either a real
  // restricted/synchronized filesystem or OS-level file locking beyond what
  // Node's fs module portably exposes; EF-13's own proposed fix already
  // calls this out as separate, dedicated work ("build a restricted-
  // filesystem test harness first"). What IS verified here, honestly: the
  // buildGitEnv test above proves the code sets GIT_OPTIONAL_LOCKS=0 on
  // every invocation, and the commit test above proves that setting doesn't
  // break normal writes. External efficacy against a real restricted
  // filesystem remains unverified by this suite -- see the follow-up task
  // filed against this session for the dedicated harness.
});
