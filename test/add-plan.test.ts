import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ArcaneManifest } from "../src/types.js";
import { removeFixtureDir } from "./helpers/fixture-dir.js";

const { runAdd } = await import("../src/commands/add.js");

const ASSETS_DIR = join(process.cwd(), "src/assets");
const VERSION = "0.1.0";
const TESTING = ".arcane/governance/testing-standards.md";
const NAMING = ".arcane/governance/naming-conventions.md";
const MINE = "{\"mine\":true}\n";

async function seedManifest(dir: string, components: ArcaneManifest["components"] = []) {
  const manifest: ArcaneManifest = {
    version: VERSION,
    profile: "lite",
    installedAt: "2026-01-01T00:00:00.000Z",
    components,
  };
  await fs.writeFile(join(dir, ".arcane.json"), JSON.stringify(manifest, null, 2));
}

async function readManifest(dir: string): Promise<ArcaneManifest> {
  return JSON.parse(await fs.readFile(join(dir, ".arcane.json"), "utf8")) as ArcaneManifest;
}

async function listAll(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true, recursive: true })) {
    if (e.isFile()) out.push(join(e.parentPath, e.name));
  }
  return out.sort();
}

function lines(spy: { mock: { calls: unknown[][] } }): string[] {
  return spy.mock.calls.map((c) => String(c[0]));
}

