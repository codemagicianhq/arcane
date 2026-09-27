import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { runGit as fixtureGit, createFixtureDir, removeFixtureDir } from "./helpers/git-fixture.js";
import { VERY_HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";
import { isHookEnforced, isClosedPrWarningHookInstalled, undisabledRemotes } from "../src/modules/push-safety.js";
import type { ArcaneManifest } from "../src/types.js";

/**
 * `spell init`'s push_policy path against a real repository and a real bare
 * remote. git.js is deliberately NOT mocked: the controls are only proven by
 * a real push failing.
 */

const { selectMock, confirmMock } = vi.hoisted(() => ({ selectMock: vi.fn(), confirmMock: vi.fn() }));

vi.mock("@inquirer/prompts", () => ({
  select: selectMock,
  confirm: confirmMock,
  checkbox: vi.fn().mockResolvedValue([]),
  input: vi.fn().mockResolvedValue("Agent"),
}));

const { runInit } = await import("../src/commands/init.js");

const ASSETS_DIR = join(process.cwd(), "src/assets");
const saved: Record<string, string | undefined> = {};
let globalConfig: string;
let home: string;

beforeAll(async () => {
  const dir = await createFixtureDir("up02-a-init-scopes-");
  globalConfig = join(dir, "gitconfig-global");
  await fs.writeFile(globalConfig, "");
  await fs.writeFile(join(dir, "gitconfig-system"), "");
  home = await createFixtureDir("up02-a-init-home-");
  for (const key of ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM", "HOME", "USERPROFILE"]) saved[key] = process.env[key];
  process.env["GIT_CONFIG_GLOBAL"] = globalConfig;
  process.env["GIT_CONFIG_SYSTEM"] = join(dir, "gitconfig-system");
  process.env["HOME"] = home;
  process.env["USERPROFILE"] = home;
});

afterAll(async () => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await removeFixtureDir(home);
});

function answer(pushPolicy: "open" | "guarded" | "blocked") {
  selectMock.mockReset();
  selectMock.mockImplementation(async (opts: { message: string }) => {
    if (opts.message.includes("installation profile")) return "lite";
    if (opts.message.includes("How will work be tracked")) return "internal";
    if (opts.message.includes("treat this repository's contents")) return "standard";
    if (opts.message.includes("allowed to push to a remote")) return pushPolicy;
    throw new Error(`unexpected select: ${opts.message}`);
  });
  confirmMock.mockReset();
  confirmMock.mockImplementation(async (opts: { message: string }) => {
    if (opts.message.includes("agent team")) return false;
    if (opts.message.includes("as a hub")) return false;
    return true;
  });
}

async function repoWithRemote(): Promise<{ work: string; bare: string }> {
  const bare = await createFixtureDir("up02-a-init-bare-");
  fixtureGit(bare, ["init", "--bare", "-b", "main"]);
  const work = await createFixtureDir("up02-a-init-work-");
  fixtureGit(work, ["init", "-b", "main"]);
  fixtureGit(work, ["config", "user.name", "Arcane Tests"]);
  fixtureGit(work, ["config", "user.email", "arcane-tests@example.invalid"]);
  await fs.writeFile(join(work, "a.txt"), "hello\n");
  fixtureGit(work, ["add", "-A"]);
  fixtureGit(work, ["commit", "-m", "test: seed"]);
  fixtureGit(work, ["remote", "add", "origin", bare]);
  return { work, bare };
}

function pushes(dir: string, args: string[] = ["origin", "main"]): boolean {
  return (
    spawnSync("git", ["push", ...args], {
      cwd: dir,
      encoding: "utf-8",
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    }).status === 0
  );
}

function logged(spy: { mock: { calls: unknown[][] } }): string {
  return spy.mock.calls.map((c) => String(c[0])).join("\n");
}

describe("spell init — push_policy blocked (interactive answer)", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
  });

  it("installs both controls, prints the same lines as before the refactor, and a real push is refused", async () => {
    const { work, bare } = await repoWithRemote();
    answer("blocked");

    await runInit({}, work, ASSETS_DIR, "0.1.0");

    const manifest = JSON.parse(await fs.readFile(join(work, ".arcane.json"), "utf-8")) as ArcaneManifest;
    expect(manifest.push_policy).toBe("blocked");
    const out = logged(logSpy);
    expect(out).toContain("Installed a pre-push hook that blocks pushes from this repository.");
    expect(out).toContain("Disabled the push URL for: origin (fetch still works).");
    expect(out).toContain("Run `spell unblock-push` from a terminal to undo this.");
    expect(await isHookEnforced(work)).toBe(true);
    expect(await undisabledRemotes(work)).toEqual([]);
    expect(pushes(work)).toBe(false);
    expect(pushes(work, ["--no-verify", "origin", "main"])).toBe(false);
    expect(spawnSync("git", ["rev-parse", "--verify", "main"], { cwd: bare }).status).not.toBe(0);
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("a foreign core.hooksPath is refused with the same warning, and the manifest still records the answer", async () => {
    const { work } = await repoWithRemote();
    fixtureGit(work, ["config", "--local", "core.hooksPath", ".husky/_"]);
    answer("blocked");

    await runInit({}, work, ASSETS_DIR, "0.1.0");

    const out = logged(logSpy);
    expect(out).toContain('Did not install the pre-push hook: core.hooksPath is already ".husky/_"');
    expect(fixtureGit(work, ["config", "--get", "core.hooksPath"])).toBe(".husky/_");
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("open installs the closed-PR warning hook instead, and pushes still work", async () => {
    const { work } = await repoWithRemote();
    answer("open");

    await runInit({}, work, ASSETS_DIR, "0.1.0");

    expect(await isClosedPrWarningHookInstalled(work)).toBe(true);
    expect(pushes(work)).toBe(true);
  }, VERY_HEAVY_TEST_TIMEOUT);
});
