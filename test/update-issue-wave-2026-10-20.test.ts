import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { ArcaneManifest } from "../src/types.js";
import { VERY_HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";
import { createFixtureDir, removeFixtureDir, runGit } from "./helpers/git-fixture.js";

// Handler-level coverage for issue wave 2026-10-20 (#357, #358, #359), against
// REAL git fixtures: unlike test/update.test.ts, the git module is not mocked
// here, so the index conversion and the prune fallback run for real.

vi.mock("@inquirer/prompts", () => ({
  confirm: vi.fn().mockResolvedValue(true),
  select: vi.fn().mockResolvedValue("internal"),
}));

// Never a network call: the versions below were never published.
vi.mock("../src/modules/npm-registry.js", () => ({
  fetchPublishedFile: vi.fn().mockResolvedValue(undefined),
}));

const { runUpdate } = await import("../src/commands/update.js");
const { runInit } = await import("../src/commands/init.js");

const ASSETS_DIR = join(process.cwd(), "src/assets");
const PACKAGE_VERSION = "0.1.0";
const OLD_VERSION = "0.0.9";
const IDENTITY = ["-c", "user.name=Arcane Test", "-c", "user.email=test@example.invalid"];

let dir: string;
let home: string;
let savedHome: { HOME: string | undefined; USERPROFILE: string | undefined };

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
  await fs.writeFile(join(dir, ".arcane.json"), JSON.stringify(manifest, null, 2));
}

async function readManifest(): Promise<ArcaneManifest> {
  return JSON.parse(await fs.readFile(join(dir, ".arcane.json"), "utf8")) as ArcaneManifest;
}

function commitAll(message: string): void {
  runGit(dir, ["add", "-A"]);
  runGit(dir, [...IDENTITY, "commit", "-q", "--no-gpg-sign", "-m", message]);
}

function indexMode(file: string): string {
  return runGit(dir, ["ls-files", "-s", "--", file]).trim().split(" ")[0];
}

async function installTier(): Promise<void> {
  await fs.mkdir(join(home, ".arcane"), { recursive: true });
  await fs.writeFile(
    join(home, ".arcane", ".arcane.json"),
    JSON.stringify({ version: PACKAGE_VERSION, profile: "full", installedAt: "2026-10-20T00:00:00.000Z", components: [], scope: "user" }),
  );
}

beforeEach(async () => {
  dir = await createFixtureDir("iw-2026-10-20-repo");
  home = await createFixtureDir("iw-2026-10-20-home");
  savedHome = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  // core.symlinks=false on every OS: the checkout shape #357 reported, where a
  // path tracked as a symlink holds a regular file in the working tree.
  runGit(dir, ["init", "-q"]);
  runGit(dir, ["config", "core.symlinks", "false"]);
});

afterEach(async () => {
  vi.restoreAllMocks();
  if (savedHome.HOME === undefined) delete process.env.HOME;
  else process.env.HOME = savedHome.HOME;
  if (savedHome.USERPROFILE === undefined) delete process.env.USERPROFILE;
  else process.env.USERPROFILE = savedHome.USERPROFILE;
  await removeFixtureDir(dir);
  await removeFixtureDir(home);
});

describe("spell update converts symlinked managed files (#357)", () => {
  it(
    "rewrites a shim the index tracks as a symlink, re-records it as 100644, and names it in the summary (AC-357-3)",
    async () => {
      await runInit({ profile: "lite" }, dir, ASSETS_DIR, OLD_VERSION);
      const shims = (await fs.readdir(join(dir, ".claude/commands"))).filter((f) => f.startsWith("spell-"));
      expect(shims.length).toBeGreaterThan(0);
      const shim = `.claude/commands/${shims[0]}`;
      commitAll("install");
      // The consumer's own refactor: the shim becomes a link to the prompt,
      // committed from a machine without symlinks.
      const linkText = `../../.github/prompts/${shims[0].replace(/\.md$/, ".prompt.md")}`;
      await fs.writeFile(join(dir, shim), linkText);
      await fs.writeFile(join(home, "link-text"), linkText);
      const blob = runGit(dir, ["hash-object", "-w", "--", join(home, "link-text")]).trim();
      runGit(dir, ["update-index", "--add", "--cacheinfo", `120000,${blob},${shim}`]);
      runGit(dir, [...IDENTITY, "commit", "-q", "--no-gpg-sign", "-m", "symlink the shim"]);
      expect(indexMode(shim)).toBe("120000");
      expect(runGit(dir, ["status", "--porcelain"]).trim()).toBe("");
      const log = vi.spyOn(console, "log").mockImplementation(() => {});

      await runUpdate({}, dir, ASSETS_DIR, PACKAGE_VERSION);

      const output = log.mock.calls.map((c) => String(c[0])).join("\n");
      expect(output).toContain("Converted 1 symlinked managed file(s) to regular files");
      expect(output).toContain(`${shim} — the index tracked it as a symlink (mode 120000)`);
      expect(indexMode(shim)).toBe("100644");
      const body = await fs.readFile(join(dir, shim), "utf8");
      expect(body).not.toBe(linkText);
      expect(body.length).toBeGreaterThan(linkText.length);
    },
    VERY_HEAVY_TEST_TIMEOUT,
  );
});

