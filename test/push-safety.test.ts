import { describe, it, expect, beforeAll, afterAll } from "vitest";
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
  blockedRemotes,
  DISABLED_PUSH_URL,
  ARCANE_HOOKS_DIR,
  installHook,
  isHookInstalled,
  removeHook,
  installClosedPrWarningHook,
  isClosedPrWarningHookInstalled,
} from "../src/modules/push-safety.js";

/**
 * EF-09 R6 requires a REAL local remote, not mocks: the point is to prove a
 * genuine `git push` is actually blocked, not merely that config was written.
 * A prior session shipped a config-only assertion elsewhere and review called
 * it vacuous, so this suite pushes for real and asserts on exit codes.
 */

/**
 * Hermetic git scopes for the CODE UNDER TEST, not just the fixtures.
 *
 * `test/helpers/git-fixture.ts` scrubs the environment for calls it makes
 * itself, but `push-safety` goes through `runGit` → `buildGitEnv()`, which
 * spreads `process.env`. So the suite inherited the developer's real global
 * config: on any machine with a global `core.hooksPath` (pre-commit, a corporate
 * hook manager — exactly the setup finding #1 was about) six tests failed,
 * because `installPrePushHook` correctly refused. The suite has to be hermetic
 * on the machine the fix was written for.
 *
 * Pointing GIT_CONFIG_GLOBAL/SYSTEM at real temp files rather than /dev/null
 * also lets the tests below STAGE a global or system value on purpose, which is
 * how the global-scope regression is exercised for real.
 */
let globalConfig: string;
let systemConfig: string;
const savedEnv: Record<string, string | undefined> = {};

