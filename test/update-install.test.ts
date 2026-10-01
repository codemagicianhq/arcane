import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ArcaneManifest, InstalledComponent, Profile } from "../src/types.js";
import { getComponent, listProfiles } from "../src/modules/registry.js";
import { removeFixtureDir } from "./helpers/git-fixture.js";
import { HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";

const { inspectGitRepositoryMock, checkboxMock } = vi.hoisted(() => ({
  inspectGitRepositoryMock: vi.fn(),
  checkboxMock: vi.fn(),
}));

vi.mock("../src/modules/npm-registry.js", () => ({ fetchPublishedFile: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@inquirer/prompts", () => ({
  confirm: vi.fn().mockResolvedValue(true),
  select: vi.fn().mockResolvedValue("internal"),
  input: vi.fn().mockResolvedValue("docs"),
  checkbox: checkboxMock,
}));
vi.mock("../src/modules/git.js", () => ({
  inspectGitRepository: inspectGitRepositoryMock,
  countUncommittedChanges: vi.fn().mockResolvedValue(0),
  correctUnbornMasterDefault: vi.fn().mockResolvedValue({ corrected: false, to: "main" }),
  ensureLocalPullRebase: vi.fn().mockResolvedValue({ action: "already-set" }),
}));

const { runUpdate } = await import("../src/commands/update.js");
const { planUpdateInstalls } = await import("../src/modules/update-installs.js");

const ASSETS_DIR = join(process.cwd(), "src/assets");
const OLD_VERSION = "0.0.9";
const NEW_VERSION = "0.1.0";
const STANDARDS = [
  "external-verification-standards",
  "web-discoverability-standards",
  "mobile-release-standards",
  "compliance-standards",
];
// A governance-only install that predates these two; the second is initOnly.
const PREDATES = ["compliance-standards", "line-ending-baseline"];

async function writeManifest(dir: string, partial: Partial<ArcaneManifest>): Promise<void> {
  const manifest: ArcaneManifest = {
    version: OLD_VERSION,
    profile: "lite",
    installedAt: "2026-01-01T00:00:00.000Z",
    components: [],
    role: "consumer",
    tracking_mode: "internal",
    external_provider: null,
    content_sensitivity: "standard",
    push_policy: "open",
    ...partial,
  };
  await fs.writeFile(join(dir, ".arcane.json"), JSON.stringify(manifest, null, 2));
}

async function readManifestFile(dir: string): Promise<ArcaneManifest> {
  return JSON.parse(await fs.readFile(join(dir, ".arcane.json"), "utf8")) as ArcaneManifest;
}

function entry(name: string, version = OLD_VERSION): InstalledComponent {
  return { name, files: [...getComponent(name).files], installedVersion: version };
}

function installedProfile(profile: Profile, omit: string[], version = OLD_VERSION): InstalledComponent[] {
  const names = listProfiles().find((p) => p.id === profile)!.components;
  return names.filter((n) => !omit.includes(n)).map((name) => entry(name, version));
}

function logged(spy: { mock: { calls: unknown[][] } }): string {
  return spy.mock.calls.map((c) => c.join(" ")).join("\n");
}

function names(out: string, marker: string): string[] {
  return [...out.matchAll(new RegExp(`${marker}: ([a-z0-9-]+) `, "g"))].map((m) => m[1]!);
}

async function exists(path: string): Promise<boolean> {
  return fs.access(path).then(() => true, () => false);
}

async function listAll(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true, recursive: true })) {
    if (e.isFile()) out.push(join(e.parentPath, e.name));
  }
  return out.sort();
}

function setTTY(value: boolean): () => void {
  const before = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
  Object.defineProperty(process.stdin, "isTTY", { value, configurable: true });
  return () => {
    if (before) Object.defineProperty(process.stdin, "isTTY", before);
    else delete (process.stdin as { isTTY?: boolean }).isTTY;
  };
}

