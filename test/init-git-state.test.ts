import { afterEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import {
  correctUnbornMasterDefault,
  ensureLocalPullRebase,
} from "../src/modules/git.js";
import { checkPullRebase } from "../src/commands/doctor.js";
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

    vi.doUnmock("@inquirer/prompts");
    vi.resetModules();
  });
});
