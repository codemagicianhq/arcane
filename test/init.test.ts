import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  vi,
} from "vitest";
import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ArcaneManifest } from "../src/types.js";

// ─── Mock @inquirer/prompts ───────────────────────────────────────────────────
// vitest hoists vi.mock() to avoid real stdin interaction in tests
vi.mock("@inquirer/prompts", () => ({
  select: vi.fn().mockResolvedValue("lite"),
  confirm: vi.fn().mockResolvedValue(true),
  checkbox: vi.fn().mockResolvedValue([]),
  input: vi.fn().mockResolvedValue("Agent"),
}));

// ─── Mock git module ──────────────────────────────────────────────────────────
// Prevent real git status checks in temp directories
vi.mock("../src/modules/git.js", () => ({
  countUncommittedChanges: vi.fn().mockResolvedValue(0),
}));

// Import AFTER mocking so the mock is in place
const { runInit } = await import("../src/commands/init.js");

// Assets dir pointing to src/assets/ (used in handler-level tests)
const ASSETS_DIR = join(process.cwd(), "src/assets");
const BIN = join(process.cwd(), "dist/index.js");
const PACKAGE_VERSION = "0.1.0";

describe("spell init — handler", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "init-test-"));
    vi.restoreAllMocks();
    // Re-apply the mocks after restoreAllMocks
    const { select, confirm } = await import("@inquirer/prompts");
    vi.mocked(select).mockResolvedValue("lite" as never);
    vi.mocked(confirm).mockResolvedValue(true as never);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
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

    expect(vi.mocked(select)).toHaveBeenCalledOnce();

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
    await fs.rm(join(tmpDir, ".arcane.json"), { force: true });

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
});

// ─── Built CLI tests ─────────────────────────────────────────────────────────

describe("spell init — built CLI", () => {
  beforeAll(() => {
    spawnSync("npm", ["run", "build"], {
      cwd: process.cwd(),
      stdio: "pipe",
    });
  });

  it("spell --help prints all 5 subcommands", () => {
    const result = spawnSync("node", [BIN, "--help"], { encoding: "utf-8" });
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
        [BIN, "init", "--profile", "lite", "--dry-run"],
        { cwd: tmpDir, encoding: "utf-8", timeout: 30_000 },
      );
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Would copy:");

      // No .arcane.json should be created
      const files = await fs.readdir(tmpDir);
      expect(files).toHaveLength(0);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  }, 30_000);

  it("spell init --profile full --dry-run exit code is 0", () => {
    const result = spawnSync(
      "node",
      [BIN, "init", "--profile", "full", "--dry-run"],
      { cwd: tmpdir(), encoding: "utf-8" },
    );
    expect(result.status).toBe(0);
  });
});
