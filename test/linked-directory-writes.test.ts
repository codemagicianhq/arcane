import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { ArcaneManifest } from "../src/types.js";
import {
  copyDirectory,
  copyFile,
  hashContent,
  removeEmptyAncestors,
  removeWithin,
  writeManagedFile,
} from "../src/modules/copier.js";
import { MARKER_END, MARKER_START, mergeIntoFile, stripMarkerSection } from "../src/modules/merger.js";
import { planComponentInstall } from "../src/modules/component-install.js";
import { getAllComponents } from "../src/modules/registry.js";
import { findNewlyAvailable } from "../src/modules/registry-changes.js";
import { offerableNewComponents } from "../src/modules/update-installs.js";
import { syncUserTierFanout } from "../src/modules/user-tier.js";
import { createFixtureDir, removeFixtureDir, runGit } from "./helpers/git-fixture.js";
import { HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";

// TODO.md, "a managed path under a symlinked parent directory is written
// outside the repository": validateTargetPath compared path.resolve results
// and #357 lstat'd only the leaf, so when a directory such as .claude was
// itself a link (a cloned repository can carry one), every managed write and
// delete below it landed wherever the link pointed. Decided 2026-10-22: a
// repository refuses such a path outright; the user tier keeps following
// links, which only the operator can make in a home directory. Every link
// here is a junction, which needs no privilege, so the file runs on Windows.

vi.mock("@inquirer/prompts", () => ({
  confirm: vi.fn().mockResolvedValue(true),
  select: vi.fn().mockResolvedValue("internal"),
  checkbox: vi.fn().mockResolvedValue([]),
}));

// Never a network call: the versions below were never published.
vi.mock("../src/modules/npm-registry.js", () => ({
  fetchPublishedFile: vi.fn().mockResolvedValue(undefined),
}));

const { resolveOrphan, runUpdate } = await import("../src/commands/update.js");
const { runAdd } = await import("../src/commands/add.js");
const { runInit } = await import("../src/commands/init.js");
const { runUninstall } = await import("../src/commands/uninstall.js");

const ASSETS_DIR = join(process.cwd(), "src/assets");
const PACKAGE_VERSION = "0.1.0";
const OLD_VERSION = "0.0.9";
const IDENTITY = ["-c", "user.name=Arcane Test", "-c", "user.email=test@example.invalid"];
const SHIM = ".claude/commands/spell-x.md";

// The component that ships Claude Code shims, named from the registry, and its
// first shim: the files a linked .claude takes out of the repository.
const SHIM_PATTERN = /^\.claude\/commands\/spell-[a-z0-9-]+\.md$/;
const shimComponent = getAllComponents().find((c) => c.files.some((f) => SHIM_PATTERN.test(f)))!;
const registryShim = shimComponent.files.find((f) => SHIM_PATTERN.test(f))!;

let repo: string;
let outside: string;
let src: string;

beforeEach(async () => {
  repo = await createFixtureDir("linked-dir-repo");
  outside = await createFixtureDir("linked-dir-outside");
  src = await createFixtureDir("linked-dir-src");
  await fs.writeFile(join(src, "shim.md"), "managed content\n");
});

afterEach(async () => {
  vi.restoreAllMocks();
  // Removing a tree that holds a junction unlinks the junction; it does not
  // follow it, so each fixture is removed on its own.
  await removeFixtureDir(repo);
  await removeFixtureDir(outside);
  await removeFixtureDir(src);
});

/** A directory link at `relative` inside the repository: a junction on Windows, a symlink elsewhere. */
async function linkDirectory(relative: string, target: string): Promise<void> {
  await fs.mkdir(join(repo, relative, ".."), { recursive: true });
  await fs.symlink(target, join(repo, relative), "junction");
}

async function exists(p: string): Promise<boolean> {
  return fs.access(p).then(() => true, () => false);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The refusal every write and delete path raises, up to the link's resolved target. */
function linkedRefusal(file: string, link: string): RegExp {
  return new RegExp(`^Linked directory: "${escapeRegExp(file)}" is under "${escapeRegExp(link)}", a link to "`);
}

async function writeManifest(partial: Partial<ArcaneManifest>): Promise<void> {
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
  await fs.writeFile(join(repo, ".arcane.json"), JSON.stringify(manifest, null, 2));
}

describe("managed writes refuse a directory that a link takes outside the target", { timeout: HEAVY_TEST_TIMEOUT }, () => {
  it("copyFile refuses a destination under a linked .claude and creates nothing where the link points", async () => {
    await linkDirectory(".claude", outside);

    await expect(copyFile(join(src, "shim.md"), repo, SHIM, { force: true })).rejects.toThrow(linkedRefusal(SHIM, ".claude"));
    expect(await fs.readdir(outside)).toEqual([]);
  });

  it("writeManagedFile refuses it too, so the merge write cannot go through the link", async () => {
    await linkDirectory(".claude", outside);

    await expect(writeManagedFile(repo, SHIM, "merged")).rejects.toMatchObject({ name: "LinkedDirectoryError" });
    expect(await fs.readdir(outside)).toEqual([]);
  });

  it("names the link when it is deeper in the path", async () => {
    await linkDirectory(".claude/commands", outside);

    await expect(copyFile(join(src, "shim.md"), repo, SHIM, { force: true })).rejects.toThrow(
      linkedRefusal(SHIM, ".claude/commands"),
    );
    expect(await fs.readdir(outside)).toEqual([]);
  });

  it("copyDirectory refuses every file under a linked directory", async () => {
    await fs.mkdir(join(src, "agents"));
    await fs.writeFile(join(src, "agents", "one.md"), "one");
    await linkDirectory(".github", outside);

    await expect(copyDirectory(join(src, "agents"), repo, ".github/agents", { force: true })).rejects.toThrow(
      linkedRefusal(".github/agents/one.md", ".github"),
    );
    expect(await fs.readdir(outside)).toEqual([]);
  });

  it("follows a link that stays inside the target", async () => {
    await fs.mkdir(join(repo, "shared-commands"));
    await linkDirectory(".claude/commands", join(repo, "shared-commands"));

    await copyFile(join(src, "shim.md"), repo, SHIM, { force: true });

    expect(await fs.readFile(join(repo, "shared-commands", "spell-x.md"), "utf8")).toBe("managed content\n");
  });

  it("writes into a target directory that is itself reached through a link", async () => {
    const alias = join(outside, "alias");
    await fs.symlink(repo, alias, "junction");

    await copyFile(join(src, "shim.md"), alias, SHIM, { force: true });

    expect(await fs.readFile(join(repo, SHIM), "utf8")).toBe("managed content\n");
  });

  it("keeps following the link when the caller asks, as the user tier's store does", async () => {
    await linkDirectory(".claude", outside);

    await copyFile(join(src, "shim.md"), repo, SHIM, { force: true, followDirectoryLinks: true });

    expect(await fs.readFile(join(outside, "commands", "spell-x.md"), "utf8")).toBe("managed content\n");
  });
});

describe("managed deletes refuse it too", { timeout: HEAVY_TEST_TIMEOUT }, () => {
  it("removeWithin leaves the file where the link points", async () => {
    await fs.mkdir(join(outside, "commands"));
    await fs.writeFile(join(outside, "commands", "spell-x.md"), "not the repository's");
    await linkDirectory(".claude", outside);

    await expect(removeWithin(repo, SHIM)).rejects.toThrow(linkedRefusal(SHIM, ".claude"));
    expect(await fs.readFile(join(outside, "commands", "spell-x.md"), "utf8")).toBe("not the repository's");
  });

  it("removeEmptyAncestors leaves an empty directory where the link points", async () => {
    await fs.mkdir(join(outside, "commands"));
    await linkDirectory(".claude", outside);

    await expect(removeEmptyAncestors(repo, SHIM)).rejects.toThrow(linkedRefusal(SHIM, ".claude"));
    expect(await exists(join(outside, "commands"))).toBe(true);
  });

  it("spell update --prune reports an orphan under the link instead of deleting it", async () => {
    await fs.mkdir(join(outside, "commands"));
    await fs.writeFile(join(outside, "commands", "spell-x.md"), "recorded content");
    await linkDirectory(".claude", outside);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    expect(await resolveOrphan(repo, SHIM, hashContent("recorded content"), true)).toBe("reported");

    const output = log.mock.calls.map((c) => String(c[0])).join("\n");
    expect(output).toContain('! Refused (under ".claude", a link to');
    expect(output).toContain(`outside the target directory): ${SHIM}`);
    expect(await fs.readFile(join(outside, "commands", "spell-x.md"), "utf8")).toBe("recorded content");
  });
});

describe("marker merges refuse it too", { timeout: HEAVY_TEST_TIMEOUT }, () => {
  const MERGED = ".github/copilot-instructions.md";
  const body = `${MARKER_START}\nold\n${MARKER_END}\n`;

  it("mergeIntoFile leaves the file where the link points untouched", async () => {
    await fs.writeFile(join(outside, "copilot-instructions.md"), body);
    await linkDirectory(".github", outside);

    await expect(mergeIntoFile(repo, MERGED, "new", { force: true })).rejects.toThrow(linkedRefusal(MERGED, ".github"));
    expect(await fs.readFile(join(outside, "copilot-instructions.md"), "utf8")).toBe(body);
  });

  it("stripMarkerSection leaves it untouched", async () => {
    await fs.writeFile(join(outside, "copilot-instructions.md"), body);
    await linkDirectory(".github", outside);

    await expect(stripMarkerSection(repo, MERGED)).rejects.toThrow(linkedRefusal(MERGED, ".github"));
    expect(await fs.readFile(join(outside, "copilot-instructions.md"), "utf8")).toBe(body);
  });
});

describe("spell add refuses before writing anything", { timeout: HEAVY_TEST_TIMEOUT }, () => {
  it("plans a file under the link as linked: a conflict that --force does not override", async () => {
    await linkDirectory(".claude", outside);

    const plan = await planComponentInstall(shimComponent, repo, ASSETS_DIR, { force: true });

    expect(plan.files.find((f) => f.file === registryShim)?.state).toBe("linked");
    expect(plan.conflicts.map((f) => f.file)).toContain(registryShim);
    expect(plan.toCopy.map((f) => f.file)).not.toContain(registryShim);
  });

  it("names the link, writes nothing in the repository or where the link points, and exits 1", async () => {
    await writeManifest({ components: [] });
    const manifestBefore = await fs.readFile(join(repo, ".arcane.json"), "utf8");
    await linkDirectory(".claude", outside);
    const exit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});

    await runAdd([shimComponent.name], {}, repo, ASSETS_DIR, PACKAGE_VERSION);

    expect(exit).toHaveBeenCalledWith(1);
    expect(error.mock.calls.map((c) => String(c[0])).join("\n")).toContain(
      `Cannot add "${shimComponent.name}": "${registryShim}" is under ".claude", a link to`,
    );
    expect(await fs.readdir(outside)).toEqual([]);
    expect((await fs.readdir(repo)).sort()).toEqual([".arcane.json", ".claude"]);
    expect(await fs.readFile(join(repo, ".arcane.json"), "utf8")).toBe(manifestBefore);
  });
});

