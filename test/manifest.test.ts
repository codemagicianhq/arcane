import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readManifest,
  writeManifest,
  createManifest,
  addComponent,
  removeComponent,
  hasComponent,
  resolveSecretsScanExcludePrefixes,
  ManifestNotFoundError,
  ManifestCorruptError,
  ManifestInvalidFieldError,
} from "../src/modules/manifest.js";
import type { ArcaneManifest, InstalledComponent } from "../src/types.js";

describe("manifest", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), "manifest-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // ─── createManifest ───────────────────────────────────────────────────────

  describe("createManifest", () => {
    it("creates .arcane.json with correct schema", async () => {
      const manifest = await createManifest(tempDir, "full", "0.1.0");

      expect(manifest.version).toBe("0.1.0");
      expect(manifest.profile).toBe("full");
      expect(manifest.components).toEqual([]);
      expect(manifest.installedAt).toBeTruthy();
      // ISO timestamp format
      expect(new Date(manifest.installedAt).toISOString()).toBe(
        manifest.installedAt,
      );
    });

    it("writes the file to disk", async () => {
      await createManifest(tempDir, "lite", "1.0.0");
      const content = await fs.readFile(
        join(tempDir, ".arcane.json"),
        "utf-8",
      );
      const parsed = JSON.parse(content) as ArcaneManifest;
      expect(parsed.profile).toBe("lite");
    });

    it("creates manifests for all valid profiles", async () => {
      for (const profile of ["full", "lite", "governance-only"] as const) {
        const dir = await fs.mkdtemp(join(tmpdir(), "manifest-profile-"));
        const manifest = await createManifest(dir, profile, "0.1.0");
        expect(manifest.profile).toBe(profile);
        await fs.rm(dir, { recursive: true, force: true });
      }
    });
  });

  // ─── readManifest ─────────────────────────────────────────────────────────

  describe("readManifest", () => {
    it("reads a valid manifest back from disk", async () => {
      await createManifest(tempDir, "lite", "1.0.0");
      const manifest = await readManifest(tempDir);
      expect(manifest.profile).toBe("lite");
      expect(manifest.version).toBe("1.0.0");
      expect(Array.isArray(manifest.components)).toBe(true);
    });

    it("throws ManifestNotFoundError when file is missing", async () => {
      await expect(readManifest(tempDir)).rejects.toThrow(ManifestNotFoundError);
    });

    it("throws ManifestNotFoundError with a helpful message", async () => {
      await expect(readManifest(tempDir)).rejects.toThrow(/spell init/);
    });

    it("throws ManifestCorruptError for invalid JSON", async () => {
      await fs.writeFile(join(tempDir, ".arcane.json"), "{ not valid json }}");
      await expect(readManifest(tempDir)).rejects.toThrow(ManifestCorruptError);
    });

    it("throws ManifestCorruptError for truncated JSON", async () => {
      await fs.writeFile(join(tempDir, ".arcane.json"), '{"version": "1.0.0"');
      await expect(readManifest(tempDir)).rejects.toThrow(ManifestCorruptError);
    });

    // chmod is a no-op on Windows for the process owner, so skip this test there
    const itOnPosix = process.platform === "win32" ? it.skip : it;
    itOnPosix("rethrows non-ENOENT errors (e.g. permission denied)", async () => {
      const manifestFile = join(tempDir, ".arcane.json");
      await fs.writeFile(manifestFile, "{}");
      await fs.chmod(manifestFile, 0o000);

      let thrownError: Error | undefined;
      try {
        await readManifest(tempDir);
      } catch (err) {
        thrownError = err as Error;
      } finally {
        await fs.chmod(manifestFile, 0o644);
      }

      expect(thrownError).toBeDefined();
      expect(thrownError).not.toBeInstanceOf(ManifestNotFoundError);
      expect(thrownError).not.toBeInstanceOf(ManifestCorruptError);
    });

    // -- tracking_mode / external_provider validation (EF-14 point 2) ------

    it("throws ManifestInvalidFieldError for an unsupported tracking_mode value", async () => {
      await fs.writeFile(
        join(tempDir, ".arcane.json"),
        JSON.stringify({ version: "1.0.0", profile: "lite", installedAt: "x", components: [], tracking_mode: "bogus" }),
      );
      await expect(readManifest(tempDir)).rejects.toThrow(ManifestInvalidFieldError);
    });

    it("throws ManifestInvalidFieldError for an unsupported external_provider value", async () => {
      await fs.writeFile(
        join(tempDir, ".arcane.json"),
        JSON.stringify({
          version: "1.0.0",
          profile: "lite",
          installedAt: "x",
          components: [],
          tracking_mode: "external",
          external_provider: "azure-devops",
        }),
      );
      await expect(readManifest(tempDir)).rejects.toThrow(ManifestInvalidFieldError);
    });

    it("accepts external_provider: null (internal mode, no provider)", async () => {
      await fs.writeFile(
        join(tempDir, ".arcane.json"),
        JSON.stringify({
          version: "1.0.0",
          profile: "lite",
          installedAt: "x",
          components: [],
          tracking_mode: "internal",
          external_provider: null,
        }),
      );
      const manifest = await readManifest(tempDir);
      expect(manifest.external_provider).toBeNull();
    });

    it("accepts a manifest where tracking_mode/external_provider are absent entirely", async () => {
      await createManifest(tempDir, "lite", "1.0.0");
      await expect(readManifest(tempDir)).resolves.not.toThrow();
    });

    it.each(["internal", "external"] as const)(
      "accepts tracking_mode: %s",
      async (mode) => {
        await fs.writeFile(
          join(tempDir, ".arcane.json"),
          JSON.stringify({ version: "1.0.0", profile: "lite", installedAt: "x", components: [], tracking_mode: mode }),
        );
        const manifest = await readManifest(tempDir);
        expect(manifest.tracking_mode).toBe(mode);
      },
    );

    it.each(["ado", "github", "jira", "other"] as const)(
      "accepts external_provider: %s",
      async (provider) => {
        await fs.writeFile(
          join(tempDir, ".arcane.json"),
          JSON.stringify({
            version: "1.0.0",
            profile: "lite",
            installedAt: "x",
            components: [],
            tracking_mode: "external",
            external_provider: provider,
          }),
        );
        const manifest = await readManifest(tempDir);
        expect(manifest.external_provider).toBe(provider);
      },
    );
  });

  // ─── writeManifest ────────────────────────────────────────────────────────

  describe("writeManifest", () => {
    it("writes with 2-space indentation", async () => {
      const manifest: ArcaneManifest = {
        version: "1.0.0",
        profile: "full",
        installedAt: new Date().toISOString(),
        components: [],
      };
      await writeManifest(tempDir, manifest);
      const content = await fs.readFile(join(tempDir, ".arcane.json"), "utf-8");
      // 2-space indent means keys start with two spaces
      expect(content).toContain('  "version"');
    });

    it("overwrites an existing manifest", async () => {
      await createManifest(tempDir, "lite", "1.0.0");
      const updated: ArcaneManifest = {
        version: "2.0.0",
        profile: "full",
        installedAt: new Date().toISOString(),
        components: [],
      };
      await writeManifest(tempDir, updated);
      const readBack = await readManifest(tempDir);
      expect(readBack.version).toBe("2.0.0");
    });
  });

  // ─── addComponent ─────────────────────────────────────────────────────────

  describe("addComponent", () => {
    it("returns a manifest with the component appended", () => {
      const manifest: ArcaneManifest = {
        version: "1.0.0",
        profile: "lite",
        installedAt: new Date().toISOString(),
        components: [],
      };
      const component: InstalledComponent = {
        name: "git-conventions",
        files: [".arcane/governance/git-conventions.md"],
        installedVersion: "1.0.0",
      };

      const updated = addComponent(manifest, component);
      expect(updated.components).toHaveLength(1);
      expect(updated.components[0].name).toBe("git-conventions");
    });

    it("does not mutate the original manifest", () => {
      const manifest: ArcaneManifest = {
        version: "1.0.0",
        profile: "lite",
        installedAt: new Date().toISOString(),
        components: [],
      };
      const component: InstalledComponent = {
        name: "git-conventions",
        files: [".arcane/governance/git-conventions.md"],
        installedVersion: "1.0.0",
      };

      addComponent(manifest, component);
      expect(manifest.components).toHaveLength(0);
    });

    it("preserves existing components", () => {
      const existing: InstalledComponent = {
        name: "testing-standards",
        files: ["governance/testing-standards.md"],
        installedVersion: "1.0.0",
      };
      const manifest: ArcaneManifest = {
        version: "1.0.0",
        profile: "full",
        installedAt: new Date().toISOString(),
        components: [existing],
      };
      const newComp: InstalledComponent = {
        name: "git-conventions",
        files: [".arcane/governance/git-conventions.md"],
        installedVersion: "1.0.0",
      };

      const updated = addComponent(manifest, newComp);
      expect(updated.components).toHaveLength(2);
      expect(updated.components[0].name).toBe("testing-standards");
      expect(updated.components[1].name).toBe("git-conventions");
    });
  });

  // ─── removeComponent ──────────────────────────────────────────────────────

  describe("removeComponent", () => {
    it("removes the named component", () => {
      const manifest: ArcaneManifest = {
        version: "1.0.0",
        profile: "full",
        installedAt: new Date().toISOString(),
        components: [
          { name: "a", files: [], installedVersion: "1.0.0" },
          { name: "b", files: [], installedVersion: "1.0.0" },
        ],
      };
      const updated = removeComponent(manifest, "a");
      expect(updated.components).toHaveLength(1);
      expect(updated.components[0].name).toBe("b");
    });

    it("preserves all other components", () => {
      const manifest: ArcaneManifest = {
        version: "1.0.0",
        profile: "full",
        installedAt: new Date().toISOString(),
        components: [
          { name: "a", files: [], installedVersion: "1.0.0" },
          { name: "b", files: [], installedVersion: "1.0.0" },
          { name: "c", files: [], installedVersion: "1.0.0" },
        ],
      };
      const updated = removeComponent(manifest, "b");
      expect(updated.components.map((c) => c.name)).toEqual(["a", "c"]);
    });

    it("does not mutate the original manifest", () => {
      const manifest: ArcaneManifest = {
        version: "1.0.0",
        profile: "full",
        installedAt: new Date().toISOString(),
        components: [{ name: "a", files: [], installedVersion: "1.0.0" }],
      };
      removeComponent(manifest, "a");
      expect(manifest.components).toHaveLength(1);
    });

    it("returns unchanged manifest if component not found", () => {
      const manifest: ArcaneManifest = {
        version: "1.0.0",
        profile: "full",
        installedAt: new Date().toISOString(),
        components: [{ name: "a", files: [], installedVersion: "1.0.0" }],
      };
      const updated = removeComponent(manifest, "nonexistent");
      expect(updated.components).toHaveLength(1);
    });
  });

  // ─── hasComponent ─────────────────────────────────────────────────────────

  describe("hasComponent", () => {
    it("returns true when the component exists", () => {
      const manifest: ArcaneManifest = {
        version: "1.0.0",
        profile: "full",
        installedAt: new Date().toISOString(),
        components: [
          { name: "git-conventions", files: [], installedVersion: "1.0.0" },
        ],
      };
      expect(hasComponent(manifest, "git-conventions")).toBe(true);
    });

    it("returns false when the component does not exist", () => {
      const manifest: ArcaneManifest = {
        version: "1.0.0",
        profile: "full",
        installedAt: new Date().toISOString(),
        components: [],
      };
      expect(hasComponent(manifest, "git-conventions")).toBe(false);
    });

    it("is case-sensitive", () => {
      const manifest: ArcaneManifest = {
        version: "1.0.0",
        profile: "full",
        installedAt: new Date().toISOString(),
        components: [
          { name: "Git-Conventions", files: [], installedVersion: "1.0.0" },
        ],
      };
      expect(hasComponent(manifest, "git-conventions")).toBe(false);
    });
  });

  // ─── round-trip ───────────────────────────────────────────────────────────

  describe("round-trip", () => {
    it("createManifest → readManifest returns an equal object", async () => {
      const original = await createManifest(
        tempDir,
        "governance-only",
        "2.0.0",
      );
      const readBack = await readManifest(tempDir);
      expect(readBack).toEqual(original);
    });

    it("create → add → write → read preserves components", async () => {
      const base = await createManifest(tempDir, "lite", "1.0.0");
      const component: InstalledComponent = {
        name: "testing-standards",
        files: ["governance/testing-standards.md"],
        installedVersion: "1.0.0",
      };
      const updated = addComponent(base, component);
      await writeManifest(tempDir, updated);

      const readBack = await readManifest(tempDir);
      expect(readBack.components).toHaveLength(1);
      expect(readBack.components[0].name).toBe("testing-standards");
    });
  });
});