beforeAll(async () => {
  const dir = await createFixtureDir("push-safety-scopes-");
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

/** Writes a value into the staged global/system config file. */
async function setScopedConfig(file: string, key: string, value: string): Promise<void> {
  spawnSync("git", ["config", "--file", file, key, value], { encoding: "utf-8" });
}

async function clearScopedConfig(file: string): Promise<void> {
  await fs.writeFile(file, "");
}

/** Windows paths come back from git with forward slashes; compare on one form. */
function normalizeSeparators(p: string): string {
  return p.split("\\").join("/");
}

/** `git config --get-all` exits 1 when the key is absent; that is not an error here. */
function configValues(dir: string, key: string): string[] {
  const res = spawnSync("git", ["config", "--get-all", key], { cwd: dir, encoding: "utf-8" });
  return (res.stdout ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

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

    expect(await restorePushUrls(work)).toEqual([{ remote: "origin", status: "restored" }]);
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

    await fs.rm(await hookFilePath(work));

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
    const { work } = await repoWithRemote();

    expect(await readHooksPath(work)).toBeUndefined();

    fixtureGit(work, ["config", "--local", "core.hooksPath", ".husky/_"]);
    expect(await readHooksPath(work)).toEqual({ value: ".husky/_", scope: "local" });
  });

  it("refuses an org hook manager configured at GLOBAL scope, and leaves it running", async () => {
    // The regression for review finding #1. An earlier version of this test set
    // only a LOCAL value, so nothing in it distinguished `git config --get` from
    // `git config --local --get` — the very difference being fixed. Staging a
    // real global scope via GIT_CONFIG_GLOBAL is hermetic, so there is no excuse
    // for the weaker version.
    const { work } = await repoWithRemote();
    await setScopedConfig(globalConfig, "core.hooksPath", "/org/hooks");

    try {
      expect(await readHooksPath(work)).toEqual({ value: "/org/hooks", scope: "global" });

      const outcome = await installPrePushHook(work);
      expect(outcome.status).toBe("refused-foreign-hooks-path");
      if (outcome.status === "refused-foreign-hooks-path") expect(outcome.scope).toBe("global");

      // The org's setting is untouched and no hook file was written.
      expect((await readHooksPath(work))?.value).toBe("/org/hooks");
      await expect(fs.access(await hookFilePath(work))).rejects.toThrow();
    } finally {
      await clearScopedConfig(globalConfig);
    }
  });

  it("refuses a hooks path set at SYSTEM scope too, and names that scope", async () => {
    const { work } = await repoWithRemote();
    await setScopedConfig(systemConfig, "core.hooksPath", "/system/hooks");

    try {
      expect(await readHooksPath(work)).toEqual({ value: "/system/hooks", scope: "system" });
      const outcome = await installPrePushHook(work);
      if (outcome.status === "refused-foreign-hooks-path") expect(outcome.scope).toBe("system");
      else expect.unreachable("should have refused");
    } finally {
      await clearScopedConfig(systemConfig);
    }
  });

  it("recognises equivalent spellings of its own hooks path", async () => {
    // The hook fires on a real push for every one of these, so reporting "not
    // enforced" would contradict what git actually does.
    const { work } = await repoWithRemote();
    await installPrePushHook(work);

    for (const spelling of [".arcane/hooks/", "./.arcane/hooks", join(work, ".arcane", "hooks")]) {
      fixtureGit(work, ["config", "--local", "core.hooksPath", spelling]);
      expect(await isHookEnforced(work)).toBe(true);
      expect(tryPush(work).ok).toBe(false);
    }
  });

  it("refuses any foreign hooks path regardless of the scope it came from", async () => {
    // The security-relevant property: refusal keys on "this value is not ours",
    // never on where it was configured.
    const { work } = await repoWithRemote();
    fixtureGit(work, ["config", "--local", "core.hooksPath", "/some/org/hooks"]);

    expect((await installPrePushHook(work)).status).toBe("refused-foreign-hooks-path");
    await expect(fs.access(await hookFilePath(work))).rejects.toThrow();
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
    await fs.writeFile(await hookFilePath(work), "#!/bin/sh\nexit 0\n");

    expect((await installPrePushHook(work)).status).toBe("installed");
    expect(tryPush(work).ok).toBe(false);
  });

  it("removes a hooks path set at WORKTREE scope, not just local", async () => {
    // `--local` cannot unset a `config.worktree` value, so accepting worktree
    // scope and then unsetting locally left the hook fully in force while
    // `unblock-push` printed "Push unblocked".
    const { work } = await repoWithRemote();
    await installPrePushHook(work);
    fixtureGit(work, ["config", "extensions.worktreeConfig", "true"]);
    fixtureGit(work, ["config", "--local", "--unset", "core.hooksPath"]);
    fixtureGit(work, ["config", "--worktree", "core.hooksPath", ARCANE_HOOKS_DIR]);
    expect((await readHooksPath(work))?.scope).toBe("worktree");
    expect(await isHookEnforced(work)).toBe(true);

    await removePrePushHook(work);

    expect(await readHooksPath(work)).toBeUndefined();
    expect(await isHookEnforced(work)).toBe(false);
    expect(tryPush(work).ok).toBe(true);
  });

  it("deletes the hook file when removing, so a later init cannot re-arm it", async () => {
    const { work } = await repoWithRemote();
    await installPrePushHook(work);
    await removePrePushHook(work);
    await expect(fs.access(await hookFilePath(work))).rejects.toThrow();
  });

  it("leaves a foreign hooks path alone when removing", async () => {
    const { work } = await repoWithRemote();
    fixtureGit(work, ["config", "--local", "core.hooksPath", ".husky/_"]);
    await removePrePushHook(work);
    expect((await readHooksPath(work))?.value).toBe(".husky/_");
  });
});

