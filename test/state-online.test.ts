import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { join } from "node:path";
import type { ArcaneManifest } from "../src/types.js";
import type { GitSection } from "../src/modules/state/types.js";
import { createFixtureDir, removeFixtureDir } from "./helpers/fixture-dir.js";
import { commitFiles, initRepo, withUpstream } from "./helpers/state-fixtures.js";
import { HEAVY_TEST_TIMEOUT, VERY_HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";

// Both network reads are mocked at the module boundary so the offline path
// can assert zero calls into either (PRD ST-13), and the online path can
// answer without a network.
vi.mock("../src/modules/version-check.js", () => ({
  getFeedUrl: vi.fn().mockReturnValue("https://fake.artifacts.feed/"),
  checkForUpdate: vi.fn().mockResolvedValue({ current: "1.0.0", latest: "1.1.0", updateAvailable: true }),
}));
vi.mock("../src/modules/exec.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/modules/exec.js")>();
  return { ...actual, execFileWithTimeout: vi.fn() };
});

const { collectState } = await import("../src/modules/state/collect.js");
const { collectPullRequest, parseAdoRemote } = await import("../src/modules/state/pull-request.js");
const versionCheck = await import("../src/modules/version-check.js");
const exec = await import("../src/modules/exec.js");

const fixtures: string[] = [];
let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network must not be reached"));
  vi.mocked(exec.execFileWithTimeout).mockReset();
  vi.mocked(versionCheck.checkForUpdate).mockClear();
});

afterEach(async () => {
  fetchSpy.mockRestore();
  for (const dir of fixtures.splice(0)) await removeFixtureDir(dir);
});

async function githubFixture(prefix: string): Promise<string> {
  const parent = await createFixtureDir(prefix);
  fixtures.push(parent);
  const dir = join(parent, "repo");
  await (await import("node:fs/promises")).mkdir(dir);
  initRepo(dir);
  const manifest: ArcaneManifest = { version: "1.0.0", profile: "lite", installedAt: "2026-01-01T00:00:00.000Z", components: [] };
  await commitFiles(dir, "test: seed", { ".arcane.json": JSON.stringify(manifest) });
  await withUpstream(dir, parent, { ahead: 0, behind: 0, originUrl: "https://github.com/ordovica/survey.git" });
  return dir;
}

const git = (overrides: Partial<GitSection> = {}): GitSection => ({
  branch: "sessions/2026-11-04-survey",
  detached: false,
  trunk: "main",
  ahead: 0,
  behind: 0,
  uncommitted: 0,
  remote: { provider: "github", url: "https://github.com/ordovica/survey.git" },
  worktrees: [{ path: ".", branch: "sessions/2026-11-04-survey" }],
  pull_request: null,
  ...overrides,
});

