import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { createFixtureDir, removeFixtureDir } from "./helpers/git-fixture.js";

// #357, review F6: replacing a symlinked destination removes the link with
// unlink and nothing else; there is no rmdir fallback (on POSIX rmdir cannot
// remove a link, and unlink removes a Windows junction on every supported
// Node, which the junction test in copier-symlinks covers). A refusal must
// surface as unlink's own error and leave the link in place. Only unlink is
// replaced here; every other fs call is real.
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

describe("replacing a symlinked destination (#357, review F6)", () => {
  it("surfaces an unlink failure and leaves the link in place", async () => {
    unlinkMock.mockRejectedValue(Object.assign(new Error("EACCES: permission denied"), { code: "EACCES" }));

    await expect(copyFile(join(src, "shim.md"), repo, SHIM, { force: true })).rejects.toThrow(/EACCES/);

    expect(unlinkMock).toHaveBeenCalledTimes(1);
    expect((await fs.lstat(join(repo, SHIM))).isSymbolicLink()).toBe(true);
    await expect(fs.stat(join(src, "target-dir"))).resolves.toBeTruthy();
  });
});
