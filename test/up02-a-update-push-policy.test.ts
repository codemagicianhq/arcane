import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { runGit as fixtureGit, createFixtureDir } from "./helpers/git-fixture.js";
import { VERY_HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";
import type { ArcaneManifest, PushPolicy } from "../src/types.js";

/**
 * `spell update`'s push_policy retrofit notice (ARC-049 decision 2,
 * UP02-A-03). git.js is NOT mocked: the point is to prove, against a real
 * repository and a real bare remote, that update records the policy and
 * installs nothing.
 */

const { selectMock, confirmMock } = vi.hoisted(() => ({ selectMock: vi.fn(), confirmMock: vi.fn() }));

vi.mock("@inquirer/prompts", () => ({
  select: selectMock,
  confirm: confirmMock,
  input: vi.fn().mockResolvedValue("docs"),
  checkbox: vi.fn().mockResolvedValue([]),
}));
vi.mock("../src/modules/npm-registry.js", () => ({ fetchPublishedFile: vi.fn().mockResolvedValue(undefined) }));

const { runUpdate } = await import("../src/commands/update.js");

const ASSETS_DIR = join(process.cwd(), "src/assets");
const savedEnv: Record<string, string | undefined> = {};

beforeAll(async () => {
  const dir = await createFixtureDir("up02-a-update-scopes-");
  await fs.writeFile(join(dir, "global"), "");
  await fs.writeFile(join(dir, "system"), "");
  for (const key of ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM"]) savedEnv[key] = process.env[key];
  process.env["GIT_CONFIG_GLOBAL"] = join(dir, "global");
  process.env["GIT_CONFIG_SYSTEM"] = join(dir, "system");
});

afterAll(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

async function repoPredatingPushPolicy(extra: Partial<ArcaneManifest> = {}): Promise<{ work: string; bare: string }> {
  const bare = await createFixtureDir("up02-a-update-bare-");
  fixtureGit(bare, ["init", "--bare", "-b", "main"]);
  const work = await createFixtureDir("up02-a-update-work-");
  fixtureGit(work, ["init", "-b", "main"]);
  fixtureGit(work, ["config", "user.name", "Arcane Tests"]);
  fixtureGit(work, ["config", "user.email", "arcane-tests@example.invalid"]);
  const manifest: ArcaneManifest = {
    version: "0.0.9",
    profile: "lite",
    installedAt: "2026-01-01T00:00:00.000Z",
    components: [
      { name: "testing-standards", files: [".arcane/governance/testing-standards.md"], installedVersion: "0.0.9" },
    ],
    role: "consumer",
    tracking_mode: "internal",
    external_provider: null,
    content_sensitivity: "standard",
    ...extra,
  };
  await fs.writeFile(join(work, ".arcane.json"), JSON.stringify(manifest, null, 2));
  fixtureGit(work, ["add", "-A"]);
  fixtureGit(work, ["commit", "-m", "test: seed"]);
  fixtureGit(work, ["remote", "add", "origin", bare]);
  return { work, bare };
}

function answerPushPolicy(answer: PushPolicy) {
  selectMock.mockReset();
  selectMock.mockImplementation(async (opts: { message: string }) => {
    if (opts.message.includes("allowed to push to a remote")) return answer;
    throw new Error(`unexpected select: ${opts.message}`);
  });
  confirmMock.mockReset();
  confirmMock.mockResolvedValue(false);
}

function pushes(dir: string): boolean {
  return (
    spawnSync("git", ["push", "origin", "main"], {
      cwd: dir,
      encoding: "utf-8",
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    }).status === 0
  );
}

function localConfig(dir: string): string {
  return spawnSync("git", ["config", "--local", "--list"], { cwd: dir, encoding: "utf-8" }).stdout;
}

async function recorded(work: string): Promise<ArcaneManifest> {
  return JSON.parse(await fs.readFile(join(work, ".arcane.json"), "utf-8")) as ArcaneManifest;
}

describe("spell update — push_policy retrofit notice (ARC-049 decision 2)", () => {
  let realIsTTY: boolean | undefined;
  let logSpy: ReturnType<typeof vi.spyOn>;
  const output = (): string => logSpy.mock.calls.map((c) => String(c[0])).join("\n");

  beforeEach(() => {
    realIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = true;
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    process.stdin.isTTY = realIsTTY as boolean;
    vi.restoreAllMocks();
  });

  it("blocked: records it, prints the required-action notice naming spell block-push, and installs nothing", async () => {
    const { work } = await repoPredatingPushPolicy();
    answerPushPolicy("blocked");
    const configBefore = localConfig(work);

    await runUpdate({}, work, ASSETS_DIR, "0.1.0");

    expect((await recorded(work)).push_policy).toBe("blocked");
    expect(output()).toContain("Required action");
    expect(output()).toContain("NOT enforced");
    expect(output()).toContain("spell block-push");
    // Decision 7 stands: no hook, no hooks path, no push URL change.
    expect(localConfig(work)).toBe(configBefore);
    await expect(fs.access(join(work, ".arcane", "hooks"))).rejects.toThrow();
    expect(pushes(work)).toBe(true);
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("guarded: prints what guarded does and that nothing is installed", async () => {
    const { work } = await repoPredatingPushPolicy();
    answerPushPolicy("guarded");
    const configBefore = localConfig(work);

    await runUpdate({}, work, ASSETS_DIR, "0.1.0");

    expect((await recorded(work)).push_policy).toBe("guarded");
    expect(output()).toContain('recorded as "guarded". Nothing is installed for it');
    expect(output()).toContain("spell doctor");
    expect(output()).toContain("ask before pushing");
    expect(output()).not.toContain("spell block-push");
    expect(localConfig(work)).toBe(configBefore);
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("open: no notice", async () => {
    const { work } = await repoPredatingPushPolicy();
    answerPushPolicy("open");

    await runUpdate({}, work, ASSETS_DIR, "0.1.0");

    expect((await recorded(work)).push_policy).toBe("open");
    expect(output()).not.toContain("push_policy is now recorded");
    expect(output()).not.toContain("spell block-push");
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("an already-recorded policy is not re-announced on a later update", async () => {
    const { work } = await repoPredatingPushPolicy({ push_policy: "blocked" });
    answerPushPolicy("open");

    await runUpdate({}, work, ASSETS_DIR, "0.1.0");

    expect(selectMock).not.toHaveBeenCalled();
    expect(output()).not.toContain("push_policy is now recorded");
  }, VERY_HEAVY_TEST_TIMEOUT);
});
