import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { runGit as fixtureGit, createFixtureDir } from "./helpers/git-fixture.js";
import { HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";
import {
  applyBlockedPushControls,
  hookFilePath,
  isHookEnforced,
  readHooksPath,
  undisabledRemotes,
  DISABLED_PUSH_URL,
} from "../src/modules/push-safety.js";

/**
 * UP02-A-01: the blocked-policy install that `spell init` and
 * `spell block-push` share. Real bare remotes and real pushes, the same way
 * test/push-safety.test.ts proves the underlying controls.
 */

let globalConfig: string;
let systemConfig: string;
const savedEnv: Record<string, string | undefined> = {};

beforeAll(async () => {
  const dir = await createFixtureDir("up02-a-controls-scopes-");
  globalConfig = join(dir, "gitconfig-global");
  systemConfig = join(dir, "gitconfig-system");
  await fs.writeFile(globalConfig, "");
  await fs.writeFile(systemConfig, "");
  for (const key of ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM"]) savedEnv[key] = process.env[key];
  process.env["GIT_CONFIG_GLOBAL"] = globalConfig;
  process.env["GIT_CONFIG_SYSTEM"] = systemConfig;
});

afterAll(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

async function repoWithRemote(): Promise<{ work: string; bare: string }> {
  const bare = await createFixtureDir("up02-a-controls-bare-");
  fixtureGit(bare, ["init", "--bare", "-b", "main"]);
  const work = await createFixtureDir("up02-a-controls-work-");
  fixtureGit(work, ["init", "-b", "main"]);
  fixtureGit(work, ["config", "user.name", "Arcane Tests"]);
  fixtureGit(work, ["config", "user.email", "arcane-tests@example.invalid"]);
  await fs.writeFile(join(work, "a.txt"), "hello\n");
  fixtureGit(work, ["add", "-A"]);
  fixtureGit(work, ["commit", "-m", "test: seed"]);
  fixtureGit(work, ["remote", "add", "origin", bare]);
  return { work, bare };
}

function tryPush(dir: string, args: string[] = ["origin", "main"]): boolean {
  const res = spawnSync("git", ["push", ...args], {
    cwd: dir,
    encoding: "utf-8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  return res.status === 0;
}

function remoteHasMain(bare: string): boolean {
  return spawnSync("git", ["rev-parse", "--verify", "main"], { cwd: bare, encoding: "utf-8" }).status === 0;
}

function texts(outcome: { messages: { text: string }[] }): string {
  return outcome.messages.map((m) => m.text).join("\n");
}

describe("applyBlockedPushControls", () => {
  it("installs both layers, and a real push (with or without --no-verify) never reaches the remote", async () => {
    const { work, bare } = await repoWithRemote();
    const emitted: string[] = [];

    const outcome = await applyBlockedPushControls(work, { emit: (m) => emitted.push(m.text) });

    expect(outcome.hook.status).toBe("installed");
    expect(outcome.urls).toEqual([{ remote: "origin", status: "disabled" }]);
    expect(outcome.stoppedAtHook).toBe(false);
    expect(emitted).toEqual(outcome.messages.map((m) => m.text));
    expect(texts(outcome)).toContain("Installed a pre-push hook that blocks pushes");
    expect(texts(outcome)).toContain("Disabled the push URL for: origin (fetch still works).");
    expect(texts(outcome)).toContain("Run `spell unblock-push` from a terminal to undo this.");

    expect(tryPush(work)).toBe(false);
    expect(tryPush(work, ["--no-verify", "origin", "main"])).toBe(false);
    expect(tryPush(work, [bare, "main"])).toBe(false);
    expect(remoteHasMain(bare)).toBe(false);
  }, HEAVY_TEST_TIMEOUT);

  it("is idempotent: a second run reports the hook as already ours and every remote as already disabled", async () => {
    const { work } = await repoWithRemote();
    await applyBlockedPushControls(work);

    const second = await applyBlockedPushControls(work);

    expect(second.hook.status).toBe("already-ours");
    expect(second.urls).toEqual([{ remote: "origin", status: "already-disabled" }]);
  }, HEAVY_TEST_TIMEOUT);

  it("refused-foreign-hooks-path: warns, and by default still disables the push URLs (init's behaviour)", async () => {
    const { work } = await repoWithRemote();
    fixtureGit(work, ["config", "--local", "core.hooksPath", ".husky/_"]);

    const outcome = await applyBlockedPushControls(work);

    expect(outcome.hook).toEqual({ status: "refused-foreign-hooks-path", existing: ".husky/_", scope: "local" });
    expect(texts(outcome)).toContain('core.hooksPath is already ".husky/_" (set for this repository)');
    expect(outcome.urls).toEqual([{ remote: "origin", status: "disabled" }]);
    expect(fixtureGit(work, ["config", "--get", "core.hooksPath"])).toBe(".husky/_");
  }, HEAVY_TEST_TIMEOUT);

  it("stopOnHookRefusal: a refused hook stops before any push URL is touched", async () => {
    const { work } = await repoWithRemote();
    fixtureGit(work, ["config", "--local", "core.hooksPath", ".husky/_"]);

    const outcome = await applyBlockedPushControls(work, { stopOnHookRefusal: true });

    expect(outcome.stoppedAtHook).toBe(true);
    expect(outcome.urls).toEqual([]);
    expect(texts(outcome)).not.toContain("spell unblock-push");
    expect(await undisabledRemotes(work)).toEqual(["origin"]);
    expect(tryPush(work)).toBe(true);
  }, HEAVY_TEST_TIMEOUT);

  it("refused-default-hooks: names the hooks in git's default directory and writes no hook", async () => {
    const { work } = await repoWithRemote();
    await fs.writeFile(join(work, ".git", "hooks", "pre-commit"), "#!/bin/sh\nexit 0\n");

    const outcome = await applyBlockedPushControls(work, { stopOnHookRefusal: true });

    expect(outcome.hook).toEqual({ status: "refused-default-hooks", hooks: ["pre-commit"] });
    expect(texts(outcome)).toContain("hooks in git's default directory (pre-commit)");
    await expect(fs.access(await hookFilePath(work))).rejects.toThrow();
    expect(await readHooksPath(work)).toBeUndefined();
  }, HEAVY_TEST_TIMEOUT);

  it("refused-unreadable-config: fails closed when git cannot report core.hooksPath", async () => {
    const { work } = await repoWithRemote();
    await fs.writeFile(globalConfig, "[[[ not a config file\n");
    try {
      const outcome = await applyBlockedPushControls(work, { stopOnHookRefusal: true });

      expect(outcome.hook.status).toBe("refused-unreadable-config");
      expect(texts(outcome)).toContain("git could not report the current core.hooksPath");
      expect(outcome.urls).toEqual([]);
    } finally {
      await fs.writeFile(globalConfig, "");
    }
    await expect(fs.access(await hookFilePath(work))).rejects.toThrow();
  }, HEAVY_TEST_TIMEOUT);

  it("reports a remote whose push URL is configured outside the repository, and never claims it covered", async () => {
    const { work, bare } = await repoWithRemote();
    spawnSync("git", ["config", "--file", globalConfig, "remote.origin.pushurl", bare], { encoding: "utf-8" });
    try {
      const outcome = await applyBlockedPushControls(work);

      expect(outcome.hook.status).toBe("installed");
      expect(outcome.urls[0]?.status).toBe("failed");
      expect(texts(outcome)).toContain("Could not disable the push URL for: origin");
      expect(texts(outcome)).not.toContain("Disabled the push URL for");
      const local = spawnSync("git", ["config", "--local", "--get-all", "remote.origin.pushurl"], {
        cwd: work,
        encoding: "utf-8",
      });
      expect(local.stdout).not.toContain(DISABLED_PUSH_URL);
      expect(await undisabledRemotes(work)).toEqual(["origin"]);
    } finally {
      await fs.writeFile(globalConfig, "");
    }
  }, HEAVY_TEST_TIMEOUT);

  it("with no remote, warns that only the hook is active", async () => {
    const work = await createFixtureDir("up02-a-controls-noremote-");
    fixtureGit(work, ["init", "-b", "main"]);

    const outcome = await applyBlockedPushControls(work);

    expect(outcome.urls).toEqual([]);
    expect(texts(outcome)).toContain("No remote is configured, so only the pre-push hook is active.");
    expect(await isHookEnforced(work)).toBe(true);
  }, HEAVY_TEST_TIMEOUT);
});
