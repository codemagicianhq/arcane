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
import { hashFile } from "../src/modules/copier.js";
import { getComponent } from "../src/modules/registry.js";
import {
  USER_FANOUT_PATHS,
  USER_TIER_COMPONENTS,
  absoluteStoreSpellPath,
  componentForScope,
} from "../src/modules/user-tier.js";
import { resolveBuiltCli, BUILT_CLI_SKIP_REASON } from "./helpers/resolve-cli.js";
import { removeFixtureDir } from "./helpers/fixture-dir.js";
import { VERY_HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";

// ─── Mock @inquirer/prompts ───────────────────────────────────────────────────
// vitest hoists vi.mock() to avoid real stdin interaction in tests
// Message-branching rather than a blanket return: init now asks several
// select() questions (profile, tracking mode, content sensitivity, subject
// shape) and answering them all with "lite" would write invalid enum values
// into the manifest -- which readManifest rightly rejects.
vi.mock("@inquirer/prompts", () => ({
  select: vi.fn(async (opts: { message: string }) => {
    if (opts.message.includes("installation profile")) return "lite";
    if (opts.message.includes("How will work be tracked")) return "internal";
    if (opts.message.includes("Which external tracker")) return "ado";
    if (opts.message.includes("treat this repository's contents")) return "standard";
    if (opts.message.includes("What does this repository hold")) return "portfolio";
    if (opts.message.includes("allowed to push to a remote")) return "open";
    return "lite";
  }),
  confirm: vi.fn().mockResolvedValue(true),
  checkbox: vi.fn().mockResolvedValue([]),
  input: vi.fn().mockResolvedValue("Agent"),
}));

// ─── Mock git module ──────────────────────────────────────────────────────────
// Prevent real git status/config checks in temp directories. inspectGitRepository
// defaults to "not-repository", matching these tests' real environment: every
// tmpDir here is a plain fs.mkdtemp directory, never `git init`'d. Real-git
// scenarios (unborn repo, pull.rebase) live in test/init-git-state.test.ts,
// which does NOT mock this module.
vi.mock("../src/modules/git.js", () => ({
  countUncommittedChanges: vi.fn().mockResolvedValue(0),
  inspectGitRepository: vi.fn().mockResolvedValue({ status: "not-repository" }),
  correctUnbornMasterDefault: vi.fn().mockResolvedValue({ corrected: false, to: "main" }),
  ensureLocalPullRebase: vi.fn().mockResolvedValue({ action: "already-set" }),
}));

// Import AFTER mocking so the mock is in place
const { runInit } = await import("../src/commands/init.js");

// Assets dir pointing to src/assets/ (used in handler-level tests)
const ASSETS_DIR = join(process.cwd(), "src/assets");
const BIN = resolveBuiltCli();
if (!BIN) console.warn(`[init.test.ts] ${BUILT_CLI_SKIP_REASON}`);
const PACKAGE_VERSION = "0.1.0";

describe("spell init — handler", () => {
  let tmpDir: string;
  let emptyHome: string;
  const savedHomeEnv: Record<string, string | undefined> = {};

  /**
   * CS-05: init asks about the user tier only when one exists. The real home
   * of whoever runs the suite may have one, so every handler test below points
   * at an empty temp home; the tests that WANT the question stub it themselves.
   */
  function stubHomeForInit(dir: string) {
    for (const key of ["USERPROFILE", "HOME"]) {
      if (!(key in savedHomeEnv)) savedHomeEnv[key] = process.env[key];
      process.env[key] = dir;
    }
  }

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "init-test-"));
    emptyHome = await fs.mkdtemp(join(tmpdir(), "init-home-"));
    stubHomeForInit(emptyHome);
    vi.restoreAllMocks();
    // Re-apply the mocks after restoreAllMocks -- restoreAllMocks clears a
    // plain vi.fn()'s configured resolved value back to undefined (there's
    // no "original implementation" to restore it to, unlike a vi.spyOn
    // wrapping a real method), so every module-mocked function needs its
    // return value reasserted here, not just declared once in the factory.
    const { select, confirm } = await import("@inquirer/prompts");
    vi.mocked(select).mockResolvedValue("lite" as never);
    vi.mocked(confirm).mockResolvedValue(true as never);
    const { countUncommittedChanges, inspectGitRepository, correctUnbornMasterDefault, ensureLocalPullRebase } =
      await import("../src/modules/git.js");
    vi.mocked(countUncommittedChanges).mockResolvedValue(0);
    vi.mocked(inspectGitRepository).mockResolvedValue({ status: "not-repository" });
    vi.mocked(correctUnbornMasterDefault).mockResolvedValue({ corrected: false, to: "main" });
    vi.mocked(ensureLocalPullRebase).mockResolvedValue({ action: "already-set" });
  });

  afterEach(async () => {
    for (const [key, value] of Object.entries(savedHomeEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
      delete savedHomeEnv[key];
    }
    await removeFixtureDir(tmpDir);
    await removeFixtureDir(emptyHome);
  });

  // ─── Profile validation ────────────────────────────────────────────────────

  it("throws for an invalid profile option", async () => {
    await expect(
      runInit(
        { profile: "invalid" as never },
        tmpDir,
        ASSETS_DIR,
        PACKAGE_VERSION,
      ),
    ).rejects.toThrow(/Invalid profile/);
  });

  // ─── Already initialized ───────────────────────────────────────────────────

  it("prints 'Already initialized' and returns early when .arcane.json exists", async () => {
    // Create a manifest first
    await fs.writeFile(
      join(tmpDir, ".arcane.json"),
      JSON.stringify({
        version: "0.1.0",
        profile: "lite",
        installedAt: new Date().toISOString(),
        components: [],
      }),
    );

    const consoleSpy = vi.spyOn(console, "log");
    await runInit({}, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Already initialized"),
    );
    // Should NOT create additional files
    const files = await fs.readdir(tmpDir);
    expect(files).toHaveLength(1); // only .arcane.json
  });

  // ─── Interactive profile selection ────────────────────────────────────────

  it("prompts for profile selection when --profile is not passed", async () => {
    const { select, confirm } = await import("@inquirer/prompts");
    vi.mocked(select).mockResolvedValue("governance-only" as never);
    vi.mocked(confirm).mockResolvedValue(true as never);

    await runInit({}, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    // Assert the PROFILE question specifically -- init legitimately asks
    // several select() questions now, so a bare call-count would be testing
    // the wrong thing.
    expect(vi.mocked(select)).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("installation profile") }),
    );

    const manifest = JSON.parse(
      await fs.readFile(join(tmpDir, ".arcane.json"), "utf-8"),
    ) as ArcaneManifest;
    expect(manifest.profile).toBe("governance-only");
  });

  it("does not prompt when --profile is provided explicitly", async () => {
    const { select } = await import("@inquirer/prompts");

    await runInit({ profile: "lite" }, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    expect(vi.mocked(select)).not.toHaveBeenCalled();
  });

  // ─── Dry-run ──────────────────────────────────────────────────────────────

  it("--dry-run does not create .arcane.json", async () => {
    await runInit(
      { profile: "lite", dryRun: true },
      tmpDir,
      ASSETS_DIR,
      PACKAGE_VERSION,
    );
    await expect(
      fs.access(join(tmpDir, ".arcane.json")),
    ).rejects.toThrow();
  });

  it("--dry-run logs [dry-run] Would copy: for each file", async () => {
    const consoleSpy = vi.spyOn(console, "log");
    await runInit(
      { profile: "lite", dryRun: true },
      tmpDir,
      ASSETS_DIR,
      PACKAGE_VERSION,
    );
    const logged = consoleSpy.mock.calls.map((c) => String(c[0]));
    expect(logged.some((l) => l.includes("Would copy:"))).toBe(true);
  });

  it("--dry-run does not copy any files to target directory", async () => {
    await runInit(
      { profile: "governance-only", dryRun: true },
      tmpDir,
      ASSETS_DIR,
      PACKAGE_VERSION,
    );
    const files = await fs.readdir(tmpDir);
    expect(files).toHaveLength(0);
  });

  // ─── Non-dry-run: governance-only profile ─────────────────────────────────

  it("creates .arcane.json with correct schema after init", async () => {
    await runInit(
      { profile: "governance-only" },
      tmpDir,
      ASSETS_DIR,
      PACKAGE_VERSION,
    );

    const manifest = JSON.parse(
      await fs.readFile(join(tmpDir, ".arcane.json"), "utf-8"),
    ) as ArcaneManifest;

    expect(manifest.version).toBe(PACKAGE_VERSION);
    expect(manifest.profile).toBe("governance-only");
    expect(Array.isArray(manifest.components)).toBe(true);
    expect(manifest.components.length).toBeGreaterThan(0);
    expect(manifest.installedAt).toBeTruthy();
    expect(new Date(manifest.installedAt).toISOString()).toBe(
      manifest.installedAt,
    );
  });

  it("copies profile-appropriate files to the target directory", async () => {
    await runInit(
      { profile: "governance-only" },
      tmpDir,
      ASSETS_DIR,
      PACKAGE_VERSION,
    );

    // governance-only includes .arcane/governance/** files
    const govDir = join(tmpDir, ".arcane", "governance");
    const stat = await fs.stat(govDir);
    expect(stat.isDirectory()).toBe(true);

    const files = await fs.readdir(govDir);
    expect(files.length).toBeGreaterThan(0);
    expect(files).toContain("git-conventions.md");
    expect(files).toContain("testing-standards.md");
  });

  it("manifest components list matches installed files", async () => {
    await runInit(
      { profile: "governance-only" },
      tmpDir,
      ASSETS_DIR,
      PACKAGE_VERSION,
    );

    const manifest = JSON.parse(
      await fs.readFile(join(tmpDir, ".arcane.json"), "utf-8"),
    ) as ArcaneManifest;

    // Every file listed in a component should exist on disk
    for (const component of manifest.components) {
      for (const file of component.files) {
        await expect(
          fs.access(join(tmpDir, file)),
          `Expected ${file} to exist`,
        ).resolves.not.toThrow();
      }
    }
  });

  it("--force overwrites existing files without error", async () => {
    // Pre-create a file that the init would write
    const existing = join(tmpDir, ".arcane", "governance");
    await fs.mkdir(existing, { recursive: true });
    await fs.writeFile(join(existing, "git-conventions.md"), "old-content");

    // Without force, should throw on existing file
    await expect(
      runInit({ profile: "governance-only" }, tmpDir, ASSETS_DIR, PACKAGE_VERSION),
    ).rejects.toThrow();

    // Clean the manifest so we can re-init
    await removeFixtureDir(join(tmpDir, ".arcane.json"));

    // With force, should succeed
    await expect(
      runInit(
        { profile: "governance-only", force: true },
        tmpDir,
        ASSETS_DIR,
        PACKAGE_VERSION,
      ),
    ).resolves.not.toThrow();
  });

  // ─── --user: the per-user tier (ARC-045 decision 3 / CS-04) ────────────────
  // tmpDir stands in for the home directory; the store is its `.arcane`
  // child, exactly as userTierRoot() derives it. The command receives the
  // store root and fans out to its parent, so no environment stubbing is
  // needed at this level (userTierRoot's own env behavior is covered in
  // test/user-tier.test.ts).

  describe("--user", () => {
    const EXPECTED_SPELLS = USER_TIER_COMPONENTS
      .map((name) => componentForScope(getComponent(name), "user"))
      .flatMap((c) => c.files).length;

    function storeRootOf(home: string) {
      return join(home, ".arcane");
    }

    it("installs canonical spells into ~/.arcane/spells and fans two client files per spell out to the home directory, recording both", async () => {
      const home = tmpDir;
      const storeRoot = storeRootOf(home);
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await runInit({ user: true }, storeRoot, ASSETS_DIR, PACKAGE_VERSION);

      const manifest = JSON.parse(await fs.readFile(join(storeRoot, ".arcane.json"), "utf8")) as ArcaneManifest;
      expect(manifest.scope).toBe("user");
      expect(manifest.version).toBe(PACKAGE_VERSION);
      expect(manifest.components.map((c) => c.name)).toEqual([...USER_TIER_COMPONENTS]);
      const storeFiles = manifest.components.flatMap((c) => c.files);
      expect(storeFiles).toHaveLength(EXPECTED_SPELLS);
      expect(storeFiles.every((f) => /^spells\/spell-[a-z0-9-]+\.md$/.test(f))).toBe(true);
      for (const component of manifest.components) {
        for (const file of component.files) {
          expect(component.fileHashes?.[file]).toBe(await hashFile(join(storeRoot, file)));
        }
      }
      // No repository-relative shim, no governance, no manifest questions' fields.
      expect(storeFiles.some((f) => f.startsWith(".github") || f.startsWith(".claude") || f.startsWith(".agents"))).toBe(false);
      expect(manifest.role).toBeUndefined();
      expect(manifest.tracking_mode).toBeUndefined();
      expect(manifest.push_policy).toBeUndefined();

      // The fan-out: two files per spell, recorded with the hash of what was written.
      expect(Object.keys(manifest.fanout ?? {})).toHaveLength(EXPECTED_SPELLS * 2);
      const codex = USER_FANOUT_PATHS.codex("spell-status");
      const claude = USER_FANOUT_PATHS.claude("spell-status");
      const abs = absoluteStoreSpellPath(storeRoot, "spell-status");
      expect(await fs.readFile(join(home, codex), "utf8")).toContain(`Read \`${abs}\``);
      expect(await fs.readFile(join(home, claude), "utf8")).toContain(`@${abs}\n`);
      expect(manifest.fanout![codex]).toBe(await hashFile(join(home, codex)));
      expect(manifest.fanout![claude]).toBe(await hashFile(join(home, claude)));

      // What the operator is told: counts, the VS Code note, the precedence rule.
      const output = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(output).toContain(`${EXPECTED_SPELLS} Spells installed to ${storeRoot}/spells/`);
      expect(output).toContain(`Wrote ${EXPECTED_SPELLS * 2} client file(s)`);
      expect(output).toContain("chat.useAgentSkills");
      expect(output).toContain("chat.promptFilesLocations; the user tier does not use it");
      expect(output).toContain("personal command over a project command");
    });

    it("asks no question and touches no git state", async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});
      const { select, confirm, input } = await import("@inquirer/prompts");
      const { inspectGitRepository, ensureLocalPullRebase } = await import("../src/modules/git.js");

      await runInit({ user: true }, storeRootOf(tmpDir), ASSETS_DIR, PACKAGE_VERSION);

      expect(vi.mocked(select)).not.toHaveBeenCalled();
      expect(vi.mocked(confirm)).not.toHaveBeenCalled();
      expect(vi.mocked(input)).not.toHaveBeenCalled();
      expect(vi.mocked(inspectGitRepository)).not.toHaveBeenCalled();
      expect(vi.mocked(ensureLocalPullRebase)).not.toHaveBeenCalled();
    });

    it("--dry-run lists the store copies and the client files it would write, and writes nothing", async () => {
      const home = tmpDir;
      const storeRoot = storeRootOf(home);
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await runInit({ user: true, dryRun: true }, storeRoot, ASSETS_DIR, PACKAGE_VERSION);

      const output = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(output).toContain("Would copy: spells/spell-status.md");
      expect(output).toContain(`Would write: ~/${USER_FANOUT_PATHS.codex("spell-status")}`);
      expect(output).toContain(`Would write: ~/${USER_FANOUT_PATHS.claude("spell-status")}`);
      expect(output).toContain(`Would initialize the user tier — ${EXPECTED_SPELLS} spells, ${EXPECTED_SPELLS * 2} client files`);
      await expect(fs.access(storeRoot)).rejects.toThrow();
      await expect(fs.access(join(home, ".agents"))).rejects.toThrow();
      await expect(fs.access(join(home, ".claude"))).rejects.toThrow();
    });

    it("a second init reports the tier as already initialized and points at spell update --user", async () => {
      const storeRoot = storeRootOf(tmpDir);
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      await runInit({ user: true }, storeRoot, ASSETS_DIR, PACKAGE_VERSION);
      logSpy.mockClear();

      await runInit({ user: true }, storeRoot, ASSETS_DIR, PACKAGE_VERSION);

      const output = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(output).toContain(`Already initialized (user tier at ${storeRoot})`);
      expect(output).toContain("spell update --user");
    });

    it("rejects --profile together with --user", async () => {
      await expect(
        runInit({ user: true, profile: "lite" }, storeRootOf(tmpDir), ASSETS_DIR, PACKAGE_VERSION),
      ).rejects.toThrow(/does not apply to "--user"/);
    });

    it("leaves a same-named client file it did not write alone, says so, and does not record it", async () => {
      const home = tmpDir;
      const storeRoot = storeRootOf(home);
      const foreign = USER_FANOUT_PATHS.codex("spell-plan");
      await fs.mkdir(join(home, foreign, ".."), { recursive: true });
      await fs.writeFile(join(home, foreign), "the operator's own spell-plan skill\n", "utf8");
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await runInit({ user: true }, storeRoot, ASSETS_DIR, PACKAGE_VERSION);

      expect(await fs.readFile(join(home, foreign), "utf8")).toBe("the operator's own spell-plan skill\n");
      const manifest = JSON.parse(await fs.readFile(join(storeRoot, ".arcane.json"), "utf8")) as ArcaneManifest;
      expect(manifest.fanout![foreign]).toBeUndefined();
      expect(Object.keys(manifest.fanout!)).toHaveLength(EXPECTED_SPELLS * 2 - 1);
      const output = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(output).toContain("Left 1 existing path(s) alone");
      expect(output).toContain(`~/${foreign}`);
    });
  });
});

