import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { runGit as fixtureGit, createFixtureDir, removeFixtureDir } from "./helpers/git-fixture.js";
import { VERY_HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";
import type { ArcaneManifest } from "../src/types.js";

/**
 * PRD D-03 / UP02-A-05: an Azure DevOps remote pre-selects external/ado in
 * the tracking questions, in init AND in the update retrofit (one shared
 * helper); any other remote pre-selects nothing.
 */

const { selectMock, confirmMock } = vi.hoisted(() => ({ selectMock: vi.fn(), confirmMock: vi.fn() }));
vi.mock("@inquirer/prompts", () => ({
  select: selectMock,
  confirm: confirmMock,
  input: vi.fn().mockResolvedValue("docs"),
  checkbox: vi.fn().mockResolvedValue([]),
}));
vi.mock("../src/modules/npm-registry.js", () => ({ fetchPublishedFile: vi.fn().mockResolvedValue(undefined) }));

const { detectAdoContext, isAdoRemoteUrl, remoteUrlHost } = await import("../src/modules/ado-context.js");
const { runInit } = await import("../src/commands/init.js");
const { runUpdate } = await import("../src/commands/update.js");

const ASSETS_DIR = join(process.cwd(), "src/assets");
const savedEnv: Record<string, string | undefined> = {};
let home: string;

beforeAll(async () => {
  const dir = await createFixtureDir("up02-a-ado-scopes-");
  await fs.writeFile(join(dir, "global"), "");
  await fs.writeFile(join(dir, "system"), "");
  home = await createFixtureDir("up02-a-ado-home-");
  for (const key of ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM", "HOME", "USERPROFILE"]) savedEnv[key] = process.env[key];
  process.env["GIT_CONFIG_GLOBAL"] = join(dir, "global");
  process.env["GIT_CONFIG_SYSTEM"] = join(dir, "system");
  process.env["HOME"] = home;
  process.env["USERPROFILE"] = home;
});

afterAll(async () => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await removeFixtureDir(home);
});

async function repo(remotes: Record<string, string>): Promise<string> {
  const work = await createFixtureDir("up02-a-ado-work-");
  fixtureGit(work, ["init", "-b", "main"]);
  fixtureGit(work, ["config", "user.name", "Arcane Tests"]);
  fixtureGit(work, ["config", "user.email", "arcane-tests@example.invalid"]);
  await fs.writeFile(join(work, "a.txt"), "hello\n");
  fixtureGit(work, ["add", "-A"]);
  fixtureGit(work, ["commit", "-m", "test: seed"]);
  for (const [name, url] of Object.entries(remotes)) fixtureGit(work, ["remote", "add", name, url]);
  return work;
}

const ADO_HTTPS = "https://dev.azure.com/org/proj/_git/repo";
const GITHUB_HTTPS = "https://github.com/org/repo.git";

describe("isAdoRemoteUrl", () => {
  it.each([
    ADO_HTTPS,
    "https://org@dev.azure.com/org/proj/_git/repo",
    "git@ssh.dev.azure.com:v3/org/proj/repo",
    "ssh://git@ssh.dev.azure.com/v3/org/proj/repo",
    "https://org.visualstudio.com/proj/_git/repo",
    "https://org.visualstudio.com/DefaultCollection/proj/_git/repo",
    "org@vs-ssh.visualstudio.com:v3/org/proj/repo",
    "HTTPS://DEV.AZURE.COM/Org/Proj/_git/Repo",
  ])("true for %s", (url) => {
    expect(isAdoRemoteUrl(url)).toBe(true);
  });

  it.each([
    GITHUB_HTTPS,
    "git@github.com:org/repo.git",
    "https://dev.azure.com.example.net/org/repo",
    "https://notdev.azure.com/org/repo",
    "https://visualstudio.com/org/repo",
    "https://gitlab.com/org/visualstudio.com",
    "/srv/git/repo.git",
    "file:///srv/git/repo.git",
    "C:\\repos\\dev.azure.com",
    "",
  ])("false for %s", (url) => {
    expect(isAdoRemoteUrl(url)).toBe(false);
  });

  it("parses scp-like hosts and ignores drive letters", () => {
    expect(remoteUrlHost("git@ssh.dev.azure.com:v3/o/p/r")).toBe("ssh.dev.azure.com");
    expect(remoteUrlHost("C:\\repo")).toBeUndefined();
  });
});

describe("detectAdoContext (real repositories)", () => {
  it("true with a dev.azure.com remote", async () => {
    expect(await detectAdoContext(await repo({ origin: ADO_HTTPS }))).toBe(true);
  });

  it("true when ANY remote is on ADO, not just origin", async () => {
    expect(await detectAdoContext(await repo({ origin: GITHUB_HTTPS, mirror: "git@ssh.dev.azure.com:v3/o/p/r" }))).toBe(true);
  });

  it("false with a GitHub remote, with no remote, and outside a repository", async () => {
    expect(await detectAdoContext(await repo({ origin: GITHUB_HTTPS }))).toBe(false);
    expect(await detectAdoContext(await repo({}))).toBe(false);
    expect(await detectAdoContext(await createFixtureDir("up02-a-ado-plain-"))).toBe(false);
  });
});

type SelectOpts = { message: string; default?: string; choices: { value: string; description?: string }[] };

function captureSelects(): SelectOpts[] {
  const seen: SelectOpts[] = [];
  selectMock.mockReset();
  selectMock.mockImplementation(async (opts: SelectOpts) => {
    seen.push(opts);
    if (opts.message.includes("installation profile")) return "lite";
    if (opts.message.includes("How will work be tracked")) return "external";
    if (opts.message.includes("Which external tracker")) return "ado";
    if (opts.message.includes("treat this repository's contents")) return "standard";
    if (opts.message.includes("allowed to push to a remote")) return "open";
    throw new Error(`unexpected select: ${opts.message}`);
  });
  confirmMock.mockReset();
  confirmMock.mockImplementation(async (opts: { message: string }) => !opts.message.includes("agent team") && !opts.message.includes("as a hub"));
  return seen;
}

const tracking = (seen: SelectOpts[]) => seen.find((o) => o.message.includes("How will work be tracked"));
const provider = (seen: SelectOpts[]) => seen.find((o) => o.message.includes("Which external tracker"));

describe("the tracking questions pre-select from ADO context, in both paths", () => {
  let realIsTTY: boolean | undefined;
  beforeEach(() => {
    realIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = true;
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    process.stdin.isTTY = realIsTTY as boolean;
    vi.restoreAllMocks();
  });

  async function installedRepo(url: string): Promise<string> {
    const work = await repo({ origin: url });
    const manifest: ArcaneManifest = {
      version: "0.0.9",
      profile: "lite",
      installedAt: "2026-01-01T00:00:00.000Z",
      components: [
        { name: "testing-standards", files: [".arcane/governance/testing-standards.md"], installedVersion: "0.0.9" },
      ],
      role: "consumer",
      content_sensitivity: "standard",
      push_policy: "open",
    };
    await fs.writeFile(join(work, ".arcane.json"), JSON.stringify(manifest, null, 2));
    fixtureGit(work, ["add", "-A"]);
    fixtureGit(work, ["commit", "-m", "test: install"]);
    return work;
  }

  it("init: dev.azure.com remote -> external then ado pre-selected", async () => {
    const seen = captureSelects();
    const work = await repo({ origin: ADO_HTTPS });

    await runInit({}, work, ASSETS_DIR, "0.1.0");

    expect(tracking(seen)?.default).toBe("external");
    expect(provider(seen)?.default).toBe("ado");
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("init: github.com remote -> nothing pre-selected", async () => {
    const seen = captureSelects();
    const work = await repo({ origin: GITHUB_HTTPS });

    await runInit({}, work, ASSETS_DIR, "0.1.0");

    expect(tracking(seen)).toBeDefined();
    expect(tracking(seen)?.default).toBeUndefined();
    expect(provider(seen)?.default).toBeUndefined();
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("update retrofit: dev.azure.com remote -> external then ado pre-selected", async () => {
    const work = await installedRepo(ADO_HTTPS);
    const seen = captureSelects();

    await runUpdate({}, work, ASSETS_DIR, "0.1.0");

    expect(tracking(seen)?.default).toBe("external");
    expect(provider(seen)?.default).toBe("ado");
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("update retrofit: github.com remote -> nothing pre-selected", async () => {
    const work = await installedRepo(GITHUB_HTTPS);
    const seen = captureSelects();

    await runUpdate({}, work, ASSETS_DIR, "0.1.0");

    expect(tracking(seen)).toBeDefined();
    expect(tracking(seen)?.default).toBeUndefined();
    expect(provider(seen)?.default).toBeUndefined();
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("every tracking and provider option carries a one-line description of its effect", async () => {
    const seen = captureSelects();
    await runInit({}, await repo({ origin: ADO_HTTPS }), ASSETS_DIR, "0.1.0");

    for (const question of [tracking(seen), provider(seen)]) {
      expect(question).toBeDefined();
      for (const choice of question!.choices) {
        expect(choice.description, choice.value).toMatch(/\S/);
        expect(choice.description).not.toContain("\n");
      }
    }
    expect(provider(seen)!.choices.map((c) => c.value)).toEqual(["ado", "github", "jira", "other"]);
  }, VERY_HEAVY_TEST_TIMEOUT);
});
