import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getComponent } from "../src/modules/registry.js";
import { planComponentInstall, executeInstallPlan, type InstallPlan } from "../src/modules/component-install.js";
import { removeFixtureDir } from "./helpers/fixture-dir.js";

const ASSETS_DIR = join(process.cwd(), "src/assets");
const TESTING = ".arcane/governance/testing-standards.md";

async function listAll(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true, recursive: true })) {
    if (e.isFile()) out.push(join(e.parentPath, e.name));
  }
  return out.sort();
}

describe("component install plan — review leftovers", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "component-install-"));
  });

  afterEach(async () => {
    await removeFixtureDir(tmpDir);
  });

  describe("planComponentInstall", () => {
    it("adopts an unrecorded file identical to the packaged one instead of refusing it", async () => {
      await fs.mkdir(join(tmpDir, ".arcane/governance"), { recursive: true });
      await fs.copyFile(join(ASSETS_DIR, TESTING), join(tmpDir, TESTING));

      const plan = await planComponentInstall(getComponent("testing-standards"), tmpDir, ASSETS_DIR, {});

      expect(plan.files.map((f) => f.state)).toEqual(["identical"]);
      expect(plan.toCopy.map((f) => f.file)).toEqual([TESTING]);
      expect(plan.conflicts).toEqual([]);
    });

    it("still refuses a differing file without --force", async () => {
      await fs.mkdir(join(tmpDir, ".arcane/governance"), { recursive: true });
      await fs.writeFile(join(tmpDir, TESTING), "mine\n");

      const plan = await planComponentInstall(getComponent("testing-standards"), tmpDir, ASSETS_DIR, {});

      expect(plan.conflicts.map((f) => f.state)).toEqual(["differs"]);
      expect(plan.toCopy).toEqual([]);
    });

    it("treats a directory at a destination as a conflict even under --force, and never hashes it", async () => {
      await fs.mkdir(join(tmpDir, TESTING), { recursive: true });

      const plain = await planComponentInstall(getComponent("testing-standards"), tmpDir, ASSETS_DIR, {});
      const forced = await planComponentInstall(getComponent("testing-standards"), tmpDir, ASSETS_DIR, { force: true });

      for (const plan of [plain, forced]) {
        expect(plan.files.map((f) => f.state)).toEqual(["directory"]);
        expect(plan.conflicts.map((f) => f.file)).toEqual([TESTING]);
        expect(plan.toCopy).toEqual([]);
      }
    });

    it("keeps a directory at a skipExisting destination, as it keeps any present file", async () => {
      const component = getComponent("line-ending-baseline");
      expect(component.skipExisting).toBe(true);
      await fs.mkdir(join(tmpDir, component.files[0]!), { recursive: true });

      const plan = await planComponentInstall(component, tmpDir, ASSETS_DIR, {});

      expect(plan.kept.map((f) => f.state)).toEqual(["directory"]);
      expect(plan.conflicts).toEqual([]);
    });
  });

  describe("executeInstallPlan is atomic", () => {
    const src = join(ASSETS_DIR, TESTING);
    const planFor = (toCopy: InstallPlan["toCopy"]): InstallPlan => ({
      component: getComponent("testing-standards"),
      files: toCopy,
      toCopy,
      kept: [],
      conflicts: [],
    });

    it("removes the files it created when a later copy fails, and rethrows", async () => {
      // A FILE where the second destination's parent directory must be makes ensureDir throw.
      await fs.writeFile(join(tmpDir, "blocked"), "not a directory\n");
      const before = await listAll(tmpDir);
      const plan = planFor([
        { file: "first/a.md", src, state: "missing" },
        { file: "blocked/b.md", src, state: "missing" },
      ]);

      await expect(executeInstallPlan(plan, tmpDir)).rejects.toThrow();

      expect(await listAll(tmpDir)).toEqual(before);
      await expect(fs.stat(join(tmpDir, "first"))).rejects.toThrow();
    });

    it("restores the previous content of a file it overwrote when a later copy fails", async () => {
      await fs.writeFile(join(tmpDir, "mine.md"), "mine\n");
      await fs.writeFile(join(tmpDir, "blocked"), "not a directory\n");
      const plan = planFor([
        { file: "mine.md", src, state: "differs" },
        { file: "blocked/b.md", src, state: "missing" },
      ]);

      await expect(executeInstallPlan(plan, tmpDir)).rejects.toThrow();

      expect(await fs.readFile(join(tmpDir, "mine.md"), "utf8")).toBe("mine\n");
    });

    it("records every file and its hash when nothing fails", async () => {
      const plan = planFor([
        { file: "first/a.md", src, state: "missing" },
        { file: "second/b.md", src, state: "missing" },
      ]);

      const { files, fileHashes } = await executeInstallPlan(plan, tmpDir);

      expect(files).toEqual(["first/a.md", "second/b.md"]);
      expect(Object.keys(fileHashes)).toEqual(files);
      expect(await fs.readFile(join(tmpDir, "second/b.md"), "utf8")).toBe(await fs.readFile(src, "utf8"));
    });
  });
});
