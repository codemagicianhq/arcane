import { afterEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import {
  correctUnbornMasterDefault,
  ensureLocalPullRebase,
} from "../src/modules/git.js";
import { checkPullRebase } from "../src/commands/doctor.js";
import { isSecretsPrecommitHookInstalled } from "../src/modules/secrets-scan.js";
import { createFixtureDir, runGit as fixtureGit } from "./helpers/git-fixture.js";

// This file deliberately does NOT mock src/modules/git.js -- these tests
// need real git behavior (a real unborn repo, real repository-local config)
// to prove EF-05/EF-32's actual claims. test/init.test.ts covers runInit's
// interactive flow with git mocked; this file covers the git-state
// primitives it calls, against real fixtures.

const tempDirs: string[] = [];

async function createTempDir() {
  const dir = await createFixtureDir("init-git-state-test");
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

describe("correctUnbornMasterDefault (EF-05, R2/R3)", () => {
  it("repoints an unborn repo from master to main", async () => {
    const dir = await createTempDir();
    fixtureGit(dir, ["init"]);
    // Sanity-check the fixture actually reproduces the reported defect
    // before asserting the fix: a bare `git init` in this hermetic
    // environment (no system config reaches it) lands on git's own raw
    // default, which is "master" -- identical in effect to the reported
    // Git for Windows system-config leak, even though the mechanism
    // differs (git's own default vs. an explicit system override).
    expect(fixtureGit(dir, ["symbolic-ref", "--short", "HEAD"])).toBe("master");

    const result = await correctUnbornMasterDefault(dir);

    expect(result).toEqual({ corrected: true, from: "master", to: "main" });
    expect(fixtureGit(dir, ["symbolic-ref", "--short", "HEAD"])).toBe("main");
  });

  it("leaves a deliberately different unborn branch name untouched", async () => {
    const dir = await createTempDir();
    fixtureGit(dir, ["init"]);
    fixtureGit(dir, ["symbolic-ref", "HEAD", "refs/heads/develop"]);

    const result = await correctUnbornMasterDefault(dir);

    expect(result).toEqual({ corrected: false, to: "main" });
    expect(fixtureGit(dir, ["symbolic-ref", "--short", "HEAD"])).toBe("develop");
  });

  it("never renames a BORN repo's branch, even if it's named master", async () => {
    // The dangerous case this guards against: symbolic-ref --short HEAD
    // resolves identically whether a repo is born or unborn, so without an
    // internal unborn check, this function would happily repoint a BORN
    // repo's HEAD to refs/heads/main -- detaching it from master's commit
    // history without moving any commits (main would be an empty ref while
    // every real commit stays reachable only via the now-abandoned master).
    const dir = await createTempDir();
    fixtureGit(dir, ["init"]);
    fixtureGit(dir, ["symbolic-ref", "HEAD", "refs/heads/master"]);
    fixtureGit(dir, ["config", "user.name", "Arcane Tests"]);
    fixtureGit(dir, ["config", "user.email", "arcane-tests@example.invalid"]);
    await fs.writeFile(join(dir, "f.txt"), "x");
    fixtureGit(dir, ["add", "-A"]);
    fixtureGit(dir, ["commit", "-m", "test: seed"]);
    const commitSha = fixtureGit(dir, ["rev-parse", "HEAD"]);

    const result = await correctUnbornMasterDefault(dir);

    expect(result).toEqual({ corrected: false, to: "main" });
    expect(fixtureGit(dir, ["symbolic-ref", "--short", "HEAD"])).toBe("master");
    expect(fixtureGit(dir, ["rev-parse", "HEAD"])).toBe(commitSha);
  });

  it("no-ops (not corrected) outside a Git repository", async () => {
    const dir = await createTempDir(); // never git-init'd

    await expect(correctUnbornMasterDefault(dir)).resolves.toEqual({
      corrected: false,
      to: "main",
    });
  });

  it("never repoints onto a main that already has real, unrelated history (R1)", async () => {
    // The hazard this guards against: confirming the SOURCE (master) is
    // unborn is not enough -- if the TARGET (main) already has commits
    // (realistic via `git worktree add`, which shares refs/heads/* across
    // worktrees while HEAD is per-worktree, or simply an earlier `main`
    // that was created and later abandoned for `master`), repointing HEAD
    // onto it would silently attach whatever's staged on the unborn HEAD
    // to main's real commit history -- a history splice a later `git
    // commit` would make permanent.
    const dir = await createTempDir();
    fixtureGit(dir, ["init"]);
    fixtureGit(dir, ["symbolic-ref", "HEAD", "refs/heads/main"]);
    fixtureGit(dir, ["config", "user.name", "Arcane Tests"]);
    fixtureGit(dir, ["config", "user.email", "arcane-tests@example.invalid"]);
    await fs.writeFile(join(dir, "only-on-main.txt"), "real history");
    fixtureGit(dir, ["add", "-A"]);
    fixtureGit(dir, ["commit", "-m", "test: seed main with real history"]);
    const mainSha = fixtureGit(dir, ["rev-parse", "main"]);

    // Now repoint HEAD back to an unborn "master" -- the exact state
    // correctUnbornMasterDefault is designed to detect and correct.
    fixtureGit(dir, ["symbolic-ref", "HEAD", "refs/heads/master"]);
    await fs.writeFile(join(dir, "staged-on-orphan.txt"), "should never touch main's history");
    fixtureGit(dir, ["add", "-A"]);

    const result = await correctUnbornMasterDefault(dir);

    expect(result).toEqual({ corrected: false, to: "main" });
    // HEAD must still be the unborn "master" -- untouched.
    expect(fixtureGit(dir, ["symbolic-ref", "--short", "HEAD"])).toBe("master");
    // main's real history must be completely unaffected.
    expect(fixtureGit(dir, ["rev-parse", "main"])).toBe(mainSha);
  });

  it("refuses to repoint when refs/heads/main is unreadable rather than absent", async () => {
    // The R1 guard's own failure mode: it asked "does main resolve?" with a
    // bare try/catch, so a CORRUPT main (exists, holds real history, but is
    // unreadable) failed the check identically to an absent one -- and the
    // code then attached HEAD to it. Absence and unreadability must not be
    // the same answer.
    const dir = await createTempDir();
    fixtureGit(dir, ["init"]);
    fixtureGit(dir, ["symbolic-ref", "HEAD", "refs/heads/main"]);
    fixtureGit(dir, ["config", "user.name", "Arcane Tests"]);
    fixtureGit(dir, ["config", "user.email", "arcane-tests@example.invalid"]);
    await fs.writeFile(join(dir, "only-on-main.txt"), "real history");
    fixtureGit(dir, ["add", "-A"]);
    fixtureGit(dir, ["commit", "-m", "test: seed main with real history"]);

    // Corrupt the ref in place: keep the file (so it is NOT absent) but make
    // its contents unresolvable.
    await fs.writeFile(join(dir, ".git", "refs", "heads", "main"), "not-a-valid-object-id\n");

    fixtureGit(dir, ["symbolic-ref", "HEAD", "refs/heads/master"]);
    await fs.writeFile(join(dir, "staged-on-orphan.txt"), "must not reach main");
    fixtureGit(dir, ["add", "-A"]);

    const result = await correctUnbornMasterDefault(dir);

    // Declines the correction AND reports why, so the caller can warn.
    expect(result).toEqual({
      corrected: false,
      to: "main",
      blockedReason: "target-unreadable",
    });
    // HEAD must be left exactly as it was -- never repointed onto the broken ref.
    expect(fixtureGit(dir, ["symbolic-ref", "--short", "HEAD"])).toBe("master");
  });

  it("declines when refs/heads/main is a dangling symref, not an absent ref", async () => {
    // Found in adversarial review: a symref pointing at a missing target
    // reports EXACTLY the same shape as an absent ref through for-each-ref
    // (empty stdout, empty stderr). Repointing onto it left HEAD on the
    // symref's target while init reported "repointed to main" -- no splice,
    // but a false statement about where HEAD ended up.
    const dir = await createTempDir();
    fixtureGit(dir, ["init"]);
    fixtureGit(dir, ["symbolic-ref", "HEAD", "refs/heads/master"]);
    await fs.writeFile(join(dir, ".git", "refs", "heads", "main"), "ref: refs/heads/nope\n");

    const result = await correctUnbornMasterDefault(dir);

    expect(result).toEqual({
      corrected: false,
      to: "main",
      blockedReason: "target-unreadable",
    });
    expect(fixtureGit(dir, ["symbolic-ref", "--short", "HEAD"])).toBe("master");
  });

  it("distinguishes an unreadable target from a genuinely absent one", async () => {
    // The control for the test above: with no refs/heads/main at all, the
    // correction must still go through. If this and the corrupt case ever
    // return the same thing, the distinction has silently collapsed -- which
    // is exactly the bug that motivated moving off `rev-parse --verify`.
    const dir = await createTempDir();
    fixtureGit(dir, ["init"]);
    fixtureGit(dir, ["symbolic-ref", "HEAD", "refs/heads/master"]);

    const result = await correctUnbornMasterDefault(dir);

    expect(result).toEqual({ corrected: true, from: "master", to: "main" });
    expect(result.blockedReason).toBeUndefined();
    expect(fixtureGit(dir, ["symbolic-ref", "--short", "HEAD"])).toBe("main");
  });
});

describe("ensureLocalPullRebase (EF-32, R5/R6)", () => {
  it("sets pull.rebase=true when it is unset locally", async () => {
    const dir = await createTempDir();
    fixtureGit(dir, ["init"]);

    const result = await ensureLocalPullRebase(dir);

    expect(result).toEqual({ action: "set" });
    expect(fixtureGit(dir, ["config", "--local", "--get", "pull.rebase"])).toBe("true");
  });

  it("preserves an explicit local pull.rebase=false and reports it, without overwriting", async () => {
    const dir = await createTempDir();
    fixtureGit(dir, ["init"]);
    fixtureGit(dir, ["config", "--local", "pull.rebase", "false"]);

    const result = await ensureLocalPullRebase(dir);

    expect(result).toEqual({ action: "explicit-false-preserved" });
    expect(fixtureGit(dir, ["config", "--local", "--get", "pull.rebase"])).toBe("false");
  });

  it("is a no-op (already-set) when pull.rebase is already locally true", async () => {
    const dir = await createTempDir();
    fixtureGit(dir, ["init"]);
    fixtureGit(dir, ["config", "--local", "pull.rebase", "true"]);

    const result = await ensureLocalPullRebase(dir);

    expect(result).toEqual({ action: "already-set" });
  });

  // R2: git recognizes several falsy boolean spellings for this key, not
  // just the literal word "false" -- each must be preserved (never
  // silently overwritten) and reported the same as an explicit "false".
  it.each(["no", "off", "0"])(
    "preserves and reports pull.rebase=%s the same as an explicit false",
    async (falsySpelling) => {
      const dir = await createTempDir();
      fixtureGit(dir, ["init"]);
      fixtureGit(dir, ["config", "--local", "pull.rebase", falsySpelling]);

      const result = await ensureLocalPullRebase(dir);

      expect(result).toEqual({ action: "explicit-false-preserved" });
      // The raw local value is untouched -- only its normalized boolean
      // meaning is used for the decision, never rewritten to a canonical
      // spelling.
      expect(fixtureGit(dir, ["config", "--local", "--get", "pull.rebase"])).toBe(falsySpelling);
    },
  );

  it.each(["yes", "on", "1"])(
    "treats pull.rebase=%s as already-set, not unset",
    async (truthySpelling) => {
      const dir = await createTempDir();
      fixtureGit(dir, ["init"]);
      fixtureGit(dir, ["config", "--local", "pull.rebase", truthySpelling]);

      const result = await ensureLocalPullRebase(dir);

      expect(result).toEqual({ action: "already-set" });
      expect(fixtureGit(dir, ["config", "--local", "--get", "pull.rebase"])).toBe(truthySpelling);
    },
  );

  it("never overwrites a non-boolean local value like 'merges'", async () => {
    // "merges" and "interactive" are valid, deliberate pull.rebase
    // settings that --type=bool can't coerce -- must be treated as an
    // explicit choice (already-set), never silently replaced with "true".
    const dir = await createTempDir();
    fixtureGit(dir, ["init"]);
    fixtureGit(dir, ["config", "--local", "pull.rebase", "merges"]);

    const result = await ensureLocalPullRebase(dir);

    expect(result).toEqual({ action: "already-set" });
    expect(fixtureGit(dir, ["config", "--local", "--get", "pull.rebase"])).toBe("merges");
  });
});

describe("checkPullRebase (EF-32, doctor)", () => {
  it("passes when the effective pull.rebase resolves to true", async () => {
    const dir = await createTempDir();
    fixtureGit(dir, ["init"]);
    fixtureGit(dir, ["config", "--local", "pull.rebase", "true"]);

    const result = await checkPullRebase(dir);

    expect(result.passed).toBe(true);
    expect(result.blocking).not.toBe(true);
  });

  it("warns (non-blocking) when pull.rebase is unset", async () => {
    const dir = await createTempDir();
    fixtureGit(dir, ["init"]);

    const result = await checkPullRebase(dir);

    expect(result.passed).toBe(false);
    expect(result.blocking).toBe(false);
  });

  it("warns (non-blocking) when pull.rebase is explicitly false", async () => {
    const dir = await createTempDir();
    fixtureGit(dir, ["init"]);
    fixtureGit(dir, ["config", "--local", "pull.rebase", "false"]);

    const result = await checkPullRebase(dir);

    expect(result.passed).toBe(false);
    expect(result.blocking).toBe(false);
    expect(result.message).toContain("false");
  });

  // R4: a non-canonical but fully compliant boolean spelling must PASS,
  // not false-positive-warn -- git itself treats "yes" identically to
  // "true" for this key.
  it("passes on a non-canonical but compliant boolean spelling ('yes')", async () => {
    const dir = await createTempDir();
    fixtureGit(dir, ["init"]);
    fixtureGit(dir, ["config", "--local", "pull.rebase", "yes"]);

    const result = await checkPullRebase(dir);

    expect(result.passed).toBe(true);
  });

  it("degrades gracefully (non-blocking warning, not a crash) outside a Git repository", async () => {
    const dir = await createTempDir();

    await expect(checkPullRebase(dir)).resolves.toMatchObject({
      passed: false,
      blocking: false,
    });
  });
});

describe("runInit — end-to-end git-state wiring (real git)", () => {
  it("corrects an unborn master branch and sets pull.rebase during a real init", async () => {
    vi.resetModules();
    vi.doMock("@inquirer/prompts", () => ({
      select: vi.fn().mockResolvedValue("governance-only"),
      confirm: vi.fn().mockResolvedValue(true),
      checkbox: vi.fn().mockResolvedValue([]),
      input: vi.fn().mockResolvedValue("Agent"),
    }));
    // No git mock in this describe block's dynamic import -- real git runs.
    const { runInit } = await import("../src/commands/init.js");

    const dir = await createTempDir();
    fixtureGit(dir, ["init"]);

    await runInit(
      { profile: "governance-only" },
      dir,
      join(process.cwd(), "src/assets"),
      "0.1.0",
    );

    expect(fixtureGit(dir, ["symbolic-ref", "--short", "HEAD"])).toBe("main");
    expect(fixtureGit(dir, ["config", "--local", "--get", "pull.rebase"])).toBe("true");
    // ARC-037 decision 2: installed unconditionally, unlike the pre-push
    // hook -- this profile never asks the push_policy question at all.
    expect(await isSecretsPrecommitHookInstalled(dir)).toBe(true);

    vi.doUnmock("@inquirer/prompts");
    vi.resetModules();
  });

  it("R3: warns and preserves an explicit local pull.rebase=false during a real init, instead of silently overwriting it", async () => {
    // This is the exact scenario EF-32.md's own "Required tests" section
    // asks for: "a second fixture proving an existing explicit
    // pull.rebase=false ... is surfaced as a warning rather than silently
    // overwritten." The underlying ensureLocalPullRebase primitive already
    // had a direct test for this; this one proves the operator-facing
    // behavior in init.ts's actual warning branch fires too -- adversarial
    // review found that branch had zero coverage before this test existed.
    vi.resetModules();
    vi.doMock("@inquirer/prompts", () => ({
      select: vi.fn().mockResolvedValue("governance-only"),
      confirm: vi.fn().mockResolvedValue(true),
      checkbox: vi.fn().mockResolvedValue([]),
      input: vi.fn().mockResolvedValue("Agent"),
    }));
    const { runInit } = await import("../src/commands/init.js");

    const dir = await createTempDir();
    fixtureGit(dir, ["init"]);
    fixtureGit(dir, ["config", "user.name", "Arcane Tests"]);
    fixtureGit(dir, ["config", "user.email", "arcane-tests@example.invalid"]);
    await fs.writeFile(join(dir, "f.txt"), "x");
    fixtureGit(dir, ["add", "-A"]);
    fixtureGit(dir, ["commit", "-m", "test: seed so this repo is born, not unborn"]);
    fixtureGit(dir, ["config", "--local", "pull.rebase", "false"]);

    const logSpy = vi.spyOn(console, "log");

    await runInit(
      { profile: "governance-only" },
      dir,
      join(process.cwd(), "src/assets"),
      "0.1.0",
    );

    const logged = logSpy.mock.calls.map((call) => String(call[0]));
    expect(logged.some((line) => line.includes("pull.rebase") && line.includes("false"))).toBe(
      true,
    );
    // The whole point: the explicit choice must survive untouched.
    expect(fixtureGit(dir, ["config", "--local", "--get", "pull.rebase"])).toBe("false");

    logSpy.mockRestore();
    vi.doUnmock("@inquirer/prompts");
    vi.resetModules();
  });
});