describe("collectState --online (ST-13)", () => {
  it("offline: neither the npm lookup nor the provider CLI runs, and nothing fetches", async () => {
    const dir = await githubFixture("state-online-off");
    const doc = await collectState(dir, "1.0.0", { online: false, includeLocalPaths: false });
    expect(doc.versions.latest).toBeNull();
    expect(doc.versions.drift.cli_behind_latest).toBeNull();
    expect(doc.git?.pull_request).toBeNull();
    expect(doc.warnings).toEqual([]);
    expect(versionCheck.checkForUpdate).not.toHaveBeenCalled();
    expect(exec.execFileWithTimeout).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("online: a mocked gh with one open PR populates git.pull_request, and versions.latest with a boolean drift", async () => {
    const dir = await githubFixture("state-online-pr");
    vi.mocked(exec.execFileWithTimeout).mockResolvedValue({
      stdout: JSON.stringify([{ number: 42, url: "https://github.com/ordovica/survey/pull/42", state: "OPEN" }]),
      stderr: "",
    });
    const doc = await collectState(dir, "1.0.0", { online: true, includeLocalPaths: false });
    expect(doc.git?.pull_request).toEqual({ id: 42, url: "https://github.com/ordovica/survey/pull/42", state: "OPEN" });
    expect(doc.versions.latest).toBe("1.1.0");
    expect(doc.versions.drift.cli_behind_latest).toBe(true);
    expect(doc.warnings).toEqual([]);
    expect(exec.execFileWithTimeout).toHaveBeenCalledWith(
      "gh",
      ["pr", "list", "--head", "main", "--state", "open", "--json", "number,url,state"],
      expect.any(Number),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("online: a missing gh yields pull_request null with one warning, and the document still completes", async () => {
    const dir = await githubFixture("state-online-nogh");
    const missing = Object.assign(new Error("spawn gh ENOENT"), { code: "ENOENT" });
    vi.mocked(exec.execFileWithTimeout).mockRejectedValue(missing);
    const doc = await collectState(dir, "1.0.0", { online: true, includeLocalPaths: false });
    expect(doc.git?.pull_request).toBeNull();
    expect(doc.warnings).toEqual(["git.pull_request: gh pr list failed (the CLI is not installed)"]);
    expect(doc.versions.latest).toBe("1.1.0");
  }, VERY_HEAVY_TEST_TIMEOUT);
});

describe("collectPullRequest", () => {
  const run = vi.fn();

  beforeEach(() => run.mockReset());

  it("is null without a warning when there is no remote or no open PR", async () => {
    expect(await collectPullRequest(git({ remote: null }), { exec: run })).toEqual({ pull_request: null, warnings: [] });
    run.mockResolvedValue({ stdout: "[]", stderr: "" });
    expect(await collectPullRequest(git(), { exec: run })).toEqual({ pull_request: null, warnings: [] });
  });

  it("warns on a detached HEAD, an unsupported provider, a timeout, a non-zero exit, and unparseable output", async () => {
    const detached = await collectPullRequest(git({ branch: "abc1234", detached: true }), { exec: run });
    expect(detached.pull_request).toBeNull();
    expect(detached.warnings[0]).toContain("no branch is checked out");
    expect(run).not.toHaveBeenCalled();

    const other = await collectPullRequest(git({ remote: { provider: "other", url: "https://gitlab.example/x.git" } }), { exec: run });
    expect(other.warnings[0]).toContain("no pull-request lookup for a other remote");

    run.mockRejectedValueOnce(Object.assign(new Error("killed"), { killed: true }));
    expect((await collectPullRequest(git(), { exec: run })).warnings[0]).toContain("timed out");

    run.mockRejectedValueOnce(new Error("Command failed: gh pr list\nerror: not logged in"));
    expect((await collectPullRequest(git(), { exec: run })).warnings[0]).toBe("git.pull_request: gh pr list failed (Command failed: gh pr list)");

    run.mockResolvedValueOnce({ stdout: "not json", stderr: "" });
    expect((await collectPullRequest(git(), { exec: run })).warnings[0]).toContain("other than JSON");
    run.mockResolvedValueOnce({ stdout: "{}", stderr: "" });
    expect((await collectPullRequest(git(), { exec: run })).warnings[0]).toContain("other than a list");
    run.mockResolvedValueOnce({ stdout: '[{"number":"x"}]', stderr: "" });
    expect((await collectPullRequest(git(), { exec: run })).warnings[0]).toContain("without number, url and state");
  });

  it("looks an Azure DevOps remote up with az repos pr list through the resolved launcher, and builds the PR URL", async () => {
    run.mockResolvedValue({ stdout: JSON.stringify([{ pullRequestId: 7, status: "active" }]), stderr: "" });
    const launch = { file: "C:/azure/python.exe", prefixArgs: ["-IBm", "azure.cli"], env: { AZ_INSTALLER: "MSI" } };
    const result = await collectPullRequest(
      git({ remote: { provider: "ado", url: "https://dev.azure.com/tidewright/coastal%20repair/_git/repair" } }),
      { exec: run, azureLaunch: launch },
    );
    expect(result).toEqual({
      pull_request: { id: 7, url: "https://dev.azure.com/tidewright/coastal%20repair/_git/repair/pullrequest/7", state: "active" },
      warnings: [],
    });
    expect(run).toHaveBeenCalledWith(
      "C:/azure/python.exe",
      [
        "-IBm", "azure.cli", "repos", "pr", "list",
        "--source-branch", "sessions/2026-11-04-survey", "--status", "active",
        "--org", "https://dev.azure.com/tidewright", "--project", "coastal repair", "--repository", "repair",
        "--output", "json",
      ],
      expect.any(Number),
      { env: { AZ_INSTALLER: "MSI" } },
    );
  });

  it("warns when the Azure DevOps remote cannot be parsed, when az fails, or when its output is not a list of PRs", async () => {
    const launch = { file: "az", prefixArgs: [] };
    const bad = await collectPullRequest(git({ remote: { provider: "ado", url: "https://dev.azure.com/tidewright" } }), { exec: run, azureLaunch: launch });
    expect(bad.warnings[0]).toContain("names no organization");
    const ado = git({ remote: { provider: "ado", url: "https://dev.azure.com/tidewright/platform/_git/repair" } });
    run.mockRejectedValueOnce(Object.assign(new Error("spawn az ENOENT"), { code: "ENOENT" }));
    expect((await collectPullRequest(ado, { exec: run, azureLaunch: launch })).warnings[0]).toBe("git.pull_request: az repos pr list failed (the CLI is not installed)");
    run.mockResolvedValueOnce({ stdout: "nope", stderr: "" });
    expect((await collectPullRequest(ado, { exec: run, azureLaunch: launch })).warnings[0]).toContain("other than JSON");
    run.mockResolvedValueOnce({ stdout: "{}", stderr: "" });
    expect((await collectPullRequest(ado, { exec: run, azureLaunch: launch })).warnings[0]).toContain("other than a list");
    run.mockResolvedValueOnce({ stdout: "[]", stderr: "" });
    expect(await collectPullRequest(ado, { exec: run, azureLaunch: launch })).toEqual({ pull_request: null, warnings: [] });
    run.mockResolvedValueOnce({ stdout: '[{"status":"active"}]', stderr: "" });
    expect((await collectPullRequest(ado, { exec: run, azureLaunch: launch })).warnings[0]).toContain("without pullRequestId and status");
  });
});

describe("parseAdoRemote", () => {
  it("reads the three Azure DevOps URL forms and rejects anything else", () => {
    expect(parseAdoRemote("https://dev.azure.com/tidewright/platform/_git/repair")).toEqual({ org: "tidewright", project: "platform", repo: "repair" });
    expect(parseAdoRemote("https://tidewright@dev.azure.com/tidewright/platform/_git/repair")).toEqual({ org: "tidewright", project: "platform", repo: "repair" });
    expect(parseAdoRemote("https://tidewright.visualstudio.com/platform/_git/repair")).toEqual({ org: "tidewright", project: "platform", repo: "repair" });
    expect(parseAdoRemote("https://tidewright.visualstudio.com/DefaultCollection/platform/_git/repair")).toEqual({ org: "tidewright", project: "platform", repo: "repair" });
    expect(parseAdoRemote("git@ssh.dev.azure.com:v3/tidewright/platform/repair")).toEqual({ org: "tidewright", project: "platform", repo: "repair" });
    expect(parseAdoRemote("https://github.com/ordovica/survey.git")).toBeNull();
  });
});

describe("collectState online on a repository with no remote", () => {
  it("leaves pull_request null and warns about nothing", async () => {
    const dir = await createFixtureDir("state-online-noremote");
    fixtures.push(dir);
    initRepo(dir);
    const manifest: ArcaneManifest = { version: "1.0.0", profile: "lite", installedAt: "2026-01-01T00:00:00.000Z", components: [] };
    await commitFiles(dir, "test: seed", { ".arcane.json": JSON.stringify(manifest) });
    const doc = await collectState(dir, "1.0.0", { online: true, includeLocalPaths: false });
    expect(doc.git?.pull_request).toBeNull();
    expect(doc.warnings).toEqual([]);
    expect(exec.execFileWithTimeout).not.toHaveBeenCalled();
  }, HEAVY_TEST_TIMEOUT);
});
