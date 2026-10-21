import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import {
  copyFile,
  looksLikeBarePath,
  managedPathLinkShape,
  type SymlinkConversion,
} from "../src/modules/copier.js";
import { listSymlinkTrackedPaths } from "../src/modules/git.js";
import { createFixtureDir, removeFixtureDir, runGit } from "./helpers/git-fixture.js";
import { HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";

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

// Real git fixtures: the suite's heavy budget, not the 5 s default.
describe("#357 — managed writes replace symlinked destinations", { timeout: HEAVY_TEST_TIMEOUT }, () => {
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
  // as a symlink, so the working-tree-link branch runs on every OS here.
  // `unlink` removes the junction on the Node versions tested; where a
  // platform refuses a directory link, the replacement falls back to `rmdir`,
  // which removes the link and not the directory it points at.
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

  // Review F1: `update-index --cacheinfo` takes a root-relative path while the
  // other pathspecs are relative to the target directory. A target below the
  // repository root must re-record its own entry, not add a phantom root one.
  it("re-records the entry under its root-relative path when the target directory is below the repository root", async () => {
    const sub = join(repo, "sub");
    const file = `sub/${SHIM}`;
    await fs.mkdir(join(sub, ".claude/commands"), { recursive: true });
    await fs.writeFile(join(repo, file), LINK_TEXT);
    await fs.writeFile(join(src, "link-text"), LINK_TEXT);
    const blob = runGit(repo, ["hash-object", "-w", "--", join(src, "link-text")]).trim();
    runGit(repo, ["update-index", "--add", "--cacheinfo", `120000,${blob},${file}`]);
    const linkTracked = await listSymlinkTrackedPaths(sub);
    expect([...linkTracked]).toEqual([SHIM]);

    const conversions: SymlinkConversion[] = [];
    await copyFile(join(src, "shim.md"), sub, SHIM, { force: true, linkTracked, conversions });

    expect(indexMode(file)).toBe("100644");
    expect(runGit(repo, ["ls-files", "-s"]).trim().split("\n")).toHaveLength(1);
    expect(conversions).toEqual([{ file: SHIM, shape: "index-symlink" }]);
  });
});

describe("managedPathLinkShape and looksLikeBarePath (#357)", { timeout: HEAVY_TEST_TIMEOUT }, () => {
  it("is null for an absent path", async () => {
    expect(await managedPathLinkShape(repo, SHIM, undefined, true)).toBeNull();
  });

  it("names a link at the path, by junction", async () => {
    await fs.mkdir(join(repo, ".claude/commands"), { recursive: true });
    await fs.mkdir(join(src, "target-dir"));
    await fs.symlink(join(src, "target-dir"), join(repo, SHIM), "junction");
    expect(await managedPathLinkShape(repo, SHIM, undefined, false)).toBe("symlink");
  });

  it("names a path the index tracks as a symlink", async () => {
    await trackAsSymlink(SHIM);
    expect(await managedPathLinkShape(repo, SHIM, new Set([SHIM]), false)).toBe("index-symlink");
    expect(await managedPathLinkShape(repo, SHIM, new Set(), false)).toBeNull();
  });

  it("names a body that is only a link target, and only when asked to", async () => {
    await fs.mkdir(join(repo, ".claude/commands"), { recursive: true });
    await fs.writeFile(join(repo, SHIM), `${LINK_TEXT}\n`);
    expect(await managedPathLinkShape(repo, SHIM, undefined, true)).toBe("path-body");
    expect(await managedPathLinkShape(repo, SHIM, undefined, false)).toBeNull();
  });

  it("is null for a real shim body, for a shim trimmed to its include line, and for a path whose body cannot be read", async () => {
    await fs.mkdir(join(repo, ".claude/commands/dir-at-path"), { recursive: true });
    await fs.writeFile(join(repo, SHIM), "---\ndescription: shim\n---\nBody\n");
    expect(await managedPathLinkShape(repo, SHIM, undefined, true)).toBeNull();
    // Review F2: an operator's one-line customization is not a link.
    await fs.writeFile(join(repo, SHIM), "@.arcane/spells/spell-example.md\n");
    expect(await managedPathLinkShape(repo, SHIM, undefined, true)).toBeNull();
    expect(await managedPathLinkShape(repo, ".claude/commands/dir-at-path", undefined, true)).toBeNull();
  });

  it("looksLikeBarePath accepts one relative path and rejects includes, URLs, prose, front matter, headings and the empty body", () => {
    expect(looksLikeBarePath("../../.github/prompts/spell-x.prompt.md\n")).toBe(true);
    expect(looksLikeBarePath("./spell-x.md")).toBe(true);
    expect(looksLikeBarePath("@.arcane/spells/spell-bug.md\n")).toBe(false);
    expect(looksLikeBarePath("https://example.com/spell-x.md")).toBe(false);
    expect(looksLikeBarePath("---\ndescription: x\n---\n")).toBe(false);
    expect(looksLikeBarePath("# Heading\n")).toBe(false);
    expect(looksLikeBarePath("two words/here\n")).toBe(false);
    expect(looksLikeBarePath("noslash\n")).toBe(false);
    expect(looksLikeBarePath("")).toBe(false);
  });
});
