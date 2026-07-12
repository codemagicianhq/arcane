/**
 * FEAT-561-014: End-to-end lifecycle test
 *
 * Exercises the full spell loop via handler functions (no subprocess):
 *   init → add → status → update → uninstall
 *
 * Each test is intentionally ordered and sequential within the describe block —
 * they share a single temp dir so each step asserts on the mutations of the
 * previous step.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ArcaneManifest } from "../src/types.js";

// ─── Mock version-check module (used by runStatus) ───────────────────────────
// Must be hoisted before any imports that transitively pull in version-check.
vi.mock("../src/modules/version-check.js", () => ({
  getFeedUrl: vi.fn().mockResolvedValue("https://registry.npmjs.org/arcane-cli"),
  checkForUpdate: vi.fn().mockResolvedValue({
    current: "0.1.0",
    latest: "0.1.0",
    updateAvailable: false,
  }),
}));

// Import handlers AFTER vi.mock() so the hoisted mock is in place.
const { runInit } = await import("../src/commands/init.js");
const { runAdd } = await import("../src/commands/add.js");
const { runUpdate } = await import("../src/commands/update.js");
const { runStatus } = await import("../src/commands/status.js");
const { runUninstall } = await import("../src/commands/uninstall.js");

// Assets dir points to src/assets/ (vitest runs source directly, not dist/)
const ASSETS_DIR = join(process.cwd(), "src/assets");
const PACKAGE_VERSION = "0.1.0";

// A component not in the lite profile, used to exercise `spell add`
const EXTRA_COMPONENT = "decision-documentation-standard";
const EXTRA_FILE = ".arcane/governance/decision-documentation-standard.md";

// ─── Test suite ───────────────────────────────────────────────────────────────
describe("lifecycle — full spell loop (init → add → status → update → uninstall)", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "arcane-lifecycle-"));
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // ── Step 1: spell init ──────────────────────────────────────────────────────
  describe("spell init", () => {
    it("creates .arcane.json with the lite profile manifest", async () => {
      // Pass profile in options to skip the interactive select prompt
      await runInit({ profile: "lite" }, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

      const raw = await fs.readFile(join(tmpDir, ".arcane.json"), "utf-8");
      const manifest = JSON.parse(raw) as ArcaneManifest;

      expect(manifest.version).toBe(PACKAGE_VERSION);
      expect(manifest.components).toHaveLength(6);

      const names = manifest.components.map((c) => c.name);
      expect(names).toContain("spell-prompts");
      expect(names).toContain("claude-commands");
      expect(names).toContain("agent-output-instructions");
      expect(names).toContain("git-conventions");
      expect(names).toContain("testing-standards");
    }, 30_000);

    it("copies lite-profile files to the target directory", async () => {
      // Spot-check one file from each lite-profile component
      await expect(
        fs.access(join(tmpDir, ".arcane/governance/git-conventions.md")),
      ).resolves.toBeUndefined();

      await expect(
        fs.access(join(tmpDir, ".arcane/governance/testing-standards.md")),
      ).resolves.toBeUndefined();

      await expect(
        fs.access(join(tmpDir, ".github/prompts/spell-plan.prompt.md")),
      ).resolves.toBeUndefined();
    });

    it("does not re-initialize if .arcane.json already exists", async () => {
      // Running init again on an already-initialized directory should be a no-op
      // (it prints a message and returns rather than throwing)
      await expect(
        runInit({ profile: "lite" }, tmpDir, ASSETS_DIR, PACKAGE_VERSION),
      ).resolves.toBeUndefined();
    });
  });

  // ── Step 2: spell add ───────────────────────────────────────────────────────
  describe("spell add", () => {
    it("installs an additional component not in the lite profile", async () => {
      await runAdd(EXTRA_COMPONENT, {}, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

      await expect(
        fs.access(join(tmpDir, EXTRA_FILE)),
      ).resolves.toBeUndefined();
    });

    it("records the new component in the manifest", async () => {
      const raw = await fs.readFile(join(tmpDir, ".arcane.json"), "utf-8");
      const manifest = JSON.parse(raw) as ArcaneManifest;

      expect(manifest.components).toHaveLength(7); // 6 lite + 1 extra
      expect(manifest.components.map((c) => c.name)).toContain(EXTRA_COMPONENT);
    });

    it("refuses to add a component that is already installed", async () => {
      // Adding an already-installed component without --force should print a
      // message and return (asserting no throw is the key behaviour here)
      await expect(
        runAdd("git-conventions", {}, tmpDir, ASSETS_DIR, PACKAGE_VERSION),
      ).resolves.toBeUndefined();

      // Manifest should still have exactly 7 components (no duplicate)
      const raw = await fs.readFile(join(tmpDir, ".arcane.json"), "utf-8");
      const manifest = JSON.parse(raw) as ArcaneManifest;
      expect(manifest.components).toHaveLength(7);
    });
  });

  // ── Step 3: spell status ────────────────────────────────────────────────────
  describe("spell status", () => {
    it("runs without error and reads the manifest", async () => {
      // runStatus writes its output to stdout; verifying it resolves is sufficient
      await expect(
        runStatus(tmpDir, PACKAGE_VERSION),
      ).resolves.toBeUndefined();
    });
  });

  // ── Step 4: spell update ────────────────────────────────────────────────────
  describe("spell update", () => {
    it("overwrites installed files with new content", async () => {
      // Overwrite a tracked file so update has something to overwrite
      const trackedFile = join(tmpDir, ".arcane/governance/git-conventions.md");
      await fs.writeFile(trackedFile, "# modified by lifecycle test\n");

      // Pass a higher package version so update doesn't short-circuit with
      // "Already up to date" (which triggers when manifest.version === packageVersion)
      await runUpdate({}, tmpDir, ASSETS_DIR, "0.2.0");

      // The original content from assets should be restored
      const restoredContent = await fs.readFile(trackedFile, "utf-8");
      expect(restoredContent).not.toBe("# modified by lifecycle test\n");
    }, 30_000);

    it("bumps the manifest version after update", async () => {
      const raw = await fs.readFile(join(tmpDir, ".arcane.json"), "utf-8");
      const manifest = JSON.parse(raw) as ArcaneManifest;
      // version should equal the packageVersion passed to runUpdate ("0.2.0")
      expect(manifest.version).toBe("0.2.0");
    });
  });

  // ── Step 5: spell uninstall ─────────────────────────────────────────────────
  describe("spell uninstall", () => {
    it("preserves non-manifest files", async () => {
      // Plant a custom file that should survive the uninstall
      const survivorPath = join(tmpDir, "my-custom-notes.md");
      await fs.writeFile(survivorPath, "# keep me\n");

      await runUninstall({ yes: true }, tmpDir);

      // The non-manifest file must still be there
      await expect(fs.access(survivorPath)).resolves.toBeUndefined();
    }, 30_000);

    it("removes all manifest-tracked files", async () => {
      await expect(
        fs.access(join(tmpDir, ".arcane/governance/git-conventions.md")),
      ).rejects.toThrow();

      await expect(
        fs.access(join(tmpDir, ".arcane/governance/testing-standards.md")),
      ).rejects.toThrow();

      await expect(
        fs.access(join(tmpDir, EXTRA_FILE)),
      ).rejects.toThrow();

      await expect(
        fs.access(join(tmpDir, ".github/prompts/spell-plan.prompt.md")),
      ).rejects.toThrow();
    });

    it("removes .arcane.json", async () => {
      await expect(
        fs.access(join(tmpDir, ".arcane.json")),
      ).rejects.toThrow();
    });
  });
});
