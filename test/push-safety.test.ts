import { describe, it, expect } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { runGit as fixtureGit, createFixtureDir } from "./helpers/git-fixture.js";
import {
  installPrePushHook,
  removePrePushHook,
  disablePushUrl,
  restorePushUrl,
  readHooksPath,
  DISABLED_PUSH_URL,
  ARCANE_HOOKS_DIR,
} from "../src/modules/push-safety.js";

/**
 * EF-09 R6 requires a REAL local remote, not mocks: the point is to prove a
 * genuine `git push` is actually blocked, not merely that config was written.
 * A prior session shipped a config-only assertion elsewhere and review correctly
 * called it vacuous, so this suite pushes for real and asserts on exit codes.
 */

/** Creates a work repo with one commit and a real bare remote wired up. */
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
function tryPush(dir: string, extraArgs: string[] = []): { ok: boolean; stderr: string } {
  const res = spawnSync("git", ["push", ...extraArgs, "origin", "main"], {
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
    const outcome = await installPrePushHook(work);
    expect(outcome.status).toBe("installed");

    const result = tryPush(work);
    expect(result.ok).toBe(false);
    expect(result.stderr).toContain("push blocked");
  });

  it("the disabled push URL blocks even --no-verify, which skips hooks entirely", async () => {
    // This is why R3 exists as a separate control: --no-verify bypasses R2's
    // hook completely, so the hook alone would be defeated by one extra flag.
    const { work } = await repoWithRemote();
    await installPrePushHook(work);
    await disablePushUrl(work);

    const result = tryPush(work, ["--no-verify"]);
    expect(result.ok).toBe(false);
  });

  it("blocking push does not break fetch", async () => {
    // The fetch URL is deliberately untouched: a blocked repository must still
    // be able to pull.
    const { work } = await repoWithRemote();
    await disablePushUrl(work);

    const fetchUrl = fixtureGit(work, ["remote", "get-url", "origin"]);
    expect(fetchUrl).not.toContain("arcane-push-blocked");
    expect(() => fixtureGit(work, ["fetch", "origin"])).not.toThrow();
  });

  it("records the original push URL so restore is exact, not guessed", async () => {
    const { work, bare } = await repoWithRemote();
    await disablePushUrl(work);

    expect(fixtureGit(work, ["remote", "get-url", "--push", "origin"])).toBe(DISABLED_PUSH_URL);

    const restored = await restorePushUrl(work);
    expect(restored.status).toBe("restored");
    // Compare resolved paths -- git may normalize separators on Windows.
    expect(fixtureGit(work, ["remote", "get-url", "--push", "origin"]).replace(/\\/g, "/")).toBe(
      bare.replace(/\\/g, "/"),
    );
  });

  it("a push succeeds again once both controls are undone", async () => {
    const { work } = await repoWithRemote();
    await installPrePushHook(work);
    await disablePushUrl(work);
    expect(tryPush(work).ok).toBe(false);

    await removePrePushHook(work);
    await restorePushUrl(work);

    expect(tryPush(work).ok).toBe(true);
  });
});

describe("hook-manager collision guard (R7)", () => {
  it("refuses rather than clobbering an existing core.hooksPath", async () => {
    // Not hypothetical: this repository's own core.hooksPath is .husky/_,
    // running lint, typecheck and the full suite. A naive install would have
    // silently disabled all of it while appearing to add protection.
    const { work } = await repoWithRemote();
    fixtureGit(work, ["config", "--local", "core.hooksPath", ".husky/_"]);

    const outcome = await installPrePushHook(work);

    expect(outcome.status).toBe("refused-foreign-hooks-path");
    if (outcome.status === "refused-foreign-hooks-path") {
      expect(outcome.existing).toBe(".husky/_");
    }
    // The foreign setting must be exactly as it was.
    expect(await readHooksPath(work)).toBe(".husky/_");
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

  it("leaves a foreign hooks path alone when removing", async () => {
    const { work } = await repoWithRemote();
    fixtureGit(work, ["config", "--local", "core.hooksPath", ".husky/_"]);

    await removePrePushHook(work);

    expect(await readHooksPath(work)).toBe(".husky/_");
  });
});

describe("no remote configured", () => {
  it("reports no-remote rather than failing", async () => {
    const dir = await createFixtureDir("push-safety-noremote-");
    fixtureGit(dir, ["init", "-b", "main"]);

    expect((await disablePushUrl(dir)).status).toBe("no-remote");
    expect((await restorePushUrl(dir)).status).toBe("nothing-to-restore");
  });
});