describe("generic multi-hook support (ARC-037 decision 2)", () => {
  it("installs a hook under an arbitrary name, not just pre-push", async () => {
    const { work } = await repoWithRemote();

    const outcome = await installHook(work, "pre-commit", "#!/bin/sh\necho hi\n");

    expect(outcome.status).toBe("installed");
    expect(await isHookInstalled(work, "pre-commit", "#!/bin/sh\necho hi\n")).toBe(true);
    await expect(fs.access(await hookFilePath(work, "pre-commit"))).resolves.toBeUndefined();
  });

  it("a second Arcane hook joins the already-claimed directory rather than being refused as foreign", async () => {
    const { work } = await repoWithRemote();
    await installPrePushHook(work);

    const outcome = await installHook(work, "pre-commit", "#!/bin/sh\necho hi\n");

    expect(outcome.status).toBe("installed");
    // Both hooks now live side by side under the one claimed core.hooksPath.
    expect(await isHookEnforced(work)).toBe(true);
    expect(await isHookInstalled(work, "pre-commit", "#!/bin/sh\necho hi\n")).toBe(true);
  });

  it("removing one hook does not disable a sibling hook still installed", async () => {
    const { work } = await repoWithRemote();
    await installPrePushHook(work);
    await installHook(work, "pre-commit", "#!/bin/sh\necho hi\n");

    await removeHook(work, "pre-commit");

    // The sibling pre-push hook, and the shared core.hooksPath claim it still
    // needs, must survive removing a DIFFERENT hook from the same directory.
    expect(await isHookEnforced(work)).toBe(true);
    await expect(fs.access(await hookFilePath(work, "pre-commit"))).rejects.toThrow();
  });

  it("removing the LAST remaining hook does unclaim core.hooksPath, matching the original single-hook behavior", async () => {
    const { work } = await repoWithRemote();
    await installHook(work, "pre-commit", "#!/bin/sh\necho hi\n");

    await removeHook(work, "pre-commit");

    expect(await readHooksPath(work)).toBeUndefined();
  });
});

describe("closed-PR push warning (ARC-035 decision 4)", () => {
  it("installs successfully on a repo with no existing hook", async () => {
    const { work } = await repoWithRemote();

    const outcome = await installClosedPrWarningHook(work);

    expect(outcome.status).toBe("installed");
    expect(await isClosedPrWarningHookInstalled(work)).toBe(true);
  });

  it("is distinguished from the blocking pre-push hook, not just 'some hook exists'", async () => {
    const { work } = await repoWithRemote();
    await installPrePushHook(work);

    // The blocking hook occupies the "pre-push" slot; the warning hook does not.
    expect(await isHookEnforced(work)).toBe(true);
    expect(await isClosedPrWarningHookInstalled(work)).toBe(false);
  });

  it("replaces the blocking hook when installed into the same slot (caller's job to gate this, not this function's)", async () => {
    const { work } = await repoWithRemote();
    await installPrePushHook(work);

    await installClosedPrWarningHook(work);

    expect(await isHookEnforced(work)).toBe(false);
    expect(await isClosedPrWarningHookInstalled(work)).toBe(true);
  });

  it("removePrePushHook removes it too -- same generic 'pre-push' slot as the blocking hook", async () => {
    const { work } = await repoWithRemote();
    await installClosedPrWarningHook(work);

    await removePrePushHook(work);

    expect(await isClosedPrWarningHookInstalled(work)).toBe(false);
    expect(await readHooksPath(work)).toBeUndefined();
  });

  it("the installed hook body never blocks a real push (no gh on PATH in this fixture, and the remote isn't github.com either)", async () => {
    const { work } = await repoWithRemote();
    await installClosedPrWarningHook(work);

    const { ok } = tryPush(work);

    expect(ok).toBe(true);
  });
});

