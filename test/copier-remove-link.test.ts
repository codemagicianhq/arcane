import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { createFixtureDir, removeFixtureDir } from "./helpers/git-fixture.js";

// Review F6: where a platform refuses to unlink a directory link (EPERM or
// EISDIR), replacing a symlinked destination falls back to rmdir, which
// removes exactly the link; any other failure surfaces. Current Node removes
// a junction with unlink, so the fallback is reached here only by making
// unlink fail. Only unlink is replaced; every other fs call is real.
const unlinkMock = vi.hoisted(() => vi.fn());
vi.mock("node:fs/promises", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:fs/promises")>();
  return { ...real, unlink: (...args: Parameters<typeof real.unlink>) => unlinkMock(...args) };
});
const { copyFile } = await import("../src/modules/copier.js");

const SHIM = ".claude/commands/spell-example.md";

let repo: string;
let src: string;

beforeEach(async () => {
  repo = await createFixtureDir("copier-remove-link-repo");
  src = await createFixtureDir("copier-remove-link-src");
  await fs.writeFile(join(src, "shim.md"), "rendered\n");
  await fs.mkdir(join(src, "target-dir"));
  await fs.mkdir(join(repo, ".claude/commands"), { recursive: true });
  await fs.symlink(join(src, "target-dir"), join(repo, SHIM), "junction");
  unlinkMock.mockReset();
});

afterEach(async () => {
  await removeFixtureDir(repo);
  await removeFixtureDir(src);
});

describe("removeLink fallback (#357, review F6)", () => {
  it("falls back to rmdir when unlink refuses the directory link with EPERM", async () => {
    unlinkMock.mockRejectedValue(Object.assign(new Error("EPERM: operation not permitted"), { code: "EPERM" }));

    await copyFile(join(src, "shim.md"), repo, SHIM, { force: true });

    expect(unlinkMock).toHaveBeenCalledTimes(1);
    expect((await fs.lstat(join(repo, SHIM))).isSymbolicLink()).toBe(false);
    expect(await fs.readFile(join(repo, SHIM), "utf8")).toBe("rendered\n");
    await expect(fs.stat(join(src, "target-dir"))).resolves.toBeTruthy();
  });

  it("surfaces any other unlink failure and leaves the link in place", async () => {
    unlinkMock.mockRejectedValue(Object.assign(new Error("EACCES: permission denied"), { code: "EACCES" }));

    await expect(copyFile(join(src, "shim.md"), repo, SHIM, { force: true })).rejects.toThrow(/EACCES/);

    expect((await fs.lstat(join(repo, SHIM))).isSymbolicLink()).toBe(true);
  });
});
