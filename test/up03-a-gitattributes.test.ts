import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ArcaneManifest, InstalledComponent, Profile } from "../src/types.js";
import { hashContent } from "../src/modules/copier.js";
import { getComponent, getProfile, listProfiles } from "../src/modules/registry.js";
import { HEAVY_TEST_TIMEOUT, VERY_HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";
import { removeFixtureDir } from "./helpers/git-fixture.js";
import { resolveBuiltCli, BUILT_CLI_SKIP_REASON } from "./helpers/resolve-cli.js";

const { inspectGitRepositoryMock } = vi.hoisted(() => ({ inspectGitRepositoryMock: vi.fn() }));

vi.mock("../src/modules/npm-registry.js", () => ({ fetchPublishedFile: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@inquirer/prompts", () => ({
  confirm: vi.fn().mockResolvedValue(true),
  select: vi.fn().mockResolvedValue("internal"),
}));
vi.mock("../src/modules/git.js", () => ({
  inspectGitRepository: inspectGitRepositoryMock,
  countUncommittedChanges: vi.fn().mockResolvedValue(0),
  correctUnbornMasterDefault: vi.fn().mockResolvedValue({ corrected: false, to: "main" }),
  ensureLocalPullRebase: vi.fn().mockResolvedValue({ action: "already-set" }),
}));

const { runUpdate, moveComponentFiles } = await import("../src/commands/update.js");
const { runInit } = await import("../src/commands/init.js");

const ASSETS_DIR = join(process.cwd(), "src/assets");
const BIN = resolveBuiltCli();
if (!BIN) console.warn(`[up03-a-gitattributes.test.ts] ${BUILT_CLI_SKIP_REASON}`);
const OLD_VERSION = "0.0.9";
const NEW_VERSION = "0.1.0";
const PROFILES: Profile[] = ["full", "lite", "methodology", "docs", "governance-only"];

async function writeManifest(dir: string, partial: Partial<ArcaneManifest>): Promise<void> {
  const manifest: ArcaneManifest = {
    version: OLD_VERSION,
    profile: "docs",
    installedAt: "2026-01-01T00:00:00.000Z",
    components: [],
    role: "consumer",
    tracking_mode: "internal",
    external_provider: null,
    ...partial,
  };
  await fs.writeFile(join(dir, ".arcane.json"), JSON.stringify(manifest, null, 2));
}

async function readManifestFile(dir: string): Promise<ArcaneManifest> {
  return JSON.parse(await fs.readFile(join(dir, ".arcane.json"), "utf8")) as ArcaneManifest;
}

function logged(spy: ReturnType<typeof vi.spyOn>): string {
  return spy.mock.calls.map((c: unknown[]) => c.join(" ")).join("\n");
}

describe("UP03-A-03 — the .gitattributes component (#281, PRD D-09)", () => {
  it("is its own initOnly + skipExisting component, from the same asset docs-baseline used", () => {
    const c = getComponent("line-ending-baseline");
    expect(c.files).toEqual([".gitattributes"]);
    expect(c.sourceOverrides).toEqual({ ".gitattributes": "docs-baseline/gitattributes" });
    expect(c.skipExisting).toBe(true);
    expect(c.initOnly).toBe(true);
    expect(getComponent("docs-baseline").files).toEqual([".gitignore"]);
  });

  it("is in every profile", () => {
    expect(listProfiles().map((p) => p.id).sort()).toEqual([...PROFILES].sort());
    for (const profile of PROFILES) {
      expect(getProfile(profile).map((c) => c.name), profile).toContain("line-ending-baseline");
    }
  });

  it("moving files is idempotent and keeps each recorded hash", () => {
    const legacy: InstalledComponent[] = [
      {
        name: "docs-baseline",
        files: [".gitattributes", ".gitignore"],
        installedVersion: OLD_VERSION,
        fileHashes: { ".gitattributes": "a".repeat(64), ".gitignore": "b".repeat(64) },
      },
    ];
    const once = moveComponentFiles(legacy);
    expect(once).toEqual([
      { name: "docs-baseline", files: [".gitignore"], installedVersion: OLD_VERSION, fileHashes: { ".gitignore": "b".repeat(64) } },
      { name: "line-ending-baseline", files: [".gitattributes"], installedVersion: OLD_VERSION, fileHashes: { ".gitattributes": "a".repeat(64) } },
    ]);
    expect(moveComponentFiles(once)).toEqual(once);
    // A docs-baseline that never recorded .gitattributes (the operator's own
    // file was preserved) does not claim the new component.
    const untracked = [{ name: "docs-baseline", files: [".gitignore"], installedVersion: OLD_VERSION }];
    expect(moveComponentFiles(untracked)).toEqual(untracked);
  });
});

describe.skipIf(!BIN)("UP03-A-03 — `spell init --dry-run` lists .gitattributes for every profile", () => {
  for (const profile of PROFILES) {
    it(profile, async () => {
      const dir = await fs.mkdtemp(join(tmpdir(), "up03-a-init-dry-"));
      try {
        const result = spawnSync("node", [BIN!, "init", "--profile", profile, "--dry-run"], {
          cwd: dir,
          encoding: "utf-8",
          timeout: 30_000,
        });
        expect(result.status, result.stderr).toBe(0);
        expect(result.stdout).toContain("Would copy: .gitattributes");
        expect(await fs.readdir(dir)).toHaveLength(0);
      } finally {
        await removeFixtureDir(dir);
      }
    }, VERY_HEAVY_TEST_TIMEOUT);
  }
});

describe("UP03-A-03 — upgrading an install from before the split", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "up03-a-gitattributes-"));
    inspectGitRepositoryMock.mockResolvedValue({ status: "ready", uncommittedChanges: 0 });
  });

  afterEach(async () => {
    await removeFixtureDir(tmpDir);
    vi.restoreAllMocks();
  });

  it("a docs-baseline install that tracked .gitattributes does not lose, orphan or duplicate it", async () => {
    const attrs = "* text=auto eol=lf\n# operator addition\n*.psd binary\n";
    const ignore = "node_modules/\n";
    await fs.writeFile(join(tmpDir, ".gitattributes"), attrs);
    await fs.writeFile(join(tmpDir, ".gitignore"), ignore);
    const attrsHash = hashContent(Buffer.from("as installed\n"));
    await writeManifest(tmpDir, {
      components: [
        {
          name: "docs-baseline",
          files: [".gitattributes", ".gitignore"],
          installedVersion: OLD_VERSION,
          fileHashes: { ".gitattributes": attrsHash, ".gitignore": hashContent(Buffer.from(ignore)) },
        },
      ],
    });
    const spy = vi.spyOn(console, "log");

    await runUpdate({ prune: true }, tmpDir, ASSETS_DIR, NEW_VERSION);

    const out = logged(spy);
    expect(await fs.readFile(join(tmpDir, ".gitattributes"), "utf8")).toBe(attrs);
    expect(out).not.toContain("orphaned file");
    expect(out).not.toContain("spell add line-ending-baseline");
    expect(out).toContain("Preserved: .gitattributes");

    const manifest = await readManifestFile(tmpDir);
    const owners = manifest.components.filter((c) => c.files.includes(".gitattributes"));
    // Recorded once, under the new component. (No hash after the run: update
    // never hash-tracks a preserved skipExisting file -- unchanged behavior.)
    expect(owners.map((c) => c.name)).toEqual(["line-ending-baseline"]);
    expect(owners[0]!.files).toEqual([".gitattributes"]);
    expect(manifest.components.find((c) => c.name === "docs-baseline")?.files).toEqual([".gitignore"]);
  });

  it("a same-version run over a pre-split manifest is still up to date, and writes nothing", async () => {
    await fs.writeFile(join(tmpDir, ".gitattributes"), "* text=auto eol=lf\n");
    await fs.writeFile(join(tmpDir, ".gitignore"), "dist/\n");
    await writeManifest(tmpDir, {
      version: NEW_VERSION,
      profile: "docs",
      components: [{ name: "docs-baseline", files: [".gitattributes", ".gitignore"], installedVersion: NEW_VERSION }],
    });
    const before = await fs.readFile(join(tmpDir, ".arcane.json"), "utf8");
    const spy = vi.spyOn(console, "log");

    await runUpdate({}, tmpDir, ASSETS_DIR, NEW_VERSION);

    expect(spy).toHaveBeenCalledWith("Already up to date.");
    expect(logged(spy)).not.toContain("line-ending-baseline");
    expect(await fs.readFile(join(tmpDir, ".arcane.json"), "utf8")).toBe(before);
  });

  it("an operator's own .gitattributes (never recorded) is left alone and not offered", async () => {
    const own = "# mine\n* -text\n";
    await fs.writeFile(join(tmpDir, ".gitattributes"), own);
    await writeManifest(tmpDir, {
      components: [{ name: "docs-baseline", files: [".gitignore"], installedVersion: OLD_VERSION }],
    });
    const spy = vi.spyOn(console, "log");

    await runUpdate({}, tmpDir, ASSETS_DIR, NEW_VERSION);

    expect(await fs.readFile(join(tmpDir, ".gitattributes"), "utf8")).toBe(own);
    expect(logged(spy)).not.toContain("spell add line-ending-baseline");
    const manifest = await readManifestFile(tmpDir);
    expect(manifest.components.some((c) => c.files.includes(".gitattributes"))).toBe(false);
  });

  it("a lite install from before the split is offered .gitattributes and never given it", async () => {
    await writeManifest(tmpDir, {
      profile: "lite",
      components: [{ name: "testing-standards", files: [".arcane/governance/testing-standards.md"], installedVersion: OLD_VERSION }],
    });
    const spy = vi.spyOn(console, "log");

    await runUpdate({}, tmpDir, ASSETS_DIR, NEW_VERSION);

    expect(spy).toHaveBeenCalledWith("      spell add line-ending-baseline");
    await expect(fs.access(join(tmpDir, ".gitattributes"))).rejects.toThrow();
  });

  it("a fresh lite init writes .gitattributes and records it under line-ending-baseline", async () => {
    await runInit({ profile: "lite" }, tmpDir, ASSETS_DIR, NEW_VERSION);

    expect(await fs.readFile(join(tmpDir, ".gitattributes"), "utf8")).toBe(
      await fs.readFile(join(ASSETS_DIR, "docs-baseline/gitattributes"), "utf8"),
    );
    const manifest = await readManifestFile(tmpDir);
    expect(manifest.components.find((c) => c.name === "line-ending-baseline")?.files).toEqual([".gitattributes"]);
  }, HEAVY_TEST_TIMEOUT);
});
