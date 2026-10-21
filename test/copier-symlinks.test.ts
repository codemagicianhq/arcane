import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import {
  copyFile,
  isSymlinkedManagedPath,
  looksLikeBarePath,
  type SymlinkConversion,
} from "../src/modules/copier.js";
import { listSymlinkTrackedPaths } from "../src/modules/git.js";
import { createFixtureDir, removeFixtureDir, runGit } from "./helpers/git-fixture.js";

// #357: `spell update` wrote managed content THROUGH a symlinked shim. Two
// shapes exist. On a machine with symlinks, the working-tree path is a link
// (`lstat` sees it). On a `core.symlinks=false` machine the working-tree file
// is regular but the index still says mode 120000, so git commits the new
// content as a link TARGET and every other machine checks out a broken link.

const SHIM = ".claude/commands/spell-example.md";
const LINK_TEXT = "../../.github/prompts/spell-example.prompt.md";

let repo: string;
let src: string;

beforeEach(async () => {
  repo = await createFixtureDir("copier-symlinks-repo");
  src = await createFixtureDir("copier-symlinks-src");
  await fs.writeFile(join(src, "shim.md"), "---\ndescription: rendered shim\n---\nBody\n");
  runGit(repo, ["init", "-q"]);
});

afterEach(async () => {
  await removeFixtureDir(repo);
  await removeFixtureDir(src);
});

/** The core.symlinks=false shape: a regular file whose index entry says symlink. */
async function trackAsSymlink(file: string): Promise<void> {
  await fs.mkdir(join(repo, ".claude/commands"), { recursive: true });
  await fs.writeFile(join(repo, file), LINK_TEXT);
  // The link text as a blob, hashed from a file outside the repository so
  // the fixture's working tree stays clean.
  await fs.writeFile(join(src, "link-text"), LINK_TEXT);
  const blob = runGit(repo, ["hash-object", "-w", "--", join(src, "link-text")]).trim();
  runGit(repo, ["update-index", "--add", "--cacheinfo", `120000,${blob},${file}`]);
}

function indexMode(file: string): string {
  return runGit(repo, ["ls-files", "-s", "--", file]).trim().split(" ")[0];
}

describe("#357 — managed writes replace symlinked destinations", () => {
  it("rewrites a path the index tracks as a symlink (core.symlinks=false shape) and re-records it as 100644", async () => {
    await trackAsSymlink(SHIM);
    expect(indexMode(SHIM)).toBe("120000");
    const linkTracked = await listSymlinkTrackedPaths(repo);
    expect([...linkTracked]).toEqual([SHIM]);

    const conversions: SymlinkConversion[] = [];
    await copyFile(join(src, "shim.md"), repo, SHIM, { force: true, linkTracked, conversions });

    expect(await fs.readFile(join(repo, SHIM), "utf8")).toContain("description: rendered shim");
    expect(indexMode(SHIM)).toBe("100644");
    expect(conversions).toEqual([{ file: SHIM, shape: "index-symlink" }]);
    expect(await listSymlinkTrackedPaths(repo)).toEqual(new Set());
  });

  // A file symlink needs a privilege on Windows that CI and most operators do
  // not have; the index-mode test above is the shape #357 reported and runs
  // everywhere. This one covers the other shape where it can be created.
  it.skipIf(process.platform === "win32")(
    "replaces a working-tree symlink with a regular file, leaving the link's target alone (POSIX)",
    async () => {
      await fs.mkdir(join(repo, ".claude/commands"), { recursive: true });
      await fs.mkdir(join(repo, ".github/prompts"), { recursive: true });
      await fs.writeFile(join(repo, ".github/prompts/spell-example.prompt.md"), "target");
      await fs.symlink(LINK_TEXT, join(repo, SHIM), "file");

      const conversions: SymlinkConversion[] = [];
      await copyFile(join(src, "shim.md"), repo, SHIM, { force: true, conversions });

      expect((await fs.lstat(join(repo, SHIM))).isSymbolicLink()).toBe(false);
      expect(await fs.readFile(join(repo, SHIM), "utf8")).toContain("rendered shim");
      expect(conversions).toEqual([{ file: SHIM, shape: "symlink" }]);
      expect(await fs.readFile(join(repo, ".github/prompts/spell-example.prompt.md"), "utf8")).toBe("target");
    },
  );

  it("writes a regular destination without reporting a conversion", async () => {
    await fs.mkdir(join(repo, ".claude/commands"), { recursive: true });
    await fs.writeFile(join(repo, SHIM), "old");
    runGit(repo, ["add", "--", SHIM]);

    const conversions: SymlinkConversion[] = [];
    await copyFile(join(src, "shim.md"), repo, SHIM, {
      force: true,
      linkTracked: await listSymlinkTrackedPaths(repo),
      conversions,
    });

    expect(conversions).toEqual([]);
    expect(indexMode(SHIM)).toBe("100644");
    expect(await fs.readFile(join(repo, SHIM), "utf8")).toContain("rendered shim");
  });

  it("listSymlinkTrackedPaths is empty outside a git repository", async () => {
    expect(await listSymlinkTrackedPaths(src)).toEqual(new Set());
  });

  // A directory junction needs no privilege on Windows, and lstat reports it
  // as a symlink, so the working-tree-link branch runs on every OS here. On
  // Windows a directory link is a reparse point `unlink` refuses; the
  // replacement falls back to `rmdir`, which removes the link and not the
  // directory it points at.
  it("replaces a junction at the destination with a regular file and leaves the junction's target alone", async () => {
    await fs.mkdir(join(repo, ".claude/commands"), { recursive: true });
    const target = join(src, "target-dir");
    await fs.mkdir(target);
    await fs.writeFile(join(target, "inside.txt"), "kept");
    await fs.symlink(target, join(repo, SHIM), "junction");
    expect((await fs.lstat(join(repo, SHIM))).isSymbolicLink()).toBe(true);

    const conversions: SymlinkConversion[] = [];
    await copyFile(join(src, "shim.md"), repo, SHIM, { force: true, conversions });

    expect((await fs.lstat(join(repo, SHIM))).isSymbolicLink()).toBe(false);
    expect(await fs.readFile(join(repo, SHIM), "utf8")).toContain("rendered shim");
    expect(conversions).toEqual([{ file: SHIM, shape: "symlink" }]);
    expect(await fs.readFile(join(target, "inside.txt"), "utf8")).toBe("kept");
  });
});