describe("spell add — plan, refusal, skipExisting, multiple names", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "add-plan-"));
    await seedManifest(tmpDir);
  });

  afterEach(async () => {
    await removeFixtureDir(tmpDir);
    vi.restoreAllMocks();
  });

  describe("R-294a dry-run names the destination state", () => {
    it("prints three distinct lines for missing, identical and differing, and writes nothing", async () => {
      const src = await fs.readFile(join(ASSETS_DIR, TESTING), "utf8");
      await fs.mkdir(join(tmpDir, ".arcane/governance"), { recursive: true });
      vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

      const run = async () => {
        const log = vi.spyOn(console, "log");
        await runAdd(["testing-standards"], { dryRun: true }, tmpDir, ASSETS_DIR, VERSION);
        const out = lines(log).filter((l) => l.includes(TESTING));
        log.mockRestore();
        return out;
      };

      const missing = await run();
      await fs.writeFile(join(tmpDir, TESTING), src);
      const identical = await run();
      await fs.writeFile(join(tmpDir, TESTING), "something else\n");
      const differs = await run();

      expect(missing).toHaveLength(1);
      expect(identical).toHaveLength(1);
      expect(differs).toHaveLength(1);
      expect(missing[0]).toContain("Would copy");
      expect(identical[0]).toContain("identical");
      expect(differs[0]).toContain("differs");
      expect(new Set([missing[0], identical[0], differs[0]]).size).toBe(3);

      expect(await fs.readFile(join(tmpDir, TESTING), "utf8")).toBe("something else\n");
      expect((await readManifest(tmpDir)).components).toHaveLength(0);
    });

    it("writes nothing on a dry run against an empty directory", async () => {
      const before = await listAll(tmpDir);
      await runAdd(["testing-standards"], { dryRun: true }, tmpDir, ASSETS_DIR, VERSION);
      expect(before.length).toBeGreaterThan(0);
      expect(await listAll(tmpDir)).toEqual(before);
    });
  });

  describe("R-294b a real run on an existing file refuses cleanly", () => {
    it("prints one error line naming the file and --force, exits 1, writes nothing", async () => {
      await fs.mkdir(join(tmpDir, ".arcane/governance"), { recursive: true });
      await fs.writeFile(join(tmpDir, TESTING), "mine\n");
      const err = vi.spyOn(console, "error");
      const exit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

      await runAdd(["testing-standards"], {}, tmpDir, ASSETS_DIR, VERSION);

      const errorLines = lines(err);
      expect(errorLines).toHaveLength(1);
      expect(errorLines[0]).toContain(TESTING);
      expect(errorLines[0]).toContain("--force");
      expect(errorLines[0]).not.toMatch(/\n\s+at /);
      expect(exit).toHaveBeenCalledWith(1);
      expect(await fs.readFile(join(tmpDir, TESTING), "utf8")).toBe("mine\n");
      expect((await readManifest(tmpDir)).components).toHaveLength(0);
    });

    it("writes none of a multi-file component's files when one destination exists", async () => {
      const component = "spells-capture";
      const { getComponent } = await import("../src/modules/registry.js");
      const { planComponentInstall } = await import("../src/modules/component-install.js");
      const plan = await planComponentInstall(getComponent(component), tmpDir, ASSETS_DIR, {});
      expect(plan.files.length).toBeGreaterThan(1);

      const last = plan.files[plan.files.length - 1]!.file;
      await fs.mkdir(join(tmpDir, last, ".."), { recursive: true });
      await fs.writeFile(join(tmpDir, last), "mine\n");
      const before = await listAll(tmpDir);
      vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

      await runAdd([component], {}, tmpDir, ASSETS_DIR, VERSION);

      expect(await listAll(tmpDir)).toEqual(before);
    });
  });

  describe("R-294c a skipExisting component keeps a present destination", () => {
    it("keeps an existing .gitattributes, reports it as kept, and does not record it", async () => {
      await fs.writeFile(join(tmpDir, ".gitattributes"), MINE);
      const log = vi.spyOn(console, "log");
      const exit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

      await runAdd(["line-ending-baseline"], {}, tmpDir, ASSETS_DIR, VERSION);

      expect(exit).not.toHaveBeenCalled();
      expect(await fs.readFile(join(tmpDir, ".gitattributes"), "utf8")).toBe(MINE);
      expect(lines(log).some((l) => l.includes("Kept") && l.includes(".gitattributes"))).toBe(true);
      const installed = (await readManifest(tmpDir)).components.find((c) => c.name === "line-ending-baseline");
      expect(installed).toBeDefined();
      expect(installed!.files).not.toContain(".gitattributes");
    });

    it("creates a missing .gitattributes and records it", async () => {
      await runAdd(["line-ending-baseline"], {}, tmpDir, ASSETS_DIR, VERSION);

      expect((await fs.stat(join(tmpDir, ".gitattributes"))).isFile()).toBe(true);
      const installed = (await readManifest(tmpDir)).components.find((c) => c.name === "line-ending-baseline");
      expect(installed!.files).toContain(".gitattributes");
    });

    it("overwrites a kept file under --force and records it", async () => {
      await fs.writeFile(join(tmpDir, ".gitattributes"), MINE);
      await runAdd(["line-ending-baseline"], { force: true }, tmpDir, ASSETS_DIR, VERSION);

      expect(await fs.readFile(join(tmpDir, ".gitattributes"), "utf8")).not.toBe(MINE);
      const installed = (await readManifest(tmpDir)).components.find((c) => c.name === "line-ending-baseline");
      expect(installed!.files).toContain(".gitattributes");
    });

    it("dry-run says Would keep, not Would copy, for a present skipExisting file", async () => {
      await fs.writeFile(join(tmpDir, ".gitattributes"), MINE);
      const log = vi.spyOn(console, "log");
      await runAdd(["line-ending-baseline"], { dryRun: true }, tmpDir, ASSETS_DIR, VERSION);
      const line = lines(log).find((l) => l.includes(".gitattributes"));
      expect(line).toContain("Would keep");
      expect(await fs.readFile(join(tmpDir, ".gitattributes"), "utf8")).toBe(MINE);
    });
  });

  describe("R-293c spell add a b c", () => {
    it("adds every name in order when all succeed", async () => {
      await runAdd(["testing-standards", "naming-conventions"], {}, tmpDir, ASSETS_DIR, VERSION);

      const names = (await readManifest(tmpDir)).components.map((c) => c.name);
      expect(names).toEqual(["testing-standards", "naming-conventions"]);
      expect((await fs.stat(join(tmpDir, TESTING))).isFile()).toBe(true);
      expect((await fs.stat(join(tmpDir, NAMING))).isFile()).toBe(true);
    });

    it("stops at the first failure, reports what was added, and leaves the rest untouched", async () => {
      const err = vi.spyOn(console, "error");
      const exit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

      await runAdd(
        ["testing-standards", "no-such-component", "naming-conventions"],
        {},
        tmpDir,
        ASSETS_DIR,
        VERSION,
      );

      const names = (await readManifest(tmpDir)).components.map((c) => c.name);
      expect(names).toEqual(["testing-standards"]);
      await expect(fs.stat(join(tmpDir, NAMING))).rejects.toThrow();
      const summary = lines(err).find((l) => l.startsWith("Added:"));
      expect(summary).toContain("testing-standards");
      expect(summary).toContain("Not attempted: naming-conventions");
      expect(exit).toHaveBeenCalledWith(1);
    });

    it("skips an already-installed name without failing and continues", async () => {
      await seedManifest(tmpDir, [
        { name: "testing-standards", files: [TESTING], installedVersion: VERSION },
      ]);
      const log = vi.spyOn(console, "log");
      const exit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

      await runAdd(["testing-standards", "naming-conventions"], {}, tmpDir, ASSETS_DIR, VERSION);

      expect(exit).not.toHaveBeenCalled();
      expect(lines(log).some((l) => l.includes("already installed"))).toBe(true);
      const names = (await readManifest(tmpDir)).components.map((c) => c.name);
      expect(names).toEqual(["testing-standards", "naming-conventions"]);
    });
  });

  describe("review regressions — directory at a destination, multi-name dry run", () => {
    it("refuses cleanly when a directory sits where a file would go", async () => {
      await fs.mkdir(join(tmpDir, TESTING), { recursive: true });
      const err = vi.spyOn(console, "error");
      const exit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

      await runAdd(["testing-standards"], {}, tmpDir, ASSETS_DIR, VERSION);

      const errorLines = lines(err);
      expect(errorLines).toHaveLength(1);
      expect(errorLines[0]).toContain(TESTING);
      expect(errorLines[0]).toContain("--force");
      expect(errorLines.join("\n")).not.toContain("EISDIR");
      expect(exit).toHaveBeenCalledWith(1);
      expect((await fs.stat(join(tmpDir, TESTING))).isDirectory()).toBe(true);
      expect((await readManifest(tmpDir)).components).toHaveLength(0);
    });

    it("a dry run walks every name, reports the refusal at the end, and exits 1", async () => {
      await fs.mkdir(join(tmpDir, ".arcane/governance"), { recursive: true });
      await fs.writeFile(join(tmpDir, TESTING), MINE);
      const log = vi.spyOn(console, "log");
      const err = vi.spyOn(console, "error");
      const exit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

      await runAdd(
        ["testing-standards", "naming-conventions"],
        { dryRun: true },
        tmpDir,
        ASSETS_DIR,
        VERSION,
      );

      expect(lines(log).some((l) => l.includes(NAMING))).toBe(true);
      expect(lines(err).some((l) => l.includes("Would refuse: testing-standards"))).toBe(true);
      expect(exit).toHaveBeenCalledWith(1);
      await expect(fs.stat(join(tmpDir, NAMING))).rejects.toThrow();
      expect(await fs.readFile(join(tmpDir, TESTING), "utf8")).toBe(MINE);
    });
  });

  describe("review leftovers — adopt identical, refuse a directory cleanly", () => {
    it("adopts an unrecorded file identical to the packaged one: records it, leaves its content alone", async () => {
      await fs.mkdir(join(tmpDir, ".arcane/governance"), { recursive: true });
      await fs.copyFile(join(ASSETS_DIR, TESTING), join(tmpDir, TESTING));
      const log = vi.spyOn(console, "log");
      const exit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

      await runAdd(["testing-standards"], {}, tmpDir, ASSETS_DIR, VERSION);

      expect(exit).not.toHaveBeenCalled();
      const recorded = (await readManifest(tmpDir)).components.find((c) => c.name === "testing-standards")!;
      expect(recorded.files).toEqual([TESTING]);
      expect(Object.keys(recorded.fileHashes ?? {})).toEqual([TESTING]);
      expect(await fs.readFile(join(tmpDir, TESTING), "utf8")).toBe(await fs.readFile(join(ASSETS_DIR, TESTING), "utf8"));
      expect(lines(log).some((l) => l.includes("Added component \"testing-standards\""))).toBe(true);
    });

    it("dry-run says Would adopt for an identical file, and does not refuse the component", async () => {
      await fs.mkdir(join(tmpDir, ".arcane/governance"), { recursive: true });
      await fs.copyFile(join(ASSETS_DIR, TESTING), join(tmpDir, TESTING));
      const log = vi.spyOn(console, "log");
      const exit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

      await runAdd(["testing-standards"], { dryRun: true }, tmpDir, ASSETS_DIR, VERSION);

      expect(lines(log).some((l) => l.includes(`Would adopt: ${TESTING}`))).toBe(true);
      expect(lines(log).some((l) => l.includes("Would refuse"))).toBe(false);
      expect(exit).not.toHaveBeenCalled();
      expect((await readManifest(tmpDir)).components).toHaveLength(0);
    });

    it("refuses a directory at a destination with wording that names the directory, not --force", async () => {
      await fs.mkdir(join(tmpDir, TESTING), { recursive: true });
      const err = vi.spyOn(console, "error");
      const exit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

      await runAdd(["testing-standards"], {}, tmpDir, ASSETS_DIR, VERSION);

      const errorLines = lines(err);
      expect(errorLines).toHaveLength(1);
      expect(errorLines[0]).toContain(`"${TESTING}" is a directory`);
      expect(errorLines[0]).toContain("Remove it first");
      expect(errorLines[0]).not.toContain("Use --force");
      expect(exit).toHaveBeenCalledWith(1);
    });

    it("--force over a directory refuses cleanly instead of failing at copy time", async () => {
      await fs.mkdir(join(tmpDir, TESTING), { recursive: true });
      const err = vi.spyOn(console, "error");
      const exit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

      await runAdd(["testing-standards"], { force: true }, tmpDir, ASSETS_DIR, VERSION);

      expect(lines(err)).toHaveLength(1);
      expect(lines(err)[0]).toContain("is a directory, which --force does not replace");
      expect(lines(err).join("\n")).not.toContain("EISDIR");
      expect(exit).toHaveBeenCalledWith(1);
      expect((await fs.stat(join(tmpDir, TESTING))).isDirectory()).toBe(true);
      expect((await readManifest(tmpDir)).components).toHaveLength(0);
    });

    it("dry-run names the directory on its own line and in the component summary, with or without --force", async () => {
      await fs.mkdir(join(tmpDir, TESTING), { recursive: true });
      vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

      for (const options of [{ dryRun: true }, { dryRun: true, force: true }]) {
        const log = vi.spyOn(console, "log");
        await runAdd(["testing-standards"], options, tmpDir, ASSETS_DIR, VERSION);
        const out = lines(log);
        log.mockRestore();
        expect(out.some((l) => l.includes(`Would refuse: ${TESTING} (exists, is a directory) — remove it first`))).toBe(true);
        expect(out.some((l) => l.includes(`a directory is at "${TESTING}"`))).toBe(true);
        expect(out.some((l) => l.includes("differs from the packaged file"))).toBe(false);
      }
    });
  });
});