describe("awkward but legal remote configurations", () => {
  // Every test in this block does several real git operations (fixture repo
  // creation, remote add/rename/restore, real pushes) and was confirmed
  // timing out at vitest's default 5000ms under full-suite contention (5 of
  // these 6 in one run, a different 1 of them on immediate retry -- TODO.md,
  // found 2026-09-01). None is individually slow in isolation; all six get
  // the same margin used elsewhere in this suite for contention-prone tests.
  it("covers a remote whose name is not a legal trailing config key", async () => {
    // `my_remote` is a legal remote name but an illegal last config-key segment.
    // The flat `arcane.originalPushUrl.<remote>` key made git error, which threw
    // out of the loop and left EVERY remote after it live — in a repository the
    // operator had just been told was blocked.
    const { work } = await repoWithRemote();
    const second = await createFixtureDir("push-safety-odd-");
    fixtureGit(second, ["init", "--bare", "-b", "main"]);
    fixtureGit(work, ["remote", "add", "my_remote", second]);
    const third = await createFixtureDir("push-safety-odd2-");
    fixtureGit(third, ["init", "--bare", "-b", "main"]);
    fixtureGit(work, ["remote", "add", "team.backup", third]);

    const results = await disablePushUrls(work);

    expect(results.filter((r) => r.status === "failed")).toEqual([]);
    expect(await undisabledRemotes(work)).toEqual([]);
    // The consequence, not just the bookkeeping: every one is actually blocked.
    for (const remote of ["origin", "my_remote", "team.backup"]) {
      expect(tryPush(work, ["--no-verify", remote, "main"]).ok).toBe(false);
    }
  }, 15_000);

  it("keeps `origin` and `Origin` apart instead of collapsing them onto one key", async () => {
    // Trailing key segments are case-INSENSITIVE, so the flat key lost one of
    // the two originals and restore pointed a remote at the OTHER remote's URL —
    // the wrong-remote push this whole feature exists to prevent.
    const { work, bare } = await repoWithRemote();
    const upper = await createFixtureDir("push-safety-upper-");
    fixtureGit(upper, ["init", "--bare", "-b", "main"]);
    fixtureGit(work, ["remote", "add", "Origin", upper]);

    await disablePushUrls(work);
    await restorePushUrls(work);

    const normalize = (p: string): string => p.replace(/\\/g, "/");
    expect(normalize(fixtureGit(work, ["remote", "get-url", "--push", "origin"]))).toBe(
      normalize(bare),
    );
    expect(normalize(fixtureGit(work, ["remote", "get-url", "--push", "Origin"]))).toBe(
      normalize(upper),
    );
  }, 15_000);

  it("blocks BOTH urls of a mirror remote and restores both", async () => {
    // `git remote set-url --push` refuses a remote with multiple push URLs
    // ("has multiple values"), which used to abort the run with both mirrors
    // still pushable.
    const { work, bare } = await repoWithRemote();
    const mirror = await createFixtureDir("push-safety-mirror-");
    fixtureGit(mirror, ["init", "--bare", "-b", "main"]);
    fixtureGit(work, ["remote", "set-url", "--push", "--add", "origin", bare]);
    fixtureGit(work, ["remote", "set-url", "--push", "--add", "origin", mirror]);

    expect((await disablePushUrls(work)).filter((r) => r.status === "failed")).toEqual([]);
    expect(tryPush(work, ["--no-verify", "origin", "main"]).ok).toBe(false);

    await restorePushUrls(work);
    expect(configValues(work, "remote.origin.pushurl")).toHaveLength(2);
  }, 15_000);

  it("does not pin a pushurl that was never there", async () => {
    // A remote with no pushurl key pushes to its fetch URL. Writing the resolved
    // URL into a new pushurl key means a later `git remote set-url` changes
    // fetch only, and pushes silently keep going to the old location.
    const { work } = await repoWithRemote();
    expect(configValues(work, "remote.origin.pushurl")).toEqual([]);

    await disablePushUrls(work);
    await restorePushUrls(work);

    expect(configValues(work, "remote.origin.pushurl")).toEqual([]);
  }, 15_000);

  it("survives a remote renamed while blocked", async () => {
    // `git remote rename` moves the whole `remote.<name>.*` section, custom keys
    // included — which the flat key did not get, leaving the record orphaned and
    // the renamed remote permanently blocked while unblock reported success.
    const { work } = await repoWithRemote();
    await disablePushUrls(work);
    fixtureGit(work, ["remote", "rename", "origin", "upstream"]);

    const results = await restorePushUrls(work);

    expect(results).toEqual([{ remote: "upstream", status: "restored" }]);
    expect(await blockedRemotes(work)).toEqual([]);
    expect(tryPush(work, ["upstream", "main"]).ok).toBe(true);
  }, 15_000);

  it("does not enshrine the sentinel as the original when disabled twice", async () => {
    const { work, bare } = await repoWithRemote();
    await disablePushUrls(work);
    await disablePushUrls(work);
    await disablePushUrls(work);

    await restorePushUrls(work);
    expect(fixtureGit(work, ["remote", "get-url", "--push", "origin"]).replace(/\\/g, "/")).toBe(
      bare.replace(/\\/g, "/"),
    );
  }, 15_000);
});