describe("spell update installs (ARC-052)", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "update-install-"));
    inspectGitRepositoryMock.mockResolvedValue({ status: "ready", uncommittedChanges: 0 });
    checkboxMock.mockReset();
  });

  afterEach(async () => {
    await removeFixtureDir(tmpDir);
    vi.restoreAllMocks();
  });

  describe("R-293a — missing `requires` prerequisites", () => {
    it(
      "installs each missing prerequisite, reports it by name, hash-tracks it, and installs nothing else",
      async () => {
        await writeManifest(tmpDir, { profile: "full", components: [entry("spells-build")] });
        const spy = vi.spyOn(console, "log");

        await runUpdate({}, tmpDir, ASSETS_DIR, NEW_VERSION);

        const out = logged(spy);
        expect(STANDARDS).toHaveLength(4);
        for (const name of STANDARDS) {
          expect(out).toContain(`Installed: ${name} (prerequisite of spells-build)`);
          expect(await exists(join(tmpDir, getComponent(name).files[0]!))).toBe(true);
        }
        expect(out).not.toContain("Missing prerequisites");

        const after = await readManifestFile(tmpDir);
        expect(after.components.map((c) => c.name)).toEqual(["spells-build", ...STANDARDS]);
        for (const name of STANDARDS) {
          const recorded = after.components.find((c) => c.name === name)!;
          expect(recorded.installedVersion).toBe(NEW_VERSION);
          expect(Object.keys(recorded.fileHashes ?? {})).toEqual(recorded.files);
          expect(recorded.files.length).toBeGreaterThan(0);
        }
      },
      HEAVY_TEST_TIMEOUT,
    );

    it(
      "--dry-run names exactly the set a real run installs, and writes nothing",
      async () => {
        await writeManifest(tmpDir, { profile: "full", components: [entry("spells-build")] });
        const before = await listAll(tmpDir);
        const spy = vi.spyOn(console, "log");

        await runUpdate({ dryRun: true }, tmpDir, ASSETS_DIR, NEW_VERSION);
        const dry = names(logged(spy), "Would install");
        expect(await listAll(tmpDir)).toEqual(before);

        spy.mockClear();
        await runUpdate({}, tmpDir, ASSETS_DIR, NEW_VERSION);
        const real = names(logged(spy), "Installed");

        expect(dry).toHaveLength(4);
        expect(real).toEqual(dry);
      },
      HEAVY_TEST_TIMEOUT,
    );

    it(
      "installs prerequisites on a same-version run too",
      async () => {
        await writeManifest(tmpDir, {
          version: NEW_VERSION,
          profile: "full",
          components: [entry("spells-build", NEW_VERSION)],
        });
        for (const f of getComponent("spells-build").files) {
          await fs.mkdir(join(tmpDir, f, ".."), { recursive: true });
          await fs.copyFile(join(ASSETS_DIR, f), join(tmpDir, f));
        }
        const spy = vi.spyOn(console, "log");

        await runUpdate({}, tmpDir, ASSETS_DIR, NEW_VERSION);

        expect(spy).toHaveBeenCalledWith("Installed components are at the current version.");
        expect(names(logged(spy), "Installed")).toEqual(STANDARDS);
        expect((await readManifestFile(tmpDir)).components.map((c) => c.name)).toEqual(["spells-build", ...STANDARDS]);
      },
      HEAVY_TEST_TIMEOUT,
    );

    it(
      "leaves a prerequisite whose destination already exists alone, and says why in the list",
      async () => {
        await writeManifest(tmpDir, { profile: "full", components: [entry("spells-build")] });
        const mine = join(tmpDir, ".arcane/governance/compliance-standards.md");
        await fs.mkdir(join(mine, ".."), { recursive: true });
        await fs.writeFile(mine, "mine\n");
        const spy = vi.spyOn(console, "log");

        await runUpdate({}, tmpDir, ASSETS_DIR, NEW_VERSION);

        const out = logged(spy);
        expect(await fs.readFile(mine, "utf8")).toBe("mine\n");
        expect(names(out, "Installed")).toEqual(STANDARDS.filter((n) => n !== "compliance-standards"));
        expect(out).toContain("compliance-standards (required by spells-build)");
        expect(out).toContain("not installed by update: .arcane/governance/compliance-standards.md already exists");
        expect((await readManifestFile(tmpDir)).components.map((c) => c.name)).not.toContain("compliance-standards");
      },
      HEAVY_TEST_TIMEOUT,
    );

    it("never plans an initOnly prerequisite; it stays listed with the reason", async () => {
      const plan = await planUpdateInstalls({
        targetDir: tmpDir,
        assetsDir: ASSETS_DIR,
        spellScope: "repo",
        missingRequires: [{ name: "line-ending-baseline", requiredBy: ["git-conventions"] }],
        selectedNew: [],
      });

      expect(getComponent("line-ending-baseline").initOnly).toBe(true);
      expect(plan.items).toEqual([]);
      expect(plan.leftAlone).toHaveLength(1);
      expect(plan.leftAlone[0]).toMatchObject({ name: "line-ending-baseline", kind: "prerequisite" });
      expect(plan.leftAlone[0]!.reason).toContain("initOnly");
    });
  });

  describe("R-293b — newly available components are opt-in", () => {
    const governance = async (extra: Partial<ArcaneManifest> = {}): Promise<void> => {
      await writeManifest(tmpDir, {
        profile: "governance-only",
        components: installedProfile("governance-only", PREDATES),
        ...extra,
      });
    };

    it("--add-new installs the newly available component and hash-tracks it", async () => {
      await governance();
      const spy = vi.spyOn(console, "log");

      await runUpdate({ addNew: true }, tmpDir, ASSETS_DIR, NEW_VERSION);

      const out = logged(spy);
      expect(out).toContain("Installed: compliance-standards (newly available)");
      expect(await exists(join(tmpDir, ".arcane/governance/compliance-standards.md"))).toBe(true);
      const recorded = (await readManifestFile(tmpDir)).components.find((c) => c.name === "compliance-standards")!;
      expect(recorded.installedVersion).toBe(NEW_VERSION);
      expect(Object.keys(recorded.fileHashes ?? {})).toEqual(recorded.files);
      expect(recorded.files).toHaveLength(1);
      expect(spy).not.toHaveBeenCalledWith("      spell add compliance-standards");
    });

    it("--add-new never installs an initOnly component; it is still listed with its `spell add` line", async () => {
      await governance();
      const spy = vi.spyOn(console, "log");

      await runUpdate({ addNew: true }, tmpDir, ASSETS_DIR, NEW_VERSION);

      expect(getComponent("line-ending-baseline").initOnly).toBe(true);
      expect(await exists(join(tmpDir, ".gitattributes"))).toBe(false);
      expect((await readManifestFile(tmpDir)).components.map((c) => c.name)).not.toContain("line-ending-baseline");
      expect(spy).toHaveBeenCalledWith("      spell add line-ending-baseline");
    });

    it("without --add-new and without a terminal, installs nothing and prints the list as before", async () => {
      await governance();
      const restore = setTTY(false);
      const spy = vi.spyOn(console, "log");
      try {
        await runUpdate({}, tmpDir, ASSETS_DIR, NEW_VERSION);
      } finally {
        restore();
      }

      const out = logged(spy);
      expect(checkboxMock).not.toHaveBeenCalled();
      expect(out).not.toContain("Installed: compliance-standards");
      expect(spy).toHaveBeenCalledWith("      spell add compliance-standards");
      expect(await exists(join(tmpDir, ".arcane/governance/compliance-standards.md"))).toBe(false);
    });

    it("in a terminal, accepting the checklist installs the chosen component; initOnly is not offered", async () => {
      await governance();
      checkboxMock.mockResolvedValue(["compliance-standards"]);
      const restore = setTTY(true);
      try {
        await runUpdate({}, tmpDir, ASSETS_DIR, NEW_VERSION);
      } finally {
        restore();
      }

      expect(checkboxMock).toHaveBeenCalledTimes(1);
      const offered = (checkboxMock.mock.calls[0]![0] as { choices: Array<{ value: string }> }).choices.map((c) => c.value);
      expect(offered).toEqual(["compliance-standards"]);
      expect(await exists(join(tmpDir, ".arcane/governance/compliance-standards.md"))).toBe(true);
      expect((await readManifestFile(tmpDir)).components.map((c) => c.name)).toContain("compliance-standards");
    });

    it("in a terminal, declining the checklist installs nothing and still prints the list", async () => {
      await governance();
      checkboxMock.mockResolvedValue([]);
      const restore = setTTY(true);
      const spy = vi.spyOn(console, "log");
      try {
        await runUpdate({}, tmpDir, ASSETS_DIR, NEW_VERSION);
      } finally {
        restore();
      }

      expect(checkboxMock).toHaveBeenCalledTimes(1);
      expect(await exists(join(tmpDir, ".arcane/governance/compliance-standards.md"))).toBe(false);
      expect(spy).toHaveBeenCalledWith("      spell add compliance-standards");
    });

    it("--add-new --dry-run names the same set the real run installs, and writes nothing", async () => {
      await governance();
      const before = await listAll(tmpDir);
      const spy = vi.spyOn(console, "log");

      await runUpdate({ addNew: true, dryRun: true }, tmpDir, ASSETS_DIR, NEW_VERSION);
      const dry = names(logged(spy), "Would install");
      expect(await listAll(tmpDir)).toEqual(before);

      spy.mockClear();
      await runUpdate({ addNew: true }, tmpDir, ASSETS_DIR, NEW_VERSION);
      const real = names(logged(spy), "Installed");

      expect(dry).toEqual(["compliance-standards"]);
      expect(real).toEqual(dry);
    });

    it("--add-new leaves a candidate alone when its destination exists, and reports it", async () => {
      await governance();
      const mine = join(tmpDir, ".arcane/governance/compliance-standards.md");
      await fs.mkdir(join(mine, ".."), { recursive: true });
      await fs.writeFile(mine, "mine\n");
      const spy = vi.spyOn(console, "log");

      await runUpdate({ addNew: true }, tmpDir, ASSETS_DIR, NEW_VERSION);

      expect(await fs.readFile(mine, "utf8")).toBe("mine\n");
      expect(logged(spy)).toContain("Not installed: compliance-standards");
      expect((await readManifestFile(tmpDir)).components.map((c) => c.name)).not.toContain("compliance-standards");
    });

    it("--add-new is refused for the user tier, and nothing is written", async () => {
      await governance({ scope: "user" });
      const err = vi.spyOn(console, "error");
      const exit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);
      const before = await listAll(tmpDir);

      await runUpdate({ addNew: true, user: true }, tmpDir, ASSETS_DIR, NEW_VERSION);

      expect(logged(err)).toContain("--add-new");
      expect(exit).toHaveBeenCalledWith(1);
      expect(await listAll(tmpDir)).toEqual(before);
    });

    it("after installing, the list header does not claim nothing was added and omits the --add-new hint", async () => {
      await governance();
      const spy = vi.spyOn(console, "log");

      await runUpdate({ addNew: true }, tmpDir, ASSETS_DIR, NEW_VERSION);

      const out = logged(spy);
      expect(out).toContain("Installed: compliance-standards (newly available)");
      expect(out).toContain("not installed by this run:");
      expect(out).not.toContain("nothing was added");
      expect(out).not.toContain("spell update --add-new");
    });

    it("without installing anything, the header still says nothing was added and shows the hint", async () => {
      await governance();
      const spy = vi.spyOn(console, "log");

      await runUpdate({}, tmpDir, ASSETS_DIR, NEW_VERSION);

      const out = logged(spy);
      expect(out).toContain("nothing was added");
      expect(out).toContain("spell update --add-new");
    });
  });

  describe("review regressions — a directory at a prerequisite destination", () => {
    it("is left alone and reported, without a crash", async () => {
      await writeManifest(tmpDir, { profile: "full", components: [entry("spells-build")] });
      const target = getComponent(STANDARDS[0]!).files[0]!;
      await fs.mkdir(join(tmpDir, target), { recursive: true });
      const spy = vi.spyOn(console, "log");

      await runUpdate({}, tmpDir, ASSETS_DIR, NEW_VERSION);

      expect((await fs.stat(join(tmpDir, target))).isDirectory()).toBe(true);
      expect(logged(spy)).not.toContain(`Installed: ${STANDARDS[0]!} `);
      const recorded = (await readManifestFile(tmpDir)).components.map((c) => c.name);
      expect(recorded).not.toContain(STANDARDS[0]!);
      for (const name of STANDARDS.slice(1)) expect(recorded).toContain(name);
    });

    it("adopts a prerequisite whose unrecorded file is identical to the packaged one, instead of leaving it alone", async () => {
      await writeManifest(tmpDir, { profile: "full", components: [entry("spells-build")] });
      const target = getComponent("compliance-standards").files[0]!;
      await fs.mkdir(join(tmpDir, target, ".."), { recursive: true });
      await fs.copyFile(join(ASSETS_DIR, target), join(tmpDir, target));
      const spy = vi.spyOn(console, "log");

      await runUpdate({}, tmpDir, ASSETS_DIR, NEW_VERSION);

      const out = logged(spy);
      expect(names(out, "Installed")).toEqual(STANDARDS);
      expect(out).not.toContain("not installed by update");
      const recorded = (await readManifestFile(tmpDir)).components.find((c) => c.name === "compliance-standards")!;
      expect(Object.keys(recorded.fileHashes ?? {})).toEqual([target]);
    });

    it("names a directory at a prerequisite destination as a directory in the reason", async () => {
      await writeManifest(tmpDir, { profile: "full", components: [entry("spells-build")] });
      const target = getComponent(STANDARDS[0]!).files[0]!;
      await fs.mkdir(join(tmpDir, target), { recursive: true });
      const spy = vi.spyOn(console, "log");

      await runUpdate({}, tmpDir, ASSETS_DIR, NEW_VERSION);

      expect(logged(spy)).toContain(`not installed by update: ${target} is a directory, which update does not replace`);
    });
  });
});