// ─── Built CLI tests ─────────────────────────────────────────────────────────

describe.skipIf(!BIN)("spell init — built CLI", () => {
  // No beforeAll rebuild here, deliberately: this describe block relies on
  // dist/index.js already being current -- CI's own workflow (ci.yml) builds
  // once before running `npm test`, and a per-file rebuild was actively
  // harmful, not merely redundant. `spawnSync("npm", ...)` fails ENOENT on
  // Windows (npm resolves to a .cmd shim that Node's spawnSync won't
  // auto-resolve without shell:true, confirmed live 2026-08-31), so locally
  // this was already a silent no-op; on CI's Linux runner it actually ran,
  // and tsup's `clean: true` wiped dist/ as a side effect, racing any OTHER
  // concurrently-scheduled test file that also spawns dist/index.js --
  // confirmed live 2026-08-31: test/agent-loader.test.ts's own "built CLI"
  // test hit `ENOENT: dist/index.js` mid-run, the same failure shape BC-02
  // found and fixed for copy-assets.ts's import-time rebuild. Run `npm run
  // build` yourself before `npm test` if iterating on this file locally.
  it("spell --help prints all 5 subcommands", () => {
    const result = spawnSync("node", [BIN!, "--help"], { encoding: "utf-8" });
    expect(result.status).toBe(0);
    for (const cmd of ["init", "add", "update", "status", "uninstall"]) {
      expect(result.stdout, `Expected '${cmd}' in --help output`).toContain(
        cmd,
      );
    }
  });

  it("spell init --dry-run lists files without creating any", async () => {
    const tmpDir = await fs.mkdtemp(join(tmpdir(), "cli-dry-run-"));
    try {
      const result = spawnSync(
        "node",
        [BIN!, "init", "--profile", "lite", "--dry-run"],
        { cwd: tmpDir, encoding: "utf-8", timeout: 30_000 },
      );
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Would copy:");

      // No .arcane.json should be created
      const files = await fs.readdir(tmpDir);
      expect(files).toHaveLength(0);
    } finally {
      await removeFixtureDir(tmpDir);
    }
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("spell init --profile full --dry-run exit code is 0", () => {
    const result = spawnSync(
      "node",
      [BIN!, "init", "--profile", "full", "--dry-run"],
      { cwd: tmpdir(), encoding: "utf-8" },
    );
    expect(result.status).toBe(0);
  });
});

// ─── The repository opt-out (ARC-045 decision 4 / CS-05) ─────────────────────

describe("spell init — spell_scope, the repository opt-out", () => {
  let repo: string;
  let home: string;
  const saved: Record<string, string | undefined> = {};

  const SPELL_PREFIXES = [".arcane/spells/", ".github/prompts/", ".claude/commands/", ".agents/skills/"];
  const QUESTION = "Use it for this repository";

  function stubHome(dir: string) {
    for (const key of ["USERPROFILE", "HOME"]) {
      if (!(key in saved)) saved[key] = process.env[key];
      process.env[key] = dir;
    }
  }

  /** A user tier in `home`: the question only reads the store manifest's version. */
  async function installStore(version = "1.2.0") {
    const storeRoot = join(home, ".arcane");
    await fs.mkdir(join(storeRoot, "spells"), { recursive: true });
    await fs.writeFile(
      join(storeRoot, ".arcane.json"),
      JSON.stringify({ version, profile: "full", installedAt: "x", components: [], scope: "user" }, null, 2),
    );
    return storeRoot;
  }

  /** Answers the CS-05 question with `useTier`, and every other confirm with yes. */
  async function answerSpellScope(useTier: boolean) {
    const { confirm } = await import("@inquirer/prompts");
    vi.mocked(confirm).mockImplementation((async (opts: { message: string }) => {
      if (opts.message.includes(QUESTION)) return useTier;
      // Decline the agent-team offer: this describe is about spell delivery,
      // and runAgentsInit would ask its own profile question the select mock
      // above answers with a spell profile name.
      if (opts.message.includes("agent team")) return false;
      return true;
    }) as never);
    return vi.mocked(confirm);
  }

  function askedQuestion(mock: { mock: { calls: unknown[][] } }): { message: string; default?: boolean } | undefined {
    return mock.mock.calls
      .map((c) => c[0] as { message: string; default?: boolean })
      .find((o) => typeof o?.message === "string" && o.message.includes(QUESTION));
  }

  async function installedSpellFiles(): Promise<string[]> {
    const manifest = JSON.parse(await fs.readFile(join(repo, ".arcane.json"), "utf-8")) as ArcaneManifest;
    return manifest.components.flatMap((c) => c.files).filter((f) => SPELL_PREFIXES.some((p) => f.startsWith(p)));
  }

  beforeEach(async () => {
    repo = await fs.mkdtemp(join(tmpdir(), "scope-repo-"));
    home = await fs.mkdtemp(join(tmpdir(), "scope-home-"));
    stubHome(home);
    vi.restoreAllMocks();
    const { select, confirm } = await import("@inquirer/prompts");
    vi.mocked(select).mockImplementation((async (opts: { message: string }) => {
      if (opts.message.includes("installation profile")) return "lite";
      if (opts.message.includes("How will work be tracked")) return "internal";
      if (opts.message.includes("treat this repository")) return "standard";
      if (opts.message.includes("allowed to push to a remote")) return "open";
      return "lite";
    }) as never);
    vi.mocked(confirm).mockResolvedValue(true as never);
    const { inspectGitRepository, correctUnbornMasterDefault, ensureLocalPullRebase } =
      await import("../src/modules/git.js");
    vi.mocked(inspectGitRepository).mockResolvedValue({ status: "not-repository" });
    vi.mocked(correctUnbornMasterDefault).mockResolvedValue({ corrected: false, to: "main" });
    vi.mocked(ensureLocalPullRebase).mockResolvedValue({ action: "already-set" });
  });

  afterEach(async () => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
      delete saved[key];
    }
    await removeFixtureDir(repo);
    await removeFixtureDir(home);
  });

  it("never asks when this machine has no user tier, and records no spell_scope", async () => {
    const confirmMock = await answerSpellScope(true);
    vi.spyOn(console, "log").mockImplementation(() => {});

    await runInit({}, repo, ASSETS_DIR, PACKAGE_VERSION);

    expect(askedQuestion(confirmMock)).toBeUndefined();
    const manifest = JSON.parse(await fs.readFile(join(repo, ".arcane.json"), "utf-8")) as ArcaneManifest;
    expect(manifest.spell_scope).toBeUndefined();
    expect((await installedSpellFiles()).length).toBeGreaterThan(0);
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("asks when a store exists, naming its version, and installs nothing spell-shaped when the answer is yes", async () => {
    await installStore("1.2.0");
    const confirmMock = await answerSpellScope(true);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runInit({}, repo, ASSETS_DIR, PACKAGE_VERSION);

    expect(askedQuestion(confirmMock)?.message).toContain("v1.2.0");

    const manifest = JSON.parse(await fs.readFile(join(repo, ".arcane.json"), "utf-8")) as ArcaneManifest;
    expect(manifest.spell_scope).toBe("user");
    expect(await installedSpellFiles()).toEqual([]);
    for (const dir of [".arcane/spells", ".github/prompts", ".claude/commands", ".agents/skills"]) {
      await expect(fs.access(join(repo, dir)), dir).rejects.toThrow();
    }
    // Governance still installs: the opt-out moves spell delivery only.
    await expect(fs.access(join(repo, ".arcane/governance/git-conventions.md"))).resolves.toBeUndefined();
    expect(manifest.components.some((c) => c.files.some((f) => f.startsWith(".arcane/governance/")))).toBe(true);
    const output = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(output).not.toContain("Spells (Copilot, Claude Code, Codex)");
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("defaults to No, and answering no installs the repository copies and records repo", async () => {
    await installStore("1.2.0");
    const confirmMock = await answerSpellScope(false);
    vi.spyOn(console, "log").mockImplementation(() => {});

    await runInit({}, repo, ASSETS_DIR, PACKAGE_VERSION);

    expect(askedQuestion(confirmMock)?.default).toBe(false);
    const manifest = JSON.parse(await fs.readFile(join(repo, ".arcane.json"), "utf-8")) as ArcaneManifest;
    expect(manifest.spell_scope).toBe("repo");
    expect((await installedSpellFiles()).length).toBeGreaterThan(0);
    await expect(fs.access(join(repo, ".arcane/spells"))).resolves.toBeUndefined();
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("a scripted --profile install never asks and never opts out, even with a store present", async () => {
    await installStore("1.2.0");
    const confirmMock = await answerSpellScope(true);
    vi.spyOn(console, "log").mockImplementation(() => {});

    await runInit({ profile: "lite" }, repo, ASSETS_DIR, PACKAGE_VERSION);

    expect(askedQuestion(confirmMock)).toBeUndefined();
    const manifest = JSON.parse(await fs.readFile(join(repo, ".arcane.json"), "utf-8")) as ArcaneManifest;
    expect(manifest.spell_scope).toBeUndefined();
    expect((await installedSpellFiles()).length).toBeGreaterThan(0);
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("a dry run with a store present previews the default and asks nothing", async () => {
    await installStore("1.2.0");
    const confirmMock = await answerSpellScope(true);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runInit({ dryRun: true }, repo, ASSETS_DIR, PACKAGE_VERSION);

    expect(askedQuestion(confirmMock)).toBeUndefined();
    const output = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(output).toContain("Would copy: .arcane/spells/spell-status.md");
    await expect(fs.access(join(repo, ".arcane.json"))).rejects.toThrow();
  }, VERY_HEAVY_TEST_TIMEOUT);
});