describe("push URLs configured outside this repository", () => {
  it("refuses rather than pretending to cover a globally-configured push URL", async () => {
    // The worst shape available, and it shipped in 0.20.0: `remote.<r>.pushurl`
    // is multivalued and git collects values across scopes, so a local
    // --replace-all APPENDS the sentinel rather than replacing the live URL.
    // The outside value sorts first, git delivers the push to it and only then
    // fails on the sentinel -- exit 128, history already gone, doctor green.
    const { work, bare } = await repoWithRemote();
    await setScopedConfig(globalConfig, "remote.origin.pushurl", bare);

    try {
      const results = await disablePushUrls(work);
      expect(results[0]?.status).toBe("failed");
      expect(results[0]?.reason).toContain("global");
      // And doctor must not claim coverage.
      expect(await undisabledRemotes(work)).toEqual(["origin"]);
    } finally {
      await clearScopedConfig(globalConfig);
    }
  });

  it("reports a remote as open when only a local sentinel sits under an outside URL", async () => {
    // Guards the reporting half independently: even if a sentinel is present
    // locally, an outside URL means the remote is still a live delivery path.
    const { work, bare } = await repoWithRemote();
    fixtureGit(work, ["config", "--local", "--replace-all", "remote.origin.pushurl", DISABLED_PUSH_URL]);
    await setScopedConfig(globalConfig, "remote.origin.pushurl", bare);

    try {
      expect(await undisabledRemotes(work)).toEqual(["origin"]);
      // Prove the consequence rather than trusting the report.
      expect(tryPush(work, ["--no-verify", "origin", "main"]).ok).toBe(false);
      expect(fixtureGit(bare, ["log", "--oneline", "-1", "main"])).toContain("test: seed");
    } finally {
      await clearScopedConfig(globalConfig);
    }
  });
});

describe("records left by the released 0.20.0", () => {
  it("does not apply a legacy record when remote names collide case-insensitively", async () => {
    // 0.20.0 stored originals under a flat, case-INSENSITIVE key, so `origin`
    // and `Origin` shared one entry and only the last writer survived. Applying
    // it points one remote at the other's URL and reports a clean success --
    // the wrong-remote push this release exists to fix, handed to exactly the
    // population the release note tells to upgrade.
    const { work } = await repoWithRemote();
    const upper = await createFixtureDir("push-safety-legacy-upper-");
    fixtureGit(upper, ["init", "--bare", "-b", "main"]);
    fixtureGit(work, ["remote", "add", "Origin", upper]);

    // Replay 0.20.0's state: sentinel in place, one shared flat key.
    for (const remote of ["origin", "Origin"]) {
      fixtureGit(work, ["config", "--local", "--replace-all", `remote.${remote}.pushurl`, DISABLED_PUSH_URL]);
    }
    fixtureGit(work, ["config", "--local", "arcane.originalPushUrl.origin", "/wherever/lower.git"]);

    const results = await restorePushUrls(work);

    expect(results.every((r) => r.status === "failed")).toBe(true);
    expect(results[0]?.reason).toContain("differ only by case");
    // Nothing was applied, so neither remote was pointed at the other's URL.
    for (const remote of ["origin", "Origin"]) {
      expect(fixtureGit(work, ["config", "--get", `remote.${remote}.pushurl`])).toBe(DISABLED_PUSH_URL);
    }
  });

  it("does not apply a legacy record to a remote that is not actually blocked", async () => {
    // The flat key survives `git remote remove`, unlike a remote.<name>.* key.
    // A remote deleted and re-pointed while blocked would be restored to the
    // OLD target — silently sending history somewhere the operator moved away
    // from.
    const { work } = await repoWithRemote();
    const elsewhere = await createFixtureDir("push-safety-legacy-new-");
    fixtureGit(elsewhere, ["init", "--bare", "-b", "main"]);
    fixtureGit(work, ["remote", "remove", "origin"]);
    fixtureGit(work, ["remote", "add", "origin", elsewhere]);
    fixtureGit(work, ["config", "--local", "arcane.originalPushUrl.origin", "/wherever/secret.git"]);

    const results = await restorePushUrls(work);

    expect(results[0]?.status).toBe("failed");
    expect(results[0]?.reason).toContain("not currently blocked");
    expect(configValues(work, "remote.origin.pushurl")).toEqual([]);
  });

  it("does apply an unambiguous legacy record", async () => {
    // The fallback must still work for the ordinary single-remote case, or
    // 0.20.0 users are stranded.
    const { work } = await repoWithRemote();
    fixtureGit(work, ["config", "--local", "--replace-all", "remote.origin.pushurl", DISABLED_PUSH_URL]);
    fixtureGit(work, ["config", "--local", "arcane.originalPushUrl.origin", "/wherever/real.git"]);

    expect(await restorePushUrls(work)).toEqual([{ remote: "origin", status: "restored" }]);
    expect(fixtureGit(work, ["config", "--get", "remote.origin.pushurl"])).toBe("/wherever/real.git");
    expect(configValues(work, "arcane.originalPushUrl.origin")).toEqual([]);
  });
});

