import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ArcaneManifest } from "../src/types.js";
import { canonicalSpellPath } from "../src/modules/spell-compiler.js";
import { USER_FANOUT_PATHS, storeSpellPath, syncUserTierFanout } from "../src/modules/user-tier.js";
import { resolveBuiltCli, BUILT_CLI_SKIP_REASON } from "./helpers/resolve-cli.js";
import { removeFixtureDir } from "./helpers/fixture-dir.js";

// ─── Mock version-check so tests never hit the network ───────────────────────
vi.mock("../src/modules/version-check.js", () => ({
  getFeedUrl: vi.fn().mockReturnValue("https://fake.artifacts.feed/"),
  checkForUpdate: vi.fn().mockResolvedValue({
    current: "0.1.0",
    latest: "0.1.0",
    updateAvailable: false,
  }),
}));

const { runStatus } = await import("../src/commands/status.js");
const versionCheck = await import("../src/modules/version-check.js");

const BIN = resolveBuiltCli();
if (!BIN) console.warn(`[status.test.ts] ${BUILT_CLI_SKIP_REASON}`);
const PACKAGE_VERSION = "0.1.0";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function writeManifest(dir: string, partial?: Partial<ArcaneManifest>) {
  const manifest: ArcaneManifest = {
    version: PACKAGE_VERSION,
    profile: "lite",
    installedAt: "2026-01-01T00:00:00.000Z",
    components: [],
    ...partial,
  };
  await fs.writeFile(join(dir, ".arcane.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe("spell status — handler", () => {
  let tmpDir: string;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "status-test-"));
    logSpy = vi.spyOn(console, "log").mockImplementation(() => { });
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
    // Reset mocks to defaults before each test
    vi.mocked(versionCheck.getFeedUrl).mockReturnValue("https://fake.artifacts.feed/");
    vi.mocked(versionCheck.checkForUpdate).mockResolvedValue({
      current: PACKAGE_VERSION,
      latest: PACKAGE_VERSION,
      updateAvailable: false,
    });
  });

  afterEach(async () => {
    await removeFixtureDir(tmpDir);
    vi.clearAllMocks();
  });

  // ─── Not initialized ───────────────────────────────────────────────────────

  it("prints helpful error and exits 1 when not initialized", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => { }) as never);

    await runStatus(tmpDir, PACKAGE_VERSION);

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("spell init"));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  // ─── No components ─────────────────────────────────────────────────────────

  it("prints 'No components installed.' when manifest is empty", async () => {
    await writeManifest(tmpDir, { components: [] });

    await runStatus(tmpDir, PACKAGE_VERSION);

    expect(logSpy).toHaveBeenCalledWith("No components installed.");
  });

  // ─── Component table ───────────────────────────────────────────────────────

  it("shows each installed component with name, file count, and version", async () => {
    await writeManifest(tmpDir, {
      components: [
        {
          name: "testing-standards",
          files: ["governance/testing-standards.md"],
          installedVersion: PACKAGE_VERSION,
        },
        {
          name: "git-conventions",
          files: [".arcane/governance/git-conventions.md"],
          installedVersion: PACKAGE_VERSION,
        },
      ],
    });

    await runStatus(tmpDir, PACKAGE_VERSION);

    const allOutput = logSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(allOutput).toContain("testing-standards");
    expect(allOutput).toContain("git-conventions");
    expect(allOutput).toContain("1");
    expect(allOutput).toContain(PACKAGE_VERSION);
  });

  it("shows column headers: Component, Files, Version", async () => {
    await writeManifest(tmpDir, {
      components: [
        {
          name: "testing-standards",
          files: ["governance/testing-standards.md"],
          installedVersion: PACKAGE_VERSION,
        },
      ],
    });

    await runStatus(tmpDir, PACKAGE_VERSION);

    const allOutput = logSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(allOutput).toContain("Component");
    expect(allOutput).toContain("Files");
    expect(allOutput).toContain("Version");
  });

  // ─── Version footer ────────────────────────────────────────────────────────

  it("shows installed and latest version in footer", async () => {
    await writeManifest(tmpDir, {
      components: [
        {
          name: "testing-standards",
          files: ["governance/testing-standards.md"],
          installedVersion: PACKAGE_VERSION,
        },
      ],
    });
    vi.mocked(versionCheck.checkForUpdate).mockResolvedValue({
      current: PACKAGE_VERSION,
      latest: "0.2.0",
      updateAvailable: false,
    });

    await runStatus(tmpDir, PACKAGE_VERSION);

    const footerLine = logSpy.mock.calls
      .map((c) => c[0] as string)
      .find((l) => l.includes("Installed:"));

    expect(footerLine).toBeDefined();
    expect(footerLine).toContain(`Installed: ${PACKAGE_VERSION}`);
    expect(footerLine).toContain("Latest: 0.2.0");
  });

  it("shows 'spell update available' when updateAvailable is true", async () => {
    await writeManifest(tmpDir, {
      version: "0.0.9",
      components: [
        {
          name: "testing-standards",
          files: ["governance/testing-standards.md"],
          installedVersion: "0.0.9",
        },
      ],
    });
    vi.mocked(versionCheck.checkForUpdate).mockResolvedValue({
      current: "0.0.9",
      latest: PACKAGE_VERSION,
      updateAvailable: true,
    });

    await runStatus(tmpDir, PACKAGE_VERSION);

    const allOutput = logSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(allOutput).toContain("spell update available");
  });

  it("shows 'unable to check' when version check returns an error", async () => {
    await writeManifest(tmpDir, {
      components: [
        {
          name: "testing-standards",
          files: ["governance/testing-standards.md"],
          installedVersion: PACKAGE_VERSION,
        },
      ],
    });
    vi.mocked(versionCheck.checkForUpdate).mockResolvedValue({
      current: PACKAGE_VERSION,
      latest: null,
      updateAvailable: false,
      error: "Network timeout",
    });

    await runStatus(tmpDir, PACKAGE_VERSION);

    const allOutput = logSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(allOutput).toContain("unable to check");
  });

  it("does NOT show 'spell update available' when already at latest", async () => {
    await writeManifest(tmpDir, {
      components: [
        {
          name: "testing-standards",
          files: ["governance/testing-standards.md"],
          installedVersion: PACKAGE_VERSION,
        },
      ],
    });
    vi.mocked(versionCheck.checkForUpdate).mockResolvedValue({
      current: PACKAGE_VERSION,
      latest: PACKAGE_VERSION,
      updateAvailable: false,
    });

    await runStatus(tmpDir, PACKAGE_VERSION);

    const allOutput = logSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(allOutput).not.toContain("spell update available");
  });

  // ─── Version-drift diagram (ARC-036 R8) ────────────────────────────────────

  describe("version-drift diagram", () => {
    let isTTYDescriptor: PropertyDescriptor | undefined;

    beforeEach(() => {
      isTTYDescriptor = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");
    });

    afterEach(() => {
      if (isTTYDescriptor) {
        Object.defineProperty(process.stdout, "isTTY", isTTYDescriptor);
      } else {
        delete (process.stdout as { isTTY?: boolean }).isTTY;
      }
    });

    function setTTY(value: boolean) {
      Object.defineProperty(process.stdout, "isTTY", {
        value,
        configurable: true,
      });
    }

    it("shows no diagram and no drift text when axis A and axis B both match (guard)", async () => {
      setTTY(true);
      await writeManifest(tmpDir, {
        version: PACKAGE_VERSION,
        components: [{ name: "testing-standards", files: ["x.md"], installedVersion: PACKAGE_VERSION }],
      });
      vi.mocked(versionCheck.checkForUpdate).mockResolvedValue({
        current: PACKAGE_VERSION,
        latest: PACKAGE_VERSION,
        updateAvailable: false,
      });

      await runStatus(tmpDir, PACKAGE_VERSION);

      const allOutput = logSpy.mock.calls.map((c) => c[0] as string).join("\n");
      expect(allOutput).not.toContain("Version drift");
      expect(allOutput).not.toContain("gitGraph");
    });

    it("shows no diagram when the npm check failed (latest is null)", async () => {
      setTTY(true);
      await writeManifest(tmpDir, {
        version: "0.14.0",
        components: [{ name: "testing-standards", files: ["x.md"], installedVersion: "0.14.0" }],
      });
      vi.mocked(versionCheck.checkForUpdate).mockResolvedValue({
        current: PACKAGE_VERSION,
        latest: null,
        updateAvailable: false,
        error: "Network timeout",
      });

      await runStatus(tmpDir, PACKAGE_VERSION);

      const allOutput = logSpy.mock.calls.map((c) => c[0] as string).join("\n");
      expect(allOutput).not.toContain("Version drift");
      expect(allOutput).not.toContain("gitGraph");
    });

    it("shows plain aligned text, not a fenced diagram, on a TTY", async () => {
      setTTY(true);
      await writeManifest(tmpDir, {
        version: "0.14.0",
        components: [{ name: "testing-standards", files: ["x.md"], installedVersion: "0.14.0" }],
      });
      vi.mocked(versionCheck.checkForUpdate).mockResolvedValue({
        current: PACKAGE_VERSION,
        latest: "0.22.1",
        updateAvailable: true,
      });

      await runStatus(tmpDir, PACKAGE_VERSION);

      const allOutput = logSpy.mock.calls.map((c) => c[0] as string).join("\n");
      expect(allOutput).toContain("Version drift:");
      expect(allOutput).toContain("repo-files:    0.14.0");
      expect(allOutput).toContain(`installed-cli: ${PACKAGE_VERSION}`);
      expect(allOutput).toContain("latest (npm):  0.22.1");
      expect(allOutput).not.toContain("```mermaid");
      expect(allOutput).not.toContain("gitGraph");
    });

    it("shows the fenced gitGraph diagram, not text, when piped (not a TTY)", async () => {
      setTTY(false);
      await writeManifest(tmpDir, {
        version: "0.14.0",
        components: [{ name: "testing-standards", files: ["x.md"], installedVersion: "0.14.0" }],
      });
      vi.mocked(versionCheck.checkForUpdate).mockResolvedValue({
        current: PACKAGE_VERSION,
        latest: "0.22.1",
        updateAvailable: true,
      });

      await runStatus(tmpDir, PACKAGE_VERSION);

      const allOutput = logSpy.mock.calls.map((c) => c[0] as string).join("\n");
      expect(allOutput).toContain("```mermaid");
      expect(allOutput).toContain("gitGraph");
      expect(allOutput).toContain('commit id: "0.14.0"');
      expect(allOutput).not.toContain("Version drift:");
    });
  });

  // ─── Scope and --user (ARC-045 decision 3 / CS-04) ─────────────────────────
  // tmpDir doubles as a home directory whose `.arcane` child is the store.
  // The repository-status test that looks for a user tier on "this machine"
  // resolves it through the environment, so it stubs USERPROFILE/HOME to a
  // temp home rather than mocking anything.

  describe("scope and --user", () => {
    const ASSETS_DIR = join(process.cwd(), "src/assets");
    const savedEnv: Record<string, string | undefined> = {};

    function stubHome(dir: string) {
      for (const key of ["USERPROFILE", "HOME"]) {
        if (!(key in savedEnv)) savedEnv[key] = process.env[key];
        process.env[key] = dir;
      }
    }

    afterEach(() => {
      for (const [key, value] of Object.entries(savedEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
        delete savedEnv[key];
      }
    });

    /** A store under `home` with one spell and its two client files, as `spell init --user` leaves it. */
    async function installTier(home: string, version = PACKAGE_VERSION) {
      const storeRoot = join(home, ".arcane");
      const dest = join(storeRoot, storeSpellPath("spell-status"));
      await fs.mkdir(join(dest, ".."), { recursive: true });
      await fs.copyFile(join(ASSETS_DIR, canonicalSpellPath("spell-status")), dest);
      const { record } = await syncUserTierFanout({ homeDir: home, storeRoot, spellIds: ["spell-status"] });
      await writeManifest(storeRoot, {
        version,
        profile: "full",
        components: [
          { name: "spells-session", files: [storeSpellPath("spell-status")], installedVersion: version },
        ],
        scope: "user",
        fanout: record,
      });
      return { storeRoot, record };
    }

    const output = () => logSpy.mock.calls.map((c) => c[0] as string).join("\n");

    it("--user reports the store, its scope, the client-file counts and the VS Code note", async () => {
      const { storeRoot } = await installTier(tmpDir);

      await runStatus(storeRoot, PACKAGE_VERSION, { user: true });

      expect(output()).toContain(`Scope: user — ${storeRoot}`);
      expect(output()).toContain("Client files: 2 (1 Codex/Copilot skills, 1 Claude Code commands)");
      expect(output()).not.toContain("missing");
      expect(output()).toContain("chat.useAgentSkills");
      expect(output()).toContain("personal command over a project command");
    });

    it("--user counts a deleted client file as missing and an edited one as customized, with the remedy", async () => {
      const { storeRoot } = await installTier(tmpDir);
      await removeFixtureDir(join(tmpDir, USER_FANOUT_PATHS.claude("spell-status")));
      await fs.appendFile(join(tmpDir, USER_FANOUT_PATHS.codex("spell-status")), "\nEDIT\n");

      await runStatus(storeRoot, PACKAGE_VERSION, { user: true });

      expect(output()).toContain("1 missing, 1 customized");
      expect(output()).toContain("spell update --user");
    });

    it("refuses a scope: user manifest found outside the store when --user is not given (review F4)", async () => {
      const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => { }) as never);
      await writeManifest(tmpDir, {
        scope: "user",
        components: [{ name: "spells-session", files: ["spells/spell-status.md"], installedVersion: PACKAGE_VERSION }],
      });

      await runStatus(tmpDir, PACKAGE_VERSION);

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("is not the store"));
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(output()).not.toContain("Scope:");
    });

