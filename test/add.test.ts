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

// ─── Module under test ────────────────────────────────────────────────────────
const { runAdd } = await import("../src/commands/add.js");

const ASSETS_DIR = join(process.cwd(), "src/assets");
const BIN = join(process.cwd(), "dist/index.js");
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

async function readManifestFile(dir: string): Promise<ArcaneManifest> {
  const raw = await fs.readFile(join(dir, ".arcane.json"), "utf8");
  return JSON.parse(raw) as ArcaneManifest;
}

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe("spell add — handler", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "add-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // ─── Not initialized ───────────────────────────────────────────────────────

  it("prints helpful error and exits 1 when no .arcane.json", async () => {
    const consoleSpy = vi.spyOn(console, "error");
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

    await runAdd("testing-standards", {}, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("spell init"),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  // ─── Unknown component ─────────────────────────────────────────────────────

  it("prints error with valid names for unknown component", async () => {
    await writeManifest(tmpDir);
    const consoleSpy = vi.spyOn(console, "error");
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

    await runAdd("nonexistent-component", {}, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    const errorMsg = consoleSpy.mock.calls[0]?.[0] as string;
    expect(errorMsg).toContain('"nonexistent-component"');
    expect(errorMsg).toContain("testing-standards");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  // ─── Already installed ─────────────────────────────────────────────────────

  it("prints 'already installed' message without changes when component exists", async () => {
    await writeManifest(tmpDir, {
      components: [
        {
          name: "testing-standards",
          files: [".arcane/governance/testing-standards.md"],
          installedVersion: PACKAGE_VERSION,
        },
      ],
    });

    const consoleSpy = vi.spyOn(console, "log");
    const manifestBefore = await readManifestFile(tmpDir);
    const mtimeBefore = (await fs.stat(join(tmpDir, ".arcane.json"))).mtimeMs;

    // Small sleep to ensure mtime would differ if file were written
    await new Promise((r) => setTimeout(r, 10));

    await runAdd("testing-standards", {}, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    const mtimeAfter = (await fs.stat(join(tmpDir, ".arcane.json"))).mtimeMs;
    expect(mtimeAfter).toBe(mtimeBefore); // file not touched
    expect(JSON.stringify(await readManifestFile(tmpDir))).toBe(
      JSON.stringify(manifestBefore),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("already installed"),
    );
  });

  // ─── Successful add ────────────────────────────────────────────────────────

  it("copies file and updates manifest on successful add", async () => {
    await writeManifest(tmpDir);

    const consoleSpy = vi.spyOn(console, "log");

    await runAdd("testing-standards", {}, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    // File should exist in target dir
    const destPath = join(tmpDir, ".arcane/governance/testing-standards.md");
    const stats = await fs.stat(destPath);
    expect(stats.isFile()).toBe(true);

    // Manifest should be updated
    const manifest = await readManifestFile(tmpDir);
    expect(manifest.components).toHaveLength(1);
    expect(manifest.components[0]!.name).toBe("testing-standards");
    expect(manifest.components[0]!.installedVersion).toBe(PACKAGE_VERSION);

    // Success message
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Added component "testing-standards"'),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("1 files copied"),
    );
  });

  // ─── Dry-run ───────────────────────────────────────────────────────────────

  it("lists files but does not copy them or update manifest on --dry-run", async () => {
    await writeManifest(tmpDir);

    const consoleSpy = vi.spyOn(console, "log");

    await runAdd(
      "testing-standards",
      { dryRun: true },
      tmpDir,
      ASSETS_DIR,
      PACKAGE_VERSION,
    );

    // File should NOT exist
    const destPath = join(tmpDir, ".arcane/governance/testing-standards.md");
    await expect(fs.stat(destPath)).rejects.toThrow();

    // Manifest should still have empty components
    const manifest = await readManifestFile(tmpDir);
    expect(manifest.components).toHaveLength(0);

    // Dry-run output
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[dry-run]"),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("testing-standards"),
    );
  });

  // ─── Force flag ────────────────────────────────────────────────────────────

  it("overwrites existing file with --force", async () => {
    await writeManifest(tmpDir);

    // Pre-create the destination file with different content
    const destPath = join(tmpDir, ".arcane/governance/testing-standards.md");
    await fs.mkdir(join(tmpDir, ".arcane", "governance"), { recursive: true });
    await fs.writeFile(destPath, "old content");

    // Without force should throw
    await expect(
      runAdd("testing-standards", { force: false }, tmpDir, ASSETS_DIR, PACKAGE_VERSION),
    ).rejects.toThrow();

    // Reset manifest (add threw before updating it)
    await writeManifest(tmpDir);

    // With force should succeed
    await runAdd("testing-standards", { force: true }, tmpDir, ASSETS_DIR, PACKAGE_VERSION);
    const content = await fs.readFile(destPath, "utf8");
    expect(content).not.toBe("old content");
  });

  // ─── Multi-file component ──────────────────────────────────────────────────

  it("handles a component with multiple files", async () => {
    await writeManifest(tmpDir);

    const consoleSpy = vi.spyOn(console, "log");

    // Use "spell-prompts" which has many files
    await runAdd("spell-prompts", {}, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    const manifest = await readManifestFile(tmpDir);
    const installed = manifest.components.find((c) => c.name === "spell-prompts");
    expect(installed).toBeDefined();
    expect(installed!.files.length).toBeGreaterThan(1);

    // Check success message mentions file count matching the component
    const successLog = consoleSpy.mock.calls.find((call) =>
      (call[0] as string).includes("Added component"),
    );
    expect(successLog).toBeDefined();
    expect(successLog![0]).toContain(`${installed!.files.length} files copied`);
  });
});

// ─── Built binary tests (integration) ─────────────────────────────────────────

describe("spell add — built CLI integration", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "add-bin-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("exits 1 with helpful message when not initialized", () => {
    const result = spawnSync("node", [BIN, "add", "testing-standards"], {
      cwd: tmpDir,
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("spell init");
  });

  it("exits 1 with valid names listed for unknown component", async () => {
    // Create a manifest directly (dist/assets/ not yet populated, so spell init binary can't copy files)
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(
      join(tmpDir, ".arcane.json"),
      JSON.stringify({
        version: PACKAGE_VERSION,
        profile: "lite",
        installedAt: "2026-01-01T00:00:00.000Z",
        components: [],
      }, null, 2),
    );

    const result = spawnSync("node", [BIN, "add", "totally-fake-component"], {
      cwd: tmpDir,
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("totally-fake-component");
    expect(result.stderr).toContain("testing-standards");
  });

  it("adds a component and exits 0", async () => {
    // Create a manifest directly (dist/assets/ not yet populated)
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(
      join(tmpDir, ".arcane.json"),
      JSON.stringify({
        version: PACKAGE_VERSION,
        profile: "lite",
        installedAt: "2026-01-01T00:00:00.000Z",
        components: [],
      }, null, 2),
    );

    // Provide the src/assets dir via env var so binary resolves assets correctly
    const result = spawnSync(
      "node",
      [BIN, "add", "testing-standards"],
      {
        cwd: tmpDir,
        encoding: "utf8",
        env: { ...process.env, ARCANE_ASSETS_DIR: join(process.cwd(), "src/assets") },
      },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Added component");
  });
});