describe("a neutered hook is not enforcement", () => {
  it("reports not-enforced when the hook body has been replaced with a no-op", async () => {
    // Existence alone is a declaration check wearing an enforcement check's
    // name — one level down from the same defect review already found.
    const { work } = await repoWithRemote();
    await installPrePushHook(work);
    expect(await isHookEnforced(work)).toBe(true);

    await fs.writeFile(await hookFilePath(work), "#!/bin/sh\nexit 0\n");

    expect(await isHookEnforced(work)).toBe(false);
    // And prove the consequence: this hook lets a push straight to a URL through.
    const elsewhere = await createFixtureDir("push-safety-elsewhere-");
    fixtureGit(elsewhere, ["init", "--bare", "-b", "main"]);
    expect(tryPush(work, [elsewhere, "main"]).ok).toBe(true);
  });

  it.skipIf(process.platform === "win32")(
    "reports not-enforced for a correct hook body that is not executable",
    async () => {
      // Git silently skips a non-executable hook on POSIX, so the right content
      // in a non-executable file is a declaration, not enforcement. Skipped on
      // Windows, where git does not consult the bit and chmod is advisory --
      // asserting there would be the vacuous-test failure mode, not coverage.
      const { work } = await repoWithRemote();
      await installPrePushHook(work);
      expect(await isHookEnforced(work)).toBe(true);

      await fs.chmod(await hookFilePath(work), 0o644);

      expect(await isHookEnforced(work)).toBe(false);
      expect(tryPush(work).ok).toBe(true);
    },
  );

  it("reports not-enforced for a zero-byte hook file", async () => {
    const { work } = await repoWithRemote();
    await installPrePushHook(work);
    await fs.writeFile(await hookFilePath(work), "");

    expect(await isHookEnforced(work)).toBe(false);
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

describe("the hook must exist where git actually looks", () => {
  it("fires from a LINKED WORKTREE, not just the checkout that installed it", async () => {
    // The worst defect this feature has had, and it shipped. `core.hooksPath`
    // lives in shared local config, but `.arcane/hooks/` is an untracked
    // directory that exists only where it was created — and git resolves a
    // RELATIVE hooksPath against each worktree's own top level. So every linked
    // worktree inherited the config and had no hook file: the hook layer was
    // simply absent, and `git push <url>` (the bypass only the hook covers)
    // delivered the full history in one ordinary command while doctor reported
    // the repository blocked.
    //
    // Not an edge case: Arcane's own methodology (ARC-028 R3) sends concurrent
    // sessions into linked worktrees.
    const { work, bare } = await repoWithRemote();
    await installPrePushHook(work);

    const worktree = await createFixtureDir("push-safety-linked-");
    await fs.rm(worktree, { recursive: true, force: true });
    fixtureGit(work, ["worktree", "add", worktree, "-b", "topic/x"]);

    expect(await isHookEnforced(worktree)).toBe(true);
    // The consequence, which is the whole point.
    expect(tryPush(worktree, [bare, "topic/x"]).ok).toBe(false);
  });

  it("writes core.hooksPath as an absolute path, so it cannot be re-resolved per worktree", async () => {
    const { work } = await repoWithRemote();
    await installPrePushHook(work);

    const configured = (await readHooksPath(work))?.value ?? "";
    expect(configured).not.toBe(ARCANE_HOOKS_DIR);
    expect(configured.endsWith(ARCANE_HOOKS_DIR)).toBe(true);
  });

  it("installs at the repository root when run from a subdirectory", async () => {
    // `--is-inside-work-tree` is true from any subdirectory, so `spell init` in
    // a monorepo package installed the hook under that package while pointing
    // repo-wide core.hooksPath at a path git resolves from the ROOT. The hook
    // layer was absent everywhere in the repository, doctor reported it in
    // place, and the repo's own .git/hooks stopped firing as collateral.
    const { work, bare } = await repoWithRemote();
    const nested = join(work, "packages", "thing");
    await fs.mkdir(nested, { recursive: true });

    const outcome = await installPrePushHook(nested);
    expect(outcome.status).toBe("installed");
    if (outcome.status === "installed") {
      expect(outcome.path).toBe(join(work, ".arcane", "hooks", "pre-push"));
    }
    expect(tryPush(work, [bare, "main"]).ok).toBe(false);
  });
});

describe("hooks in git's DEFAULT directory are a collision too (R7)", () => {
  it("refuses rather than silently switching off .git/hooks", async () => {
    // The R7 guard only looked at core.hooksPath, so a repository using git's
    // default directory — no hook manager, no config key to collide with — had
    // every hook silently disabled by taking the slot. ARC-034's own stated
    // rationale for R7 applies verbatim; the guard just wasn't looking there.
    const { work } = await repoWithRemote();
    const hooksDir = join(work, ".git", "hooks");
    await fs.writeFile(join(hooksDir, "pre-commit"), "#!/bin/sh\nexit 0\n");

    const outcome = await installPrePushHook(work);

    expect(outcome.status).toBe("refused-default-hooks");
    if (outcome.status === "refused-default-hooks") {
      expect(outcome.hooks).toContain("pre-commit");
    }
    // Nothing written, nothing repointed.
    await expect(fs.access(await hookFilePath(work))).rejects.toThrow();
    expect(await readHooksPath(work)).toBeUndefined();
  });

  it("ignores git's inert .sample templates", async () => {
    // Every fresh repo ships those; treating them as real hooks would refuse
    // every ordinary repository and get the feature switched off.
    const { work } = await repoWithRemote();
    await fs.writeFile(join(work, ".git", "hooks", "pre-commit.sample"), "#!/bin/sh\nexit 0\n");

    expect((await installPrePushHook(work)).status).toBe("installed");
  });
});

describe("a partial unblock stays recoverable", () => {
  it("does not let the manifest's 'open' lock out a retry", async () => {
    // A partial lift writes push_policy "open" while controls remain in force.
    // Keying the retry on the manifest meant the failed attempt closed its own
    // recovery path.
    const { work } = await repoWithRemote();
    await installPrePushHook(work);
    await disablePushUrls(work);

    expect(await blockedRemotes(work)).toEqual(["origin"]);
    expect(await isHookEnforced(work)).toBe(true);

    // Simulate the partial state: manifest lifted, controls untouched.
    await removePrePushHook(work);
    expect(await isHookEnforced(work)).toBe(false);
    // The URL half is still blocked and must still be detectable.
    expect(await blockedRemotes(work)).toEqual(["origin"]);
  });

  it("treats an already-absent key as done rather than a failure", async () => {
    // `git config --unset-all` exits 5 for a missing key. Letting that throw
    // skipped the stale-key cleanup, and a surviving marker made the NEXT
    // block record nothing and the restore after that delete a genuine URL.
    const { work, bare } = await repoWithRemote();
    await disablePushUrls(work);
    fixtureGit(work, ["config", "--local", "--unset-all", "remote.origin.pushurl"]);

    const results = await restorePushUrls(work);
    expect(results[0]?.status).not.toBe("failed");
    expect(configValues(work, "remote.origin.arcaneHadNoPushUrl")).toEqual([]);

    // And the next full cycle must round-trip a genuine URL correctly.
    fixtureGit(work, ["config", "--local", "remote.origin.pushurl", bare]);
    await disablePushUrls(work);
    await restorePushUrls(work);
    expect(configValues(work, "remote.origin.pushurl").map(normalizeSeparators)).toEqual([
      normalizeSeparators(bare),
    ]);
  });
});