describe("spell update refuses before writing anything", { timeout: HEAVY_TEST_TIMEOUT }, () => {
  let home: string;
  let savedHome: { HOME: string | undefined; USERPROFILE: string | undefined };

  beforeEach(async () => {
    home = await createFixtureDir("linked-dir-home");
    savedHome = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
    process.env.HOME = home;
    process.env.USERPROFILE = home;
  });

  afterEach(async () => {
    if (savedHome.HOME === undefined) delete process.env.HOME;
    else process.env.HOME = savedHome.HOME;
    if (savedHome.USERPROFILE === undefined) delete process.env.USERPROFILE;
    else process.env.USERPROFILE = savedHome.USERPROFILE;
    await removeFixtureDir(home);
  });

  it("names the link, writes nothing in the repository or where the link points, and exits 1", async () => {
    runGit(repo, ["init", "-q"]);
    const vendor = await fs.readFile(join(ASSETS_DIR, shimComponent.sourceOverrides?.[registryShim] ?? registryShim));
    await writeManifest({
      components: [
        { name: shimComponent.name, files: [registryShim], installedVersion: OLD_VERSION, fileHashes: { [registryShim]: hashContent(vendor) } },
      ],
    });
    // The clone's shape: .claude is a link, committed on POSIX (git stores a
    // symlink), invisible to git on Windows (a junction to an empty directory).
    await linkDirectory(".claude", outside);
    runGit(repo, ["add", "-A"]);
    runGit(repo, [...IDENTITY, "commit", "-q", "--no-gpg-sign", "-m", "a clone whose .claude is a link"]);
    expect(runGit(repo, ["status", "--porcelain"]).trim()).toBe("");
    const exit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});

    await runUpdate({}, repo, ASSETS_DIR, PACKAGE_VERSION);

    const output = error.mock.calls.map((c) => String(c[0])).join("\n");
    expect(output).toContain('".claude" is a link to');
    expect(output).toContain("Update refused: nothing was written.");
    expect(exit).toHaveBeenCalledWith(1);
    expect(await fs.readdir(outside)).toEqual([]);
    expect(runGit(repo, ["status", "--porcelain"]).trim()).toBe("");
  });

  // Review of the fix: the newly-available checklist used to be put to the
  // operator first, and the run refused after the answer.
  it("refuses a version change before the newly-available checklist is asked", async () => {
    runGit(repo, ["init", "-q"]);
    const components = [{ name: shimComponent.name, files: [registryShim], installedVersion: OLD_VERSION }];
    await writeManifest({ components });
    // Not vacuous: there is something the checklist would offer.
    expect(offerableNewComponents(await findNewlyAvailable(repo, "lite", components, "repo"), []).length).toBeGreaterThan(0);
    await linkDirectory(".claude", outside);
    runGit(repo, ["add", "-A"]);
    runGit(repo, [...IDENTITY, "commit", "-q", "--no-gpg-sign", "-m", "a clone whose .claude is a link"]);
    const { checkbox } = await import("@inquirer/prompts");
    vi.mocked(checkbox).mockClear();
    const tty = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
    Object.defineProperty(process.stdin, "isTTY", { value: true, configurable: true });
    const exit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await runUpdate({}, repo, ASSETS_DIR, PACKAGE_VERSION);
    } finally {
      if (tty) Object.defineProperty(process.stdin, "isTTY", tty);
      else delete (process.stdin as { isTTY?: boolean }).isTTY;
    }

    expect(error.mock.calls.map((c) => String(c[0])).join("\n")).toContain("Update refused: nothing was written.");
    expect(exit).toHaveBeenCalledWith(1);
    expect(vi.mocked(checkbox)).not.toHaveBeenCalled();
  });

  it("refuses a dry run too", async () => {
    runGit(repo, ["init", "-q"]);
    await writeManifest({
      components: [{ name: shimComponent.name, files: [registryShim], installedVersion: OLD_VERSION }],
    });
    await linkDirectory(".claude", outside);
    runGit(repo, ["add", "-A"]);
    runGit(repo, [...IDENTITY, "commit", "-q", "--no-gpg-sign", "-m", "a clone whose .claude is a link"]);
    const exit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});

    await runUpdate({ dryRun: true }, repo, ASSETS_DIR, PACKAGE_VERSION);

    expect(error.mock.calls.map((c) => String(c[0])).join("\n")).toContain("Update refused: nothing was written.");
    expect(exit).toHaveBeenCalledWith(1);
  });

  // The clone's usual shape: the manifest is current, and every file under the
  // link reads as missing, so a same-version run would restore them there.
  it("refuses a same-version restore before announcing it", async () => {
    runGit(repo, ["init", "-q"]);
    const vendor = await fs.readFile(join(ASSETS_DIR, shimComponent.sourceOverrides?.[registryShim] ?? registryShim));
    await writeManifest({
      version: PACKAGE_VERSION,
      components: [
        { name: shimComponent.name, files: [registryShim], installedVersion: PACKAGE_VERSION, fileHashes: { [registryShim]: hashContent(vendor) } },
      ],
    });
    await linkDirectory(".claude", outside);
    runGit(repo, ["add", "-A"]);
    runGit(repo, [...IDENTITY, "commit", "-q", "--no-gpg-sign", "-m", "a clone whose .claude is a link"]);
    const exit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});

    await runUpdate({}, repo, ASSETS_DIR, PACKAGE_VERSION);

    expect(error.mock.calls.map((c) => String(c[0])).join("\n")).toContain("Update refused: nothing was written.");
    expect(log.mock.calls.map((c) => String(c[0])).join("\n")).not.toContain("restoring");
    expect(exit).toHaveBeenCalledWith(1);
    expect(await fs.readdir(outside)).toEqual([]);
  });

  it("does not refuse an up-to-date run, which writes nothing", async () => {
    runGit(repo, ["init", "-q"]);
    await fs.mkdir(join(outside, "commands"));
    const vendor = await fs.readFile(join(ASSETS_DIR, shimComponent.sourceOverrides?.[registryShim] ?? registryShim));
    await fs.writeFile(join(outside, "commands", registryShim.split("/").pop()!), vendor);
    await writeManifest({
      version: PACKAGE_VERSION,
      components: [
        { name: shimComponent.name, files: [registryShim], installedVersion: PACKAGE_VERSION, fileHashes: { [registryShim]: hashContent(vendor) } },
      ],
    });
    await linkDirectory(".claude", outside);
    runGit(repo, ["add", "-A"]);
    runGit(repo, [...IDENTITY, "commit", "-q", "--no-gpg-sign", "-m", "a clone whose .claude is a link"]);
    const exit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});

    await runUpdate({}, repo, ASSETS_DIR, PACKAGE_VERSION);

    expect(log.mock.calls.map((c) => String(c[0])).join("\n")).toContain("Already up to date.");
    expect(exit).not.toHaveBeenCalled();
  });
});

