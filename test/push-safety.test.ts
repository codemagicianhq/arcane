import { describe, it, expect } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { runGit as fixtureGit, createFixtureDir } from "./helpers/git-fixture.js";
import {
  installPrePushHook,
  removePrePushHook,
  disablePushUrls,
  restorePushUrls,
  undisabledRemotes,
  isHookEnforced,
  readHooksPath,
  hookFilePath,
  listRemotes,
  DISABLED_PUSH_URL,
  ARCANE_HOOKS_DIR,
} from "../src/modules/push-safety.js";

/**
 * EF-09 R6 requires a REAL local remote, not mocks: the point is to prove a
 * genuine `git push` is actually blocked, not merely that config was written.
 * A prior session shipped a config-only assertion elsewhere and review called
 * it vacuous, so this suite pushes for real and asserts on exit codes.
 */

async function repoWithRemote(): Promise<{ work: string; bare: string }> {
  const bare = await createFixtureDir("push-safety-bare-");
  fixtureGit(bare, ["init", "--bare", "-b", "main"]);

  const work = await createFixtureDir("push-safety-work-");
  fixtureGit(work, ["init", "-b", "main"]);
  fixtureGit(work, ["config", "user.name", "Arcane Tests"]);
  fixtureGit(work, ["config", "user.email", "arcane-tests@example.invalid"]);
  await fs.writeFile(join(work, "a.txt"), "hello\n");
  fixtureGit(work, ["add", "-A"]);
  fixtureGit(work, ["commit", "-m", "test: seed"]);
  fixtureGit(work, ["remote", "add", "origin", bare]);
  return { work, bare };
}

