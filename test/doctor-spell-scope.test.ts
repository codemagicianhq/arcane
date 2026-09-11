import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkSpellScope } from "../src/commands/doctor.js";
import { writeManifest } from "../src/modules/manifest.js";
import { canonicalSpellPath } from "../src/modules/spell-compiler.js";
import { storeSpellPath, userTierRoot } from "../src/modules/user-tier.js";
import { removeFixtureDir } from "./helpers/fixture-dir.js";

const ASSETS_DIR = join(process.cwd(), "src/assets");

let home: string;
let repo: string;

beforeEach(async () => {
  home = await fs.mkdtemp(join(tmpdir(), "spell-scope-home-"));
  repo = await fs.mkdtemp(join(tmpdir(), "spell-scope-repo-"));
});

afterEach(async () => {
  await removeFixtureDir(home);
  await removeFixtureDir(repo);
});

/** A repository manifest at `version`, opted in or not. */
async function writeRepoManifest(version: string, spellScope?: "repo" | "user") {
  await writeManifest(repo, {
    version,
    profile: "lite",
    installedAt: "2026-09-10T00:00:00.000Z",
    components: [{ name: "git-conventions", files: [".arcane/governance/git-conventions.md"], installedVersion: version }],
    ...(spellScope ? { spell_scope: spellScope } : {}),
  });
}

/** A user-tier store at `version` holding `spells` (real canonical files). */
async function installStore(version: string, spells: string[] = ["spell-status", "spell-plan"]) {
  const storeRoot = userTierRoot(home);
  await fs.mkdir(storeRoot, { recursive: true });
  for (const id of spells) {
    const dest = join(storeRoot, storeSpellPath(id));
    await fs.mkdir(join(dest, ".."), { recursive: true });
    await fs.copyFile(join(ASSETS_DIR, canonicalSpellPath(id)), dest);
  }
  await writeManifest(storeRoot, {
    version,
    profile: "full",
    installedAt: "2026-09-10T00:00:00.000Z",
    components: spells.map((id) => ({
      name: "spells-session",
      files: [storeSpellPath(id)],
      installedVersion: version,
    })),
    scope: "user",
  });
  return storeRoot;
}

describe("checkSpellScope (ARC-045 decision 4 / CS-05)", () => {
  it("passes, non-blocking, when there is no Arcane install to check", async () => {
    const result = await checkSpellScope(repo, home);
    expect(result.passed).toBe(true);
    expect(result.blocking).toBe(false);
    expect(result.message).toContain("no .arcane.json");
  });

  it("passes, non-blocking, for a repository that carries its own spells — absent field and explicit repo alike", async () => {
    await writeRepoManifest("1.2.0");
    const absent = await checkSpellScope(repo, home);
    expect(absent.passed).toBe(true);
    expect(absent.blocking).toBe(false);
    expect(absent.message).toContain("repo — this repository carries its own spells");

    await writeRepoManifest("1.2.0", "repo");
    const explicit = await checkSpellScope(repo, home);
    expect(explicit).toEqual(absent);
  });

  it("passes for an opted-in repository whose store is present, compatible and actually holds the probed spell", async () => {
    await writeRepoManifest("1.2.0", "user");
    const storeRoot = await installStore("1.2.3");

    const result = await checkSpellScope(repo, home);

    expect(result.passed).toBe(true);
    expect(result.blocking).toBe(false);
    expect(result.message).toContain(storeRoot);
    expect(result.message).toContain("2 spell(s)");
    expect(result.message).toContain("spell-status.md present");
  });

  it("FAILS AND BLOCKS when an opted-in repository has no user tier at all", async () => {
    await writeRepoManifest("1.2.0", "user");

    const result = await checkSpellScope(repo, home);

    expect(result.passed).toBe(false);
    // Blocking is the default (undefined), never an explicit false: an opted-in
    // repository with no store has no spells in any client.
    expect(result.blocking).not.toBe(false);
    expect(result.message).toContain("is not installed");
    expect(result.message).toContain("spell init --user");
  });

  it("FAILS AND BLOCKS when the store's manifest is unreadable", async () => {
    await writeRepoManifest("1.2.0", "user");
    const storeRoot = userTierRoot(home);
    await fs.mkdir(storeRoot, { recursive: true });
    await fs.writeFile(join(storeRoot, ".arcane.json"), "{ not json", "utf8");

    const result = await checkSpellScope(repo, home);

    expect(result.passed).toBe(false);
    expect(result.blocking).not.toBe(false);
    expect(result.message).toContain("could not be read");
  });

  it("FAILS AND BLOCKS when the store exists but holds no spells, or not the probed one", async () => {
    await writeRepoManifest("1.2.0", "user");
    await installStore("1.2.0", []);
    const empty = await checkSpellScope(repo, home);
    expect(empty.passed).toBe(false);
    expect(empty.blocking).not.toBe(false);
    expect(empty.message).toContain("holds 0 spell(s)");

    await removeFixtureDir(userTierRoot(home));
    await installStore("1.2.0", ["spell-plan"]);
    const noProbe = await checkSpellScope(repo, home);
    expect(noProbe.passed).toBe(false);
    expect(noProbe.message).toContain("not spell-status.md");
  });

  it("warns, non-blocking, when the store and the repository are at different major.minor versions", async () => {
    await writeRepoManifest("1.2.0", "user");
    await installStore("1.1.1");

    const result = await checkSpellScope(repo, home);

    expect(result.passed).toBe(false);
    expect(result.blocking).toBe(false);
    expect(result.message).toContain("v1.2.0");
    expect(result.message).toContain("v1.1.1");
    expect(result.message).toContain("spell update --user");
  });

  it("treats a patch-level difference as compatible", async () => {
    await writeRepoManifest("1.2.0", "user");
    await installStore("1.2.9");
    const result = await checkSpellScope(repo, home);
    expect(result.passed).toBe(true);
  });
});