it("names the opt-out on the scope line when the repository takes its spells from the user tier (CS-05)", async () => {
      const home = await fs.mkdtemp(join(tmpdir(), "status-scope-home-"));
      try {
        stubHome(home);
        await writeManifest(tmpDir, {
          spell_scope: "user",
          components: [{ name: "git-conventions", files: ["x.md"], installedVersion: PACKAGE_VERSION }],
        });

        // No store on this machine: the line has to say so, because it is why
        // no client can find a spell here.
        await runStatus(tmpDir, PACKAGE_VERSION);
        expect(output()).toContain("Scope: repo (spells: user tier)");
        expect(output()).toContain("User tier: not installed");
        expect(output()).toContain("spell init --user");

        logSpy.mockClear();
        const { storeRoot } = await installTier(home, "1.2.0");
        await runStatus(tmpDir, PACKAGE_VERSION);
        expect(output()).toContain("Scope: repo (spells: user tier)");
        expect(output()).toContain(`User tier: v1.2.0 at ${storeRoot}`);
        expect(output()).not.toContain("not installed");
      } finally {
        await removeFixtureDir(home);
      }
    });

    it("a repository that has not opted out still prints the plain scope line", async () => {
      const home = await fs.mkdtemp(join(tmpdir(), "status-scope-home2-"));
      try {
        stubHome(home);
        await installTier(home, "1.2.0");
        await writeManifest(tmpDir, {
          spell_scope: "repo",
          components: [{ name: "git-conventions", files: ["x.md"], installedVersion: PACKAGE_VERSION }],
        });

        await runStatus(tmpDir, PACKAGE_VERSION);

        expect(output()).toContain("Scope: repo");
        expect(output()).not.toContain("spells: user tier");
      } finally {
        await removeFixtureDir(home);
      }
    });

    it("--user without a store points at spell init --user", async () => {
      const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => { }) as never);

      await runStatus(join(tmpDir, ".arcane"), PACKAGE_VERSION, { user: true });

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("spell init --user"));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("a repository status says Scope: repo, and names the user tier only when this machine has one", async () => {
      await writeManifest(tmpDir, {
        components: [{ name: "testing-standards", files: ["x.md"], installedVersion: PACKAGE_VERSION }],
      });
      const home = await fs.mkdtemp(join(tmpdir(), "status-home-"));
      try {
        stubHome(home);

        await runStatus(tmpDir, PACKAGE_VERSION);
        expect(output()).toContain("Scope: repo");
        expect(output()).not.toContain("User tier:");

        logSpy.mockClear();
        const { storeRoot } = await installTier(home, "1.1.0");
        await runStatus(tmpDir, PACKAGE_VERSION);
        expect(output()).toContain("Scope: repo");
        expect(output()).toContain(`User tier: v1.1.0 at ${storeRoot} (spell status --user)`);
      } finally {
        await removeFixtureDir(home);
      }
    });
  });
});

// ─── Built binary integration tests ──────────────────────────────────────────

describe.skipIf(!BIN)("spell status — built CLI integration", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "status-bin-test-"));
  });

  afterEach(async () => {
    await removeFixtureDir(tmpDir);
  });

  it("exits 1 with helpful message when not initialized", () => {
    const result = spawnSync("node", [BIN!, "status"], {
      cwd: tmpDir,
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("spell init");
  });

  it("exits 0 and shows component table when initialized", async () => {
    const manifest: ArcaneManifest = {
      version: PACKAGE_VERSION,
      profile: "lite",
      installedAt: "2026-01-01T00:00:00.000Z",
      components: [
        {
          name: "testing-standards",
          files: ["governance/testing-standards.md"],
          installedVersion: PACKAGE_VERSION,
        },
      ],
    };
    await fs.writeFile(join(tmpDir, ".arcane.json"), JSON.stringify(manifest, null, 2));

    const result = spawnSync("node", [BIN!, "status"], {
      cwd: tmpDir,
      encoding: "utf8",
      // Network calls will fail but that's fine — error is caught gracefully
      env: { ...process.env },
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("testing-standards");
    expect(result.stdout).toContain("Installed:");
  });
});