describe("docs-mode manifest fields (EF-07 / EF-12)", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), "manifest-docsmode-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function write(extra: Record<string, unknown>): Promise<void> {
    await fs.writeFile(
      join(tempDir, ".arcane.json"),
      JSON.stringify({
        version: "1.0.0",
        profile: "docs",
        installedAt: "x",
        components: [],
        ...extra,
      }),
    );
  }

  it.each(["standard", "sensitive"])("accepts content_sensitivity: %s", async (value) => {
    await write({ content_sensitivity: value });
    const m = await readManifest(tempDir);
    expect(m.content_sensitivity).toBe(value);
  });

  it("rejects an unsupported content_sensitivity", async () => {
    await write({ content_sensitivity: "secret" });
    await expect(readManifest(tempDir)).rejects.toThrow(ManifestInvalidFieldError);
  });

  // "." is the whole point of EF-07's root-as-subject decision: an existing
  // archive comes under governance without being restructured first.
  it.each([".", "docs", "records/2026", "a/b/c"])(
    "accepts subject_root: %s",
    async (value) => {
      await write({ subject_root: value });
      const m = await readManifest(tempDir);
      expect(m.subject_root).toBe(value);
    },
  );

  it("accepts subject_root: null, meaning asked-but-no-single-subject", async () => {
    await write({ subject_root: null });
    const m = await readManifest(tempDir);
    expect(m.subject_root).toBeNull();
  });

  // subject_root is resolved against the repo root and handed to spells, so a
  // value that escapes the repository would point agents outside the project.
  it.each([
    ["", "empty"],
    ["   ", "whitespace only"],
    ["/etc/passwd", "absolute posix"],
    ["C:\\Windows", "windows drive"],
    ["../outside", "parent traversal"],
    ["docs/../../etc", "embedded traversal"],
    ["docs\\..\\..\\etc", "windows-separator traversal"],
    ["\\\\server\\share", "UNC path"],
  ])("rejects subject_root %s (%s)", async (value) => {
    await write({ subject_root: value });
    await expect(readManifest(tempDir)).rejects.toThrow(ManifestInvalidFieldError);
  });

  it("accepts both new fields absent (existing installs are untouched)", async () => {
    await write({});
    const m = await readManifest(tempDir);
    expect(m.subject_root).toBeUndefined();
    expect(m.content_sensitivity).toBeUndefined();
  });
});

