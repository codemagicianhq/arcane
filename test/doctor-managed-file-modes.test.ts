import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { checkManagedFileModes } from "../src/commands/doctor.js";
import { writeManifest } from "../src/modules/manifest.js";
import { createFixtureDir, removeFixtureDir, runGit } from "./helpers/git-fixture.js";
import { HEAVY_TEST_TIMEOUT } from "./helpers/timeouts.js";

// #357, the doctor half: a managed path the index tracks as a symlink (mode
// 120000), or a client shim whose whole body is one relative path (a symlink
// materialised as text on a core.symlinks=false checkout), means a client
// silently skips or empties that spell. `spell doctor` names both shapes.

const SHIM = ".claude/commands/spell-example.md";
const PROMPT = ".github/prompts/spell-example.prompt.md";
const GOVERNANCE = ".arcane/governance/git-conventions.md";
const LINK_TEXT = "../../.github/prompts/spell-example.prompt.md";

let repo: string;
let aux: string;

async function writeRepoManifest(): Promise<void> {
  await writeManifest(repo, {
    version: "1.12.1",
    profile: "lite",
    installedAt: "2026-10-20T00:00:00.000Z",
    components: [
      { name: "spells-claude", files: [SHIM], installedVersion: "1.12.1" },
      { name: "spells-copilot", files: [PROMPT], installedVersion: "1.12.1" },
      { name: "git-conventions", files: [GOVERNANCE], installedVersion: "1.12.1" },
    ],
  });
}

async function writeRegular(file: string, content: string): Promise<void> {
  await fs.mkdir(join(repo, file.split("/").slice(0, -1).join("/")), { recursive: true });
  await fs.writeFile(join(repo, file), content);
  runGit(repo, ["add", "--", file]);
}

async function trackAsSymlink(file: string): Promise<void> {
  await fs.mkdir(join(repo, file.split("/").slice(0, -1).join("/")), { recursive: true });
  await fs.writeFile(join(repo, file), LINK_TEXT);
  // The link text as a blob, hashed from a file outside the repository so
  // the fixture's working tree stays clean.
  await fs.writeFile(join(aux, "link-text"), LINK_TEXT);
  const blob = runGit(repo, ["hash-object", "-w", "--", join(aux, "link-text")]).trim();
  runGit(repo, ["update-index", "--add", "--cacheinfo", `120000,${blob},${file}`]);
}

beforeEach(async () => {
  repo = await createFixtureDir("doctor-file-modes-repo");
  aux = await createFixtureDir("doctor-file-modes-aux");
  runGit(repo, ["init", "-q"]);
  await writeRepoManifest();
});

afterEach(async () => {
  await removeFixtureDir(repo);
  await removeFixtureDir(aux);
});

// Real git fixtures: the suite's heavy budget, not the 5 s default.
describe("checkManagedFileModes (#357)", { timeout: HEAVY_TEST_TIMEOUT }, () => {
  it("passes when every managed path is a regular file with real content", async () => {
    await writeRegular(SHIM, "---\ndescription: shim\n---\nBody\n");
    await writeRegular(PROMPT, "---\ndescription: prompt\n---\nBody\n");
    await writeRegular(GOVERNANCE, "# Git conventions\n");

    const result = await checkManagedFileModes(repo);

    expect(result.passed).toBe(true);
    expect(result.skipped).not.toBe(true);
  });

  it("fails naming a managed path the index tracks as a symlink, with the fix", async () => {
    await trackAsSymlink(SHIM);
    await writeRegular(PROMPT, "---\ndescription: prompt\n---\nBody\n");
    await writeRegular(GOVERNANCE, "# Git conventions\n");

    const result = await checkManagedFileModes(repo);

    expect(result.passed).toBe(false);
    expect(result.blocking).not.toBe(false);
    expect(result.message).toContain(SHIM);
    expect(result.message).toContain("120000");
    expect(result.message).toContain("spell update");
    expect(result.message).not.toContain(PROMPT);
  });

  it("fails naming a client shim whose whole body is a single relative path", async () => {
    await writeRegular(SHIM, `${LINK_TEXT}\n`);
    await writeRegular(PROMPT, "---\ndescription: prompt\n---\nBody\n");
    await writeRegular(GOVERNANCE, "# Git conventions\n");

    const result = await checkManagedFileModes(repo);

    expect(result.passed).toBe(false);
    expect(result.message).toContain(SHIM);
    expect(result.message).toMatch(/only a path|body is a path/i);
    expect(result.message).toContain("spell update");
  });

  it("does not read a governance document as a shim", async () => {
    // A one-line governance file that happens to look like a path is not a
    // client shim; only the generated shim shapes are judged by their body.
    await writeRegular(SHIM, "---\ndescription: shim\n---\nBody\n");
    await writeRegular(PROMPT, "---\ndescription: prompt\n---\nBody\n");
    await writeRegular(GOVERNANCE, "docs/governance/see-elsewhere.md\n");

    expect((await checkManagedFileModes(repo)).passed).toBe(true);
  });

  it("skips outside a git repository", async () => {
    const plain = await createFixtureDir("doctor-file-modes-plain");
    try {
      await writeManifest(plain, {
        version: "1.12.1",
        profile: "lite",
        installedAt: "2026-10-20T00:00:00.000Z",
        components: [{ name: "spells-claude", files: [SHIM], installedVersion: "1.12.1" }],
      });
      const result = await checkManagedFileModes(plain);
      expect(result.passed).toBe(true);
      expect(result.skipped).toBe(true);
    } finally {
      await removeFixtureDir(plain);
    }
  });

  it("skips when there is no manifest", async () => {
    const bare = await createFixtureDir("doctor-file-modes-bare");
    try {
      runGit(bare, ["init", "-q"]);
      const result = await checkManagedFileModes(bare);
      expect(result.passed).toBe(true);
      expect(result.skipped).toBe(true);
    } finally {
      await removeFixtureDir(bare);
    }
  });
});
