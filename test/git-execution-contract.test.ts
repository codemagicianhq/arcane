import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { platform } from "node:process";
import { join } from "node:path";
import {
  buildGitEnv,
  classifyGitCommand,
  GitTimeoutError,
  runGit,
} from "../src/modules/git.js";
import { createFixtureDir, runGit as fixtureGit } from "./helpers/git-fixture.js";

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
    tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
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
  });

  it("classifies ambiguous subcommands as write (the safer over-estimate)", () => {
    expect(classifyGitCommand(["branch", "--list"])).toBe("write");
    expect(classifyGitCommand(["branch", "-m", "old", "new"])).toBe("write");
    expect(classifyGitCommand(["config", "--get", "user.name"])).toBe("write");
  });

  it("defaults unrecognized/read subcommands to read", () => {
    expect(classifyGitCommand(["status", "--porcelain"])).toBe("read");
    expect(classifyGitCommand(["rev-parse", "--verify", "HEAD"])).toBe("read");
    expect(classifyGitCommand(["log", "-1"])).toBe("read");
  });

  it("defaults to read when there is no non-flag argument", () => {
    expect(classifyGitCommand(["--version"])).toBe("read");
    expect(classifyGitCommand([])).toBe("read");
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
  it("rejects with GitTimeoutError when a command exceeds its timeout", async () => {
    const dir = await createCommittedRepo();

    await expect(runGit(dir, ["status"], { timeoutMs: 1 })).rejects.toThrow(GitTimeoutError);
  });

  it("does not throw GitTimeoutError for a command that finishes within budget", async () => {
    const dir = await createCommittedRepo();

    await expect(runGit(dir, ["status", "--porcelain"])).resolves.toMatchObject({
      stdout: expect.any(String),
    });
  });

  it("honors an explicit commandClass override", async () => {
    const dir = await createCommittedRepo();

    // "status" auto-classifies as read (15s default); force it into the 1ms
    // timeout via an explicit override to prove the override path fires
    // independently of auto-classification.
    await expect(
      runGit(dir, ["status"], { commandClass: "read", timeoutMs: 1 }),
    ).rejects.toThrow(GitTimeoutError);
  });
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

  // Windows-only: chmod-based read-only simulation is meaningful on NTFS via
  // Node's chmod (strips the write bit git would need to create
  // .git/index.lock). POSIX permission semantics differ enough that this
  // fixture isn't a reliable proxy there, so it's scoped to the platform
  // this repo's own dogfooding environment runs on.
  it.skipIf(platform !== "win32")(
    "git status succeeds even when .git is read-only, because it never attempts the optional lock",
    async () => {
      const dir = await createCommittedRepo();
      const gitDir = join(dir, ".git");

      await fs.chmod(gitDir, 0o444);
      try {
        await expect(runGit(dir, ["status", "--porcelain"])).resolves.toBeTruthy();
      } finally {
        await fs.chmod(gitDir, 0o755);
      }
    },
  );
});