describe("resolveSecretsScanExcludePrefixes (ARC-037)", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), "manifest-secrets-exclude-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("returns the root manifest's configured list", async () => {
    const manifest = await createManifest(tempDir, "full", "1.0.0");
    await writeManifest(tempDir, { ...manifest, secretsScanExcludePrefixes: ["test/fixture.ts"] });

    expect(await resolveSecretsScanExcludePrefixes(tempDir)).toEqual(["test/fixture.ts"]);
  });

  it("returns an empty list when a root manifest exists but configures nothing", async () => {
    await createManifest(tempDir, "full", "1.0.0");

    expect(await resolveSecretsScanExcludePrefixes(tempDir)).toEqual([]);
  });

  it("falls back to the self-hosted src/assets/.arcane.json when there is no root manifest", async () => {
    await fs.mkdir(join(tempDir, "src", "assets"), { recursive: true });
    await fs.writeFile(
      join(tempDir, "src", "assets", ".arcane.json"),
      JSON.stringify({
        selfHosted: true,
        tracking_mode: "internal",
        secretsScanExcludePrefixes: ["src/modules/secrets-scan.ts"],
      }),
    );

    expect(await resolveSecretsScanExcludePrefixes(tempDir)).toEqual(["src/modules/secrets-scan.ts"]);
  });

  it("ignores a self-hosted-shaped file that lacks the actual self-hosted marker", async () => {
    await fs.mkdir(join(tempDir, "src", "assets"), { recursive: true });
    await fs.writeFile(
      join(tempDir, "src", "assets", ".arcane.json"),
      JSON.stringify({ secretsScanExcludePrefixes: ["should-not-apply"] }),
    );

    expect(await resolveSecretsScanExcludePrefixes(tempDir)).toEqual([]);
  });

  it("returns an empty list, never throws, when neither manifest exists", async () => {
    await expect(resolveSecretsScanExcludePrefixes(tempDir)).resolves.toEqual([]);
  });
});