describe("the user tier keeps following links (decided 2026-10-22)", { timeout: HEAVY_TEST_TIMEOUT }, () => {
  let savedHome: { HOME: string | undefined; USERPROFILE: string | undefined };

  beforeEach(() => {
    // `repo` stands in for the home directory throughout.
    savedHome = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
    process.env.HOME = repo;
    process.env.USERPROFILE = repo;
  });

  afterEach(() => {
    if (savedHome.HOME === undefined) delete process.env.HOME;
    else process.env.HOME = savedHome.HOME;
    if (savedHome.USERPROFILE === undefined) delete process.env.USERPROFILE;
    else process.env.USERPROFILE = savedHome.USERPROFILE;
  });

  // The store's own writes go through copier.ts: each command below fails
  // here if it stops passing followDirectoryLinks, because a spells/ that
  // links out of the store would then be refused.
  it("init, update and uninstall --user write and delete the store's spells through a linked spells/", async () => {
    const storeRoot = join(repo, ".arcane");
    await fs.mkdir(storeRoot);
    await fs.symlink(outside, join(storeRoot, "spells"), "junction");
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const spells = async (): Promise<string[]> => (await fs.readdir(outside)).filter((f) => /^spell-[a-z0-9-]+\.md$/.test(f));

    await runInit({ user: true }, storeRoot, ASSETS_DIR, PACKAGE_VERSION);
    const installed = await spells();
    expect(installed.length).toBeGreaterThan(0);

    // A version change writes every store file again, a deleted one included.
    await fs.unlink(join(outside, installed[0]));
    await runUpdate({ user: true }, storeRoot, ASSETS_DIR, "0.1.1");
    expect((await spells()).sort()).toEqual([...installed].sort());

    await runUninstall({ user: true, yes: true }, storeRoot);
    expect(await spells()).toEqual([]);
  });

  it("writes ~/.claude/commands/<id>.md through a linked ~/.claude", async () => {
    // `repo` stands in for the home directory here, `outside` for a dotfiles
    // folder its .claude links to.
    await linkDirectory(".claude", outside);

    const result = await syncUserTierFanout({
      homeDir: repo,
      storeRoot: join(repo, ".arcane"),
      spellIds: ["spell-bug"],
      fallbackDir: ASSETS_DIR,
    });

    expect(result.outcomes).toContainEqual({ relativePath: ".claude/commands/spell-bug.md", status: "written" });
    expect(await exists(join(outside, "commands", "spell-bug.md"))).toBe(true);
  });
});