describe("isSymlinkedManagedPath and looksLikeBarePath (#357)", () => {
  it("is false for an absent path", async () => {
    expect(await isSymlinkedManagedPath(repo, SHIM, undefined, true)).toBe(false);
  });

  it("is true for a link at the path, by junction", async () => {
    await fs.mkdir(join(repo, ".claude/commands"), { recursive: true });
    await fs.mkdir(join(src, "target-dir"));
    await fs.symlink(join(src, "target-dir"), join(repo, SHIM), "junction");
    expect(await isSymlinkedManagedPath(repo, SHIM, undefined, false)).toBe(true);
  });

  it("is true for a path the index tracks as a symlink", async () => {
    await trackAsSymlink(SHIM);
    expect(await isSymlinkedManagedPath(repo, SHIM, new Set([SHIM]), false)).toBe(true);
    expect(await isSymlinkedManagedPath(repo, SHIM, new Set(), false)).toBe(false);
  });

  it("judges a body that is only a link target as a link, and only when asked to", async () => {
    await fs.mkdir(join(repo, ".claude/commands"), { recursive: true });
    await fs.writeFile(join(repo, SHIM), `${LINK_TEXT}\n`);
    expect(await isSymlinkedManagedPath(repo, SHIM, undefined, true)).toBe(true);
    expect(await isSymlinkedManagedPath(repo, SHIM, undefined, false)).toBe(false);
  });

  it("is false for a real shim body and for a path whose body cannot be read", async () => {
    await fs.mkdir(join(repo, ".claude/commands/dir-at-path"), { recursive: true });
    await fs.writeFile(join(repo, SHIM), "---\ndescription: shim\n---\nBody\n");
    expect(await isSymlinkedManagedPath(repo, SHIM, undefined, true)).toBe(false);
    expect(await isSymlinkedManagedPath(repo, ".claude/commands/dir-at-path", undefined, true)).toBe(false);
  });

  it("looksLikeBarePath accepts one relative path and rejects prose, front matter, headings and the empty body", () => {
    expect(looksLikeBarePath("../../.github/prompts/spell-x.prompt.md\n")).toBe(true);
    expect(looksLikeBarePath("---\ndescription: x\n---\n")).toBe(false);
    expect(looksLikeBarePath("# Heading\n")).toBe(false);
    expect(looksLikeBarePath("two words/here\n")).toBe(false);
    expect(looksLikeBarePath("noslash\n")).toBe(false);
    expect(looksLikeBarePath("")).toBe(false);
  });
});
