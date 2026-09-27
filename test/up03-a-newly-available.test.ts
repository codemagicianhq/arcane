import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ArcaneManifest, InstalledComponent, Profile } from "../src/types.js";
import { getComponent, listProfiles } from "../src/modules/registry.js";
import { findNewlyAvailable } from "../src/modules/registry-changes.js";
import { removeFixtureDir } from "./helpers/git-fixture.js";

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

const { runUpdate, migrateLegacyComponents } = await import("../src/commands/update.js");

const ASSETS_DIR = join(process.cwd(), "src/assets");
const OLD_VERSION = "0.0.9";
const NEW_VERSION = "0.1.0";

async function writeManifest(dir: string, partial: Partial<ArcaneManifest>): Promise<void> {
  const manifest: ArcaneManifest = {
    version: OLD_VERSION,
    profile: "lite",
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

/** Manifest entries for every component of `profile` except `omit`, as an install at `version` records them. */
function installedProfile(profile: Profile, omit: string[], version = OLD_VERSION): InstalledComponent[] {
  const names = listProfiles().find((p) => p.id === profile)!.components;
  return names
    .filter((n) => !omit.includes(n))
    .map((name) => ({ name, files: [...getComponent(name).files], installedVersion: version }));
}

function logged(spy: ReturnType<typeof vi.spyOn>): string {
  return spy.mock.calls.map((c: unknown[]) => c.join(" ")).join("\n");
}

async function exists(path: string): Promise<boolean> {
  return fs.access(path).then(() => true, () => false);
}

describe("UP03-A-02 — newly available, not installed (TODO: update never surfaces a new component)", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "up03-a-newly-"));
    inspectGitRepositoryMock.mockResolvedValue({ status: "ready", uncommittedChanges: 0 });
  });

  afterEach(async () => {
    await removeFixtureDir(tmpDir);
    vi.restoreAllMocks();
  });

  // Both omitted components postdate a real governance-only install:
  // compliance-standards was added later, and line-ending-baseline is #281's.
  const PREDATES = ["compliance-standards", "line-ending-baseline"];

  it("lists a component the profile includes but the manifest lacks, with its exact `spell add` line, and installs nothing", async () => {
    await writeManifest(tmpDir, {
      profile: "governance-only",
      components: installedProfile("governance-only", PREDATES),
    });
    const spy = vi.spyOn(console, "log");

    await runUpdate({}, tmpDir, ASSETS_DIR, NEW_VERSION);

    const out = logged(spy);
    expect(out).toContain('Newly available for your "governance-only" profile, not installed — nothing was added:');
    expect(out).toContain(`    compliance-standards — ${getComponent("compliance-standards").description}`);
    expect(spy).toHaveBeenCalledWith("      spell add compliance-standards");
    expect(spy).toHaveBeenCalledWith("      spell add line-ending-baseline");
    // Exactly the missing components, one `spell add` line each.
    expect(out.match(/spell add /g)).toHaveLength(2);
    expect(await exists(join(tmpDir, ".arcane/governance/compliance-standards.md"))).toBe(false);
    expect(await exists(join(tmpDir, ".gitattributes"))).toBe(false);
    const after = await readManifestFile(tmpDir);
    expect(after.components.map((c) => c.name)).not.toContain("compliance-standards");
    expect(after.components.map((c) => c.name)).not.toContain("line-ending-baseline");
  });

  it("is surfaced on a same-version run too, and by --dry-run", async () => {
    await writeManifest(tmpDir, {
      version: NEW_VERSION,
      profile: "governance-only",
      components: installedProfile("governance-only", PREDATES, NEW_VERSION),
    });
    for (const c of installedProfile("governance-only", PREDATES)) {
      for (const f of c.files) {
        await fs.mkdir(join(tmpDir, f, ".."), { recursive: true });
        await fs.copyFile(join(ASSETS_DIR, f), join(tmpDir, f));
      }
    }
    const spy = vi.spyOn(console, "log");

    await runUpdate({}, tmpDir, ASSETS_DIR, NEW_VERSION);
    expect(spy).toHaveBeenCalledWith("Already up to date.");
    expect(spy).toHaveBeenCalledWith("      spell add compliance-standards");

    spy.mockClear();
    await runUpdate({ dryRun: true }, tmpDir, ASSETS_DIR, NEW_VERSION);
    expect(spy).toHaveBeenCalledWith("      spell add compliance-standards");
    expect(await exists(join(tmpDir, ".arcane/governance/compliance-standards.md"))).toBe(false);
  });

  it("an opted-out repository (spell_scope: user) is not offered spells-* components; an opted-in one is", async () => {
    const components = installedProfile("lite", [
      "spells-session", "spells-capture", "spells-delivery", "spells-review",
      "spells-planning", "spells-build", "spells-venture", "spells-meta", "testing-standards",
    ]);

    await writeManifest(tmpDir, { profile: "lite", spell_scope: "user", components });
    const spy = vi.spyOn(console, "log");
    await runUpdate({ dryRun: true }, tmpDir, ASSETS_DIR, NEW_VERSION);
    const optedOut = logged(spy);
    expect(optedOut).toContain("spell add testing-standards");
    expect(optedOut).not.toMatch(/spell add spells-/);

    spy.mockClear();
    await writeManifest(tmpDir, { profile: "lite", components });
    await runUpdate({ dryRun: true }, tmpDir, ASSETS_DIR, NEW_VERSION);
    expect(logged(spy)).toContain("spell add spells-session");
  });

  it("leaves out a user-owned component whose files are all already there, and flags a partly present one", async () => {
    const continuity = getComponent("session-continuity").files;
    const components = installedProfile("lite", ["session-continuity"]);

    for (const f of continuity) {
      await fs.mkdir(join(tmpDir, f, ".."), { recursive: true });
      await fs.writeFile(join(tmpDir, f), "operator's own\n");
    }
    expect(await findNewlyAvailable(tmpDir, "lite", components, "repo")).toEqual([]);

    await removeFixtureDir(join(tmpDir, "TODO.md"));
    const partial = await findNewlyAvailable(tmpDir, "lite", components, "repo");
    expect(partial.map((c) => c.name)).toEqual(["session-continuity"]);
    expect(partial[0]!.alreadyPresent).toContain("README.md");
    expect(partial[0]!.alreadyPresent).not.toContain("TODO.md");
  });

  it("counts a legacy spell-prompts entry as the spells-* components that replaced it", async () => {
    const legacy: InstalledComponent[] = [
      ...installedProfile("lite", [
        "spells-session", "spells-capture", "spells-delivery", "spells-review",
        "spells-planning", "spells-build", "spells-venture", "spells-meta",
      ]),
      { name: "spell-prompts", files: [], installedVersion: OLD_VERSION },
    ];
    const found = await findNewlyAvailable(tmpDir, "lite", migrateLegacyComponents(legacy).components, "repo");
    expect(found.filter((c) => c.name.startsWith("spells-"))).toEqual([]);
  });

  it("reports nothing for an unrecognized profile rather than throwing", async () => {
    expect(await findNewlyAvailable(tmpDir, "no-such-profile" as Profile, [], "repo")).toEqual([]);
  });
});
