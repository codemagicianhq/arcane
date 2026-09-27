import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { runGit as fixtureGit, createFixtureDir } from "./helpers/git-fixture.js";
import { HEAVY_TEST_TIMEOUT, VERY_HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";
import { resolveBuiltCli, BUILT_CLI_SKIP_REASON } from "./helpers/resolve-cli.js";
import { runBlockPush } from "../src/commands/block-push.js";
import {
  installClosedPrWarningHook,
  isClosedPrWarningHookInstalled,
  isHookEnforced,
  undisabledRemotes,
} from "../src/modules/push-safety.js";
import type { ArcaneManifest, PushPolicy } from "../src/types.js";

/**
 * `spell block-push` (ARC-049 decision 1, UP02-A-02). Real repositories, real
 * bare remotes, real pushes -- the assertion that matters is what reaches the
 * remote, not what config says.
 */

const BIN = resolveBuiltCli();
if (!BIN) console.warn(`[block-push.test.ts] ${BUILT_CLI_SKIP_REASON}`);

let scopesDir: string;
let globalConfig: string;
const savedEnv: Record<string, string | undefined> = {};

beforeAll(async () => {
  scopesDir = await createFixtureDir("block-push-scopes-");
  globalConfig = join(scopesDir, "gitconfig-global");
  await fs.writeFile(globalConfig, "");
  await fs.writeFile(join(scopesDir, "gitconfig-system"), "");
  for (const key of ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM"]) savedEnv[key] = process.env[key];
  process.env["GIT_CONFIG_GLOBAL"] = globalConfig;
  process.env["GIT_CONFIG_SYSTEM"] = join(scopesDir, "gitconfig-system");
});

afterAll(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

async function initializedRepo(
  policy?: PushPolicy,
  eol: "\n" | "\r\n" = "\n",
): Promise<{ work: string; bare: string }> {
  const bare = await createFixtureDir("block-push-bare-");
  fixtureGit(bare, ["init", "--bare", "-b", "main"]);
  const work = await createFixtureDir("block-push-work-");
  fixtureGit(work, ["init", "-b", "main"]);
  fixtureGit(work, ["config", "user.name", "Arcane Tests"]);
  fixtureGit(work, ["config", "user.email", "arcane-tests@example.invalid"]);
  const manifest: ArcaneManifest = {
    version: "1.5.1",
    profile: "lite",
    installedAt: "2026-01-01T00:00:00.000Z",
    components: [],
    ...(policy ? { push_policy: policy } : {}),
  };
  await fs.writeFile(join(work, ".arcane.json"), JSON.stringify(manifest, null, 2).replaceAll("\n", eol) + eol);
  fixtureGit(work, ["add", "-A"]);
  fixtureGit(work, ["commit", "-m", "test: seed"]);
  fixtureGit(work, ["remote", "add", "origin", bare]);
  return { work, bare };
}

function push(dir: string, args: string[] = ["origin", "main"]): boolean {
  return (
    spawnSync("git", ["push", ...args], {
      cwd: dir,
      encoding: "utf-8",
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    }).status === 0
  );
}

function remoteHasMain(bare: string): boolean {
  return spawnSync("git", ["rev-parse", "--verify", "main"], { cwd: bare }).status === 0;
}

async function recordedPolicy(work: string): Promise<PushPolicy | undefined> {
  return (JSON.parse(await fs.readFile(join(work, ".arcane.json"), "utf-8")) as ArcaneManifest).push_policy;
}

/** Local config plus the manifest bytes: everything the command could change. */
async function snapshot(work: string): Promise<string> {
  const config = spawnSync("git", ["config", "--local", "--list"], { cwd: work, encoding: "utf-8" }).stdout;
  return `${config}\n---\n${await fs.readFile(join(work, ".arcane.json"), "utf-8")}`;
}

describe("spell block-push", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  const output = (): string =>
    [...logSpy.mock.calls, ...errorSpy.mock.calls].map((c) => String(c[0])).join("\n");

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enforces blocked: a real push, --no-verify push and push-to-URL all fail to reach the remote", async () => {
    const { work, bare } = await initializedRepo("blocked");
    expect(push(work)).toBe(true); // control: the fixture can push before the command runs
    fixtureGit(bare, ["update-ref", "-d", "refs/heads/main"]);

    await runBlockPush(work);

    expect(exitSpy).not.toHaveBeenCalled();
    expect(push(work)).toBe(false);
    expect(push(work, ["--no-verify", "origin", "main"])).toBe(false);
    expect(push(work, [bare, "main"])).toBe(false);
    expect(remoteHasMain(bare)).toBe(false);
    expect(output()).toContain("spell unblock-push");
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("a second run reports already enforced and changes nothing", async () => {
    const { work } = await initializedRepo("blocked");
    await runBlockPush(work);
    const before = await snapshot(work);
    logSpy.mockClear();

    await runBlockPush(work);

    expect(exitSpy).not.toHaveBeenCalled();
    expect(output()).toContain("already blocked and enforced");
    expect(output()).toContain("spell unblock-push");
    expect(await snapshot(work)).toBe(before);
  }, VERY_HEAVY_TEST_TIMEOUT);

  it.each(["open", "guarded", undefined] as const)(
    "a manifest recording %s is recorded as blocked once enforced",
    async (policy) => {
      const { work } = await initializedRepo(policy);

      await runBlockPush(work);

      expect(exitSpy).not.toHaveBeenCalled();
      expect(await recordedPolicy(work)).toBe("blocked");
      expect(await isHookEnforced(work)).toBe(true);
      expect(await undisabledRemotes(work)).toEqual([]);
      expect(push(work)).toBe(false);
    },
    VERY_HEAVY_TEST_TIMEOUT,
  );

  it("preserves the manifest's CRLF line endings when it records blocked", async () => {
    const { work } = await initializedRepo("open", "\r\n");

    await runBlockPush(work);

    const raw = await fs.readFile(join(work, ".arcane.json"), "utf-8");
    expect(raw).toContain('"push_policy": "blocked"');
    expect(raw.replaceAll("\r\n", "")).not.toContain("\n");
    expect(raw.endsWith("\r\n")).toBe(true);
  }, HEAVY_TEST_TIMEOUT);

  it("replaces Arcane's own closed-PR warning hook with the blocking hook instead of refusing it as foreign", async () => {
    const { work, bare } = await initializedRepo("guarded");
    expect((await installClosedPrWarningHook(work)).status).toBe("installed");
    expect(await isClosedPrWarningHookInstalled(work)).toBe(true);

    await runBlockPush(work);

    expect(exitSpy).not.toHaveBeenCalled();
    expect(await isClosedPrWarningHookInstalled(work)).toBe(false);
    expect(await isHookEnforced(work)).toBe(true);
    expect(push(work, [bare, "main"])).toBe(false);
    expect(remoteHasMain(bare)).toBe(false);
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("refuses a foreign core.hooksPath: exit 1, nothing changed, manifest does not claim enforcement", async () => {
    const { work } = await initializedRepo("open");
    fixtureGit(work, ["config", "--local", "core.hooksPath", ".husky/_"]);
    const before = await snapshot(work);

    await runBlockPush(work);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(output()).toContain('core.hooksPath is already ".husky/_"');
    expect(await snapshot(work)).toBe(before);
    expect(await recordedPolicy(work)).toBe("open");
    expect(push(work)).toBe(true);
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("refuses hooks in git's default directory without touching them", async () => {
    const { work } = await initializedRepo("guarded");
    await fs.writeFile(join(work, ".git", "hooks", "pre-commit"), "#!/bin/sh\nexit 0\n");

    await runBlockPush(work);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(output()).toContain("hooks in git's default directory (pre-commit)");
    expect(await recordedPolicy(work)).toBe("guarded");
  }, HEAVY_TEST_TIMEOUT);

  it("a push URL configured outside the repository: exit 1 and the manifest is not changed to blocked", async () => {
    const { work, bare } = await initializedRepo("open");
    spawnSync("git", ["config", "--file", globalConfig, "remote.origin.pushurl", bare]);
    try {
      await runBlockPush(work);

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(output()).toContain("Could not disable the push URL for: origin");
      expect(output()).toContain("NOT fully blocked");
      expect(await recordedPolicy(work)).toBe("open");
    } finally {
      await fs.writeFile(globalConfig, "");
    }
  }, HEAVY_TEST_TIMEOUT);

  it("never loosens: an already-blocked repository stays blocked even when the controls had been removed", async () => {
    const { work } = await initializedRepo("blocked");
    // Controls absent while the manifest says blocked -- the retrofit's state.
    expect(await isHookEnforced(work)).toBe(false);

    await runBlockPush(work);

    expect(await recordedPolicy(work)).toBe("blocked");
    expect(await isHookEnforced(work)).toBe(true);
    expect(output()).toContain("it is now enforced");
  }, HEAVY_TEST_TIMEOUT);

  it("refuses outside an initialized repository", async () => {
    const dir = await createFixtureDir("block-push-uninit-");
    fixtureGit(dir, ["init", "-b", "main"]);

    await runBlockPush(dir);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(output()).toContain('Not initialized. Run "spell init" first.');
    expect(await isHookEnforced(dir)).toBe(false);
  });
});

describe.skipIf(!BIN)("spell block-push — built CLI", () => {
  it("runs without a TTY and exits 0, and a real push is then refused", async () => {
    const { work, bare } = await initializedRepo("guarded");

    const result = spawnSync("node", [BIN!, "block-push"], {
      cwd: work,
      encoding: "utf-8",
      input: "",
      env: { ...process.env },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("spell unblock-push");
    expect(push(work)).toBe(false);
    expect(remoteHasMain(bare)).toBe(false);
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("exits 1 outside an initialized repository", async () => {
    const dir = await createFixtureDir("block-push-cli-uninit-");
    const result = spawnSync("node", [BIN!, "block-push"], { cwd: dir, encoding: "utf-8" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Not initialized");
  }, HEAVY_TEST_TIMEOUT);
});
