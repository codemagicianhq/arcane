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

const { runUpdate } = await import("../src/commands/update.js");

const ASSETS_DIR = join(process.cwd(), "src/assets");
const BIN = join(process.cwd(), "dist/index.js");
const PACKAGE_VERSION = "0.1.0";
const OLD_VERSION = "0.0.9";

/** The real version the built binary uses (read from package.json). */
const REAL_PKG_VERSION = JSON.parse(
  await fs.readFile(join(process.cwd(), "package.json"), "utf8"),
).version as string;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function writeManifest(dir: string, partial?: Partial<ArcaneManifest>) {
  const manifest: ArcaneManifest = {
    version: OLD_VERSION,
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

/** Write a "previous version" of a component file so we can detect if it was updated */
async function seedComponentFile(dir: string, relativePath: string, content = "old content") {
  const dest = join(dir, relativePath);
  await fs.mkdir(join(dest, ".."), { recursive: true });
  await fs.writeFile(dest, content);
}

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe("spell update — handler", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "update-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // ─── Not initialized ───────────────────────────────────────────────────────

  it("prints helpful error and exits 1 when no .arcane.json", async () => {
    const consoleSpy = vi.spyOn(console, "error");
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

    await runUpdate({}, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("spell init"));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("rethrows non-ManifestNotFoundError from readManifest", async () => {
    // Write invalid JSON to trigger ManifestCorruptError (not caught by the handler)
    await fs.writeFile(join(tmpDir, ".arcane.json"), "{ not valid json");

    await expect(runUpdate({}, tmpDir, ASSETS_DIR, PACKAGE_VERSION)).rejects.toThrow();
  });

  // ─── Already up to date ────────────────────────────────────────────────────

  it("prints 'Already up to date.' when manifest version matches package version", async () => {
    await writeManifest(tmpDir, {
      version: PACKAGE_VERSION,
      components: [
        {
          name: "testing-standards",
          files: [".arcane/governance/testing-standards.md"],
          installedVersion: PACKAGE_VERSION,
        },
      ],
    });

    const consoleSpy = vi.spyOn(console, "log");
    await runUpdate({}, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    expect(consoleSpy).toHaveBeenCalledWith("Already up to date.");
  });

  // ─── No components ─────────────────────────────────────────────────────────

  it("prints nothing-to-update when no components are installed", async () => {
    await writeManifest(tmpDir, { version: OLD_VERSION, components: [] });

    const consoleSpy = vi.spyOn(console, "log");
    await runUpdate({}, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Nothing to update"),
    );
  });

  // ─── Successful update ─────────────────────────────────────────────────────

  it("replaces files with new content", async () => {
    const file = ".arcane/governance/testing-standards.md";
    await writeManifest(tmpDir, {
      version: OLD_VERSION,
      components: [
        {
          name: "testing-standards",
          files: [file],
          installedVersion: OLD_VERSION,
        },
      ],
    });

    // Seed old file content
    await seedComponentFile(tmpDir, file);

    await runUpdate({}, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    // File was replaced (content is no longer "old content")
    const newContent = await fs.readFile(join(tmpDir, file), "utf8");
    expect(newContent).not.toBe("old content");
  });

  it("updates manifest version after successful update", async () => {
    const file = ".arcane/governance/testing-standards.md";
    await writeManifest(tmpDir, {
      version: OLD_VERSION,
      components: [
        {
          name: "testing-standards",
          files: [file],
          installedVersion: OLD_VERSION,
        },
      ],
    });
    await seedComponentFile(tmpDir, file);

    await runUpdate({}, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    const manifest = await readManifestFile(tmpDir);
    expect(manifest.version).toBe(PACKAGE_VERSION);
  });

  it("prints success message with file count", async () => {
    const file = ".arcane/governance/testing-standards.md";
    await writeManifest(tmpDir, {
      version: OLD_VERSION,
      components: [
        {
          name: "testing-standards",
          files: [file],
          installedVersion: OLD_VERSION,
        },
      ],
    });
    await seedComponentFile(tmpDir, file);

    const consoleSpy = vi.spyOn(console, "log");
    await runUpdate({}, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Updated 1 files"),
    );
  });

  // ─── Multiple components ───────────────────────────────────────────────────

  it("updates all files across multiple components", async () => {
    await writeManifest(tmpDir, {
      version: OLD_VERSION,
      components: [
        {
          name: "testing-standards",
          files: [".arcane/governance/testing-standards.md"],
          installedVersion: OLD_VERSION,
        },
        {
          name: "git-conventions",
          files: [".arcane/governance/git-conventions.md"],
          installedVersion: OLD_VERSION,
        },
      ],
    });
    await seedComponentFile(tmpDir, ".arcane/governance/testing-standards.md");
    await seedComponentFile(tmpDir, ".arcane/governance/git-conventions.md");

    const consoleSpy = vi.spyOn(console, "log");
    await runUpdate({}, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    // Success message shows total count
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Updated 2 files"));
  });

  it("does not touch files not in the manifest", async () => {
    const file = ".arcane/governance/testing-standards.md";
    await writeManifest(tmpDir, {
      version: OLD_VERSION,
      components: [
        {
          name: "testing-standards",
          files: [file],
          installedVersion: OLD_VERSION,
        },
      ],
    });
    await seedComponentFile(tmpDir, file);

    // Extra file not in manifest
    const extraFile = join(tmpDir, "my-custom-notes.md");
    await fs.writeFile(extraFile, "keep me");

    await runUpdate({}, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    // Extra file is untouched
    const extra = await fs.readFile(extraFile, "utf8");
    expect(extra).toBe("keep me");
    // And no .bak was created for it
    await expect(fs.stat(`${extraFile}.bak`)).rejects.toThrow();
  });

  // ─── Dry-run ───────────────────────────────────────────────────────────────

  it("does not copy files or update manifest on --dry-run", async () => {
    const file = ".arcane/governance/testing-standards.md";
    await writeManifest(tmpDir, {
      version: OLD_VERSION,
      components: [
        {
          name: "testing-standards",
          files: [file],
          installedVersion: OLD_VERSION,
        },
      ],
    });
    await seedComponentFile(tmpDir, file);

    const consoleSpy = vi.spyOn(console, "log");
    await runUpdate({ dryRun: true }, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    // File still has old content
    const content = await fs.readFile(join(tmpDir, file), "utf8");
    expect(content).toBe("old content");

    // No .bak file
    await expect(fs.stat(join(tmpDir, `${file}.bak`))).rejects.toThrow();

    // Manifest version unchanged
    const manifest = await readManifestFile(tmpDir);
    expect(manifest.version).toBe(OLD_VERSION);

    // Dry-run output
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[dry-run]"));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[dry-run]"));
  });

  it("dry-run prints summary with file count", async () => {
    const file = ".arcane/governance/testing-standards.md";
    await writeManifest(tmpDir, {
      version: OLD_VERSION,
      components: [
        {
          name: "testing-standards",
          files: [file],
          installedVersion: OLD_VERSION,
        },
      ],
    });
    await seedComponentFile(tmpDir, file);

    const consoleSpy = vi.spyOn(console, "log");
    await runUpdate({ dryRun: true }, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    const summaryLog = consoleSpy.mock.calls.find((c) =>
      (c[0] as string).includes("Would update") && (c[0] as string).includes("files"),
    );
    expect(summaryLog).toBeDefined();
    expect(summaryLog![0]).toContain("1 files");
  });

  // ─── Unknown component (removed from registry) ──────────────────────────────

  it("skips components not found in registry and continues updating others", async () => {
    const file = ".arcane/governance/testing-standards.md";
    await writeManifest(tmpDir, {
      version: OLD_VERSION,
      components: [
        {
          // This component was removed from the registry — should be skipped
          name: "component-that-was-removed-from-registry",
          files: ["some/old/file.md"],
          installedVersion: OLD_VERSION,
        },
        {
          name: "testing-standards",
          files: [file],
          installedVersion: OLD_VERSION,
        },
      ],
    });
    await seedComponentFile(tmpDir, file);

    const consoleSpy = vi.spyOn(console, "log");
    await runUpdate({}, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    // Prints the skip message for the unknown component
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("not in registry — skipping"),
    );
    // Still updates the known component
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Updated"));
  });

  it("skips removed component in dry-run mode", async () => {
    await writeManifest(tmpDir, {
      version: OLD_VERSION,
      components: [
        {
          name: "component-that-was-removed-from-registry",
          files: ["some/old/file.md"],
          installedVersion: OLD_VERSION,
        },
      ],
    });

    const consoleSpy = vi.spyOn(console, "log");
    await runUpdate({ dryRun: true }, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("not in registry — skipping"),
    );
  });
});

// ─── Built binary integration tests ──────────────────────────────────────────

describe("spell update — built CLI integration", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "update-bin-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("exits 1 with helpful message when not initialized", () => {
    const result = spawnSync("node", [BIN, "update"], {
      cwd: tmpDir,
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("spell init");
  });

  it("prints 'Already up to date.' when version matches", async () => {
    await fs.writeFile(
      join(tmpDir, ".arcane.json"),
      JSON.stringify({
        version: REAL_PKG_VERSION,
        profile: "lite",
        installedAt: "2026-01-01T00:00:00.000Z",
        components: [
          {
            name: "testing-standards",
            files: [".arcane/governance/testing-standards.md"],
            installedVersion: REAL_PKG_VERSION,
          },
        ],
      }),
    );

    const result = spawnSync("node", [BIN, "update"], {
      cwd: tmpDir,
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Already up to date.");
  });

  it("--dry-run exits 0 and prints dry-run output", async () => {
    const file = ".arcane/governance/testing-standards.md";
    await fs.mkdir(join(tmpDir, ".arcane", "governance"), { recursive: true });
    await fs.writeFile(join(tmpDir, file), "old content");
    await fs.writeFile(
      join(tmpDir, ".arcane.json"),
      JSON.stringify({
        version: OLD_VERSION,
        profile: "lite",
        installedAt: "2026-01-01T00:00:00.000Z",
        components: [
          {
            name: "testing-standards",
            files: [file],
            installedVersion: OLD_VERSION,
          },
        ],
      }),
    );

    const result = spawnSync(
      "node",
      [BIN, "update", "--dry-run"],
      {
        cwd: tmpDir,
        encoding: "utf8",
        timeout: 30_000,
        env: { ...process.env, ARCANE_ASSETS_DIR: join(process.cwd(), "src/assets") },
      },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[dry-run]");
    // File not touched
    const content = await fs.readFile(join(tmpDir, file), "utf8");
    expect(content).toBe("old content");
  }, 30_000);
});
