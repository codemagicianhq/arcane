import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ArcaneManifest } from "../src/types.js";

const { inspectGitRepositoryMock } = vi.hoisted(() => ({
  inspectGitRepositoryMock: vi.fn(),
}));

const { confirmMock } = vi.hoisted(() => ({
  confirmMock: vi.fn(),
}));

vi.mock("@inquirer/prompts", () => ({
  select: vi.fn().mockResolvedValue("lite"),
  confirm: confirmMock,
  checkbox: vi.fn().mockResolvedValue([]),
  input: vi.fn().mockResolvedValue("Agent"),
}));

vi.mock("../src/modules/git.js", () => ({
  // Default matches these tests' real environment (plain fs.mkdtemp dirs,
  // never git-init'd); the "hub-update" describe block below overrides
  // this per-test via inspectGitRepositoryMock.mockResolvedValue(...) in
  // its own beforeEach. This file never calls restoreAllMocks/resetAllMocks,
  // so a factory-level default (rather than re-arming every beforeEach) is
  // safe here.
  inspectGitRepository: inspectGitRepositoryMock.mockResolvedValue({ status: "not-repository" }),
  countUncommittedChanges: vi.fn().mockResolvedValue(0),
  correctUnbornMasterDefault: vi.fn().mockResolvedValue({ corrected: false, to: "main" }),
  ensureLocalPullRebase: vi.fn().mockResolvedValue({ action: "already-set" }),
}));

const { runInit } = await import("../src/commands/init.js");
const { runUpdate } = await import("../src/commands/update.js");
const { offerRegistryScaffold, MANIFEST_RETROFITS } = await import("../src/modules/hub.js");

const ASSETS_DIR = join(process.cwd(), "src/assets");
const PACKAGE_VERSION = "0.1.0";
const OLD_VERSION = "0.0.9";

async function readManifest(dir: string): Promise<ArcaneManifest> {
  const raw = await fs.readFile(join(dir, ".arcane.json"), "utf-8");
  return JSON.parse(raw) as ArcaneManifest;
}

async function writeManifest(dir: string, partial?: Partial<ArcaneManifest>) {
  const manifest: ArcaneManifest = {
    version: OLD_VERSION,
    profile: "lite",
    installedAt: "2026-01-01T00:00:00.000Z",
    components: [
      {
        name: "testing-standards",
        files: [".arcane/governance/testing-standards.md"],
        installedVersion: OLD_VERSION,
      },
    ],
    ...partial,
  };
  await fs.writeFile(join(dir, ".arcane.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}

describe("spell init — hub question", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "hub-init-test-"));
    confirmMock.mockReset();
    confirmMock.mockResolvedValue(true);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // Say no to agent setup in every test here -- it's an unrelated interactive
  // path (its own "profile" concept, base/full/custom, distinct from install
  // profiles like "lite") that a blanket confirm-true mock would otherwise
  // pull in unintentionally.
  function mockConfirms(hubAnswer: boolean) {
    confirmMock.mockImplementation(async (opts: { message: string }) => {
      if (opts.message.includes("Set up your agent team")) return false;
      if (opts.message.includes("manage other ventures as a hub")) return hubAnswer;
      return true; // "Proceed with installation?" and anything else
    });
  }

  it("writes role: hub when the hub question is answered yes", async () => {
    mockConfirms(true);
    await runInit({}, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    const manifest = await readManifest(tmpDir);
    expect(manifest.role).toBe("hub");
  });

  it("writes role: consumer when the hub question is answered no", async () => {
    mockConfirms(false);
    await runInit({}, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    const manifest = await readManifest(tmpDir);
    expect(manifest.role).toBe("consumer");
  });

  it("does not ask the hub question, and leaves role unset, when --profile is passed", async () => {
    await runInit({ profile: "lite" }, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    expect(confirmMock).not.toHaveBeenCalled();
    const manifest = await readManifest(tmpDir);
    expect(manifest.role).toBeUndefined();
  });
});

describe("spell update — manifest retrofit wizard", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "hub-update-test-"));
    inspectGitRepositoryMock.mockResolvedValue({ status: "ready", uncommittedChanges: 0 });
    confirmMock.mockReset();
    confirmMock.mockResolvedValue(true);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("asks the role retrofit question when the installed manifest predates it", async () => {
    await writeManifest(tmpDir); // role omitted entirely -- predates the field
    await runUpdate({}, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("manage other ventures as a hub"),
      }),
    );
    const manifest = await readManifest(tmpDir);
    expect(manifest.role).toBe("hub"); // confirmMock defaults to true in this suite
  });

  it("does not ask again once role is already set (idempotent on a second update)", async () => {
    await writeManifest(tmpDir); // predates role
    await runUpdate({}, tmpDir, ASSETS_DIR, PACKAGE_VERSION);
    expect(confirmMock).toHaveBeenCalledTimes(1); // the retrofit question, once

    confirmMock.mockClear();

    // Second update, from the now-current version -- role is set, nothing to retrofit.
    await runUpdate({}, tmpDir, ASSETS_DIR, "0.1.1");
    expect(confirmMock).not.toHaveBeenCalled();

    const manifest = await readManifest(tmpDir);
    expect(manifest.role).toBe("hub");
  });

  it("does not ask any retrofit question in --dry-run mode", async () => {
    await writeManifest(tmpDir);
    await runUpdate({ dryRun: true }, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    expect(confirmMock).not.toHaveBeenCalled();
    const manifest = await readManifest(tmpDir);
    expect(manifest.role).toBeUndefined(); // dry-run never writes
  });

  it("does not ask when role is already present, even if empty/consumer", async () => {
    await writeManifest(tmpDir, { role: "consumer" });
    await runUpdate({}, tmpDir, ASSETS_DIR, PACKAGE_VERSION);

    expect(confirmMock).not.toHaveBeenCalled();
  });
});