/** Attempts a real push and reports whether it succeeded. Never throws. */
function tryPush(dir: string, args: string[] = ["origin", "main"]): { ok: boolean; stderr: string } {
  const res = spawnSync("git", ["push", ...args], {
    cwd: dir,
    encoding: "utf-8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  return { ok: res.status === 0, stderr: `${res.stderr ?? ""}${res.stdout ?? ""}` };
}

describe("push blocking (R2, R3) — against a real remote", () => {
  it("a normal push succeeds before any policy is applied", async () => {
    // Control. Without this, a later "push failed" assertion could pass for a
    // reason unrelated to the controls under test.
    const { work } = await repoWithRemote();
    expect(tryPush(work).ok).toBe(true);
  });

  it("the pre-push hook blocks a real push", async () => {
    const { work } = await repoWithRemote();
    expect((await installPrePushHook(work)).status).toBe("installed");

    const result = tryPush(work);
    expect(result.ok).toBe(false);
    expect(result.stderr).toContain("push blocked");
  });

  it("the disabled push URL blocks even --no-verify, which skips hooks entirely", async () => {
    // This is why R3 exists as a separate control: --no-verify bypasses R2's
    // hook completely, so the hook alone is defeated by one extra flag.
    const { work } = await repoWithRemote();
    await installPrePushHook(work);
    await disablePushUrls(work);

    expect(tryPush(work, ["--no-verify", "origin", "main"]).ok).toBe(false);
  });

  it("the hook catches a push straight to a URL, which never consults the remote", async () => {
    // The complementary bypass: `git push <url>` ignores the named remote
    // entirely, so the URL layer cannot see it. Together the two layers cover
    // each other's blind spot.
    const { work, bare } = await repoWithRemote();
    await installPrePushHook(work);
    await disablePushUrls(work);

    expect(tryPush(work, [bare, "main"]).ok).toBe(false);
  });

  it("disables EVERY remote, not just origin", async () => {
    // A repository commonly has an upstream or a backup too. Protecting only
    // `origin` protects nothing in particular.
    const { work } = await repoWithRemote();
    const second = await createFixtureDir("push-safety-bare2-");
    fixtureGit(second, ["init", "--bare", "-b", "main"]);
    fixtureGit(work, ["remote", "add", "backup", second]);

    await disablePushUrls(work);

    expect(await undisabledRemotes(work)).toEqual([]);
    expect(tryPush(work, ["--no-verify", "backup", "main"]).ok).toBe(false);
  });

  it("blocking push does not break fetch", async () => {
    const { work } = await repoWithRemote();
    await disablePushUrls(work);

    expect(fixtureGit(work, ["remote", "get-url", "origin"])).not.toContain("arcane-push-blocked");
    expect(() => fixtureGit(work, ["fetch", "origin"])).not.toThrow();
  });

  it("records the original push URL so restore is exact, not guessed", async () => {
    const { work, bare } = await repoWithRemote();
    await disablePushUrls(work);
    expect(fixtureGit(work, ["remote", "get-url", "--push", "origin"])).toBe(DISABLED_PUSH_URL);

    expect(await restorePushUrls(work)).toEqual(["origin"]);
    expect(fixtureGit(work, ["remote", "get-url", "--push", "origin"]).replace(/\\/g, "/")).toBe(
      bare.replace(/\\/g, "/"),
    );
  });

  it("a push succeeds again once both controls are undone", async () => {
    const { work } = await repoWithRemote();
    await installPrePushHook(work);
    await disablePushUrls(work);
    expect(tryPush(work).ok).toBe(false);

    await removePrePushHook(work);
    await restorePushUrls(work);

    expect(tryPush(work).ok).toBe(true);
  });
});

describe("enforcement is verified, not assumed", () => {
  it("isHookEnforced is false when the hook FILE is gone but config remains", async () => {
    // Found in review: checking core.hooksPath alone is a declaration check
    // wearing an enforcement check's name. Deleting the hook file leaves the
    // config intact — and pushes succeed.
    const { work } = await repoWithRemote();
    await installPrePushHook(work);
    expect(await isHookEnforced(work)).toBe(true);

    await fs.rm(hookFilePath(work));

    expect(await isHookEnforced(work)).toBe(false);
    // And prove the consequence, not just the flag.
    expect(tryPush(work).ok).toBe(true);
  });

  it("undisabledRemotes names a remote added after the block was applied", async () => {
    // The real accidental path: init blocks a repo with no remote, someone
    // adds one later, and only the hook applies — which --no-verify skips.
    const { work } = await repoWithRemote();
    await disablePushUrls(work);
    expect(await undisabledRemotes(work)).toEqual([]);

    const later = await createFixtureDir("push-safety-late-");
    fixtureGit(later, ["init", "--bare", "-b", "main"]);
    fixtureGit(work, ["remote", "add", "later", later]);

    expect(await undisabledRemotes(work)).toEqual(["later"]);
  });
});

describe("hook-manager collision guard (R7)", () => {
  it("refuses rather than clobbering a repository-local core.hooksPath", async () => {
    // Not hypothetical: this repository's own core.hooksPath is .husky/_,
    // running lint, typecheck and the full suite.
    const { work } = await repoWithRemote();
    fixtureGit(work, ["config", "--local", "core.hooksPath", ".husky/_"]);

    const outcome = await installPrePushHook(work);

    expect(outcome.status).toBe("refused-foreign-hooks-path");
    if (outcome.status === "refused-foreign-hooks-path") {
      expect(outcome.existing).toBe(".husky/_");
      expect(outcome.scope).toBe("local");
    }
    expect((await readHooksPath(work))?.value).toBe(".husky/_");
  });

  it("reads the EFFECTIVE hooks path, not only the repository-local one", async () => {
    // Found in review: reading `--local --get` missed a hooksPath set at
    // *global* scope -- the standard way organisations deploy pre-commit and
    // corporate hook managers. Since a local value overrides a global one,
    // installing would have silently disabled it while reporting "installed":
    // exactly the harm R7 exists to prevent. The reviewer reproduced that live
    // against a real global config; this test pins the query shape instead,
    // because mutating the machine's global git config from a test would be
    // hostile to whoever runs it.
    const { work } = await repoWithRemote();

    expect(await readHooksPath(work)).toBeUndefined();

    fixtureGit(work, ["config", "--local", "core.hooksPath", ".husky/_"]);
    expect(await readHooksPath(work)).toEqual({ value: ".husky/_", scope: "local" });
  });

  it("refuses any foreign hooks path regardless of the scope it came from", async () => {
    // The security-relevant property: refusal keys on "this value is not ours",
    // never on where it was configured.
    const { work } = await repoWithRemote();
    fixtureGit(work, ["config", "--local", "core.hooksPath", "/some/org/hooks"]);

    expect((await installPrePushHook(work)).status).toBe("refused-foreign-hooks-path");
    await expect(fs.access(hookFilePath(work))).rejects.toThrow();
  });

  it("does not write a hook file when it refuses", async () => {
    const { work } = await repoWithRemote();
    fixtureGit(work, ["config", "--local", "core.hooksPath", ".husky/_"]);
    await installPrePushHook(work);
    await expect(fs.access(join(work, ARCANE_HOOKS_DIR, "pre-push"))).rejects.toThrow();
  });

  it("is idempotent when the hooks path is already ours", async () => {
    const { work } = await repoWithRemote();
    expect((await installPrePushHook(work)).status).toBe("installed");
    expect((await installPrePushHook(work)).status).toBe("already-ours");
  });

  it("re-writes a tampered hook body rather than reporting it unchanged", async () => {
    const { work } = await repoWithRemote();
    await installPrePushHook(work);
    await fs.writeFile(hookFilePath(work), "#!/bin/sh\nexit 0\n");

    expect((await installPrePushHook(work)).status).toBe("installed");
    expect(tryPush(work).ok).toBe(false);
  });

  it("leaves a foreign hooks path alone when removing", async () => {
    const { work } = await repoWithRemote();
    fixtureGit(work, ["config", "--local", "core.hooksPath", ".husky/_"]);
    await removePrePushHook(work);
    expect((await readHooksPath(work))?.value).toBe(".husky/_");
  });
});

describe("no remote configured", () => {
  it("reports nothing to disable rather than failing", async () => {
    const dir = await createFixtureDir("push-safety-noremote-");
    fixtureGit(dir, ["init", "-b", "main"]);

    expect(await listRemotes(dir)).toEqual([]);
    expect(await disablePushUrls(dir)).toEqual([]);
    expect(await restorePushUrls(dir)).toEqual([]);
    expect(await undisabledRemotes(dir)).toEqual([]);
  });
});