describe("spell update --prune and a retired component with no recorded hashes (#358)", () => {
  const FILES = [".github/skills/legacy-widget/SKILL.md", ".github/skills/legacy-widget/README.md"];

  async function seedLegacyComponent(): Promise<void> {
    await writeManifest({
      components: [{ name: "legacy-widget", files: FILES, installedVersion: OLD_VERSION }],
    });
    for (const file of FILES) {
      await fs.mkdir(join(dir, ".github/skills/legacy-widget"), { recursive: true });
      await fs.writeFile(join(dir, file), `legacy content of ${file}\n`);
    }
    commitAll("install legacy-widget long ago");
  }

  it("prunes files git vouches for and drops the manifest entry (AC-358-4)", async () => {
    await seedLegacyComponent();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await runUpdate({ prune: true }, dir, ASSETS_DIR, PACKAGE_VERSION);

    for (const file of FILES) await expect(fs.access(join(dir, file))).rejects.toThrow();
    expect((await readManifest()).components.find((c) => c.name === "legacy-widget")).toBeUndefined();
    expect(log.mock.calls.map((c) => String(c[0])).join("\n")).toContain("Pruned orphaned file (no recorded hash");
  }, VERY_HEAVY_TEST_TIMEOUT);

  it("keeps a file edited in a later commit, with its entry, and names the manual route", async () => {
    await seedLegacyComponent();
    await fs.appendFile(join(dir, FILES[0]), "OPERATOR EDIT\n");
    commitAll("edit the skill");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await runUpdate({ prune: true }, dir, ASSETS_DIR, PACKAGE_VERSION);

    await expect(fs.access(join(dir, FILES[0]))).resolves.toBeUndefined();
    await expect(fs.access(join(dir, FILES[1]))).rejects.toThrow();
    const entry = (await readManifest()).components.find((c) => c.name === "legacy-widget");
    expect(entry?.files).toEqual([FILES[0]]);
    const output = log.mock.calls.map((c) => String(c[0])).join("\n");
    expect(output).toContain("2 commits touched it");
    expect(output).toContain(`git rm -- ${FILES[0]}`);
  }, VERY_HEAVY_TEST_TIMEOUT);
});

describe("spell update refuses without the user tier (#359)", () => {
  const GOVERNANCE = ".arcane/governance/git-conventions.md";

  beforeEach(async () => {
    await writeManifest({
      spell_scope: "user",
      components: [{ name: "git-conventions", files: [GOVERNANCE], installedVersion: OLD_VERSION }],
    });
    await fs.mkdir(join(dir, ".arcane/governance"), { recursive: true });
    await fs.writeFile(join(dir, GOVERNANCE), "# old\n");
    commitAll("baseline");
  });

  it("exits 1 before writing anything and names spell init --user, in a real run and a dry run (AC-359-1)", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    const before = await readManifest();

    await runUpdate({}, dir, ASSETS_DIR, PACKAGE_VERSION);

    expect(exitSpy).toHaveBeenCalledWith(1);
    const errors = errSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(errors).toContain("spell init --user");
    expect(errors).toContain("Update refused");
    expect(await readManifest()).toEqual(before);
    expect(await fs.readFile(join(dir, GOVERNANCE), "utf8")).toBe("# old\n");

    exitSpy.mockClear();
    await runUpdate({ dryRun: true }, dir, ASSETS_DIR, PACKAGE_VERSION);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("proceeds once the tier is installed", async () => {
    await installTier();
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);
    vi.spyOn(console, "log").mockImplementation(() => {});

    await runUpdate({}, dir, ASSETS_DIR, PACKAGE_VERSION);

    expect(exitSpy).not.toHaveBeenCalled();
    expect((await readManifest()).version).toBe(PACKAGE_VERSION);
  }, VERY_HEAVY_TEST_TIMEOUT);
});