describe("MANIFEST_RETROFITS registry", () => {
  it("role retrofit correctly identifies manifests that predate it", () => {
    const retrofit = MANIFEST_RETROFITS.find((r) => r.field === "role");
    expect(retrofit).toBeDefined();
    expect(retrofit!.needsRetrofit({ role: undefined } as ArcaneManifest)).toBe(true);
    expect(retrofit!.needsRetrofit({ role: "hub" } as ArcaneManifest)).toBe(false);
    expect(retrofit!.needsRetrofit({ role: "consumer" } as ArcaneManifest)).toBe(false);
  });
});

describe("offerRegistryScaffold", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "hub-scaffold-test-"));
    confirmMock.mockReset();
    confirmMock.mockResolvedValue(true);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("no-ops silently when business_root does not exist", async () => {
    await offerRegistryScaffold(tmpDir, "ventures");

    expect(confirmMock).not.toHaveBeenCalled();
    await expect(fs.access(join(tmpDir, "ventures", "registry.json"))).rejects.toThrow();
  });

  it("scaffolds registry.json from existing venture folders, excluding _template", async () => {
    await fs.mkdir(join(tmpDir, "ventures", "ordovica"), { recursive: true });
    await fs.mkdir(join(tmpDir, "ventures", "tidewright"), { recursive: true });
    await fs.mkdir(join(tmpDir, "ventures", "_template"), { recursive: true });

    await offerRegistryScaffold(tmpDir, "ventures");

    const raw = await fs.readFile(join(tmpDir, "ventures", "registry.json"), "utf-8");
    const registry = JSON.parse(raw) as { ventures: Record<string, unknown> };
    expect(Object.keys(registry.ventures).sort()).toEqual(["ordovica", "tidewright"]);
  });

  it("never overwrites an existing registry.json", async () => {
    await fs.mkdir(join(tmpDir, "ventures", "ordovica"), { recursive: true });
    await fs.mkdir(join(tmpDir, "ventures"), { recursive: true });
    const existing = { _comment: "hand-authored", updated: "2026-08-21", ventures: {} };
    await fs.writeFile(
      join(tmpDir, "ventures", "registry.json"),
      JSON.stringify(existing, null, 2),
    );

    await offerRegistryScaffold(tmpDir, "ventures");

    expect(confirmMock).not.toHaveBeenCalled();
    const raw = await fs.readFile(join(tmpDir, "ventures", "registry.json"), "utf-8");
    expect(JSON.parse(raw)).toEqual(existing);
  });

  it("declining the scaffold offer leaves no registry.json", async () => {
    await fs.mkdir(join(tmpDir, "ventures", "ordovica"), { recursive: true });
    confirmMock.mockResolvedValueOnce(false); // "scaffold from them?" -> no

    await offerRegistryScaffold(tmpDir, "ventures");

    await expect(fs.access(join(tmpDir, "ventures", "registry.json"))).rejects.toThrow();
  });
});
